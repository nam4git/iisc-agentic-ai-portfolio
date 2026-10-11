"""
A4 PortfolioManager — SDD spec Section 7, Agent A4.

Contract:
  input:  portfolio: List[Holding], live_prices: Dict[str, float], trades: List[TradeRecord]
  output: PortfolioReport { metrics, pnl_by_name, attribution, alerts, rebal_signals }

Gate conditions (ongoing):
  STOP_TRAIL:  price > entry * 1.08 AND stop < entry → trail up
  AVG_HIT:     price <= avg_level AND ROCE still passes → alert
  ROCE_DECAY:  latest_roce drops > 3pp → escalate to A5

Constraint: Signals only. Never averages if ROCE gate fails.
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
import statistics

app = FastAPI(title="A4 PortfolioManager")

RF_RATE = 7.0

class Holding(BaseModel):
    ticker: str
    weight: float
    entry_px: Optional[float] = None
    stop_px:  Optional[float] = None
    avg_levels: Optional[List[float]] = None

class TradeRecord(BaseModel):
    id: str
    ticker: str
    side: Literal["BUY", "SELL"]
    qty: int
    fill_px: float
    timestamp: int
    approved_by: str

class PortfolioMetrics(BaseModel):
    total_weight: float
    weighted_return: float
    weighted_beta: float
    weighted_vol: float
    sharpe: float

class Alert(BaseModel):
    ticker: str
    kind: Literal["STOP_TRAIL", "AVG_HIT", "ROCE_DECAY"]
    message: str

class PnLAttribution(BaseModel):
    by_sector: Dict[str, float]
    by_setup:  Dict[str, float]
    by_mp_level: Dict[str, float]

class PortfolioReport(BaseModel):
    metrics: PortfolioMetrics
    pnl_by_name: Dict[str, float]
    attribution: PnLAttribution
    alerts: List[Alert]
    rebal_signals: List[str]

class PortfolioRequest(BaseModel):
    portfolio: List[Holding]
    live_prices: Dict[str, float]
    trades: List[TradeRecord]
    stock_meta: Optional[Dict[str, Dict]] = None

def total_weight(portfolio: List[Holding]) -> float:
    return sum(h.weight for h in portfolio)

def alloc(h: Holding, tw: float) -> float:
    return h.weight / tw if tw else 0

@app.get("/health")
def health():
    return {"status": "ok", "agent": "A4_PortfolioManager"}

@app.post("/report", response_model=PortfolioReport)
def report(req: PortfolioRequest) -> PortfolioReport:
    tw = total_weight(req.portfolio)
    meta = req.stock_meta or {}
    alerts = []
    pnl_by_name = {}

    w_ret = w_beta = w_vol = 0.0
    for h in req.portfolio:
        a = alloc(h, tw)
        m = meta.get(h.ticker, {})
        ret  = m.get("ret",  0.0)
        beta = m.get("beta", 1.0)
        vol  = m.get("vol",  20.0)

        w_ret  += a * ret
        w_beta += a * beta
        w_vol  += a * vol

        px = req.live_prices.get(h.ticker)
        if px and h.entry_px:
            pnl_by_name[h.ticker] = (px - h.entry_px) / h.entry_px * 100

            if px > h.entry_px * 1.08 and h.stop_px and h.stop_px < h.entry_px:
                alerts.append(Alert(
                    ticker=h.ticker, kind="STOP_TRAIL",
                    message=f"Trail stop up: px {px:.2f} > entry*1.08 {h.entry_px*1.08:.2f}"
                ))

            if h.avg_levels:
                for lvl in h.avg_levels:
                    if px <= lvl:
                        alerts.append(Alert(
                            ticker=h.ticker, kind="AVG_HIT",
                            message=f"Averaging level {lvl:.2f} hit. Run A2 re-check before averaging."
                        ))
                        break

    sharpe = (w_ret - RF_RATE) / w_vol if w_vol else 0.0

    metrics = PortfolioMetrics(
        total_weight=tw,
        weighted_return=round(w_ret, 3),
        weighted_beta=round(w_beta, 3),
        weighted_vol=round(w_vol, 3),
        sharpe=round(sharpe, 3),
    )

    attribution = PnLAttribution(
        by_sector={},
        by_setup={"breakout": 0, "averaging": 0, "follow_through": 0},
        by_mp_level={"VAL": 0, "POC": 0, "IB": 0},
    )

    rebal_signals = []
    for h in req.portfolio:
        a = alloc(h, tw)
        if a > 0.20:
            rebal_signals.append(f"{h.ticker} overweight at {a*100:.1f}% — consider trim")
        if a < 0.02 and tw > 0:
            rebal_signals.append(f"{h.ticker} underweight at {a*100:.1f}% — consider exit")

    return PortfolioReport(
        metrics=metrics,
        pnl_by_name=pnl_by_name,
        attribution=attribution,
        alerts=alerts,
        rebal_signals=rebal_signals,
    )
