import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authRateLimit, emailRateLimit } from "../middlewares/security.middleware";

const router = Router();

// A07 · Rate limit estricto en todos los endpoints de autenticación
router.post("/login",                 authRateLimit,  AuthController.login);
router.post("/register",              authRateLimit,  AuthController.register);
router.post("/verificar-email",       authRateLimit,  AuthController.verificarEmail);
router.post("/reenviar-verificacion", emailRateLimit, AuthController.reenviarVerificacion);
router.post("/solicitar-recuperacion",authRateLimit,  AuthController.solicitarRecuperacion);
router.post("/restablecer-contrasena",authRateLimit,  AuthController.restablecerContrasena);
router.put("/cambiar-contrasena",     authMiddleware, AuthController.cambiarContrasena);

export default router;