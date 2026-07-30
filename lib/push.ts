import webpush from "web-push";
import { Redis } from "@upstash/redis";

const SUBSCRIPTION_KEY = "push:subscription";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys no configuradas");
  webpush.setVapidDetails("mailto:admin@example.com", publicKey, privateKey);
}

export async function saveSubscription(subscription: webpush.PushSubscription): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis (Upstash) no configurado");
  await redis.set(SUBSCRIPTION_KEY, JSON.stringify(subscription));
}

export async function notify(title: string, body: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const raw = await redis.get<string>(SUBSCRIPTION_KEY);
  if (!raw) return;

  configureWebPush();
  const subscription: webpush.PushSubscription = typeof raw === "string" ? JSON.parse(raw) : raw;

  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
  } catch {
    // Suscripción vencida o inválida; se ignora silenciosamente.
  }
}
