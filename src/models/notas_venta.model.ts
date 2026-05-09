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

export function generarClaveAccesoNV(
  fechaEmision: string,
  ruc: string,
  ambiente: number,
  codEstablecimiento: string,
  codPuntoEmision: string,
  secuencial: string,
): string {
  const [yyyy, mm, dd] = fechaEmision.split('-');
  const fecha = `${dd}${mm}${yyyy}`;
  const codigoNumerico = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const cuerpo = `${fecha}02${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

export interface NotaVenta {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  id_ambiente: number;
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
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  forma_pago: string;
  subtotal_sin_impuesto: number;
  descuento_total: number;
  total: number;
  observacion: string | null;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DetalleNotaVenta {
  id: number;
  id_nota_venta: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  total: number;
  orden: number;
}

export interface NotaVentaConDetalles extends NotaVenta {
  detalles: DetalleNotaVenta[];
}

export interface DetalleNVInput {
  id_producto?: number;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  total: number;
  orden: number;
}

export interface NotaVentaCreateData {
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  fecha_emision: string;
  ruc: string;
  cli_identificacion: string;
  cli_razon_social: string;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  forma_pago: string;
  subtotal_sin_impuesto: number;
  descuento_total: number;
  total: number;
  observacion: string | null;
  detalles: DetalleNVInput[];
}

export interface NotaVentaUpdateData {
  id_cliente: number | null;
  cli_identificacion: string;
  cli_razon_social: string;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  forma_pago: string;
  fecha_emision: string;
  subtotal_sin_impuesto: number;
  descuento_total: number;
  total: number;
  observacion: string | null;
  detalles: DetalleNVInput[];
}

export interface NotaVentaFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const NotaVentaModel = {
  async findAllByEmpresa(empresaId: number, filtros: NotaVentaFiltros): Promise<NotaVenta[]> {
    const condiciones: string[] = ['nv.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) { condiciones.push(`nv.estado = $${idx++}`); params.push(filtros.estado); }
    if (filtros.fecha_desde) { condiciones.push(`nv.fecha_emision >= $${idx++}`); params.push(filtros.fecha_desde); }
    if (filtros.fecha_hasta) { condiciones.push(`nv.fecha_emision <= $${idx++}`); params.push(filtros.fecha_hasta); }
    if (filtros.search) {
      condiciones.push(`(nv.cli_razon_social ILIKE $${idx} OR nv.cli_identificacion ILIKE $${idx} OR nv.numero_comprobante ILIKE $${idx})`);
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const result = await pool.query(
      `SELECT nv.*, a.nombre AS ambiente_nombre
       FROM notas_venta nv
       JOIN ambiente a ON a.id = nv.id_ambiente
       WHERE ${condiciones.join(' AND ')}
       ORDER BY nv.fecha_emision DESC, nv.id DESC`,
      params,
    );
    return result.rows;
  },

  async findById(id: number): Promise<NotaVenta | null> {
    const result = await pool.query(
      `SELECT nv.*, a.nombre AS ambiente_nombre
       FROM notas_venta nv
       JOIN ambiente a ON a.id = nv.id_ambiente
       WHERE nv.id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<NotaVentaConDetalles | null> {
    const nvResult = await pool.query(
      `SELECT nv.*, a.nombre AS ambiente_nombre
       FROM notas_venta nv
       JOIN ambiente a ON a.id = nv.id_ambiente
       WHERE nv.id = $1`,
      [id],
    );
    const nv = nvResult.rows[0];
    if (!nv) return null;

    const detResult = await pool.query<DetalleNotaVenta>(
      'SELECT * FROM detalle_notas_venta WHERE id_nota_venta = $1 ORDER BY orden',
      [id],
    );
    return { ...nv, detalles: detResult.rows };
  },

  async findPuntoEmision(puntoEmisionId: number, empresaId: number) {
    const result = await pool.query(
      `SELECT pe.id, pe.id_establecimiento, e.codigo AS cod_establecimiento,
              pe.codigo AS cod_punto_emision, pe.estado
       FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1 AND pe.id_empresa = $2`,
      [puntoEmisionId, empresaId],
    );
    return result.rows[0] ?? null;
  },

  async findDireccionEstablecimiento(puntoEmisionId: number): Promise<string> {
    const result = await pool.query<{ direccion: string | null }>(
      `SELECT e.direccion FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1`,
      [puntoEmisionId],
    );
    return result.rows[0]?.direccion ?? '';
  },

  async create(data: NotaVentaCreateData): Promise<NotaVentaConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '02'],
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAccesoNV(
        data.fecha_emision, data.ruc, data.id_ambiente,
        data.cod_establecimiento, data.cod_punto_emision, secuencial,
      );

      const nvResult = await client.query(
        `INSERT INTO notas_venta (
          id_empresa, id_usuario, id_cliente, id_punto_emision, id_ambiente,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision, cli_identificacion, cli_razon_social, cli_direccion, cli_telefono, cli_email,
          forma_pago, subtotal_sin_impuesto, descuento_total, total, observacion
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_cliente, data.id_punto_emision, data.id_ambiente,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision, data.cli_identificacion, data.cli_razon_social, data.cli_direccion,
          data.cli_telefono, data.cli_email, data.forma_pago,
          data.subtotal_sin_impuesto, data.descuento_total, data.total, data.observacion,
        ],
      );
      const nv = nvResult.rows[0];

      const detalles: DetalleNotaVenta[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleNotaVenta>(
          `INSERT INTO detalle_notas_venta (
            id_nota_venta, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [
            nv.id, data.id_empresa, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.total, d.orden,
          ],
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...nv, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: NotaVentaUpdateData): Promise<NotaVentaConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const nvResult = await client.query(
        `UPDATE notas_venta SET
          id_cliente = $1, cli_identificacion = $2, cli_razon_social = $3,
          cli_direccion = $4, cli_telefono = $5, cli_email = $6,
          forma_pago = $7, fecha_emision = $8,
          subtotal_sin_impuesto = $9, descuento_total = $10, total = $11,
          observacion = $12, updated_at = NOW()
         WHERE id = $13 AND id_empresa = $14 RETURNING *`,
        [
          data.id_cliente, data.cli_identificacion, data.cli_razon_social,
          data.cli_direccion, data.cli_telefono, data.cli_email,
          data.forma_pago, data.fecha_emision,
          data.subtotal_sin_impuesto, data.descuento_total, data.total,
          data.observacion, id, empresaId,
        ],
      );
      const nv = nvResult.rows[0];
      if (!nv) throw new Error('Nota de venta no encontrada.');

      await client.query('DELETE FROM detalle_notas_venta WHERE id_nota_venta = $1', [id]);
      const detalles: DetalleNotaVenta[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleNotaVenta>(
          `INSERT INTO detalle_notas_venta (
            id_nota_venta, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [
            id, empresaId, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.total, d.orden,
          ],
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...nv, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM notas_venta WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<NotaVenta | null> {
    const result = await pool.query<NotaVenta>(
      'UPDATE notas_venta SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id],
    );
    return result.rows[0] ?? null;
  },

  async actualizarClaveAcceso(id: number, claveAcceso: string): Promise<void> {
    await pool.query(
      'UPDATE notas_venta SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
      [claveAcceso, id],
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
    },
  ): Promise<NotaVenta | null> {
    const result = await pool.query<NotaVenta>(
      `UPDATE notas_venta SET
        xml_generado = $1, xml_autorizado = $2, numero_autorizacion = $3,
        fecha_autorizacion = $4, estado = $5, respuesta_sri = $6, motivo_rechazo = $7,
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        data.xml_generado, data.xml_autorizado, data.numero_autorizacion,
        data.fecha_autorizacion, data.estado, data.respuesta_sri, data.motivo_rechazo, id,
      ],
    );
    return result.rows[0] ?? null;
  },
};
