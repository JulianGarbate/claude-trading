import { NextRequest, NextResponse } from "next/server";
import { addTicker, getWatchlist, removeTicker } from "@/lib/watchlist-store";

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
  const tickers = await getWatchlist();
  return NextResponse.json({ tickers });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { ticker } = await req.json();
    if (!ticker) return NextResponse.json({ error: "Falta el ticker" }, { status: 400 });
    const tickers = await addTicker(ticker);
    return NextResponse.json({ tickers });
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
    const tickers = await removeTicker(ticker);
    return NextResponse.json({ tickers });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
