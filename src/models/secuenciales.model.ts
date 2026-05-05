import pool from '../config/database';

export interface TipoDocumento {
  codigo: string;
  nombre: string;
}

export interface Secuencial {
  id: number;
  id_empresa: number;
  id_punto_emision: number;
  tipo_documento: string;
  ambiente: number;
  secuencial_actual: number;
  estado: string;
  updated_at: Date;
}

export interface SecuencialCreate {
  id_empresa: number;
  id_punto_emision: number;
  tipo_documento: string;
  ambiente: number;
}

export const SecuencialModel = {
  async findAllByEmpresa(empresaId: number, filtros: { estado?: string; ambiente?: number; tipo_documento?: string }): Promise<Secuencial[]> {
    const condiciones: string[] = ['s.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado && filtros.estado !== 'TODOS') {
      condiciones.push(`s.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.ambiente) {
      condiciones.push(`s.ambiente = $${idx++}`);
      params.push(filtros.ambiente);
    }
    if (filtros.tipo_documento) {
      condiciones.push(`s.tipo_documento = $${idx++}`);
      params.push(filtros.tipo_documento);
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT s.id, s.id_empresa, s.id_punto_emision, s.tipo_documento, s.ambiente,
              s.secuencial_actual, s.estado, s.updated_at,
              a.nombre AS ambiente_nombre,
              pe.codigo AS punto_codigo,
              e.codigo  AS est_codigo, e.nombre AS est_nombre
       FROM secuenciales s
       JOIN ambiente       a  ON a.id  = s.ambiente
       JOIN puntos_emision pe ON pe.id = s.id_punto_emision
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE ${where}
       ORDER BY e.codigo, pe.codigo, s.tipo_documento, s.ambiente`,
      params
    );
    return result.rows;
  },

  async findByPuntoEmision(puntoEmisionId: number): Promise<Secuencial[]> {
    const result = await pool.query(
      `SELECT s.*, a.nombre AS ambiente_nombre
       FROM secuenciales s
       JOIN ambiente a ON a.id = s.ambiente
       WHERE s.id_punto_emision = $1
       ORDER BY s.tipo_documento, s.ambiente`,
      [puntoEmisionId]
    );
    return result.rows;
  },

  async findById(id: number): Promise<Secuencial | null> {
    const result = await pool.query<Secuencial>(
      'SELECT * FROM secuenciales WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByUnique(puntoEmisionId: number, tipoDocumento: string): Promise<Secuencial | null> {
    const result = await pool.query<Secuencial>(
      `SELECT s.* FROM secuenciales s
       JOIN puntos_emision pe ON pe.id = s.id_punto_emision
       JOIN empresas e ON e.id = pe.id_empresa
       WHERE s.id_punto_emision = $1 AND s.tipo_documento = $2 AND s.ambiente = e.ambiente`,
      [puntoEmisionId, tipoDocumento]
    );
    return result.rows[0] ?? null;
  },

  async create(data: SecuencialCreate): Promise<Secuencial> {
    const result = await pool.query<Secuencial>(
      `INSERT INTO secuenciales (id_empresa, id_punto_emision, tipo_documento, ambiente)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.id_empresa, data.id_punto_emision, data.tipo_documento, data.ambiente]
    );
    return result.rows[0]!;
  },

  async cambiarEstado(id: number, estado: string): Promise<Secuencial | null> {
    const result = await pool.query<Secuencial>(
      'UPDATE secuenciales SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async findAllTiposDocumento(): Promise<TipoDocumento[]> {
    const result = await pool.query<TipoDocumento>(
      'SELECT codigo, nombre FROM tipos_documento ORDER BY codigo'
    );
    return result.rows;
  },

  async findTipoDocumento(codigo: string): Promise<TipoDocumento | null> {
    const result = await pool.query<TipoDocumento>(
      'SELECT codigo, nombre FROM tipos_documento WHERE codigo = $1',
      [codigo]
    );
    return result.rows[0] ?? null;
  },
};
