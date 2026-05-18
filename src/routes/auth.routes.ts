import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.put("/cambiar-contrasena", authMiddleware, AuthController.cambiarContrasena);
router.post("/solicitar-recuperacion", AuthController.solicitarRecuperacion);
router.post("/restablecer-contrasena", AuthController.restablecerContrasena);

export default router;