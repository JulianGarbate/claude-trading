import { NextRequest, NextResponse } from "next/server";
import { saveSubscription } from "@/lib/push";

function isAuthorized(req: NextRequest): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return true;
  return req.headers.get("x-app-password") === appPassword;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const subscription = await req.json();
    await saveSubscription(subscription);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "No se pudo guardar la suscripción" },
      { status: 500 }
    );
  }
}
