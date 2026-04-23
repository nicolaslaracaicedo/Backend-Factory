import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/jwt.types";

// Extender Request para incluir el tenant
declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, message: "Token requerido" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    req.usuario = decoded; // 👈 empresaId disponible en todos los endpoints
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token inválido o expirado" });
  }
};