import { Request, Response, NextFunction } from 'express';

export const ROLES = {
  ADMIN: 1,
  FACTURADOR: 2,
  CONTADOR: 3,
} as const;

export const requireRol = (...roles: number[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: 'No autenticado.' });
      return;
    }
    if (!roles.includes(req.usuario.rol)) {
      res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción.' });
      return;
    }
    next();
  };

// Atajos reutilizables en las rutas
export const soloAdmin        = requireRol(ROLES.ADMIN);
export const adminYFacturador = requireRol(ROLES.ADMIN, ROLES.FACTURADOR);
export const todosLosRoles    = requireRol(ROLES.ADMIN, ROLES.FACTURADOR, ROLES.CONTADOR);
