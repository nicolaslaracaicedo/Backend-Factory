import pool from '../config/database';

export interface Usuario {
  id: number;
  id_empresa: number;
  id_rol: number;
  tipo_identificacion: string;
  identificacion: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  direccion: string | null;
  email: string;
  estado: string;
  ultimo_login: Date | null;
  id_punto_emision_default: number | null;
  created_at: Date;
  updated_at: Date;
  rol_nombre?: string;
  punto_emision_default_codigo?: string | null;
  punto_emision_default_descripcion?: string | null;
}

export interface UsuarioCreateData {
  id_empresa: number;
  id_rol: number;
  tipo_identificacion: string;
  identificacion: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string | null;
  direccion?: string | null;
  id_punto_emision_default?: number | null;
}

export interface UsuarioUpdateData {
  id_rol: number;
  tipo_identificacion: string;
  identificacion: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  password?: string;
  id_punto_emision_default?: number | null;
}

export const UsuarioModel = {
  async findAllByEmpresa(empresaId: number): Promise<Usuario[]> {
    const result = await pool.query<Usuario>(
      `SELECT u.id, u.id_empresa, u.id_rol, u.tipo_identificacion, u.identificacion,
              u.nombre, u.apellido, u.telefono, u.direccion, u.email,
              u.estado, u.ultimo_login, u.id_punto_emision_default, u.created_at, u.updated_at,
              r.nombre AS rol_nombre,
              pe.codigo AS punto_emision_default_codigo,
              pe.descripcion AS punto_emision_default_descripcion
       FROM usuarios u
       JOIN roles r ON r.id = u.id_rol
       LEFT JOIN puntos_emision pe ON pe.id = u.id_punto_emision_default
       WHERE u.id_empresa = $1
       ORDER BY u.nombre ASC`,
      [empresaId]
    );
    return result.rows;
  },

  async findById(id: number, empresaId: number): Promise<Usuario | null> {
    const result = await pool.query<Usuario>(
      `SELECT u.id, u.id_empresa, u.id_rol, u.tipo_identificacion, u.identificacion,
              u.nombre, u.apellido, u.telefono, u.direccion, u.email,
              u.estado, u.ultimo_login, u.id_punto_emision_default, u.created_at, u.updated_at,
              r.nombre AS rol_nombre,
              pe.codigo AS punto_emision_default_codigo,
              pe.descripcion AS punto_emision_default_descripcion
       FROM usuarios u
       JOIN roles r ON r.id = u.id_rol
       LEFT JOIN puntos_emision pe ON pe.id = u.id_punto_emision_default
       WHERE u.id = $1 AND u.id_empresa = $2`,
      [id, empresaId]
    );
    return result.rows[0] ?? null;
  },

  async findByEmail(email: string, empresaId: number, excludeId?: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM usuarios WHERE email = $1 AND id_empresa = $2 AND ($3::int IS NULL OR id != $3)`,
      [email, empresaId, excludeId ?? null]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async findByIdentificacion(identificacion: string, empresaId: number, excludeId?: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM usuarios WHERE identificacion = $1 AND id_empresa = $2 AND ($3::int IS NULL OR id != $3)`,
      [identificacion, empresaId, excludeId ?? null]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async create(data: UsuarioCreateData): Promise<Usuario> {
    const result = await pool.query<Usuario>(
      `INSERT INTO usuarios
         (id_empresa, id_rol, tipo_identificacion, identificacion, nombre, apellido, email, password, telefono, direccion, estado, id_punto_emision_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVO',$11)
       RETURNING id, id_empresa, id_rol, tipo_identificacion, identificacion,
                 nombre, apellido, telefono, direccion, email, estado, ultimo_login, id_punto_emision_default, created_at, updated_at`,
      [
        data.id_empresa, data.id_rol, data.tipo_identificacion, data.identificacion,
        data.nombre, data.apellido, data.email, data.password,
        data.telefono ?? null, data.direccion ?? null,
        data.id_punto_emision_default ?? null,
      ]
    );
    return result.rows[0]!;
  },

  async update(id: number, empresaId: number, data: UsuarioUpdateData): Promise<Usuario | null> {
    const fields: string[] = [
      'id_rol = $1', 'tipo_identificacion = $2', 'identificacion = $3',
      'nombre = $4', 'apellido = $5', 'email = $6',
      'telefono = $7', 'direccion = $8',
      'id_punto_emision_default = $9', 'updated_at = NOW()',
    ];
    const params: unknown[] = [
      data.id_rol, data.tipo_identificacion, data.identificacion,
      data.nombre, data.apellido, data.email,
      data.telefono ?? null, data.direccion ?? null,
      data.id_punto_emision_default ?? null,
    ];

    if (data.password) {
      fields.push(`password = $${params.length + 1}`);
      params.push(data.password);
    }

    params.push(id, empresaId);
    const whereIdx = params.length;

    const result = await pool.query<Usuario>(
      `UPDATE usuarios SET ${fields.join(', ')}
       WHERE id = $${whereIdx - 1} AND id_empresa = $${whereIdx}
       RETURNING id, id_empresa, id_rol, tipo_identificacion, identificacion,
                 nombre, apellido, telefono, direccion, email, estado, ultimo_login,
                 id_punto_emision_default, created_at, updated_at`,
      params
    );
    return result.rows[0] ?? null;
  },

  async cambiarEstado(id: number, empresaId: number, estado: string): Promise<Usuario | null> {
    const result = await pool.query<Usuario>(
      `UPDATE usuarios SET estado = $1, updated_at = NOW()
       WHERE id = $2 AND id_empresa = $3
       RETURNING id, id_empresa, id_rol, tipo_identificacion, identificacion,
                 nombre, apellido, telefono, direccion, email, estado, ultimo_login, created_at, updated_at`,
      [estado, id, empresaId]
    );
    return result.rows[0] ?? null;
  },

  async findRol(id_rol: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM roles WHERE id = $1 AND activo = TRUE',
      [id_rol]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
