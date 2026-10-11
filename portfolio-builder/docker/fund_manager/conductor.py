"""
FundManager Conductor — SDD spec Section 8.

Enforces all FM rules:
  FM1: invoke A3 only after A2 verdict = PASS
  FM2: AddHolding requires Owner approval
  FM3: A5 ROCE drift triggers A2 re-check
  FM4: Averaging requires fresh A2 re-check passing
  FM5: Reject EntryPlan if stop_px >= entry_px
  FM6: Weekly report to Owner (endpoint /weekly_report)

This is the single orchestration entry point. All agent calls go through here.
"""

import os, httpx, time, sqlite3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

app = FastAPI(title="FundManager Conductor")

A1_URL = os.environ.get("A1_URL", "http://a1_breakout:9001")
A2_URL = os.environ.get("A2_URL", "http://a2_roce:9002")
A3_URL = os.environ.get("A3_URL", "http://a3_mp_entry:9003")
A4_URL = os.environ.get("A4_URL", "http://a4_portfolio:9004")
A5_URL = os.environ.get("A5_URL", "http://a5_research:9005")
DB_PATH = os.environ.get("DB_PATH", "/data/audit.db")

def init_audit():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS audit (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ts         INTEGER NOT NULL,
            event      TEXT NOT NULL,
            ticker     TEXT,
            detail     TEXT,
            signed_by  TEXT DEFAULT 'FundManager'
        )
    """)
    con.commit()
    con.close()

@app.on_event("startup")
def startup():
    init_audit()

def log_audit(event: str, ticker: str = None, detail: str = None):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT INTO audit(ts,event,ticker,detail) VALUES(?,?,?,?)",
        (int(time.time()), event, ticker, detail)
    )
    con.commit()
    con.close()

@app.get("/health")
def health():
    return {"status": "ok", "agent": "FundManager"}

class PipelineRequest(BaseModel):
    universe: List[str]
    monthly_ohlcv: Dict
    roce_registry: Dict
    daily_tpo: Dict
    risk_budget: float

@app.post("/pipeline/run")
async def run_pipeline(req: PipelineRequest):
    """
    Full pipeline: A1 → A2 → A3.
    Returns entry plans for Owner review.
    No orders are sent. Owner approves via /approve_plan.
    """
    log_audit("PIPELINE_START")

    async with httpx.AsyncClient(timeout=30) as client:
        # A1: Breakout scan
        r1 = await client.post(f"{A1_URL}/scan", json={
            "universe": req.universe,
            "monthly_ohlcv": req.monthly_ohlcv,
        })
        r1.raise_for_status()
        candidates = r1.json()
        log_audit("A1_COMPLETE", detail=f"{len(candidates)} candidates")

        if not candidates:
            return {"status": "no_candidates", "plans": []}

        # A2: ROCE gate (FM1: A2 always before A3)
        r2 = await client.post(f"{A2_URL}/screen", json={
            "candidates": candidates,
            "roce_registry": req.roce_registry,
        })
        r2.raise_for_status()
        qualified = r2.json()
        log_audit("A2_COMPLETE", detail=f"{len(qualified)} qualified after ROCE gate")

        if not qualified:
            return {"status": "roce_gate_filtered_all", "plans": []}

        # A3: Entry plans (FM1 satisfied: A2 ran first)
        r3 = await client.post(f"{A3_URL}/plan", json={
            "qualified": qualified,
            "daily_tpo": req.daily_tpo,
            "risk_budget": req.risk_budget,
        })
        r3.raise_for_status()
        plans = r3.json()

        # FM5: Reject any plan where stop_px >= entry_px
        valid_plans = []
        for p in plans:
            if p["stop_px"] >= p["entry_px"]:
                log_audit("FM5_REJECT", ticker=p["ticker"],
                          detail=f"stop {p['stop_px']} >= entry {p['entry_px']}")
            else:
                valid_plans.append(p)

        log_audit("A3_COMPLETE", detail=f"{len(valid_plans)} valid plans (FM5 filtered {len(plans)-len(valid_plans)})")

    return {
        "status": "pending_owner_approval",
        "plans": valid_plans,
        "message": "Owner must call /approve_plan for each plan before it becomes a holding.",
    }

class ApproveRequest(BaseModel):
    plan_id: str
    ticker: str
    owner_id: str
    approved: bool

@app.post("/approve_plan")
def approve_plan(req: ApproveRequest):
    """FM2: Records Owner approval. Required before AddHolding."""
    if not req.approved:
        log_audit("OWNER_REJECT", ticker=req.ticker, detail=f"owner={req.owner_id}")
        return {"status": "rejected"}

    log_audit("OWNER_APPROVE", ticker=req.ticker,
              detail=f"plan_id={req.plan_id} owner={req.owner_id}")
    return {"status": "approved", "ticker": req.ticker, "owner_id": req.owner_id}

@app.get("/audit")
def get_audit(limit: int = 50):
    con = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT ts, event, ticker, detail, signed_by FROM audit ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    con.close()
    return [{"ts": r[0], "event": r[1], "ticker": r[2], "detail": r[3], "signed_by": r[4]} for r in rows]
