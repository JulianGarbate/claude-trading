import type { IndicatorSnapshot } from "./indicators";
import type { NewsItem } from "./news";
import type { TradingSuggestion } from "./llm";
import type { PricePoint } from "./market-data";

export interface TechnicalRating {
  score: number;
  label: string;
}

export interface AnalyzeResult {
  ticker: string;
  currency: string;
  lastPrice: number;
  changePercent: number;
  prices: PricePoint[];
  indicators: IndicatorSnapshot;
  news: NewsItem[];
  suggestion: TradingSuggestion;
  technicalRating: TechnicalRating | null;
  timestamp: string;
}
