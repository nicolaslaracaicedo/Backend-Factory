import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { AuthModel } from "../models/auth.model";
import { JwtPayload } from "../types/jwt.types";
import { validarCedula, validarRuc, validarEmail, validarPassword, validarTelefono } from "../utils/validators";

export interface LoginInput {
  ruc: string;
  cedula: string;
  clave: string;
}

export interface LoginResult {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    cedula: string;
    empresa: number;
    rol: number;
  };
}

export const AuthService = {
  async login(input: LoginInput): Promise<LoginResult> {
    const { ruc, cedula, clave } = input;

    if (!validarRuc(ruc)) throw new Error('RUC inválido.');
    if (!validarCedula(cedula)) throw new Error('Cédula inválida.');

    // 1. Verificar que la empresa (tenant) existe
    const empresa = await AuthModel.findEmpresaByRuc(ruc);
    if (!empresa) {
      throw new Error("RUC no registrado o empresa inactiva");
    }

    // 2. Verificar que el usuario existe en esa empresa
    const usuario = await AuthModel.findUsuarioByCedulaYEmpresa(
      cedula,
      empresa.id
    );
    if (!usuario) {
      throw new Error("Credenciales inválidas");
    }

    // 3. Verificar la clave
    const claveValida = await bcrypt.compare(clave, usuario.password);
    if (!claveValida) {
      throw new Error("Credenciales inválidas");
    }

    // 4. Registrar último login
    await AuthModel.updateUltimoLogin(usuario.id);

    // 5. Generar JWT con contexto del tenant
    const payload: JwtPayload = {
      usuarioId: usuario.id,
      cedula: usuario.identificacion,
      empresaId: empresa.id,
      ruc: empresa.ruc,
      rol: usuario.id_rol,
    };

    const expiresIn =
      (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        cedula: usuario.identificacion,
        empresa: empresa.id,
        rol: usuario.id_rol,
      },
    };
  },
  async register(data: {
    ruc: string;
    identificacion: string;
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono?: string;
    direccion?: string;
  }) {

  if (!validarRuc(data.ruc)) throw new Error('RUC inválido.');
  if (!validarCedula(data.identificacion)) throw new Error('Cédula inválida.');
  if (!validarEmail(data.email)) throw new Error('Correo electrónico inválido.');
  const { valido, mensaje } = validarPassword(data.password);
  if (!valido) throw new Error(mensaje);
  if (data.telefono && !validarTelefono(data.telefono)) throw new Error('El teléfono debe tener exactamente 10 dígitos.');

  const empresaExistente = await AuthModel.findEmpresaByRuc(data.ruc);
  if (empresaExistente) {
    throw new Error("La empresa ya está registrada");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await AuthModel.register({
    ruc: data.ruc,
    identificacion: data.identificacion,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    password: hashedPassword,
    telefono: data.telefono,
    direccion: data.direccion,
  });

  return {
    message: "Usuario y empresa creados correctamente",
    empresaId: result.empresaId,
    usuarioId: result.usuarioId
  };
}


};