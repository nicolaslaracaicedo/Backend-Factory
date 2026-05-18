import pool from "../config/database";
import type { Empresa as EmpresaCompleta } from "./empresas.model";

export interface Usuario {
  id: number;
  id_empresa: number;
  identificacion: string;
  password: string;
  nombre: string;
  apellido: string;
  email: string | null;
  estado: string;
  id_rol: number;
  id_punto_emision_default: number | null;
  punto_emision_default_codigo: string | null;
  punto_emision_default_descripcion: string | null;
}

export interface Empresa {
  id: number;
  ruc: string;
  nombre_comercial: string;
  estado: string;
}

export interface CodigoRecuperacion {
  id: number;
  id_usuario: number;
  codigo: string;
  expira_en: Date;
  usado: boolean;
  created_at: Date;
}

export const AuthModel = {
  async findEmpresaByRuc(ruc: string): Promise<Empresa | null> {
    const result = await pool.query<Empresa>(
      "SELECT * FROM empresas WHERE ruc = $1 AND estado = 'ACTIVO'",
      [ruc]
    );
    return result.rows[0] || null;
  },

  async findUsuarioByCedulaYEmpresa(
    identificacion: string,
    empresaId: number
  ): Promise<Usuario | null> {
    const result = await pool.query<Usuario>(
      `SELECT u.*, pe.codigo AS punto_emision_default_codigo,
              pe.descripcion AS punto_emision_default_descripcion
       FROM usuarios u
       LEFT JOIN puntos_emision pe ON pe.id = u.id_punto_emision_default
       WHERE u.identificacion = $1 AND u.id_empresa = $2 AND u.estado = 'ACTIVO'`,
      [identificacion, empresaId]
    );
    return result.rows[0] || null;
  },
  async updateUltimoLogin(usuarioId: number): Promise<void> {
    await pool.query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [usuarioId]
    );
  },

  async findUsuarioById(usuarioId: number): Promise<Usuario | null> {
    const result = await pool.query<Usuario>(
      `SELECT * FROM usuarios WHERE id = $1 AND estado = 'ACTIVO'`,
      [usuarioId]
    );
    return result.rows[0] || null;
  },

  async updatePassword(usuarioId: number, hashedPassword: string): Promise<void> {
    await pool.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2',
      [hashedPassword, usuarioId]
    );
  },

  async findEmpresaFullByRuc(ruc: string): Promise<EmpresaCompleta | null> {
    const result = await pool.query<EmpresaCompleta>(
      "SELECT * FROM empresas WHERE ruc = $1 AND estado = 'ACTIVO'",
      [ruc]
    );
    return result.rows[0] || null;
  },

  async saveCodigoRecuperacion(usuarioId: number, codigo: string): Promise<void> {
    await pool.query(
      "UPDATE codigos_recuperacion SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE",
      [usuarioId]
    );
    await pool.query(
      "INSERT INTO codigos_recuperacion (id_usuario, codigo, expira_en) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')",
      [usuarioId, codigo]
    );
  },

  async findCodigoValido(usuarioId: number, codigo: string): Promise<CodigoRecuperacion | null> {
    const result = await pool.query<CodigoRecuperacion>(
      `SELECT * FROM codigos_recuperacion
       WHERE id_usuario = $1 AND codigo = $2 AND usado = FALSE AND expira_en > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [usuarioId, codigo]
    );
    return result.rows[0] || null;
  },

  async marcarCodigoUsado(codigoId: number): Promise<void> {
    await pool.query(
      "UPDATE codigos_recuperacion SET usado = TRUE WHERE id = $1",
      [codigoId]
    );
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Crear empresa
    const empresaResult = await client.query(
      `INSERT INTO empresas (ruc, estado)
       VALUES ($1, 'ACTIVO')
       RETURNING id`,
      [data.ruc]
    );

    const empresaId = empresaResult.rows[0].id;

    // 2. Crear usuario ADMIN
    const usuarioResult = await client.query(
      `INSERT INTO usuarios
       (id_empresa, id_rol, identificacion, nombre, apellido, email, password, telefono, direccion, estado, tipo_identificacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVO', '05')
       RETURNING id`,
      [
        empresaId,
        1, // ADMIN
        data.identificacion,
        data.nombre,
        data.apellido,
        data.email,
        data.password,
        data.telefono ?? null,
        data.direccion ?? null,
      ]
    );

    await client.query("COMMIT");

    return {
      empresaId,
      usuarioId: usuarioResult.rows[0].id
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
};