"""
A5 ResearchAnalytics — SDD spec Section 7, Agent A5.

Contract:
  input:  pnl_history: List[PnLRecord],
          portfolio: List[Holding],
          roce_registry: Dict[str, List[ROCERecord]],
          benchmark_returns: List[{date, ret}]
  output: WeeklyReport { performance, expectancy_by_bucket, roce_alerts, setup_review }

Gate conditions (weekly):
  ROCE drift >= 3pp → triggers FM3 (A2 re-check)
  expectancy = win_rate * avg_W - (1 - win_rate) * avg_L

Constraint: Runs WEEKLY only. Never modifies portfolio or any registry.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
import statistics

app = FastAPI(title="A5 ResearchAnalytics")

ROCE_DRIFT_THRESHOLD = 3.0

class PnLRecord(BaseModel):
    ticker: str
    date: str
    pnl_rupees: float
    setup: str        # "breakout" | "averaging" | "follow_through"
    mp_level: str     # "VAL" | "POC" | "IB"
    side: Literal["WIN", "LOSS"]
    r_multiple: float

class Holding(BaseModel):
    ticker: str
    weight: float
    entry_px: Optional[float] = None
    stop_px:  Optional[float] = None

class ROCERecord(BaseModel):
    ticker: str
    quarter: str
    roce: float
    recorded: int

class BenchmarkPoint(BaseModel):
    date: str
    ret: float

class PortfolioMetrics(BaseModel):
    total_weight: float
    weighted_return: float
    sharpe: float

class ROCEAlert(BaseModel):
    ticker: str
    drift_pp: float
    action: str

class SetupRow(BaseModel):
    setup: str
    trades: int
    win_rate: float
    expectancy: float

class WeeklyReport(BaseModel):
    performance: PortfolioMetrics
    expectancy_by_bucket: Dict[str, float]
    roce_alerts: List[ROCEAlert]
    setup_review: List[SetupRow]
    trigger_a2_recheck: List[str]   # tickers needing re-check

class ResearchRequest(BaseModel):
    pnl_history: List[PnLRecord]
    portfolio: List[Holding]
    roce_registry: Dict[str, List[ROCERecord]]
    benchmark_returns: List[BenchmarkPoint]

def expectancy(records: List[PnLRecord]) -> float:
    wins  = [r.r_multiple for r in records if r.side == "WIN"]
    losses= [abs(r.r_multiple) for r in records if r.side == "LOSS"]
    if not records:
        return 0.0
    wr  = len(wins) / len(records)
    avg_w = statistics.mean(wins)   if wins   else 0.0
    avg_l = statistics.mean(losses) if losses else 0.0
    return wr * avg_w - (1 - wr) * avg_l

@app.get("/health")
def health():
    return {"status": "ok", "agent": "A5_ResearchAnalytics"}

@app.post("/weekly", response_model=WeeklyReport)
def weekly(req: ResearchRequest) -> WeeklyReport:
    tw = sum(h.weight for h in req.portfolio)
    wret = 0.0

    metrics = PortfolioMetrics(
        total_weight=tw, weighted_return=round(wret, 3), sharpe=0.0
    )

    buckets: Dict[str, List[PnLRecord]] = {}
    for r in req.pnl_history:
        key = f"{r.setup}/{r.mp_level}"
        buckets.setdefault(key, []).append(r)
    expectancy_by_bucket = {k: round(expectancy(v), 3) for k, v in buckets.items()}

    roce_alerts = []
    trigger_recheck = []
    for ticker, records in req.roce_registry.items():
        if len(records) < 2:
            continue
        sorted_recs = sorted(records, key=lambda r: r.quarter)
        drift = sorted_recs[-1].roce - sorted_recs[-2].roce
        if drift <= -ROCE_DRIFT_THRESHOLD:
            roce_alerts.append(ROCEAlert(
                ticker=ticker,
                drift_pp=round(drift, 2),
                action="Trigger A2 re-check (FM3)",
            ))
            trigger_recheck.append(ticker)

    setups: Dict[str, List[PnLRecord]] = {}
    for r in req.pnl_history:
        setups.setdefault(r.setup, []).append(r)

    setup_review = []
    for setup, records in setups.items():
        wins = [r for r in records if r.side == "WIN"]
        wr = len(wins) / len(records) if records else 0.0
        setup_review.append(SetupRow(
            setup=setup,
            trades=len(records),
            win_rate=round(wr, 3),
            expectancy=round(expectancy(records), 3),
        ))

    return WeeklyReport(
        performance=metrics,
        expectancy_by_bucket=expectancy_by_bucket,
        roce_alerts=roce_alerts,
        setup_review=setup_review,
        trigger_a2_recheck=trigger_recheck,
    )
