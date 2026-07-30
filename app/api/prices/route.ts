import { NextRequest, NextResponse } from "next/server";
import { fetchMarketData, CHART_PERIODS } from "@/lib/market-data";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return true;
  return req.headers.get("x-app-password") === appPassword;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ticker = req.nextUrl.searchParams.get("ticker")?.trim();
  const periodId = req.nextUrl.searchParams.get("period") ?? "3mo";
  const period = CHART_PERIODS.find((p) => p.id === periodId);

  if (!ticker) {
    return NextResponse.json({ error: "Falta el ticker" }, { status: 400 });
  }
  if (!period) {
    return NextResponse.json({ error: `Período inválido: ${periodId}` }, { status: 400 });
  }

  try {
    const market = await fetchMarketData(ticker, period);
    return NextResponse.json({ prices: market.prices });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
