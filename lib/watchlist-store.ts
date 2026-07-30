import { Redis } from "@upstash/redis";

const WATCHLIST_KEY = "watchlist:tickers";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function getWatchlist(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  const tickers = await redis.smembers(WATCHLIST_KEY);
  return tickers.sort();
}

export async function addTicker(ticker: string): Promise<string[]> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis (Upstash) no configurado");
  const upper = ticker.trim().toUpperCase();
  if (upper) await redis.sadd(WATCHLIST_KEY, upper);
  return getWatchlist();
}

export async function removeTicker(ticker: string): Promise<string[]> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis (Upstash) no configurado");
  await redis.srem(WATCHLIST_KEY, ticker.trim().toUpperCase());
  return getWatchlist();
}
