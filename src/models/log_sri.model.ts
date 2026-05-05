import pool from '../config/database';

export interface LogSri {
  id: number;
  id_empresa: number;
  tipo_documento: string;
  id_documento: number;
  clave_acceso: string | null;
  accion: string;
  ambiente: string;
  estado: string | null;
  request_xml: string | null;
  response_xml: string | null;
  mensaje: string | null;
  created_at: Date;
}

export interface LogSriCreateData {
  id_empresa: number;
  tipo_documento: string;
  id_documento: number;
  clave_acceso?: string | null;
  accion: string;
  ambiente: string;
  estado?: string | null;
  request_xml?: string | null;
  response_xml?: string | null;
  mensaje?: string | null;
}

export const LogSriModel = {
  async registrar(data: LogSriCreateData): Promise<void> {
    await pool.query(
      `INSERT INTO log_sri
         (id_empresa, tipo_documento, id_documento, clave_acceso, accion, ambiente, estado, request_xml, response_xml, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.id_empresa,
        data.tipo_documento,
        data.id_documento,
        data.clave_acceso ?? null,
        data.accion,
        data.ambiente,
        data.estado ?? null,
        data.request_xml ?? null,
        data.response_xml ?? null,
        data.mensaje ?? null,
      ]
    );
  },

  async findByEmpresa(
    empresaId: number,
    filtros: {
      tipo_documento?: string;
      id_documento?: number;
      accion?: string;
      fecha_desde?: string;
      fecha_hasta?: string;
      limit?: number;
    }
  ): Promise<LogSri[]> {
    const conditions: string[] = ['id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.tipo_documento) {
      conditions.push(`tipo_documento = $${idx++}`);
      params.push(filtros.tipo_documento);
    }
    if (filtros.id_documento) {
      conditions.push(`id_documento = $${idx++}`);
      params.push(filtros.id_documento);
    }
    if (filtros.accion) {
      conditions.push(`accion = $${idx++}`);
      params.push(filtros.accion.toUpperCase());
    }
    if (filtros.fecha_desde) {
      conditions.push(`created_at::date >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      conditions.push(`created_at::date <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }

    const limit = filtros.limit && filtros.limit > 0 ? filtros.limit : 100;
    const sql = `
      SELECT * FROM log_sri
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${limit}`;
    const result = await pool.query<LogSri>(sql, params);
    return result.rows;
  },

  async findById(id: number, empresaId: number): Promise<LogSri | null> {
    const result = await pool.query<LogSri>(
      `SELECT * FROM log_sri WHERE id = $1 AND id_empresa = $2`,
      [id, empresaId]
    );
    return result.rows[0] ?? null;
  },
};
