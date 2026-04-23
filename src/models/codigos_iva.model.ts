import pool from '../config/database';

export interface CodigoIva {
  id: number;
  id_empresa: number;
  codigo: string;
  nombre: string;
  porcentaje: number;
  activo: boolean;
}

export interface CodigoIvaCreate {
  id_empresa: number;
  codigo: string;
  nombre: string;
  porcentaje: number;
}

export interface CodigoIvaUpdate {
  nombre?: string;
  porcentaje?: number;
}

export const CodigoIvaModel = {
  async findAllByEmpresa(empresaId: number, soloActivos = false): Promise<CodigoIva[]> {
    const query = soloActivos
      ? 'SELECT * FROM codigos_iva WHERE id_empresa = $1 AND activo = TRUE ORDER BY codigo'
      : 'SELECT * FROM codigos_iva WHERE id_empresa = $1 ORDER BY codigo';
    const result = await pool.query<CodigoIva>(query, [empresaId]);
    return result.rows;
  },

  async findById(id: number): Promise<CodigoIva | null> {
    const result = await pool.query<CodigoIva>(
      'SELECT * FROM codigos_iva WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByCodigo(empresaId: number, codigo: string): Promise<CodigoIva | null> {
    const result = await pool.query<CodigoIva>(
      'SELECT * FROM codigos_iva WHERE id_empresa = $1 AND codigo = $2',
      [empresaId, codigo]
    );
    return result.rows[0] ?? null;
  },

  async create(data: CodigoIvaCreate): Promise<CodigoIva> {
    const result = await pool.query<CodigoIva>(
      `INSERT INTO codigos_iva (id_empresa, codigo, nombre, porcentaje)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.id_empresa, data.codigo, data.nombre, data.porcentaje]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: CodigoIvaUpdate): Promise<CodigoIva | null> {
    const campos = Object.keys(data) as (keyof CodigoIvaUpdate)[];
    if (campos.length === 0) return null;

    const sets = campos.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
    const valores = campos.map((campo) => data[campo]);

    const result = await pool.query<CodigoIva>(
      `UPDATE codigos_iva SET ${sets} WHERE id = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    return result.rows[0] ?? null;
  },

  async toggleActivo(id: number, activo: boolean): Promise<CodigoIva | null> {
    const result = await pool.query<CodigoIva>(
      'UPDATE codigos_iva SET activo = $1 WHERE id = $2 RETURNING *',
      [activo, id]
    );
    return result.rows[0] ?? null;
  },

  async syncProductosPorcentaje(ivaId: number, porcentaje: number): Promise<number> {
    const result = await pool.query(
      'UPDATE productos SET porcentaje_iva = $1 WHERE id_iva = $2',
      [porcentaje, ivaId]
    );
    return result.rowCount ?? 0;
  },
};
