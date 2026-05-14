import pool from '../config/database';

function modulo11(cadena: string): number {
  const pesos = [2, 3, 4, 5, 6, 7];
  let suma = 0;
  for (let i = 0; i < cadena.length; i++) {
    suma += parseInt(cadena[cadena.length - 1 - i]!) * pesos[i % pesos.length]!;
  }
  const residuo = suma % 11;
  if (residuo === 0) return 0;
  if (residuo === 1) return 1;
  return 11 - residuo;
}

export function generarClaveAccesoNC(
  fechaEmision: string,
  ruc: string,
  ambiente: number,
  codEstablecimiento: string,
  codPuntoEmision: string,
  secuencial: string
): string {
  const [yyyy, mm, dd] = fechaEmision.split('-');
  const fecha = `${dd}${mm}${yyyy}`;
  const codigoNumerico = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const cuerpo = `${fecha}04${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

export interface NotaCredito {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_factura_ref: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  factura_ref_numero: string | null;
  factura_ref_fecha: string | null;
  factura_ref_autorizacion: string | null;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  motivo: string;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DetalleNotaCredito {
  id: number;
  id_nota_credito: number;
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

export interface NotaCreditoConDetalles extends NotaCredito {
  detalles: DetalleNotaCredito[];
}

export interface DetalleNCInput {
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

export interface NotaCreditoCreateData {
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_factura_ref: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  factura_ref_numero: string | null;
  factura_ref_fecha: string | null;
  factura_ref_autorizacion: string | null;
  cod_establecimiento: string;
  cod_punto_emision: string;
  cli_identificacion: string;
  cli_razon_social: string;
  fecha_emision: string;
  motivo: string;
  ruc: string;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  detalles: DetalleNCInput[];
}

export interface NotaCreditoUpdateData {
  id_cliente: number | null;
  id_factura_ref: number | null;
  factura_ref_numero: string | null;
  factura_ref_fecha: string | null;
  factura_ref_autorizacion: string | null;
  cli_identificacion: string;
  cli_razon_social: string;
  fecha_emision: string;
  motivo: string;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  detalles: DetalleNCInput[];
}

export interface NotaCreditoFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const NotaCreditoModel = {
  async findAllByEmpresa(empresaId: number, filtros: NotaCreditoFiltros): Promise<NotaCredito[]> {
    const condiciones: string[] = ['nc.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`nc.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`nc.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`nc.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(nc.cli_razon_social ILIKE $${idx} OR nc.cli_identificacion ILIKE $${idx} OR nc.numero_comprobante ILIKE $${idx} OR nc.factura_ref_numero ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT nc.id, nc.id_empresa, nc.id_usuario, nc.id_cliente, nc.id_factura_ref,
              nc.id_punto_emision, nc.id_ambiente,
              nc.factura_ref_numero, nc.factura_ref_fecha, nc.factura_ref_autorizacion,
              nc.cod_establecimiento, nc.cod_punto_emision, nc.secuencial, nc.numero_comprobante,
              nc.clave_acceso, nc.numero_autorizacion, nc.estado, nc.fecha_emision, nc.fecha_autorizacion,
              nc.cli_identificacion, nc.cli_razon_social, nc.motivo,
              nc.subtotal_sin_impuesto, nc.descuento_total, nc.iva_total, nc.total,
              nc.created_at, nc.updated_at,
              a.nombre AS ambiente_nombre
       FROM notas_credito nc
       JOIN ambiente a ON a.id = nc.id_ambiente
       WHERE ${where}
       ORDER BY nc.fecha_emision DESC, nc.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<NotaCredito | null> {
    const result = await pool.query(
      `SELECT nc.*, a.nombre AS ambiente_nombre
       FROM notas_credito nc
       JOIN ambiente a ON a.id = nc.id_ambiente
       WHERE nc.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<NotaCreditoConDetalles | null> {
    const ncResult = await pool.query(
      `SELECT nc.*, a.nombre AS ambiente_nombre
       FROM notas_credito nc
       JOIN ambiente a ON a.id = nc.id_ambiente
       WHERE nc.id = $1`,
      [id]
    );
    const nc = ncResult.rows[0];
    if (!nc) return null;

    const detResult = await pool.query<DetalleNotaCredito>(
      'SELECT * FROM detalle_notas_credito WHERE id_nota_credito = $1 ORDER BY orden',
      [id]
    );
    return { ...nc, detalles: detResult.rows };
  },

  async findPuntoEmision(puntoEmisionId: number, empresaId: number) {
    const result = await pool.query(
      `SELECT pe.id, pe.id_establecimiento, e.codigo AS cod_establecimiento,
              pe.codigo AS cod_punto_emision, pe.estado
       FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1 AND pe.id_empresa = $2`,
      [puntoEmisionId, empresaId]
    );
    return result.rows[0] ?? null;
  },

  async create(data: NotaCreditoCreateData): Promise<NotaCreditoConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '04']
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) {
        throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');
      }

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAccesoNC(
        data.fecha_emision,
        data.ruc,
        data.id_ambiente,
        data.cod_establecimiento,
        data.cod_punto_emision,
        secuencial
      );

      const ncResult = await client.query(
        `INSERT INTO notas_credito (
          id_empresa, id_usuario, id_cliente, id_factura_ref, id_punto_emision, id_ambiente,
          factura_ref_numero, factura_ref_fecha, factura_ref_autorizacion,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision, cli_identificacion, cli_razon_social, motivo,
          subtotal_sin_impuesto, subtotal_0, subtotal_iva, descuento_total, iva_total, total
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        ) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_cliente, data.id_factura_ref,
          data.id_punto_emision, data.id_ambiente,
          data.factura_ref_numero, data.factura_ref_fecha, data.factura_ref_autorizacion,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision, data.cli_identificacion, data.cli_razon_social, data.motivo,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva,
          data.descuento_total, data.iva_total, data.total,
        ]
      );
      const nc = ncResult.rows[0];

      const detalles: DetalleNotaCredito[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleNotaCredito>(
          `INSERT INTO detalle_notas_credito (
            id_nota_credito, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, porcentaje_ice, valor_ice, codigo_ice, valor_irbpnr, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
          [
            nc.id, data.id_empresa, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.porcentaje_ice, d.valor_ice, d.codigo_ice ?? null, d.valor_irbpnr, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...nc, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: NotaCreditoUpdateData): Promise<NotaCreditoConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ncResult = await client.query(
        `UPDATE notas_credito SET
          id_cliente = $1, id_factura_ref = $2,
          factura_ref_numero = $3, factura_ref_fecha = $4, factura_ref_autorizacion = $5,
          cli_identificacion = $6, cli_razon_social = $7,
          fecha_emision = $8, motivo = $9,
          subtotal_sin_impuesto = $10, subtotal_0 = $11, subtotal_iva = $12,
          descuento_total = $13, iva_total = $14, total = $15, updated_at = NOW()
         WHERE id = $16 RETURNING *`,
        [
          data.id_cliente, data.id_factura_ref,
          data.factura_ref_numero, data.factura_ref_fecha, data.factura_ref_autorizacion,
          data.cli_identificacion, data.cli_razon_social,
          data.fecha_emision, data.motivo,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva,
          data.descuento_total, data.iva_total, data.total, id,
        ]
      );
      const nc = ncResult.rows[0];
      if (!nc) throw new Error('Nota de crédito no encontrada.');

      await client.query('DELETE FROM detalle_notas_credito WHERE id_nota_credito = $1', [id]);
      const detalles: DetalleNotaCredito[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleNotaCredito>(
          `INSERT INTO detalle_notas_credito (
            id_nota_credito, id_empresa, id_producto, codigo, descripcion, unidad_medida,
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
      return { ...nc, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async findDireccionEstablecimiento(puntoEmisionId: number): Promise<string> {
    const result = await pool.query<{ direccion: string | null }>(
      `SELECT e.direccion
       FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1`,
      [puntoEmisionId]
    );
    return result.rows[0]?.direccion ?? '';
  },

  async actualizarClaveAcceso(id: number, claveAcceso: string): Promise<void> {
    await pool.query(
      'UPDATE notas_credito SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
      [claveAcceso, id]
    );
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM notas_credito WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<NotaCredito | null> {
    const result = await pool.query<NotaCredito>(
      'UPDATE notas_credito SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async cantidadAcreditadaPorFactura(
    idFacturaRef: number,
    excluirNcId?: number
  ): Promise<{ codigo: string; cantidad_acreditada: number }[]> {
    const params: unknown[] = [idFacturaRef];
    const excluirClause = excluirNcId != null
      ? `AND nc.id <> $${params.push(excluirNcId)}`
      : '';
    const result = await pool.query<{ codigo: string; cantidad_acreditada: number }>(
      `SELECT d.codigo, SUM(d.cantidad) AS cantidad_acreditada
       FROM detalle_notas_credito d
       JOIN notas_credito nc ON nc.id = d.id_nota_credito
       WHERE nc.id_factura_ref = $1
         AND nc.estado <> 'ANULADA'
         ${excluirClause}
       GROUP BY d.codigo`,
      params
    );
    return result.rows;
  },

  async actualizarEmision(
    id: number,
    data: {
      xml_generado: string;
      xml_autorizado: string;
      numero_autorizacion: string;
      fecha_autorizacion: string | null;
      estado: string;
      respuesta_sri: string | null;
      motivo_rechazo: string | null;
    }
  ): Promise<NotaCredito | null> {
    const result = await pool.query<NotaCredito>(
      `UPDATE notas_credito SET
        xml_generado = $1, xml_autorizado = $2, numero_autorizacion = $3,
        fecha_autorizacion = $4, estado = $5, respuesta_sri = $6, motivo_rechazo = $7,
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        data.xml_generado, data.xml_autorizado, data.numero_autorizacion,
        data.fecha_autorizacion, data.estado, data.respuesta_sri, data.motivo_rechazo, id,
      ]
    );
    return result.rows[0] ?? null;
  },
};
