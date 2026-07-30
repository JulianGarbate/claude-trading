"use client";

import { useState } from "react";

const COMMON_TICKERS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
  "YPF",
  "GGAL",
  "MELI",
];

interface Props {
  onAnalyze: (ticker: string, entryPrice?: number) => void;
  onAddToWatchlist: (ticker: string) => void;
  loading: boolean;
}

export function TickerInput({ onAnalyze, onAddToWatchlist, loading }: Props) {
  const [value, setValue] = useState("");
  const [showPriceField, setShowPriceField] = useState(false);
  const [entryPrice, setEntryPrice] = useState("");

  function submit() {
    const ticker = value.trim();
    if (!ticker) return;
    const price = Number(entryPrice);
    onAnalyze(ticker, showPriceField && price > 0 ? price : undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Buscar ticker (ej: AAPL, MIRG)..."
            className="w-full h-11 pl-10 pr-4 bg-surface-low border border-outline-variant text-on-surface rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 text-sm outline-none placeholder:text-outline/60"
          />
        </div>
        <button
          onClick={submit}
          disabled={loading}
          className="h-11 px-4 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 motion-safe:active:scale-[0.97] transition-[transform,opacity] duration-150 ease-snappy disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-1.5"
        >
          {loading && <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>}
          {loading ? "Analizando…" : "Analizar"}
        </button>
        <button
          onClick={() => value.trim() && onAddToWatchlist(value.trim())}
          title="Agregar a favoritos"
          className="h-11 w-11 shrink-0 flex items-center justify-center border border-outline-variant rounded-lg text-on-surface-variant hover:border-primary hover:text-primary motion-safe:active:scale-[0.97] transition-[transform,color,border-color] duration-150 ease-snappy"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </div>

      {!value && (
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => setValue(t)}
              className="px-2.5 py-1 rounded-full bg-surface-low border border-outline-variant text-[11px] text-on-surface-variant hover:border-primary hover:text-primary motion-safe:active:scale-95 transition-[transform,color,border-color] duration-150 ease-snappy"
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowPriceField((v) => !v)}
        className="text-[11px] text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors duration-150"
      >
        <span className="material-symbols-outlined text-[14px]">
          {showPriceField ? "expand_less" : "add_circle"}
        </span>
        {showPriceField ? "Ocultar precio objetivo" : "Definir precio objetivo y alertas"}
      </button>

      {showPriceField && (
        <div className="animate-fade-in-up flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-[18px]">payments</span>
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Precio de entrada (ej: 150.50)"
            className="flex-1 h-9 px-3 bg-surface-low border border-outline-variant text-on-surface rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 text-sm outline-none placeholder:text-outline/60"
          />
        </div>
      )}
    </div>
  );
}
