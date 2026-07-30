"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { CHART_PERIODS, DEFAULT_CHART_PERIOD, type PricePoint } from "@/lib/market-data";
import { smaSeries } from "@/lib/indicators";
import type { TradingSuggestion } from "@/lib/llm";
import type { PriceTarget } from "@/lib/price-targets-store";
import { authFetch } from "@/lib/api-client";

const SMA20_COLOR = "#8ed5ff";
const SMA50_COLOR = "#f5a623";

const ACTION_MARKER: Record<
  TradingSuggestion["action"],
  { text: string; color: string; position: "aboveBar" | "belowBar"; shape: "arrowUp" | "arrowDown" | "circle" }
> = {
  COMPRAR: { text: "COMPRA", color: "#4edea3", position: "belowBar", shape: "arrowUp" },
  VENDER: { text: "VENTA", color: "#ffb4ab", position: "aboveBar", shape: "arrowDown" },
  MANTENER: { text: "MANTENER", color: "#bdc8d1", position: "aboveBar", shape: "circle" },
};

interface Props {
  ticker: string;
  prices: PricePoint[];
  suggestion?: TradingSuggestion | null;
  priceTarget?: PriceTarget | null;
}

export function CandlestickChart({ ticker, prices: initialPrices, suggestion, priceTarget }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [periodId, setPeriodId] = useState(DEFAULT_CHART_PERIOD.id);
  const [prices, setPrices] = useState(initialPrices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectPeriod(id: string) {
    if (id === periodId) return;
    setPeriodId(id);
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/prices?ticker=${encodeURIComponent(ticker)}&period=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el período");
      setPrices(data.prices ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || prices.length === 0) return;

    const period = CHART_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_CHART_PERIOD;
    const intraday = period.range === "1d" || period.range === "5d";

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 280,
      layout: {
        background: { color: "transparent" },
        textColor: "#bdc8d1",
        fontFamily: "var(--font-inter), sans-serif",
      },
      grid: {
        vertLines: { color: "#3e484f33" },
        horzLines: { color: "#3e484f33" },
      },
      rightPriceScale: { borderColor: "#3e484f" },
      timeScale: { borderColor: "#3e484f", timeVisible: intraday, secondsVisible: false },
      crosshair: { mode: 0 },
    });

    const times = prices.map((p) => (new Date(p.date).getTime() / 1000) as UTCTimestamp);
    const closes = prices.map((p) => p.close);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#4edea3",
      downColor: "#ffb4ab",
      borderVisible: false,
      wickUpColor: "#4edea3",
      wickDownColor: "#ffb4ab",
    });

    candleSeries.setData(
      prices.map((p, i) => ({
        time: times[i],
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }))
    );

    // Medias móviles: la razón visual del "cruce alcista/bajista" que cita la IA.
    const sma20Line = chart.addSeries(LineSeries, {
      color: SMA20_COLOR,
      lineWidth: 2,
      title: "SMA20",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    sma20Line.setData(
      smaSeries(closes, 20)
        .map((v, i) => (v === null ? null : { time: times[i], value: v }))
        .filter((p): p is { time: UTCTimestamp; value: number } => p !== null)
    );

    const sma50Line = chart.addSeries(LineSeries, {
      color: SMA50_COLOR,
      lineWidth: 2,
      title: "SMA50",
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    sma50Line.setData(
      smaSeries(closes, 50)
        .map((v, i) => (v === null ? null : { time: times[i], value: v }))
        .filter((p): p is { time: UTCTimestamp; value: number } => p !== null)
    );

    // Marcador con la señal sugerida por la IA, sobre la última vela.
    if (suggestion) {
      const marker = ACTION_MARKER[suggestion.action];
      createSeriesMarkers(candleSeries, [
        {
          time: times[times.length - 1],
          position: marker.position,
          color: marker.color,
          shape: marker.shape,
          text: marker.text,
        },
      ]);
    }

    // Niveles de precio objetivo cargados por el usuario.
    if (priceTarget) {
      candleSeries.createPriceLine({
        price: priceTarget.entryPrice,
        color: "#bdc8d1",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Entrada",
      });
      candleSeries.createPriceLine({
        price: priceTarget.sellTarget,
        color: "#4edea3",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Objetivo venta",
      });
      candleSeries.createPriceLine({
        price: priceTarget.stopLoss,
        color: "#ffb4ab",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Stop-loss",
      });
      if (priceTarget.buyTarget !== null) {
        candleSeries.createPriceLine({
          price: priceTarget.buyTarget,
          color: "#8ed5ff",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: "Objetivo compra",
        });
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [prices, suggestion, periodId, priceTarget]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SMA20_COLOR }} />
            SMA20
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SMA50_COLOR }} />
            SMA50
          </span>
          {priceTarget && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-secondary" />
                Objetivo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-error" />
                Stop-loss
              </span>
            </>
          )}
        </div>
        <div className="flex gap-1">
          {CHART_PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPeriod(p.id)}
              disabled={loading}
              className={`px-2 py-1 rounded text-[11px] font-semibold motion-safe:active:scale-95 transition-[transform,background-color,color] duration-150 ease-snappy disabled:opacity-50 ${
                periodId === p.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-low text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-error mb-2">{error}</p>}

      {prices.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-on-surface-variant border border-outline-variant rounded-lg bg-surface-low">
          Sin datos históricos disponibles para graficar este ticker.
        </div>
      ) : (
        <div ref={containerRef} className="w-full" />
      )}
    </div>
  );
}
