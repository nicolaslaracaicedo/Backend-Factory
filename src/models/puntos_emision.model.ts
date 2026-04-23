import pool from '../config/database';

export interface PuntoEmision {
  id: number;
  id_empresa: number;
  id_establecimiento: number;
  codigo: string;
  descripcion: string | null;
  estado: string;
  created_at: Date;
}

export interface PuntoEmisionCreate {
  id_empresa: number;
  id_establecimiento: number;
  codigo: string;
  descripcion?: string;
}

export interface PuntoEmisionUpdate {
  descripcion?: string;
}

export const PuntoEmisionModel = {
  async findAllByEmpresa(empresaId: number, estado?: string): Promise<PuntoEmision[]> {
    const filtrar = estado && estado !== 'TODOS';
    const query = filtrar
      ? `SELECT pe.id, pe.id_empresa, pe.id_establecimiento, pe.codigo, pe.descripcion, pe.estado, pe.created_at,
                e.codigo AS est_codigo, e.nombre AS est_nombre
         FROM puntos_emision pe
         JOIN establecimientos e ON e.id = pe.id_establecimiento
         WHERE pe.id_empresa = $1 AND pe.estado = $2
         ORDER BY e.codigo, pe.codigo`
      : `SELECT pe.id, pe.id_empresa, pe.id_establecimiento, pe.codigo, pe.descripcion, pe.estado, pe.created_at,
                e.codigo AS est_codigo, e.nombre AS est_nombre
         FROM puntos_emision pe
         JOIN establecimientos e ON e.id = pe.id_establecimiento
         WHERE pe.id_empresa = $1
         ORDER BY e.codigo, pe.codigo`;
    const params = filtrar ? [empresaId, estado] : [empresaId];
    const result = await pool.query(query, params);
    return result.rows;
  },

  async findByEstablecimiento(establecimientoId: number, estado?: string): Promise<PuntoEmision[]> {
    const filtrar = estado && estado !== 'TODOS';
    const query = filtrar
      ? `SELECT id, id_empresa, id_establecimiento, codigo, descripcion, estado, created_at
         FROM puntos_emision WHERE id_establecimiento = $1 AND estado = $2 ORDER BY codigo`
      : `SELECT id, id_empresa, id_establecimiento, codigo, descripcion, estado, created_at
         FROM puntos_emision WHERE id_establecimiento = $1 ORDER BY codigo`;
    const params = filtrar ? [establecimientoId, estado] : [establecimientoId];
    const result = await pool.query<PuntoEmision>(query, params);
    return result.rows;
  },

  async findById(id: number): Promise<PuntoEmision | null> {
    const result = await pool.query<PuntoEmision>(
      'SELECT * FROM puntos_emision WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByCodigo(establecimientoId: number, codigo: string): Promise<PuntoEmision | null> {
    const result = await pool.query<PuntoEmision>(
      'SELECT * FROM puntos_emision WHERE id_establecimiento = $1 AND codigo = $2',
      [establecimientoId, codigo]
    );
    return result.rows[0] ?? null;
  },

  async create(data: PuntoEmisionCreate): Promise<PuntoEmision> {
    const result = await pool.query<PuntoEmision>(
      `INSERT INTO puntos_emision (id_empresa, id_establecimiento, codigo, descripcion)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.id_empresa, data.id_establecimiento, data.codigo, data.descripcion ?? null]
    );
    return result.rows[0]!;
  },

  async update(id: number, data: PuntoEmisionUpdate): Promise<PuntoEmision | null> {
    const result = await pool.query<PuntoEmision>(
      'UPDATE puntos_emision SET descripcion = $1 WHERE id = $2 RETURNING *',
      [data.descripcion ?? null, id]
    );
    return result.rows[0] ?? null;
  },

  async cambiarEstado(id: number, estado: string): Promise<PuntoEmision | null> {
    const result = await pool.query<PuntoEmision>(
      'UPDATE puntos_emision SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },
};
