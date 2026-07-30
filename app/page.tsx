"use client";

import { useEffect, useState } from "react";
import { TopAppBar } from "@/components/TopAppBar";
import { PasswordGate } from "@/components/PasswordGate";
import { TickerInput } from "@/components/TickerInput";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SuggestionCard } from "@/components/SuggestionCard";
import { authFetch } from "@/lib/api-client";
import type { AnalyzeResult } from "@/lib/types";

function HomeContent() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/watchlist")
      .then((res) => (res.ok ? res.json() : { tickers: [] }))
      .then((data) => setWatchlist(data.tickers ?? []));
  }, []);

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

  async function analyze(ticker: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await authFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setResult(data as AnalyzeResult);
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
        <section className="mt-6">
          <TickerInput onAnalyze={analyze} onAddToWatchlist={addToWatchlist} loading={loading} />
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

        {result && <SuggestionCard result={result} />}
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
