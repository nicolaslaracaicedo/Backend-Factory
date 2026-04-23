import pool from '../config/database';

export interface GrupoProducto {
  id: number;
  id_empresa: number;
  nombre: string;
  descripcion: string | null;
  estado: string;
  created_at: Date;
}

export interface GrupoProductoCreate {
  id_empresa: number;
  nombre: string;
  descripcion?: string;
}

export interface GrupoProductoUpdate {
  nombre?: string;
  descripcion?: string;
}

export const GrupoProductoModel = {
  async findAllByEmpresa(empresaId: number, estado?: string): Promise<GrupoProducto[]> {
    const filtrar = estado && estado !== 'TODOS';
    const query = filtrar
      ? `SELECT id, nombre, descripcion, estado, created_at
         FROM grupos_productos WHERE id_empresa = $1 AND estado = $2 ORDER BY nombre`
      : `SELECT id, nombre, descripcion, estado, created_at
         FROM grupos_productos WHERE id_empresa = $1 ORDER BY nombre`;
    const params = filtrar ? [empresaId, estado] : [empresaId];
    const result = await pool.query<GrupoProducto>(query, params);
    return result.rows;
  },

  async findById(id: number): Promise<GrupoProducto | null> {
    const result = await pool.query<GrupoProducto>(
      'SELECT * FROM grupos_productos WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByNombre(empresaId: number, nombre: string): Promise<GrupoProducto | null> {
    const result = await pool.query<GrupoProducto>(
      'SELECT * FROM grupos_productos WHERE id_empresa = $1 AND LOWER(nombre) = LOWER($2)',
      [empresaId, nombre]
    );
    return result.rows[0] ?? null;
  },

  async create(data: GrupoProductoCreate): Promise<GrupoProducto> {
    const result = await pool.query<GrupoProducto>(
      `INSERT INTO grupos_productos (id_empresa, nombre, descripcion)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.id_empresa, data.nombre, data.descripcion ?? null]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: GrupoProductoUpdate): Promise<GrupoProducto | null> {
    const campos = Object.keys(data) as (keyof GrupoProductoUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<GrupoProducto>(
      `UPDATE grupos_productos SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    return result.rows[0] ?? null;
  },

  async cambiarEstado(id: number, estado: string): Promise<GrupoProducto | null> {
    const result = await pool.query<GrupoProducto>(
      'UPDATE grupos_productos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },
};
