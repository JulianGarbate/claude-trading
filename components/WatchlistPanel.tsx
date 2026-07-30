"use client";

interface Props {
  tickers: string[];
  onSelect: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}

export function WatchlistPanel({ tickers, onSelect, onRemove }: Props) {
  if (tickers.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        Tu watchlist está vacía. Agregá un ticker desde el buscador.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {tickers.map((ticker, i) => (
        <div
          key={ticker}
          onClick={() => onSelect(ticker)}
          style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
          className="animate-fade-in-up bg-surface-low border border-outline-variant p-4 rounded-lg hover:bg-surface-container hover:border-primary/40 cursor-pointer motion-safe:active:scale-[0.97] transition-[transform,background-color,border-color] duration-150 ease-snappy relative group"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(ticker);
            }}
            title={`Quitar ${ticker}`}
            className="absolute top-2 right-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
          <span className="text-lg font-bold text-on-surface tracking-tight block">{ticker}</span>
          <span className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[14px]">bar_chart</span>
            Analizar
          </span>
        </div>
      ))}
    </div>
  );
}
