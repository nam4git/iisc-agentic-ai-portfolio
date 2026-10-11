"""
A2 ROCEAgent — SDD spec Section 7, Agent A2.

ROCE formula (per owner specification):
  NCA  = Current Assets − Cash & Equivalents
  NWC  = NCA − Current Liabilities
  NFA  = Net PPE + Other Intangibles (Goodwill excluded)
  TCE  = NFA + NWC
  EBIT = TTM (sum of last 4 quarterly EBITs, annualised)
  ROCE = EBIT / TCE × 100

Intangibles: Goodwill excluded (acquisition premium ≠ operating capital).
Other Intangible Assets included per Lev-Sougiannis / Peters-Taylor research.

Data source: Yahoo Finance (.NS suffix for NSE, .BO for BSE).

Gate G2:
  Path A: ROCE > 15% AND trend_4q = IMPROVING
  Path B: peer_percentile >= 60 AND ROCE > 12%
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
import sqlite3, os, time, statistics
import yfinance as yf

app = FastAPI(title="A2 ROCEAgent")
DB_PATH = os.environ.get("DB_PATH", "/data/roce_registry.db")

ROCE_THRESHOLD_A  = 15.0
ROCE_THRESHOLD_B  = 12.0
PEER_PERCENTILE_B = 60

# ── DB ──────────────────────────────────────────────────────────────────────

def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS roce_records (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker    TEXT NOT NULL,
            quarter   TEXT NOT NULL,
            roce      REAL,
            ebit      REAL,
            tce       REAL,
            nwc       REAL,
            nfa       REAL,
            recorded  INTEGER NOT NULL,
            source    TEXT DEFAULT 'yahoo'
        )
    """)
    con.commit(); con.close()

@app.on_event("startup")
def startup():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    init_db()

# ── Yahoo Finance helpers ────────────────────────────────────────────────────

def _v(series, key):
    """Safely extract a value from a yfinance DataFrame row."""
    try:
        return float(series[key])
    except Exception:
        return 0.0

def quarter_label(ts) -> str:
    """Convert a pandas Timestamp to Indian fiscal quarter label."""
    import pandas as pd
    if hasattr(ts, 'month'):
        m, y = ts.month, ts.year
    else:
        import datetime
        d = datetime.datetime.fromtimestamp(ts)
        m, y = d.month, d.year
    fy = y + 1 if m >= 4 else y
    q = 'Q1' if 4 <= m <= 6 else 'Q2' if 7 <= m <= 9 else 'Q3' if m >= 10 else 'Q4'
    return f"{q}FY{str(fy)[2:]}"

def fetch_roce_from_yahoo(nse_ticker: str) -> List[dict]:
    """
    Fetch quarterly financials from Yahoo Finance and compute ROCE.
    Returns list of RocePoint dicts, newest first.
    """
    symbol = nse_ticker.upper()
    if not symbol.endswith(('.NS', '.BO')):
        symbol += '.NS'

    ticker = yf.Ticker(symbol)
    qbs = ticker.quarterly_balance_sheet   # columns = quarters (newest first)
    qis = ticker.quarterly_income_stmt

    if qbs is None or qbs.empty or qis is None or qis.empty:
        # try .BO
        if symbol.endswith('.NS'):
            ticker = yf.Ticker(symbol.replace('.NS', '.BO'))
            qbs = ticker.quarterly_balance_sheet
            qis = ticker.quarterly_income_stmt
        if qbs is None or qbs.empty:
            raise ValueError(f"No data for {symbol}")

    quarters = list(qbs.columns)   # pandas Timestamps, newest first
    points = []

    for col in quarters[:8]:
        ql = quarter_label(col)
        bs = qbs[col]
        # find matching IS column (same quarter)
        is_col = None
        for ic in qis.columns:
            if quarter_label(ic) == ql:
                is_col = qis[ic]; break
        if is_col is None and len(qis.columns) > 0:
            # fallback: closest column
            is_col = qis[qis.columns[0]]

        ca    = _v(bs, 'Current Assets') or _v(bs, 'Total Current Assets')
        cash  = _v(bs, 'Cash And Cash Equivalents') + _v(bs, 'Short Term Investments')
        cl    = _v(bs, 'Current Liabilities') or _v(bs, 'Total Current Liabilities')
        ppe   = _v(bs, 'Net PPE') or _v(bs, 'Property Plant Equipment Net')
        gw    = _v(bs, 'Goodwill')
        ia    = _v(bs, 'Goodwill And Other Intangible Assets') - gw   # other intangibles only

        nca   = max(ca - cash, 0)
        nwc   = nca - cl
        nfa   = ppe + max(ia, 0)
        tce   = nfa + nwc

        q_ebit = 0.0
        if is_col is not None:
            q_ebit = _v(is_col, 'EBIT') or _v(is_col, 'Operating Income')

        points.append({
            'quarter': ql, 'date_ts': col.timestamp() if hasattr(col, 'timestamp') else 0,
            'q_ebit': q_ebit, 'tce': tce, 'nwc': nwc, 'nfa': nfa,
            'breakdown': {
                'current_assets': ca, 'cash': cash, 'nca': nca,
                'current_liab': cl, 'net_ppe': ppe,
                'intangibles_included': max(ia, 0), 'goodwill_excluded': gw,
            }
        })

    # TTM EBIT for each point
    for i, pt in enumerate(points):
        window = [p['q_ebit'] for p in points[i:i+4]]
        ttm = sum(window)
        pt['ebit'] = ttm
        pt['roce'] = round((ttm / pt['tce']) * 100, 2) if pt['tce'] else None

    return points

# ── Models ────────────────────────────────────────────────────────────────────

class BreakoutCandidate(BaseModel):
    ticker: str
    breakout_month: str
    resistance_px: float
    resistance_age: int
    vol_ratio: float

class ROCERecord(BaseModel):
    ticker: str
    quarter: str
    roce: Optional[float]
    recorded: int

class ROCEReport(BaseModel):
    ticker: str
    latest_roce: Optional[float]
    trend_4q: Literal["IMPROVING", "FLAT", "DECLINING"]
    peer_percentile: int
    verdict: Literal["PASS", "FAIL"]
    reason: str
    history: Optional[List[dict]] = None

class QualifiedCandidate(BaseModel):
    candidate: BreakoutCandidate
    report: ROCEReport

class ROCERequest(BaseModel):
    candidates: List[BreakoutCandidate]
    roce_registry: Optional[Dict[str, List[ROCERecord]]] = None

# ── Helpers ────────────────────────────────────────────────────────────────────

def compute_trend(rocs: List[float]) -> str:
    if len(rocs) < 2: return "FLAT"
    diffs = [rocs[i] - rocs[i+1] for i in range(len(rocs)-1)]
    avg = sum(diffs) / len(diffs)
    if avg > 1.0:  return "IMPROVING"
    if avg < -1.0: return "DECLINING"
    return "FLAT"

def compute_percentile(roce: float, all_rocs: List[float]) -> int:
    if not all_rocs: return 50
    return int(100 * sum(1 for r in all_rocs if r < roce) / len(all_rocs))

# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "agent": "A2_ROCEAgent"}

@app.get("/fetch/{ticker}")
def fetch_ticker_roce(ticker: str):
    """Fetch ROCE from Yahoo Finance for a single NSE ticker."""
    try:
        history = fetch_roce_from_yahoo(ticker)
        trend = compute_trend([p['roce'] for p in history if p['roce'] is not None])
        return {
            "ticker": ticker.upper(),
            "history": history,
            "current": history[0] if history else None,
            "trend": trend,
            "source": "Yahoo Finance",
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/screen", response_model=List[QualifiedCandidate])
def screen(req: ROCERequest) -> List[QualifiedCandidate]:
    """Screen BreakoutCandidates through the ROCE gate (G2)."""
    all_rocs = []
    ticker_history: Dict[str, List[dict]] = {}

    for c in req.candidates:
        try:
            hist = fetch_roce_from_yahoo(c.ticker)
            ticker_history[c.ticker] = hist
            if hist and hist[0]['roce'] is not None:
                all_rocs.append(hist[0]['roce'])
        except Exception:
            pass

    qualified = []
    for c in req.candidates:
        hist = ticker_history.get(c.ticker)
        if not hist:
            continue
        rocs = [p['roce'] for p in hist if p['roce'] is not None]
        if not rocs:
            continue

        latest_roce = rocs[0]
        trend = compute_trend(rocs)
        peer_pct = compute_percentile(latest_roce, all_rocs)

        pass_a = latest_roce > ROCE_THRESHOLD_A and trend == "IMPROVING"
        pass_b = peer_pct >= PEER_PERCENTILE_B and latest_roce > ROCE_THRESHOLD_B

        if pass_a:
            verdict, reason = "PASS", f"Path A: ROCE {latest_roce:.1f}% > 15% and {trend}"
        elif pass_b:
            verdict, reason = "PASS", f"Path B: peer_pct {peer_pct} >= 60, ROCE {latest_roce:.1f}% > 12%"
        else:
            verdict = "FAIL"
            reason = f"ROCE {latest_roce:.1f}%, trend {trend}, peer_pct {peer_pct}"

        report = ROCEReport(
            ticker=c.ticker, latest_roce=latest_roce,
            trend_4q=trend, peer_percentile=peer_pct,
            verdict=verdict, reason=reason,
            history=hist[:4],
        )
        if verdict == "PASS":
            qualified.append(QualifiedCandidate(candidate=c, report=report))

        # Persist to registry (append-only)
        _persist(c.ticker, hist)

    return qualified

@app.post("/append")
def append_record(record: ROCERecord):
    """Manually append a ROCE record (e.g. from uploaded CSV)."""
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT INTO roce_records(ticker,quarter,roce,recorded,source) VALUES(?,?,?,?,?)",
        (record.ticker, record.quarter, record.roce,
         record.recorded or int(time.time()), 'manual')
    )
    con.commit(); con.close()
    return {"status": "appended"}

def _persist(ticker: str, history: List[dict]):
    con = sqlite3.connect(DB_PATH)
    for pt in history:
        existing = con.execute(
            "SELECT id FROM roce_records WHERE ticker=? AND quarter=?",
            (ticker, pt['quarter'])
        ).fetchone()
        if not existing:
            con.execute(
                "INSERT INTO roce_records(ticker,quarter,roce,ebit,tce,nwc,nfa,recorded,source) VALUES(?,?,?,?,?,?,?,?,?)",
                (ticker, pt['quarter'], pt['roce'], pt['ebit'], pt['tce'],
                 pt['nwc'], pt['nfa'], int(time.time()), 'yahoo')
            )
    con.commit(); con.close()
