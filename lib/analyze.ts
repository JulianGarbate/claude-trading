import { fetchMarketData, type MarketData } from "./market-data";
import { computeIndicators, type IndicatorSnapshot } from "./indicators";
import { fetchNews } from "./news";
import { generateSuggestion } from "./llm";
import { fetchTradingViewSnapshot, describeRecommendation } from "./tradingview";
import type { AnalyzeResult, TechnicalRating } from "./types";

function tvRecommendationSignal(recommendAll: number): string {
  return `TradingView: calificación técnica "${describeRecommendation(recommendAll)}" (score ${recommendAll.toFixed(2)})`;
}

export async function analyzeTicker(ticker: string): Promise<AnalyzeResult> {
  let market: MarketData;
  let indicators: IndicatorSnapshot;
  let technicalRating: TechnicalRating | null = null;

  try {
    market = await fetchMarketData(ticker);
    indicators = computeIndicators(market.prices.map((p) => p.close));

    const tv = await fetchTradingViewSnapshot(ticker).catch(() => null);
    if (tv?.recommendAll !== null && tv?.recommendAll !== undefined) {
      indicators.signals.push(tvRecommendationSignal(tv.recommendAll));
      technicalRating = { score: tv.recommendAll, label: describeRecommendation(tv.recommendAll) };
    }
  } catch (yahooError) {
    const tv = await fetchTradingViewSnapshot(ticker);
    if (!tv) throw yahooError;

    market = {
      ticker: tv.tvSymbol,
      currency: tv.currency,
      prices: [],
      lastPrice: tv.close,
      changePercent: tv.changePercent,
    };

    indicators = {
      rsi14: tv.rsi14,
      sma20: tv.sma20,
      sma50: tv.sma50,
      ema12: null,
      ema26: null,
      macd: tv.macd,
      macdSignal: tv.macdSignal,
      macdHistogram: tv.macd !== null && tv.macdSignal !== null ? tv.macd - tv.macdSignal : null,
      signals: [
        `Datos de mercado de TradingView (${tv.exchange}) — sin cobertura en Yahoo Finance para este ticker`,
      ],
    };

    if (tv.recommendAll !== null) {
      indicators.signals.push(tvRecommendationSignal(tv.recommendAll));
      technicalRating = { score: tv.recommendAll, label: describeRecommendation(tv.recommendAll) };
    }
  }

  const news = await fetchNews(ticker, 5);
  const suggestion = await generateSuggestion(market, indicators, news);

  return {
    ticker: market.ticker,
    currency: market.currency,
    lastPrice: market.lastPrice,
    changePercent: market.changePercent,
    prices: market.prices,
    indicators,
    news,
    suggestion,
    technicalRating,
    timestamp: new Date().toISOString(),
  };
}
