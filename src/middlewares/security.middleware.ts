import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

// ─────────────────────────────────────────────────────────
// A07 · Rate limiting global — 200 req / 15 min por IP
// ─────────────────────────────────────────────────────────
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.' },
  skip: (req) => req.method === 'OPTIONS',
});

// A07 · Rate limiting estricto para endpoints de autenticación — 10 req / 15 min por IP
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intente de nuevo en 15 minutos.' },
});

// A07 · Rate limiting para reenvío de correos — 3 req / hora por IP
export const emailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes de reenvío. Intente en 1 hora.' },
});

// ─────────────────────────────────────────────────────────
// A03 · Sanitización de inputs — elimina caracteres peligrosos
// Previene XSS en campos de texto que llegan en el body
// ─────────────────────────────────────────────────────────
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitized[k] = sanitizeValue(v);
    }
    return sanitized;
  }
  return value;
}

export function xssSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      req.query[key] = sanitizeValue(req.query[key]) as typeof req.query[string];
    }
  }
  next();
}

// ─────────────────────────────────────────────────────────
// A03 · Prevención de contaminación de parámetros HTTP
// ─────────────────────────────────────────────────────────
export const hppProtection = hpp();

// ─────────────────────────────────────────────────────────
// A05 · Validación de Content-Type en métodos con body
// ─────────────────────────────────────────────────────────
export function contentTypeGuard(req: Request, res: Response, next: NextFunction): void {
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  if (methodsWithBody.includes(req.method)) {
    const ct = req.headers['content-type'] ?? '';
    if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
      res.status(415).json({ success: false, message: 'Content-Type no soportado. Use application/json.' });
      return;
    }
  }
  next();
}

// ─────────────────────────────────────────────────────────
// A09 · Logger de seguridad — registra eventos relevantes
// ─────────────────────────────────────────────────────────
export function securityLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const ms      = Date.now() - start;
    const status  = res.statusCode;
    const ts      = new Date().toISOString();

    // Registra fallos de autenticación y autorización
    if (status === 401 || status === 403) {
      console.warn(`[SECURITY] ${ts} | ${status} | ${method} ${originalUrl} | IP: ${ip} | ${ms}ms`);
      return;
    }
    // Registra errores de servidor
    if (status >= 500) {
      console.error(`[ERROR]    ${ts} | ${status} | ${method} ${originalUrl} | IP: ${ip} | ${ms}ms`);
      return;
    }
    // Log normal en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[HTTP]     ${ts} | ${status} | ${method} ${originalUrl} | ${ms}ms`);
    }
  });

  next();
}
