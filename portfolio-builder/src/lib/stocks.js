// Stock reference database — matches SDD spec StockRecord type
// Prices and returns are sample/educational data, not live

export const DB = {
  RELIANCE:   { name: 'Reliance Industries',        sector: 'Energy',       price: 2845.30, ret: 18.5,  beta: 0.92, vol: 22.1, fno: true },
  HDFCBANK:   { name: 'HDFC Bank',                  sector: 'Banking',      price: 1678.45, ret: 12.3,  beta: 0.85, vol: 18.4, fno: true },
  INFY:       { name: 'Infosys',                    sector: 'Technology',   price: 1782.60, ret: 24.1,  beta: 0.78, vol: 26.3, fno: true },
  TCS:        { name: 'Tata Consultancy Services',  sector: 'Technology',   price: 4125.80, ret: 21.7,  beta: 0.72, vol: 20.8, fno: true },
  ICICIBANK:  { name: 'ICICI Bank',                 sector: 'Banking',      price: 1215.70, ret: 31.2,  beta: 0.95, vol: 21.5, fno: true },
  BHARTIARTL: { name: 'Bharti Airtel',              sector: 'Telecom',      price: 1634.50, ret: 41.8,  beta: 0.68, vol: 24.7, fno: true },
  ASIANPAINT: { name: 'Asian Paints',               sector: 'Consumer',     price: 2654.35, ret: -8.4,  beta: 0.62, vol: 23.2, fno: true },
  SUNPHARMA:  { name: 'Sun Pharmaceutical',         sector: 'Pharma',       price: 1842.15, ret: 28.6,  beta: 0.55, vol: 19.8, fno: true },
  TATAMOTORS: { name: 'Tata Motors',                sector: 'Auto',         price: 934.60,  ret: -12.3, beta: 1.42, vol: 38.5, fno: true },
  WIPRO:      { name: 'Wipro',                      sector: 'Technology',   price: 545.80,  ret: 15.2,  beta: 0.81, vol: 28.9, fno: true },
  HINDALCO:   { name: 'Hindalco Industries',        sector: 'Metals',       price: 634.20,  ret: 22.1,  beta: 1.15, vol: 32.1, fno: true },
  MARUTI:     { name: 'Maruti Suzuki',              sector: 'Auto',         price: 11845.0, ret: 14.8,  beta: 0.88, vol: 20.6, fno: true },
  NTPC:       { name: 'NTPC',                       sector: 'Energy',       price: 362.45,  ret: 8.9,   beta: 0.71, vol: 25.3, fno: true },
  TECHM:      { name: 'Tech Mahindra',              sector: 'Technology',   price: 1578.30, ret: 35.6,  beta: 0.85, vol: 30.4, fno: true },
  AXISBANK:   { name: 'Axis Bank',                  sector: 'Banking',      price: 1125.40, ret: 16.8,  beta: 0.98, vol: 24.1, fno: true },
  POWERGRID:  { name: 'Power Grid Corp',            sector: 'Energy',       price: 318.20,  ret: 15.4,  beta: 0.58, vol: 21.8, fno: true },
  BAJFINANCE: { name: 'Bajaj Finance',              sector: 'NBFC',         price: 6845.70, ret: 22.8,  beta: 1.12, vol: 31.5, fno: true },
  NESTLEIND:  { name: 'Nestlé India',               sector: 'Consumer',     price: 2245.60, ret: -3.2,  beta: 0.48, vol: 17.4, fno: true },
  HCLTECH:    { name: 'HCL Technologies',           sector: 'Technology',   price: 1685.30, ret: 29.4,  beta: 0.75, vol: 25.6, fno: true },
  ULTRACEMCO: { name: 'UltraTech Cement',           sector: 'Cement',       price: 10450.0, ret: 11.2,  beta: 0.82, vol: 22.4, fno: true },
  KOTAKBANK:  { name: 'Kotak Mahindra Bank',        sector: 'Banking',      price: 1845.60, ret: 8.4,   beta: 0.77, vol: 19.2, fno: true },
  DRREDDY:    { name: "Dr Reddy's Laboratories",    sector: 'Pharma',       price: 6245.80, ret: 14.2,  beta: 0.58, vol: 22.8, fno: true },
  TITAN:      { name: 'Titan Company',              sector: 'Consumer',     price: 3425.70, ret: 6.8,   beta: 0.72, vol: 26.4, fno: true },
  LT:         { name: 'Larsen & Toubro',            sector: 'Capital Goods',price: 3678.40, ret: 23.5,  beta: 0.95, vol: 24.8, fno: true },
  SBILIFE:    { name: 'SBI Life Insurance',         sector: 'Insurance',    price: 1625.30, ret: 19.3,  beta: 0.65, vol: 21.0, fno: true },
}

export const SECTOR_COLOR = {
  Banking:       '#4f8ef7',
  Technology:    '#a78bfa',
  Energy:        '#fb923c',
  Telecom:       '#34d399',
  Consumer:      '#f472b6',
  Pharma:        '#fbbf24',
  Auto:          '#60a5fa',
  Metals:        '#94a3b8',
  NBFC:          '#f9a8d4',
  Cement:        '#c4b5fd',
  Insurance:     '#86efac',
  'Capital Goods': '#fde68a',
}

export const SAMPLE_PORTFOLIO = [
  { ticker: 'HDFCBANK',   weight: 22 },
  { ticker: 'RELIANCE',   weight: 20 },
  { ticker: 'INFY',       weight: 18 },
  { ticker: 'TCS',        weight: 15 },
  { ticker: 'ICICIBANK',  weight: 12 },
  { ticker: 'BHARTIARTL', weight: 8  },
  { ticker: 'ASIANPAINT', weight: 5  },
]
