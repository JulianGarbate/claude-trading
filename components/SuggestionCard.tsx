import type { AnalyzeResult } from "@/lib/types";
import { CandlestickChart } from "@/components/CandlestickChart";

const ACTION_LABEL: Record<string, string> = {
  COMPRAR: "COMPRA",
  VENDER: "VENTA",
  MANTENER: "MANTENER",
};

const ACTION_COLOR: Record<string, string> = {
  COMPRAR: "text-secondary",
  VENDER: "text-error",
  MANTENER: "text-on-surface-variant",
};

function fmt(value: number | null, digits = 2): string {
  return value === null ? "N/D" : value.toFixed(digits);
}

function rsiLabel(rsi: number | null): string {
  if (rsi === null) return "N/D";
  if (rsi < 30) return "SOBREVENTA";
  if (rsi > 70) return "SOBRECOMPRA";
  return "NEUTRAL";
}

function smaTrendLabel(sma20: number | null, sma50: number | null): { label: string; bullish: boolean } {
  if (sma20 === null || sma50 === null) return { label: "N/D", bullish: false };
  return sma20 > sma50 ? { label: "Alcista", bullish: true } : { label: "Bajista", bullish: false };
}

function macdLabel(histogram: number | null): { label: string; bullish: boolean } {
  if (histogram === null) return { label: "N/D", bullish: false };
  return histogram > 0 ? { label: "Momentum +", bullish: true } : { label: "Momentum −", bullish: false };
}

export function SuggestionCard({ result }: { result: AnalyzeResult }) {
  const { suggestion, indicators, news, technicalRating } = result;
  const changePercent = result.changePercent ?? 0;
  const sma = smaTrendLabel(indicators.sma20, indicators.sma50);
  const macd = macdLabel(indicators.macdHistogram);

  const ratingScore = technicalRating?.score ?? 0;
  const ratingPct = Math.max(0, Math.min(100, ((ratingScore + 1) / 2) * 100));

  return (
    <div className="space-y-3">
      {/* Header: ticker + price */}
      <section
        style={{ animationDelay: "0ms" }}
        className="animate-fade-in-up border border-outline-variant p-4 rounded-xl flex justify-between items-end bg-gradient-to-r from-secondary/[0.08] to-transparent"
      >
        <div>
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            {result.ticker}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary tracking-tight">{result.ticker}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-on-surface">
            {result.lastPrice.toFixed(2)} <span className="text-sm font-medium">{result.currency}</span>
          </p>
          <p
            className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
              changePercent >= 0 ? "text-secondary bg-secondary/10" : "text-error bg-error/10"
            }`}
          >
            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%
          </p>
        </div>
      </section>

      {/* Candlestick chart */}
      <section
        style={{ animationDelay: "40ms" }}
        className="animate-fade-in-up bg-surface-container border border-outline-variant p-4 rounded-xl"
      >
        <h3 className="text-[11px] text-on-surface-variant uppercase mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">candlestick_chart</span> Gráfico (6 meses)
        </h3>
        <CandlestickChart prices={result.prices} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* AI Analysis */}
        <section
          style={{ animationDelay: "80ms" }}
          className="animate-fade-in-up bg-surface-high border border-outline-variant p-5 rounded-xl flex flex-col justify-between min-h-[180px]"
        >
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">auto_awesome</span>
                <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Análisis de IA ({suggestion.model})
                </span>
              </div>
              <span className="bg-secondary-container px-2.5 py-1 rounded-full text-[11px] font-mono text-on-secondary-container">
                {suggestion.confidence}% confianza
              </span>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${ACTION_COLOR[suggestion.action] ?? ""}`}>
              {ACTION_LABEL[suggestion.action] ?? suggestion.action}
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">{suggestion.reasoning}</p>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-[width] duration-700 ease-snappy"
              style={{ width: `${suggestion.confidence}%` }}
            />
          </div>
        </section>

        {/* TradingView Rating */}
        <section
          style={{ animationDelay: "80ms" }}
          className="animate-fade-in-up bg-surface-container border border-outline-variant p-5 rounded-xl flex flex-col"
        >
          <h3 className="text-[11px] text-on-surface-variant uppercase mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">speed</span> TradingView Rating
          </h3>
          {technicalRating ? (
            <>
              <div className="flex-grow flex flex-col justify-center items-center py-2">
                <div className="w-full max-w-xs">
                  <div className="w-full bg-surface-container-highest h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-snappy ${
                        ratingScore > 0.1
                          ? "bg-secondary"
                          : ratingScore < -0.1
                            ? "bg-error"
                            : "bg-outline"
                      }`}
                      style={{ width: `${ratingPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-tighter">
                    <span>Venta</span>
                    <span>Neutral</span>
                    <span>Compra</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 p-3 bg-surface-low rounded flex items-center justify-between">
                <span className="text-sm text-on-surface">Calificación actual</span>
                <span className="text-sm font-mono text-secondary">{technicalRating.label.toUpperCase()}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant flex-grow flex items-center">
              No disponible para este ticker.
            </p>
          )}
        </section>
      </div>

      {/* Technical indicators */}
      <section
        style={{ animationDelay: "120ms" }}
        className="animate-fade-in-up bg-surface-container border border-outline-variant p-5 rounded-xl"
      >
        <h3 className="text-[11px] text-on-surface-variant uppercase mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">monitoring</span> Análisis Técnico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 border border-outline-variant rounded flex items-center justify-between bg-surface-low">
            <div>
              <p className="text-[11px] text-on-surface-variant mb-1">RSI (14)</p>
              <p className="font-mono text-on-surface text-lg">{fmt(indicators.rsi14, 1)}</p>
            </div>
            <span className="text-[11px] px-2 py-1 bg-surface-container-highest rounded text-on-surface">
              {rsiLabel(indicators.rsi14)}
            </span>
          </div>
          <div className="p-3 border border-outline-variant rounded flex items-center justify-between bg-surface-low">
            <div>
              <p className="text-[11px] text-on-surface-variant mb-1">SMA 20/50</p>
              <p className={`font-mono text-lg ${sma.bullish ? "text-secondary" : "text-error"}`}>{sma.label}</p>
            </div>
            <span className="material-symbols-outlined text-[20px]" style={{ color: sma.bullish ? "#4edea3" : "#ffb4ab" }}>
              {sma.bullish ? "trending_up" : "trending_down"}
            </span>
          </div>
          <div className="p-3 border border-outline-variant rounded flex items-center justify-between bg-surface-low">
            <div>
              <p className="text-[11px] text-on-surface-variant mb-1">MACD (12,26,9)</p>
              <p className={`font-mono text-lg ${macd.bullish ? "text-secondary" : "text-error"}`}>{macd.label}</p>
            </div>
            <span className="material-symbols-outlined text-[20px]" style={{ color: macd.bullish ? "#4edea3" : "#ffb4ab" }}>
              import_export
            </span>
          </div>
        </div>
      </section>

      {/* News */}
      {news.length > 0 && (
        <section style={{ animationDelay: "160ms" }} className="animate-fade-in-up space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] text-on-surface-variant uppercase">Noticias Recientes</h3>
            <span className="text-[11px] text-primary bg-primary/10 px-2 py-1 rounded">Google News</span>
          </div>
          <div className="space-y-2">
            {news.map((n, i) => (
              <a
                key={n.link}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: `${160 + i * 40}ms` }}
                className="animate-fade-in-up bg-surface-low border border-outline-variant p-3 rounded-lg flex gap-3 hover:bg-surface-container motion-safe:active:scale-[0.99] transition-[transform,background-color] duration-150 ease-snappy"
              >
                <div className="w-9 h-9 shrink-0 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">newspaper</span>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  {n.source && (
                    <span className="text-[11px] text-on-surface-variant mb-0.5">{n.source}</span>
                  )}
                  <p className="text-sm text-on-surface leading-tight line-clamp-2">{n.title}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-on-surface-variant/60 px-1 pt-1">
        Información educativa generada automáticamente. No es asesoramiento financiero profesional.
      </p>
    </div>
  );
}
