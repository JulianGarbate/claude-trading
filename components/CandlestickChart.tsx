"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { PricePoint } from "@/lib/market-data";

export function CandlestickChart({ prices }: { prices: PricePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || prices.length === 0) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 260,
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
      timeScale: { borderColor: "#3e484f", timeVisible: false },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#4edea3",
      downColor: "#ffb4ab",
      borderVisible: false,
      wickUpColor: "#4edea3",
      wickDownColor: "#ffb4ab",
    });

    series.setData(
      prices.map((p) => ({
        time: (new Date(p.date).getTime() / 1000) as UTCTimestamp,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }))
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [prices]);

  if (prices.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-on-surface-variant border border-outline-variant rounded-lg bg-surface-low">
        Sin datos históricos disponibles para graficar este ticker.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}
