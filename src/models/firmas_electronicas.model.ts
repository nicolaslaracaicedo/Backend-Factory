import pool from '../config/database';

export interface FirmaElectronica {
  id: number;
  id_empresa: number;
  nombre: string | null;
  archivo_p12: string;
  password: string;
  fecha_vencimiento: Date;
  activo: boolean;
  created_at: Date;
}

export interface FirmaCreate {
  id_empresa: number;
  nombre?: string;
  archivo_p12: string;
  password: string;
  fecha_vencimiento: string;
}

export const FirmaModel = {
  async findAllByEmpresa(empresaId: number): Promise<FirmaElectronica[]> {
    const result = await pool.query<FirmaElectronica>(
      `SELECT id, id_empresa, nombre, fecha_vencimiento, activo, created_at
       FROM firmas_electronicas WHERE id_empresa = $1 ORDER BY created_at DESC`,
      [empresaId]
    );
    return result.rows;
  },

  async findActivaByEmpresa(empresaId: number): Promise<FirmaElectronica | null> {
    const result = await pool.query<FirmaElectronica>(
      `SELECT id, id_empresa, nombre, fecha_vencimiento, activo, created_at
       FROM firmas_electronicas WHERE id_empresa = $1 AND activo = TRUE LIMIT 1`,
      [empresaId]
    );
    return result.rows[0] ?? null;
  },

  async findActivaConP12ByEmpresa(empresaId: number): Promise<FirmaElectronica | null> {
    const result = await pool.query<FirmaElectronica>(
      `SELECT id, id_empresa, nombre, archivo_p12, password, fecha_vencimiento, activo, created_at
       FROM firmas_electronicas WHERE id_empresa = $1 AND activo = TRUE LIMIT 1`,
      [empresaId]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: number): Promise<FirmaElectronica | null> {
    const result = await pool.query<FirmaElectronica>(
      `SELECT id, id_empresa, nombre, archivo_p12, password, fecha_vencimiento, activo, created_at
       FROM firmas_electronicas WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async create(data: FirmaCreate): Promise<FirmaElectronica> {
    const result = await pool.query<FirmaElectronica>(
      `INSERT INTO firmas_electronicas (id_empresa, nombre, archivo_p12, password, fecha_vencimiento, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [data.id_empresa, data.nombre ?? null, data.archivo_p12, data.password, data.fecha_vencimiento]
    );
    return result.rows[0]!;
  },

  async replace(id: number, data: Omit<FirmaCreate, 'id_empresa'>): Promise<FirmaElectronica | null> {
    const result = await pool.query<FirmaElectronica>(
      `UPDATE firmas_electronicas
       SET nombre = $1, archivo_p12 = $2, password = $3, fecha_vencimiento = $4
       WHERE id = $5 RETURNING *`,
      [data.nombre ?? null, data.archivo_p12, data.password, data.fecha_vencimiento, id]
    );
    return result.rows[0] ?? null;
  },

  async desactivarTodasDeEmpresa(empresaId: number): Promise<void> {
    await pool.query(
      `UPDATE firmas_electronicas SET activo = FALSE WHERE id_empresa = $1`,
      [empresaId]
    );
  },

  async activar(id: number): Promise<FirmaElectronica | null> {
    const result = await pool.query<FirmaElectronica>(
      `UPDATE firmas_electronicas SET activo = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  },
};
