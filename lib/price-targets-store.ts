import { Redis } from "@upstash/redis";

const KEY_PREFIX = "ptarget:";

export interface PriceTarget {
  ticker: string;
  entryPrice: number;
  buyTarget: number | null;
  sellTarget: number;
  stopLoss: number;
  currency: string;
  createdAt: string;
  notifiedSell?: boolean;
  notifiedStopLoss?: boolean;
  notifiedBuy?: boolean;
}

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function key(ticker: string): string {
  return `${KEY_PREFIX}${ticker.trim().toUpperCase()}`;
}

export async function getPriceTarget(ticker: string): Promise<PriceTarget | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<PriceTarget>(key(ticker))) ?? null;
}

export async function savePriceTarget(target: PriceTarget): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis (Upstash) no configurado");
  await redis.set(key(target.ticker), target);
  await redis.sadd("ptarget:index", target.ticker.trim().toUpperCase());
}

export async function deletePriceTarget(ticker: string): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis (Upstash) no configurado");
  await redis.del(key(ticker));
  await redis.srem("ptarget:index", ticker.trim().toUpperCase());
}

export async function getAllPriceTargets(): Promise<PriceTarget[]> {
  const redis = getRedis();
  if (!redis) return [];
  const tickers = await redis.smembers("ptarget:index");
  if (tickers.length === 0) return [];

  const targets = await Promise.all(tickers.map((t) => redis.get<PriceTarget>(key(t))));
  return targets.filter((t): t is PriceTarget => t !== null);
}
