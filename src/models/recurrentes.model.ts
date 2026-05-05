import pool from '../config/database';

export interface Recurrente {
  id: number;
  id_empresa: number;
  id_cliente: number;
  id_usuario: number;
  id_punto_emision: number;
  descripcion: string;
  frecuencia: string;
  dia_emision: number;
  proxima_facturacion: string;
  ultima_facturacion: string | null;
  forma_pago: string;
  estado: string;
  created_at: Date;
}

export interface DetalleRecurrente {
  id: number;
  id_recurrente: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  codigo_iva: string;
  porcentaje_iva: number;
  orden: number;
  subtotal: number;
  valor_iva: number;
  total: number;
}

export interface RecurrenteConDetalles extends Recurrente {
  detalles: DetalleRecurrente[];
  cliente_identificacion?: string;
  cliente_razon_social?: string;
  total_estimado?: number;
}

export interface DetalleRecurrenteInput {
  id_producto?: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  codigo_iva: string;
  porcentaje_iva: number;
  orden: number;
}

export interface RecurrenteCreateData {
  id_empresa: number;
  id_cliente: number;
  id_usuario: number;
  id_punto_emision: number;
  descripcion: string;
  frecuencia: string;
  dia_emision: number;
  proxima_facturacion: string;
  forma_pago: string;
  detalles: DetalleRecurrenteInput[];
}

export interface RecurrenteUpdateData {
  id_cliente: number;
  id_punto_emision: number;
  descripcion: string;
  frecuencia: string;
  dia_emision: number;
  proxima_facturacion: string;
  forma_pago: string;
  detalles: DetalleRecurrenteInput[];
}

export interface PuntoEmisionRecurrenteInfo {
  id: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  estado: string;
}

export const RecurrenteModel = {
  async findAllByEmpresa(empresaId: number, estado?: string): Promise<RecurrenteConDetalles[]> {
    const condiciones = ['r.id_empresa = $1'];
    const params: unknown[] = [empresaId];

    if (estado) {
      condiciones.push(`r.estado = $2`);
      params.push(estado);
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT r.*, c.identificacion AS cliente_identificacion, c.razon_social AS cliente_razon_social,
              ROUND(COALESCE((
                SELECT SUM((dr.cantidad * dr.precio_unitario - dr.descuento) * (1 + dr.porcentaje_iva / 100))
                FROM detalle_recurrentes dr WHERE dr.id_recurrente = r.id
              ), 0)::NUMERIC, 4) AS total_estimado
       FROM recurrentes r
       JOIN clientes c ON c.id = r.id_cliente
       WHERE ${where}
       ORDER BY r.proxima_facturacion ASC, r.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Recurrente | null> {
    const result = await pool.query('SELECT * FROM recurrentes WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<RecurrenteConDetalles | null> {
    const recResult = await pool.query(
      `SELECT r.*, c.identificacion AS cliente_identificacion, c.razon_social AS cliente_razon_social,
              ROUND(COALESCE((
                SELECT SUM((dr.cantidad * dr.precio_unitario - dr.descuento) * (1 + dr.porcentaje_iva / 100))
                FROM detalle_recurrentes dr WHERE dr.id_recurrente = r.id
              ), 0)::NUMERIC, 4) AS total_estimado
       FROM recurrentes r
       JOIN clientes c ON c.id = r.id_cliente
       WHERE r.id = $1`,
      [id]
    );
    const recurrente = recResult.rows[0];
    if (!recurrente) return null;

    const detResult = await pool.query<DetalleRecurrente>(
      `SELECT *,
              ROUND((cantidad * precio_unitario - descuento)::NUMERIC, 4)                          AS subtotal,
              ROUND(((cantidad * precio_unitario - descuento) * porcentaje_iva / 100)::NUMERIC, 4) AS valor_iva,
              ROUND(((cantidad * precio_unitario - descuento) * (1 + porcentaje_iva / 100))::NUMERIC, 4) AS total
       FROM detalle_recurrentes WHERE id_recurrente = $1 ORDER BY orden`,
      [id]
    );

    return { ...recurrente, detalles: detResult.rows };
  },

  async findPuntoEmision(puntoEmisionId: number, empresaId: number): Promise<PuntoEmisionRecurrenteInfo | null> {
    const result = await pool.query(
      `SELECT pe.id, e.codigo AS cod_establecimiento, pe.codigo AS cod_punto_emision, pe.estado
       FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1 AND pe.id_empresa = $2`,
      [puntoEmisionId, empresaId]
    );
    return result.rows[0] ?? null;
  },

  async findPendientes(): Promise<RecurrenteConDetalles[]> {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    const result = await pool.query(
      `SELECT r.*, c.identificacion AS cliente_identificacion, c.razon_social AS cliente_razon_social,
              c.direccion AS cliente_direccion, c.telefono AS cliente_telefono, c.email AS cliente_email
       FROM recurrentes r
       JOIN clientes c ON c.id = r.id_cliente
       WHERE r.estado = 'ACTIVO' AND r.proxima_facturacion <= $1`,
      [hoy]
    );

    const recurrentes = result.rows;
    for (const r of recurrentes) {
      const detResult = await pool.query<DetalleRecurrente>(
        `SELECT *,
                ROUND((cantidad * precio_unitario - descuento)::NUMERIC, 4)                          AS subtotal,
                ROUND(((cantidad * precio_unitario - descuento) * porcentaje_iva / 100)::NUMERIC, 4) AS valor_iva,
                ROUND(((cantidad * precio_unitario - descuento) * (1 + porcentaje_iva / 100))::NUMERIC, 4) AS total
         FROM detalle_recurrentes WHERE id_recurrente = $1 ORDER BY orden`,
        [r.id]
      );
      r.detalles = detResult.rows;
    }

    return recurrentes;
  },

  async create(data: RecurrenteCreateData): Promise<RecurrenteConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const recResult = await client.query(
        `INSERT INTO recurrentes (
          id_empresa, id_cliente, id_usuario, id_punto_emision, descripcion,
          frecuencia, dia_emision, proxima_facturacion, forma_pago
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          data.id_empresa, data.id_cliente, data.id_usuario, data.id_punto_emision, data.descripcion,
          data.frecuencia, data.dia_emision, data.proxima_facturacion, data.forma_pago,
        ]
      );
      const recurrente = recResult.rows[0];

      const detalles: DetalleRecurrente[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleRecurrente>(
          `INSERT INTO detalle_recurrentes (
            id_recurrente, id_empresa, id_producto, codigo, descripcion,
            cantidad, precio_unitario, descuento, codigo_iva, porcentaje_iva, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            recurrente.id, data.id_empresa, d.id_producto ?? null, d.codigo, d.descripcion,
            d.cantidad, d.precio_unitario, d.descuento, d.codigo_iva, d.porcentaje_iva, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...recurrente, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: RecurrenteUpdateData): Promise<RecurrenteConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const recResult = await client.query(
        `UPDATE recurrentes SET
          id_cliente = $1, id_punto_emision = $2, descripcion = $3,
          frecuencia = $4, dia_emision = $5, proxima_facturacion = $6, forma_pago = $7
         WHERE id = $8 AND id_empresa = $9 RETURNING *`,
        [
          data.id_cliente, data.id_punto_emision, data.descripcion,
          data.frecuencia, data.dia_emision, data.proxima_facturacion, data.forma_pago,
          id, empresaId,
        ]
      );
      const recurrente = recResult.rows[0];
      if (!recurrente) throw new Error('Recurrente no encontrado.');

      await client.query('DELETE FROM detalle_recurrentes WHERE id_recurrente = $1', [id]);
      const detalles: DetalleRecurrente[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleRecurrente>(
          `INSERT INTO detalle_recurrentes (
            id_recurrente, id_empresa, id_producto, codigo, descripcion,
            cantidad, precio_unitario, descuento, codigo_iva, porcentaje_iva, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            id, empresaId, d.id_producto ?? null, d.codigo, d.descripcion,
            d.cantidad, d.precio_unitario, d.descuento, d.codigo_iva, d.porcentaje_iva, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...recurrente, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM recurrentes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<Recurrente | null> {
    const result = await pool.query<Recurrente>(
      'UPDATE recurrentes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async actualizarFechasPostGeneracion(id: number, ultimaFacturacion: string, proximaFacturacion: string): Promise<void> {
    await pool.query(
      'UPDATE recurrentes SET ultima_facturacion = $1, proxima_facturacion = $2 WHERE id = $3',
      [ultimaFacturacion, proximaFacturacion, id]
    );
  },
};
