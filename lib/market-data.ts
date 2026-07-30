export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketData {
  ticker: string;
  currency: string;
  prices: PricePoint[];
  lastPrice: number;
  changePercent: number;
}

export interface ChartPeriod {
  id: string;
  label: string;
  range: string;
  interval: string;
}

export const CHART_PERIODS: ChartPeriod[] = [
  { id: "1d", label: "1D", range: "1d", interval: "5m" },
  { id: "5d", label: "5D", range: "5d", interval: "15m" },
  { id: "1mo", label: "1M", range: "1mo", interval: "1d" },
  { id: "3mo", label: "3M", range: "3mo", interval: "1d" },
  { id: "6mo", label: "6M", range: "6mo", interval: "1d" },
  { id: "1y", label: "1A", range: "1y", interval: "1d" },
];

export const DEFAULT_CHART_PERIOD = CHART_PERIODS.find((p) => p.id === "3mo")!;

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency: string;
        regularMarketPrice: number;
        previousClose?: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
        }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

/**
 * Candidatos de símbolo Yahoo a partir de un input que puede venir en formato
 * TradingView ("BCBA:VALO", tras un fallback previo) o como ticker simple.
 * BYMA/pesos suele estar cubierto por Yahoo bajo el sufijo ".BA" (ej. GGAL.BA).
 */
function yahooSymbolCandidates(input: string): string[] {
  const trimmed = input.trim().toUpperCase();
  const base = trimmed.includes(":") ? trimmed.split(":")[1] : trimmed;

  const candidates = [trimmed];
  if (!base.includes(".")) candidates.push(`${base}.BA`);
  if (base !== trimmed) candidates.push(base);

  return Array.from(new Set(candidates));
}

async function fetchMarketDataForSymbol(
  symbol: string,
  period: ChartPeriod
): Promise<MarketData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${period.range}&interval=${period.interval}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; trading-pwa/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener datos de mercado para ${symbol} (HTTP ${res.status})`);
  }

  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart.result?.[0];

  if (!result) {
    throw new Error(`Ticker no encontrado: ${symbol}`);
  }

  const quote = result.indicators.quote[0];
  const prices: PricePoint[] = result.timestamp
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString(),
      open: quote?.open?.[i],
      high: quote?.high?.[i],
      low: quote?.low?.[i],
      close: quote?.close?.[i],
    }))
    .filter(
      (p): p is PricePoint =>
        typeof p.open === "number" &&
        typeof p.high === "number" &&
        typeof p.low === "number" &&
        typeof p.close === "number"
    );

  if (prices.length === 0) {
    throw new Error(`Sin datos de precios para ${symbol}`);
  }

  const lastPrice = result.meta.regularMarketPrice;
  const previousDailyClose = prices.length >= 2 ? prices[prices.length - 2].close : undefined;
  const previousClose = result.meta.previousClose ?? previousDailyClose;
  const changePercent =
    typeof previousClose === "number" && previousClose !== 0
      ? ((lastPrice - previousClose) / previousClose) * 100
      : 0;

  return {
    ticker: symbol,
    currency: result.meta.currency,
    prices,
    lastPrice,
    changePercent,
  };
}

export async function fetchMarketData(
  ticker: string,
  period: ChartPeriod = DEFAULT_CHART_PERIOD
): Promise<MarketData> {
  const candidates = yahooSymbolCandidates(ticker);

  let lastError: Error | null = null;
  for (const symbol of candidates) {
    try {
      return await fetchMarketDataForSymbol(symbol, period);
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError ?? new Error(`No se pudo obtener datos de mercado para ${ticker}`);
}
