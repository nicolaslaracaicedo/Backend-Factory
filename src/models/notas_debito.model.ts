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

export function generarClaveAccesoND(
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
  const cuerpo = `${fecha}05${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

export interface NotaDebito {
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
  subtotal: number;
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

export interface DetalleNotaDebito {
  id: number;
  id_nota_debito: number;
  id_empresa: number;
  razon: string;
  valor: number;
  orden: number;
}

export interface NotaDebitoConDetalles extends NotaDebito {
  detalles: DetalleNotaDebito[];
}

export interface DetalleNDInput {
  razon: string;
  valor: number;
  orden: number;
}

export interface NotaDebitoCreateData {
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
  subtotal: number;
  iva_total: number;
  total: number;
  detalles: DetalleNDInput[];
}

export interface NotaDebitoUpdateData {
  id_cliente: number | null;
  id_factura_ref: number | null;
  factura_ref_numero: string | null;
  factura_ref_fecha: string | null;
  factura_ref_autorizacion: string | null;
  cli_identificacion: string;
  cli_razon_social: string;
  fecha_emision: string;
  motivo: string;
  subtotal: number;
  iva_total: number;
  total: number;
  detalles: DetalleNDInput[];
}

export interface NotaDebitoFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const NotaDebitoModel = {
  async findAllByEmpresa(empresaId: number, filtros: NotaDebitoFiltros): Promise<NotaDebito[]> {
    const condiciones: string[] = ['nd.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`nd.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`nd.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`nd.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(nd.cli_razon_social ILIKE $${idx} OR nd.cli_identificacion ILIKE $${idx} OR nd.numero_comprobante ILIKE $${idx} OR nd.factura_ref_numero ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT nd.id, nd.id_empresa, nd.id_usuario, nd.id_cliente, nd.id_factura_ref,
              nd.id_punto_emision, nd.id_ambiente,
              nd.factura_ref_numero, nd.factura_ref_fecha, nd.factura_ref_autorizacion,
              nd.cod_establecimiento, nd.cod_punto_emision, nd.secuencial, nd.numero_comprobante,
              nd.clave_acceso, nd.numero_autorizacion, nd.estado, nd.fecha_emision, nd.fecha_autorizacion,
              nd.cli_identificacion, nd.cli_razon_social, nd.motivo,
              nd.subtotal, nd.iva_total, nd.total,
              nd.created_at, nd.updated_at,
              a.nombre AS ambiente_nombre
       FROM notas_debito nd
       JOIN ambiente a ON a.id = nd.id_ambiente
       WHERE ${where}
       ORDER BY nd.fecha_emision DESC, nd.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<NotaDebito | null> {
    const result = await pool.query(
      `SELECT nd.*, a.nombre AS ambiente_nombre
       FROM notas_debito nd
       JOIN ambiente a ON a.id = nd.id_ambiente
       WHERE nd.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<NotaDebitoConDetalles | null> {
    const ndResult = await pool.query(
      `SELECT nd.*, a.nombre AS ambiente_nombre
       FROM notas_debito nd
       JOIN ambiente a ON a.id = nd.id_ambiente
       WHERE nd.id = $1`,
      [id]
    );
    const nd = ndResult.rows[0];
    if (!nd) return null;

    const detResult = await pool.query<DetalleNotaDebito>(
      'SELECT * FROM detalle_notas_debito WHERE id_nota_debito = $1 ORDER BY orden',
      [id]
    );
    return { ...nd, detalles: detResult.rows };
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

  async create(data: NotaDebitoCreateData): Promise<NotaDebitoConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '05']
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) {
        throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');
      }

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAccesoND(
        data.fecha_emision,
        data.ruc,
        data.id_ambiente,
        data.cod_establecimiento,
        data.cod_punto_emision,
        secuencial
      );

      const ndResult = await client.query(
        `INSERT INTO notas_debito (
          id_empresa, id_usuario, id_cliente, id_factura_ref, id_punto_emision, id_ambiente,
          factura_ref_numero, factura_ref_fecha, factura_ref_autorizacion,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision, cli_identificacion, cli_razon_social, motivo,
          subtotal, iva_total, total
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        ) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_cliente, data.id_factura_ref,
          data.id_punto_emision, data.id_ambiente,
          data.factura_ref_numero, data.factura_ref_fecha, data.factura_ref_autorizacion,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision, data.cli_identificacion, data.cli_razon_social, data.motivo,
          data.subtotal, data.iva_total, data.total,
        ]
      );
      const nd = ndResult.rows[0];

      const detalles: DetalleNotaDebito[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleNotaDebito>(
          `INSERT INTO detalle_notas_debito (id_nota_debito, id_empresa, razon, valor, orden)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [nd.id, data.id_empresa, d.razon, d.valor, d.orden]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...nd, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: NotaDebitoUpdateData): Promise<NotaDebitoConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ndResult = await client.query(
        `UPDATE notas_debito SET
          id_cliente = $1, id_factura_ref = $2,
          factura_ref_numero = $3, factura_ref_fecha = $4, factura_ref_autorizacion = $5,
          cli_identificacion = $6, cli_razon_social = $7,
          fecha_emision = $8, motivo = $9,
          subtotal = $10, iva_total = $11, total = $12, updated_at = NOW()
         WHERE id = $13 RETURNING *`,
        [
          data.id_cliente, data.id_factura_ref,
          data.factura_ref_numero, data.factura_ref_fecha, data.factura_ref_autorizacion,
          data.cli_identificacion, data.cli_razon_social,
          data.fecha_emision, data.motivo,
          data.subtotal, data.iva_total, data.total, id,
        ]
      );
      const nd = ndResult.rows[0];
      if (!nd) throw new Error('Nota de débito no encontrada.');

      await client.query('DELETE FROM detalle_notas_debito WHERE id_nota_debito = $1', [id]);
      const detalles: DetalleNotaDebito[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleNotaDebito>(
          `INSERT INTO detalle_notas_debito (id_nota_debito, id_empresa, razon, valor, orden)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [id, empresaId, d.razon, d.valor, d.orden]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...nd, detalles };
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
      'UPDATE notas_debito SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
      [claveAcceso, id]
    );
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM notas_debito WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<NotaDebito | null> {
    const result = await pool.query<NotaDebito>(
      'UPDATE notas_debito SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
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
  ): Promise<NotaDebito | null> {
    const result = await pool.query<NotaDebito>(
      `UPDATE notas_debito SET
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
