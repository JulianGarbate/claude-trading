import { NextRequest, NextResponse } from "next/server";
import { analyzeTicker } from "@/lib/analyze";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return true;
  return req.headers.get("x-app-password") === appPassword;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let ticker: string;
  try {
    const body = await req.json();
    ticker = String(body.ticker ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!ticker) {
    return NextResponse.json({ error: "Falta el ticker" }, { status: 400 });
  }

  try {
    const result = await analyzeTicker(ticker);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Error inesperado" },
      { status: 500 }
    );
  }
}
