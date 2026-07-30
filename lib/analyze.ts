import { fetchMarketData, type MarketData } from "./market-data";
import { computeIndicators, type IndicatorSnapshot } from "./indicators";
import { fetchNews } from "./news";
import { generateSuggestions, SuggestionUnavailableError, type TradingSuggestion } from "./llm";
import { fetchTradingViewSnapshot, describeRecommendation } from "./tradingview";
import type { AnalyzeResult, TechnicalRating } from "./types";

function tvRecommendationSignal(recommendAll: number): string {
  return `TradingView: calificación técnica "${describeRecommendation(recommendAll)}" (score ${recommendAll.toFixed(2)})`;
}

export async function analyzeTicker(ticker: string, entryPrice?: number): Promise<AnalyzeResult> {
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

  let suggestions: TradingSuggestion[] = [];
  let suggestionError: string | null = null;
  try {
    suggestions = await generateSuggestions(market, indicators, news, entryPrice);
  } catch (err) {
    suggestionError =
      err instanceof SuggestionUnavailableError
        ? "Te quedaste sin cuota de IA por hoy. El precio, el gráfico y los indicadores siguen disponibles — la sugerencia de la IA vuelve a estar disponible mañana."
        : (err as Error).message;
  }

  return {
    ticker: market.ticker,
    currency: market.currency,
    lastPrice: market.lastPrice,
    changePercent: market.changePercent,
    prices: market.prices,
    indicators,
    news,
    suggestions,
    suggestionError,
    technicalRating,
    timestamp: new Date().toISOString(),
  };
}
