import pool from '../config/database';

export interface Proforma {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  numero: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  estado: string;
  id_factura: number | null;
  observaciones: string | null;
  pdf_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DetalleProforma {
  id: number;
  id_proforma: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  codigo_iva: string;
  porcentaje_iva: number;
  valor_iva: number;
  porcentaje_ice: number;
  valor_ice: number;
  codigo_ice: string | null;
  valor_irbpnr: number;
  total: number;
  orden: number;
}

export interface ProformaConDetalles extends Proforma {
  detalles: DetalleProforma[];
}

export interface DetalleProformaInput {
  id_producto?: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  codigo_iva: string;
  porcentaje_iva: number;
  valor_iva: number;
  porcentaje_ice: number;
  valor_ice: number;
  codigo_ice: string | null;
  valor_irbpnr: number;
  total: number;
  orden: number;
}

export interface ProformaCreateData {
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  observaciones: string | null;
  detalles: DetalleProformaInput[];
}

export interface ProformaUpdateData {
  id_cliente: number | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  observaciones: string | null;
  detalles: DetalleProformaInput[];
}

export interface ProformaFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export interface PuntoEmisionProformaInfo {
  id: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  estado: string;
}

export const ProformaModel = {
  async findAllByEmpresa(empresaId: number, filtros: ProformaFiltros): Promise<Proforma[]> {
    const condiciones: string[] = ['p.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`p.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`p.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`p.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(p.cli_razon_social ILIKE $${idx} OR p.cli_identificacion ILIKE $${idx} OR p.numero ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT p.id, p.id_empresa, p.id_usuario, p.id_cliente, p.id_punto_emision,
              p.numero, p.fecha_emision, p.fecha_vencimiento, p.cli_identificacion, p.cli_razon_social,
              p.subtotal_sin_impuesto, p.subtotal_0, p.subtotal_iva, p.descuento_total, p.iva_total, p.total,
              p.estado, p.id_factura, p.observaciones, p.pdf_url, p.created_at, p.updated_at
       FROM proformas p
       WHERE ${where}
       ORDER BY p.fecha_emision DESC, p.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Proforma | null> {
    const result = await pool.query('SELECT * FROM proformas WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<ProformaConDetalles | null> {
    const profResult = await pool.query('SELECT * FROM proformas WHERE id = $1', [id]);
    const proforma = profResult.rows[0];
    if (!proforma) return null;

    const detResult = await pool.query<DetalleProforma>(
      'SELECT * FROM detalle_proformas WHERE id_proforma = $1 ORDER BY orden',
      [id]
    );

    return { ...proforma, detalles: detResult.rows };
  },

  async findPuntoEmision(puntoEmisionId: number, empresaId: number): Promise<PuntoEmisionProformaInfo | null> {
    const result = await pool.query(
      `SELECT pe.id, e.codigo AS cod_establecimiento, pe.codigo AS cod_punto_emision, pe.estado
       FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1 AND pe.id_empresa = $2`,
      [puntoEmisionId, empresaId]
    );
    return result.rows[0] ?? null;
  },

  async create(data: ProformaCreateData): Promise<ProformaConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const prefix = `${data.cod_establecimiento}-${data.cod_punto_emision}`;
      const seqResult = await client.query<{ next_num: string }>(
        `SELECT LPAD(CAST(COALESCE(MAX(seq), 0) + 1 AS TEXT), 9, '0') AS next_num
         FROM (
           SELECT CAST(SPLIT_PART(numero, '-', 3) AS INT) AS seq
           FROM proformas
           WHERE id_empresa = $1 AND numero LIKE $2
           FOR UPDATE
         ) t`,
        [data.id_empresa, `${prefix}-%`]
      );
      const secNum = seqResult.rows[0]?.next_num ?? '000000001';
      const numero = `${prefix}-${secNum}`;

      const profResult = await client.query(
        `INSERT INTO proformas (
          id_empresa, id_usuario, id_cliente, id_punto_emision, numero,
          fecha_emision, fecha_vencimiento, cli_identificacion, cli_razon_social,
          subtotal_sin_impuesto, subtotal_0, subtotal_iva, descuento_total, iva_total, total,
          observaciones
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_cliente, data.id_punto_emision, numero,
          data.fecha_emision, data.fecha_vencimiento, data.cli_identificacion, data.cli_razon_social,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva,
          data.descuento_total, data.iva_total, data.total, data.observaciones,
        ]
      );
      const proforma = profResult.rows[0];

      const detalles: DetalleProforma[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleProforma>(
          `INSERT INTO detalle_proformas (
            id_proforma, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, porcentaje_ice, valor_ice, codigo_ice, valor_irbpnr, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
          [
            proforma.id, data.id_empresa, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.porcentaje_ice, d.valor_ice, d.codigo_ice ?? null, d.valor_irbpnr, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...proforma, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: ProformaUpdateData): Promise<ProformaConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const profResult = await client.query(
        `UPDATE proformas SET
          id_cliente = $1, fecha_emision = $2, fecha_vencimiento = $3,
          cli_identificacion = $4, cli_razon_social = $5,
          subtotal_sin_impuesto = $6, subtotal_0 = $7, subtotal_iva = $8,
          descuento_total = $9, iva_total = $10, total = $11,
          observaciones = $12, updated_at = NOW()
         WHERE id = $13 AND id_empresa = $14 RETURNING *`,
        [
          data.id_cliente, data.fecha_emision, data.fecha_vencimiento,
          data.cli_identificacion, data.cli_razon_social,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva,
          data.descuento_total, data.iva_total, data.total,
          data.observaciones, id, empresaId,
        ]
      );
      const proforma = profResult.rows[0];
      if (!proforma) throw new Error('Proforma no encontrada.');

      await client.query('DELETE FROM detalle_proformas WHERE id_proforma = $1', [id]);
      const detalles: DetalleProforma[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleProforma>(
          `INSERT INTO detalle_proformas (
            id_proforma, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
          [
            id, empresaId, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...proforma, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM proformas WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<Proforma | null> {
    const result = await pool.query<Proforma>(
      'UPDATE proformas SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async vincularFactura(id: number, facturaId: number): Promise<Proforma | null> {
    const result = await pool.query<Proforma>(
      `UPDATE proformas SET id_factura = $1, estado = 'CONVERTIDA', updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [facturaId, id]
    );
    return result.rows[0] ?? null;
  },
};
