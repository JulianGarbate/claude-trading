import { NextRequest, NextResponse } from "next/server";
import { fetchMarketData, CHART_PERIODS } from "@/lib/market-data";
import { fetchTradingViewSnapshot } from "@/lib/tradingview";
import { getAllPriceTargets, savePriceTarget } from "@/lib/price-targets-store";
import { notify } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const QUICK_PERIOD = CHART_PERIODS.find((p) => p.id === "1d")!;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function getCurrentPrice(ticker: string): Promise<number | null> {
  try {
    const market = await fetchMarketData(ticker, QUICK_PERIOD);
    return market.lastPrice;
  } catch {
    const tv = await fetchTradingViewSnapshot(ticker).catch(() => null);
    return tv?.close ?? null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const targets = await getAllPriceTargets();
  const results: Array<{ ticker: string; currentPrice: number | null; notified: string | null }> = [];

  for (const target of targets) {
    const currentPrice = await getCurrentPrice(target.ticker);
    if (currentPrice === null) {
      results.push({ ticker: target.ticker, currentPrice: null, notified: null });
      continue;
    }

    let notified: string | null = null;

    if (currentPrice >= target.sellTarget && !target.notifiedSell) {
      await notify(
        `🎯 ${target.ticker} alcanzó tu objetivo de venta`,
        `Precio actual: ${currentPrice.toFixed(2)} ${target.currency} (objetivo: ${target.sellTarget.toFixed(2)})`
      );
      target.notifiedSell = true;
      notified = "sell";
    } else if (currentPrice <= target.stopLoss && !target.notifiedStopLoss) {
      await notify(
        `🛑 ${target.ticker} tocó tu stop-loss`,
        `Precio actual: ${currentPrice.toFixed(2)} ${target.currency} (stop-loss: ${target.stopLoss.toFixed(2)})`
      );
      target.notifiedStopLoss = true;
      notified = "stop";
    } else if (target.buyTarget !== null && currentPrice <= target.buyTarget && !target.notifiedBuy) {
      await notify(
        `🔔 ${target.ticker} llegó a tu precio de compra`,
        `Precio actual: ${currentPrice.toFixed(2)} ${target.currency} (objetivo: ${target.buyTarget.toFixed(2)})`
      );
      target.notifiedBuy = true;
      notified = "buy";
    }

    if (notified) await savePriceTarget(target);

    results.push({ ticker: target.ticker, currentPrice, notified });
  }

  return NextResponse.json({ checked: results.length, results });
}
