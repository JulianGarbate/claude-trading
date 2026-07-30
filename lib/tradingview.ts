export interface TradingViewSnapshot {
  tvSymbol: string;
  exchange: string;
  currency: string;
  description: string;
  close: number;
  changePercent: number;
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  macd: number | null;
  macdSignal: number | null;
  recommendAll: number | null;
}

interface SymbolSearchResult {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  source_id?: string;
  currency_code: string;
  is_primary_listing?: boolean;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; trading-pwa/1.0)",
  Origin: "https://www.tradingview.com",
  Referer: "https://www.tradingview.com/",
};

interface ResolvedSymbol {
  tvSymbol: string;
  exchange: string;
  currency: string;
  description: string;
}

async function resolveSymbol(query: string): Promise<ResolvedSymbol | null> {
  const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(
    query
  )}&type=stock`;

  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) return null;

  const results = (await res.json()) as SymbolSearchResult[];
  const candidates = results.filter((r) => r.type === "stock" || r.type === "dr");
  if (candidates.length === 0) return null;

  const upperQuery = query.trim().toUpperCase();
  const best =
    candidates.find((r) => r.symbol.toUpperCase() === upperQuery && r.is_primary_listing) ??
    candidates.find((r) => r.symbol.toUpperCase() === upperQuery) ??
    candidates.find((r) => r.is_primary_listing) ??
    candidates[0];

  const exchange = best.source_id ?? best.exchange;

  return {
    tvSymbol: `${exchange}:${best.symbol}`,
    exchange,
    currency: best.currency_code,
    description: best.description,
  };
}

export async function fetchTradingViewSnapshot(query: string): Promise<TradingViewSnapshot | null> {
  const resolved = await resolveSymbol(query);
  if (!resolved) return null;

  const res = await fetch("https://scanner.tradingview.com/global/scan", {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      symbols: { tickers: [resolved.tvSymbol], query: { types: [] } },
      columns: ["close", "change", "RSI", "MACD.macd", "MACD.signal", "SMA20", "SMA50", "Recommend.All"],
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const row = data?.data?.[0]?.d as unknown[] | undefined;
  if (!row) return null;

  const [close, changePercent, rsi14, macd, macdSignal, sma20, sma50, recommendAll] = row;
  const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

  if (typeof close !== "number") return null;

  return {
    tvSymbol: resolved.tvSymbol,
    exchange: resolved.exchange,
    currency: resolved.currency,
    description: resolved.description,
    close,
    changePercent: num(changePercent) ?? 0,
    rsi14: num(rsi14),
    macd: num(macd),
    macdSignal: num(macdSignal),
    sma20: num(sma20),
    sma50: num(sma50),
    recommendAll: num(recommendAll),
  };
}

export function describeRecommendation(score: number): string {
  if (score > 0.5) return "Compra fuerte";
  if (score > 0.1) return "Compra";
  if (score < -0.5) return "Venta fuerte";
  if (score < -0.1) return "Venta";
  return "Neutral";
}
