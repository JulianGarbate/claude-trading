import { NextRequest, NextResponse } from "next/server";
import { analyzeTicker } from "@/lib/analyze";
import {
  deletePriceTarget,
  getPriceTarget,
  savePriceTarget,
  type PriceTarget,
} from "@/lib/price-targets-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return true;
  return req.headers.get("x-app-password") === appPassword;
}

function average(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ticker = req.nextUrl.searchParams.get("ticker")?.trim();
  if (!ticker) return NextResponse.json({ error: "Falta el ticker" }, { status: 400 });

  const target = await getPriceTarget(ticker);
  return NextResponse.json({ target });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let ticker: string;
  let entryPrice: number;
  try {
    const body = await req.json();
    ticker = String(body.ticker ?? "").trim();
    entryPrice = Number(body.entryPrice);
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!ticker || !entryPrice || entryPrice <= 0) {
    return NextResponse.json({ error: "Falta ticker o precio de entrada válido" }, { status: 400 });
  }

  try {
    const result = await analyzeTicker(ticker, entryPrice);

    const sellTarget = average(result.suggestions.map((s) => s.sellTarget));
    const stopLoss = average(result.suggestions.map((s) => s.stopLoss));
    const buyTarget = average(result.suggestions.map((s) => s.buyTarget));

    if (sellTarget === null || stopLoss === null) {
      return NextResponse.json(
        { error: "La IA no pudo calcular niveles de precio para este ticker. Probá de nuevo.", analysis: result },
        { status: 502 }
      );
    }

    const target: PriceTarget = {
      ticker: result.ticker,
      entryPrice,
      buyTarget,
      sellTarget,
      stopLoss,
      currency: result.currency,
      createdAt: new Date().toISOString(),
    };

    await savePriceTarget(target);

    return NextResponse.json({ target, analysis: result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: "Falta el ticker" }, { status: 400 });
    await deletePriceTarget(ticker);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
