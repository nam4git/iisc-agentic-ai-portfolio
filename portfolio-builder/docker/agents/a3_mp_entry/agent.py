"""
A3 MPEntryAgent — SDD spec Section 7, Agent A3.

Contract:
  input:  qualified: List[{candidate, roce_report}],
          daily_tpo: Dict[str, TPOProfile],
          risk_budget: float (Rupees)
  output: List[EntryPlan]

Gate conditions (G3):
  entry_px = VAL or POC (from Market Profile)
  stop_px  = IB_low or prior_month_low (whichever lower)

Constraint: ADVISORY only. Owner approval required before AddHolding.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional
import time, math

app = FastAPI(title="A3 MPEntryAgent")

CONVICTION_WEIGHT = 0.4   # weight given to ROCE conviction in scoring
PLAN_EXPIRY_DAYS = 5

class BreakoutCandidate(BaseModel):
    ticker: str
    breakout_month: str
    resistance_px: float
    resistance_age: int
    vol_ratio: float

class ROCEReport(BaseModel):
    ticker: str
    latest_roce: float
    trend_4q: str
    peer_percentile: int
    verdict: str
    reason: str

class QualifiedCandidate(BaseModel):
    candidate: BreakoutCandidate
    report: ROCEReport

class TPOProfile(BaseModel):
    ticker: str
    date: str
    poc: float
    val: float
    vah: float
    ib_high: float
    ib_low: float
    prior_month_low: Optional[float] = None

class EntryPlan(BaseModel):
    ticker: str
    entry_px: float
    stop_px: float
    avg_levels: List[float]
    suggested_wt: float
    conviction: int
    expiry: int

class MPEntryRequest(BaseModel):
    qualified: List[QualifiedCandidate]
    daily_tpo: Dict[str, TPOProfile]
    risk_budget: float

def conviction_score(report: ROCEReport) -> int:
    score = 1
    if report.latest_roce > 20: score += 1
    if report.trend_4q == "IMPROVING": score += 1
    if report.peer_percentile >= 75: score += 1
    if report.latest_roce > 25: score += 1
    return min(score, 5)

@app.get("/health")
def health():
    return {"status": "ok", "agent": "A3_MPEntryAgent"}

@app.post("/plan", response_model=List[EntryPlan])
def plan(req: MPEntryRequest) -> List[EntryPlan]:
    plans = []
    n = max(len(req.qualified), 1)
    budget_per_stock = req.risk_budget / n

    for q in req.qualified:
        ticker = q.candidate.ticker
        tpo = req.daily_tpo.get(ticker)
        if not tpo:
            continue

        entry_px = tpo.val if tpo.val > 0 else tpo.poc
        if entry_px <= 0:
            continue

        candidates_stop = [tpo.ib_low]
        if tpo.prior_month_low and tpo.prior_month_low > 0:
            candidates_stop.append(tpo.prior_month_low)
        stop_px = min(candidates_stop)

        if stop_px >= entry_px:
            continue

        risk_per_share = entry_px - stop_px
        if risk_per_share <= 0:
            continue

        avg_step = risk_per_share * 0.5
        avg_levels = [
            round(entry_px - avg_step, 2),
            round(entry_px - avg_step * 2, 2),
        ]
        avg_levels = [l for l in avg_levels if l > stop_px]

        conv = conviction_score(q.report)
        suggested_wt = round((budget_per_stock / req.risk_budget) * 100 * (conv / 5), 2)

        expiry = int(time.time()) + PLAN_EXPIRY_DAYS * 86400

        plans.append(EntryPlan(
            ticker=ticker,
            entry_px=round(entry_px, 2),
            stop_px=round(stop_px, 2),
            avg_levels=avg_levels,
            suggested_wt=suggested_wt,
            conviction=conv,
            expiry=expiry,
        ))

    return plans
