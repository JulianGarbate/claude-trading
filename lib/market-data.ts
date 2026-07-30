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

export async function fetchMarketData(ticker: string): Promise<MarketData> {
  const symbol = ticker.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=6mo&interval=1d`;

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
      date: new Date(ts * 1000).toISOString().slice(0, 10),
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
