import Redis from 'ioredis';

let client: Redis | null = null;
let available = false;

export function initRedis(): void {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableReadyCheck: false,
  });

  client.on('connect', () => {
    available = true;
    console.log('Redis conectado.');
  });

  client.on('error', (err: Error) => {
    if (available) console.warn('Redis error:', err.message);
    available = false;
  });

  client.on('close', () => { available = false; });

  client.connect().catch((err: Error) => {
    console.warn(`Redis no disponible (${err.message}). Continuando sin caché.`);
  });
}

export function getRedis(): Redis | null {
  return available ? client : null;
}
