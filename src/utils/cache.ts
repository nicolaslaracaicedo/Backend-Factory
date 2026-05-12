import { getRedis } from '../config/redis';

export const TTL = {
  EMPRESA:  300,   // 5 min — cambia muy raramente
  PRODUCTO: 300,   // 5 min
  CLIENTE:  120,   // 2 min
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    const raw = await r.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // nunca romper la app por un error de caché
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const r = getRedis();
    if (!r || keys.length === 0) return;
    await r.del(...keys);
  } catch {
    // silent
  }
}
