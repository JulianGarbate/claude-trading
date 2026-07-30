import { NextRequest, NextResponse } from "next/server";
import { getWatchlist } from "@/lib/watchlist-store";
import { analyzeTicker } from "@/lib/analyze";
import { notify } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONFIDENCE_THRESHOLD = 65;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tickers = await getWatchlist();
  const results: Array<{ ticker: string; action: string; confidence: number; notified: boolean }> = [];

  for (const ticker of tickers) {
    try {
      const result = await analyzeTicker(ticker);
      const { action, confidence, reasoning } = result.suggestion;
      const shouldNotify = action !== "MANTENER" && confidence >= CONFIDENCE_THRESHOLD;

      if (shouldNotify) {
        await notify(`${ticker}: ${action}`, reasoning.slice(0, 140));
      }

      results.push({ ticker, action, confidence, notified: shouldNotify });
    } catch (err) {
      results.push({ ticker, action: "ERROR", confidence: 0, notified: false });
      console.error(`Error analizando ${ticker} en cron:`, err);
    }
  }

  return NextResponse.json({ scanned: results.length, results });
}
