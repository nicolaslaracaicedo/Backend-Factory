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

export function generarClaveAccesoLC(
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
  const cuerpo = `${fecha}03${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

export interface LiquidacionCompra {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_punto_emision: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  tipo_identificacion_prov: string;
  identificacion_prov: string;
  razon_social_prov: string;
  direccion_prov: string | null;
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

export interface DetalleLiquidacionCompra {
  id: number;
  id_liquidacion: number;
  id_empresa: number;
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
  total: number;
  orden: number;
}

export interface LiquidacionCompraConDetalles extends LiquidacionCompra {
  detalles: DetalleLiquidacionCompra[];
}

export interface DetalleLC_Input {
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
  total: number;
  orden: number;
}

export interface LiquidacionCompraCreateData {
  id_empresa: number;
  id_usuario: number;
  id_punto_emision: number;
  id_ambiente: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  fecha_emision: string;
  ruc: string;
  tipo_identificacion_prov: string;
  identificacion_prov: string;
  razon_social_prov: string;
  direccion_prov: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  detalles: DetalleLC_Input[];
}

export interface LiquidacionCompraUpdateData {
  fecha_emision: string;
  tipo_identificacion_prov: string;
  identificacion_prov: string;
  razon_social_prov: string;
  direccion_prov: string | null;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
  detalles: DetalleLC_Input[];
}

export interface LiquidacionCompraFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const LiquidacionCompraModel = {
  async findAllByEmpresa(empresaId: number, filtros: LiquidacionCompraFiltros): Promise<LiquidacionCompra[]> {
    const condiciones: string[] = ['lc.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`lc.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`lc.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`lc.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(lc.razon_social_prov ILIKE $${idx} OR lc.identificacion_prov ILIKE $${idx} OR lc.numero_comprobante ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT lc.id, lc.id_empresa, lc.id_usuario, lc.id_punto_emision,
              lc.cod_establecimiento, lc.cod_punto_emision, lc.secuencial, lc.numero_comprobante,
              lc.clave_acceso, lc.numero_autorizacion, lc.estado, lc.fecha_emision, lc.fecha_autorizacion,
              lc.tipo_identificacion_prov, lc.identificacion_prov, lc.razon_social_prov,
              lc.subtotal_sin_impuesto, lc.descuento_total, lc.iva_total, lc.total,
              lc.respuesta_sri, lc.motivo_rechazo, lc.created_at, lc.updated_at
       FROM liquidaciones_compra lc
       WHERE ${where}
       ORDER BY lc.fecha_emision DESC, lc.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<LiquidacionCompra | null> {
    const result = await pool.query<LiquidacionCompra>(
      'SELECT * FROM liquidaciones_compra WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<LiquidacionCompraConDetalles | null> {
    const lcResult = await pool.query('SELECT * FROM liquidaciones_compra WHERE id = $1', [id]);
    const lc = lcResult.rows[0];
    if (!lc) return null;

    const detResult = await pool.query<DetalleLiquidacionCompra>(
      'SELECT * FROM detalle_liquidaciones_compra WHERE id_liquidacion = $1 ORDER BY orden',
      [id]
    );
    return { ...lc, detalles: detResult.rows };
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

  async create(data: LiquidacionCompraCreateData): Promise<LiquidacionCompraConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '03']
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) {
        throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');
      }

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAccesoLC(
        data.fecha_emision,
        data.ruc,
        data.id_ambiente,
        data.cod_establecimiento,
        data.cod_punto_emision,
        secuencial
      );

      const lcResult = await client.query(
        `INSERT INTO liquidaciones_compra (
          id_empresa, id_usuario, id_punto_emision,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision,
          tipo_identificacion_prov, identificacion_prov, razon_social_prov, direccion_prov,
          subtotal_sin_impuesto, subtotal_0, subtotal_iva, descuento_total, iva_total, total
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
        ) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_punto_emision,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision,
          data.tipo_identificacion_prov, data.identificacion_prov, data.razon_social_prov, data.direccion_prov ?? null,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva, data.descuento_total, data.iva_total, data.total,
        ]
      );
      const lc = lcResult.rows[0];

      const detalles: DetalleLiquidacionCompra[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleLiquidacionCompra>(
          `INSERT INTO detalle_liquidaciones_compra (
            id_liquidacion, id_empresa, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [
            lc.id, data.id_empresa, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...lc, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: LiquidacionCompraUpdateData): Promise<LiquidacionCompraConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lcResult = await client.query(
        `UPDATE liquidaciones_compra SET
          fecha_emision = $1,
          tipo_identificacion_prov = $2, identificacion_prov = $3,
          razon_social_prov = $4, direccion_prov = $5,
          subtotal_sin_impuesto = $6, subtotal_0 = $7, subtotal_iva = $8,
          descuento_total = $9, iva_total = $10, total = $11,
          updated_at = NOW()
         WHERE id = $12 AND id_empresa = $13 RETURNING *`,
        [
          data.fecha_emision,
          data.tipo_identificacion_prov, data.identificacion_prov,
          data.razon_social_prov, data.direccion_prov ?? null,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva,
          data.descuento_total, data.iva_total, data.total,
          id, empresaId,
        ]
      );
      const lc = lcResult.rows[0];
      if (!lc) throw new Error('Liquidación de compra no encontrada.');

      await client.query('DELETE FROM detalle_liquidaciones_compra WHERE id_liquidacion = $1', [id]);
      const detalles: DetalleLiquidacionCompra[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleLiquidacionCompra>(
          `INSERT INTO detalle_liquidaciones_compra (
            id_liquidacion, id_empresa, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [
            id, empresaId, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...lc, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM liquidaciones_compra WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<LiquidacionCompra | null> {
    const result = await pool.query<LiquidacionCompra>(
      'UPDATE liquidaciones_compra SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async actualizarClaveAcceso(id: number, claveAcceso: string): Promise<void> {
    await pool.query(
      'UPDATE liquidaciones_compra SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
      [claveAcceso, id]
    );
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
  ): Promise<LiquidacionCompra | null> {
    const result = await pool.query<LiquidacionCompra>(
      `UPDATE liquidaciones_compra SET
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
