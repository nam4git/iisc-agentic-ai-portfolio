"""
A1 BreakoutScanner — SDD spec Section 7, Agent A1.

Contract:
  input:  universe: List[str], monthly_ohlcv: Dict[str, List[MonthBar]]
  output: List[BreakoutCandidate], sorted by vol_ratio desc

Gate conditions (G1):
  monthly_close > max(high[t-lookback .. t-1])   -- close above resistance
  vol_ratio = month_vol / avg_12m_vol  >= 1.5    -- volume confirmation
  resistance_age >= 3 months                     -- meaningful level

Constraint: READ-ONLY. Never produces entry prices.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional
import statistics

app = FastAPI(title="A1 BreakoutScanner")

LOOKBACK = 12   # months to find resistance
MIN_VOL_RATIO = 1.5
MIN_RESISTANCE_AGE = 3

class MonthBar(BaseModel):
    month: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class ScanRequest(BaseModel):
    universe: List[str]
    monthly_ohlcv: Dict[str, List[MonthBar]]

class BreakoutCandidate(BaseModel):
    ticker: str
    breakout_month: str
    resistance_px: float
    resistance_age: int
    vol_ratio: float

@app.get("/health")
def health():
    return {"status": "ok", "agent": "A1_BreakoutScanner"}

@app.post("/scan", response_model=List[BreakoutCandidate])
def scan(req: ScanRequest) -> List[BreakoutCandidate]:
    candidates = []

    for ticker in req.universe:
        bars = req.monthly_ohlcv.get(ticker)
        if not bars or len(bars) < LOOKBACK + 1:
            continue

        bars = sorted(bars, key=lambda b: b.month)
        latest = bars[-1]
        prior = bars[-LOOKBACK - 1 : -1]

        if len(prior) < LOOKBACK:
            continue

        resistance_px = max(b.high for b in prior)
        if latest.close <= resistance_px:
            continue

        resistance_bar_idx = max(
            range(len(prior)), key=lambda i: prior[i].high
        )
        resistance_age = len(prior) - resistance_bar_idx

        if resistance_age < MIN_RESISTANCE_AGE:
            continue

        avg_vol = statistics.mean(b.volume for b in prior)
        if avg_vol == 0:
            continue
        vol_ratio = latest.volume / avg_vol

        if vol_ratio < MIN_VOL_RATIO:
            continue

        candidates.append(BreakoutCandidate(
            ticker=ticker,
            breakout_month=latest.month,
            resistance_px=resistance_px,
            resistance_age=resistance_age,
            vol_ratio=round(vol_ratio, 3),
        ))

    candidates.sort(key=lambda c: c.vol_ratio, reverse=True)
    return candidates
