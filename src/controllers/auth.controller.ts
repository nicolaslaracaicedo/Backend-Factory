import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export const AuthController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { ruc, cedula, clave } = req.body;

      if (!ruc || !cedula || !clave) {
        res.status(400).json({
          success: false,
          message: "RUC, cédula y clave son requeridos",
        });
        return;
      }

      const resultado = await AuthService.login({ ruc, cedula, clave });

      res.status(200).json({
        success: true,
        message: "Login exitoso",
        data: resultado,
      });
    } catch (error: any) {
      const esErrorDeCredenciales =
        error.message === "Credenciales inválidas" ||
        error.message === "RUC no registrado o empresa inactiva";

      res.status(esErrorDeCredenciales ? 401 : 500).json({
        success: false,
        message: error.message || "Error interno del servidor",
      });
    }
  },
  async register(req: Request, res: Response) {
    try {
      const { ruc, identificacion, nombre, apellido, email, password, confirmPassword, telefono, direccion } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({
          message: "Las contraseñas no coinciden",
        });
      }

      const result = await AuthService.register({
        ruc,
        identificacion,
        nombre,
        apellido,
        email,
        password,
        telefono,
        direccion,
      });

      return res.status(201).json(result);

    } catch (error: any) {
      return res.status(400).json({
        message: error.message || "Error en el registro",
      });
    }
  },

  async cambiarContrasena(req: Request, res: Response): Promise<void> {
    try {
      const { contrasenaActual, contrasenaNueva, confirmarContrasena } = req.body;

      if (!contrasenaActual || !contrasenaNueva || !confirmarContrasena) {
        res.status(400).json({
          success: false,
          message: "Todos los campos son requeridos: contrasenaActual, contrasenaNueva, confirmarContrasena",
        });
        return;
      }

      const usuarioId = req.usuario!.usuarioId;

      await AuthService.cambiarContrasena(usuarioId, {
        contrasenaActual,
        contrasenaNueva,
        confirmarContrasena,
      });

      res.status(200).json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error: any) {
      const esErrorDeCliente =
        error.message === "La contraseña actual es incorrecta." ||
        error.message === "Las contraseñas nuevas no coinciden." ||
        error.message === "Usuario no encontrado.";

      res.status(esErrorDeCliente ? 400 : 500).json({
        success: false,
        message: error.message || "Error interno del servidor",
      });
    }
  },
};