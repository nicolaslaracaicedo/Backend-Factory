import pool from '../config/database';

export interface Establecimiento {
  id: number;
  id_empresa: number;
  codigo: string;
  nombre: string;
  direccion: string | null;
  es_matriz: boolean;
  estado: string;
  created_at: Date;
}

export interface EstablecimientoCreate {
  id_empresa: number;
  codigo: string;
  nombre: string;
  direccion?: string;
  es_matriz?: boolean;
}

export interface EstablecimientoUpdate {
  nombre?: string;
  direccion?: string;
  es_matriz?: boolean;
}

export const EstablecimientoModel = {
  async findAllByEmpresa(empresaId: number, estado?: string): Promise<Establecimiento[]> {
    const filtrar = estado && estado !== 'TODOS';
    const query = filtrar
      ? `SELECT id, codigo, nombre, direccion, es_matriz, estado, created_at
         FROM establecimientos WHERE id_empresa = $1 AND estado = $2 ORDER BY codigo`
      : `SELECT id, codigo, nombre, direccion, es_matriz, estado, created_at
         FROM establecimientos WHERE id_empresa = $1 ORDER BY codigo`;
    const params = filtrar ? [empresaId, estado] : [empresaId];
    const result = await pool.query<Establecimiento>(query, params);
    return result.rows;
  },

  async findById(id: number): Promise<Establecimiento | null> {
    const result = await pool.query<Establecimiento>(
      'SELECT * FROM establecimientos WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByCodigo(empresaId: number, codigo: string): Promise<Establecimiento | null> {
    const result = await pool.query<Establecimiento>(
      'SELECT * FROM establecimientos WHERE id_empresa = $1 AND codigo = $2',
      [empresaId, codigo]
    );
    return result.rows[0] ?? null;
  },

  async create(data: EstablecimientoCreate): Promise<Establecimiento> {
    const result = await pool.query<Establecimiento>(
      `INSERT INTO establecimientos (id_empresa, codigo, nombre, direccion, es_matriz)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.id_empresa, data.codigo, data.nombre, data.direccion ?? null, data.es_matriz ?? false]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: EstablecimientoUpdate): Promise<Establecimiento | null> {
    const campos = Object.keys(data) as (keyof EstablecimientoUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<Establecimiento>(
      `UPDATE establecimientos SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    return result.rows[0] ?? null;
  },

  async quitarMatriz(empresaId: number): Promise<void> {
    await pool.query(
      'UPDATE establecimientos SET es_matriz = FALSE WHERE id_empresa = $1',
      [empresaId]
    );
  },

  async cambiarEstado(id: number, estado: string): Promise<Establecimiento | null> {
    const result = await pool.query<Establecimiento>(
      'UPDATE establecimientos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },
};
