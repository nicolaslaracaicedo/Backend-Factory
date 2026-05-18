import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { AuthModel } from "../models/auth.model";
import { JwtPayload } from "../types/jwt.types";
import { validarCedula, validarRuc, validarEmail, validarPassword, validarTelefono } from "../utils/validators";
import { enviarCodigoRecuperacion } from "../utils/email.service";

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
    punto_emision_default: {
      id: number;
      codigo: string;
      descripcion: string | null;
    } | null;
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
        punto_emision_default: usuario.id_punto_emision_default
          ? {
              id: usuario.id_punto_emision_default,
              codigo: usuario.punto_emision_default_codigo!,
              descripcion: usuario.punto_emision_default_descripcion ?? null,
            }
          : null,
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
},

  async solicitarRecuperacion(ruc: string, cedula: string): Promise<void> {
    if (!validarRuc(ruc)) throw new Error('RUC inválido.');
    if (!validarCedula(cedula)) throw new Error('Cédula inválida.');

    const empresa = await AuthModel.findEmpresaFullByRuc(ruc);
    if (!empresa) throw new Error('RUC no registrado o empresa inactiva.');

    const usuario = await AuthModel.findUsuarioByCedulaYEmpresa(cedula, empresa.id);
    if (!usuario) throw new Error('No existe un usuario con esa cédula en la empresa indicada.');

    if (!usuario.email) throw new Error('El usuario no tiene correo electrónico registrado.');

    const codigo = String(Math.floor(10000 + Math.random() * 90000));

    await AuthModel.saveCodigoRecuperacion(usuario.id, codigo);

    await enviarCodigoRecuperacion(empresa, {
      correoDestino: usuario.email,
      nombreUsuario: `${usuario.nombre} ${usuario.apellido}`,
      codigo,
    });
  },

  async restablecerContrasena(data: {
    ruc: string;
    cedula: string;
    codigo: string;
    nuevaContrasena: string;
    confirmarContrasena: string;
  }): Promise<void> {
    const { ruc, cedula, codigo, nuevaContrasena, confirmarContrasena } = data;

    if (!validarRuc(ruc)) throw new Error('RUC inválido.');
    if (!validarCedula(cedula)) throw new Error('Cédula inválida.');

    if (nuevaContrasena !== confirmarContrasena)
      throw new Error('Las contraseñas nuevas no coinciden.');

    const { valido, mensaje } = validarPassword(nuevaContrasena);
    if (!valido) throw new Error(mensaje);

    const empresa = await AuthModel.findEmpresaByRuc(ruc);
    if (!empresa) throw new Error('RUC no registrado o empresa inactiva.');

    const usuario = await AuthModel.findUsuarioByCedulaYEmpresa(cedula, empresa.id);
    if (!usuario) throw new Error('No existe un usuario con esa cédula en la empresa indicada.');

    const codigoRegistro = await AuthModel.findCodigoValido(usuario.id, codigo);
    if (!codigoRegistro) throw new Error('Código inválido o expirado.');

    const hashedNueva = await bcrypt.hash(nuevaContrasena, 10);
    await AuthModel.updatePassword(usuario.id, hashedNueva);
    await AuthModel.marcarCodigoUsado(codigoRegistro.id);
  },

  async cambiarContrasena(usuarioId: number, data: {
    contrasenaActual: string;
    contrasenaNueva: string;
    confirmarContrasena: string;
  }): Promise<void> {
    const { contrasenaActual, contrasenaNueva, confirmarContrasena } = data;

    if (contrasenaNueva !== confirmarContrasena) {
      throw new Error('Las contraseñas nuevas no coinciden.');
    }

    const { valido, mensaje } = validarPassword(contrasenaNueva);
    if (!valido) throw new Error(mensaje);

    const usuario = await AuthModel.findUsuarioById(usuarioId);
    if (!usuario) throw new Error('Usuario no encontrado.');

    const contrasenaValida = await bcrypt.compare(contrasenaActual, usuario.password);
    if (!contrasenaValida) throw new Error('La contraseña actual es incorrecta.');

    const hashedNueva = await bcrypt.hash(contrasenaNueva, 10);
    await AuthModel.updatePassword(usuarioId, hashedNueva);
  },

};