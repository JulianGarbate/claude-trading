"use client";

import { useEffect, useState } from "react";
import { TopAppBar } from "@/components/TopAppBar";
import { PasswordGate } from "@/components/PasswordGate";
import { TickerInput } from "@/components/TickerInput";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SuggestionCard } from "@/components/SuggestionCard";
import { ModelPicker } from "@/components/ModelPicker";
import { authFetch } from "@/lib/api-client";
import { getSelectedModels, setSelectedModels } from "@/lib/model-prefs";
import { DEFAULT_MODEL_IDS } from "@/lib/llm-models";
import type { AnalyzeResult } from "@/lib/types";
import type { PriceTarget } from "@/lib/price-targets-store";

function HomeContent() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [priceTarget, setPriceTarget] = useState<PriceTarget | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>(DEFAULT_MODEL_IDS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lee localStorage, solo puede ejecutarse client-side
    setModels(getSelectedModels());
    authFetch("/api/watchlist")
      .then((res) => (res.ok ? res.json() : { tickers: [] }))
      .then((data) => setWatchlist(data.tickers ?? []));
  }, []);

  function updateModels(ids: string[]) {
    setModels(ids);
    setSelectedModels(ids);
  }

  async function addToWatchlist(ticker: string) {
    const res = await authFetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setWatchlist(data.tickers ?? []);
  }

  async function removeFromWatchlist(ticker: string) {
    const res = await authFetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setWatchlist(data.tickers ?? []);
  }

  async function removePriceTarget(ticker: string) {
    await authFetch("/api/price-targets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    setPriceTarget(null);
  }

  async function analyze(ticker: string, entryPrice?: number) {
    setLoading(true);
    setError(null);
    setResult(null);
    setPriceTarget(null);
    try {
      if (entryPrice) {
        const res = await authFetch("/api/price-targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, entryPrice, models }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error desconocido");
        setResult(data.analysis as AnalyzeResult);
        setPriceTarget(data.target as PriceTarget);
      } else {
        const [analyzeRes, targetRes] = await Promise.all([
          authFetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, models }),
          }),
          authFetch(`/api/price-targets?ticker=${encodeURIComponent(ticker)}`),
        ]);
        const data = await analyzeRes.json();
        if (!analyzeRes.ok) throw new Error(data.error ?? "Error desconocido");
        setResult(data as AnalyzeResult);

        if (targetRes.ok) {
          const targetData = await targetRes.json();
          setPriceTarget(targetData.target ?? null);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopAppBar />
      <main className="pt-11 px-4 max-w-2xl mx-auto space-y-6 pb-12">
        <section className="mt-6 space-y-3">
          <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Sugerencias de trading de corto plazo (días a semanas)
          </p>
          <TickerInput onAnalyze={analyze} onAddToWatchlist={addToWatchlist} loading={loading} />
          <ModelPicker selected={models} onChange={updateModels} />
        </section>

        <section>
          <h2 className="text-base font-semibold text-primary mb-3">Mis Favoritos</h2>
          <WatchlistPanel tickers={watchlist} onSelect={analyze} onRemove={removeFromWatchlist} />
        </section>

        {error && (
          <div className="animate-fade-in-up rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {result && (
          <SuggestionCard result={result} priceTarget={priceTarget} onRemovePriceTarget={removePriceTarget} />
        )}
      </main>
    </>
  );
}

export default function Home() {
  return (
    <PasswordGate>
      <HomeContent />
    </PasswordGate>
  );
}
