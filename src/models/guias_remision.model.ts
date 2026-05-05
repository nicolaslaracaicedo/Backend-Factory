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

export function generarClaveAccesoGR(
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
  const cuerpo = `${fecha}06${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

export interface GuiaRemision {
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
  ruc_transportista: string;
  razon_social_transportista: string;
  placa: string;
  fecha_ini_transporte: string;
  fecha_fin_transporte: string;
  ruta: string | null;
  id_cliente: number | null;
  dest_identificacion: string | null;
  dest_razon_social: string | null;
  direccion_destino: string | null;
  motivo_traslado: string | null;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DetalleGuiaRemision {
  id: number;
  id_guia: number;
  id_empresa: number;
  id_producto: number | null;
  codigo: string;
  descripcion: string;
  cantidad: number;
  orden: number;
}

export interface GuiaRemisionConDetalles extends GuiaRemision {
  detalles: DetalleGuiaRemision[];
}

export interface DetalleGRInput {
  id_producto?: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  orden: number;
}

export interface GuiaRemisionCreateData {
  id_empresa: number;
  id_usuario: number;
  id_punto_emision: number;
  id_ambiente: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  fecha_emision: string;
  ruc: string;
  ruc_transportista: string;
  razon_social_transportista: string;
  placa: string;
  fecha_ini_transporte: string;
  fecha_fin_transporte: string;
  ruta: string | null;
  id_cliente: number | null;
  dest_identificacion: string;
  dest_razon_social: string;
  direccion_destino: string | null;
  motivo_traslado: string;
  detalles: DetalleGRInput[];
}

export interface GuiaRemisionUpdateData {
  fecha_emision: string;
  ruc_transportista: string;
  razon_social_transportista: string;
  placa: string;
  fecha_ini_transporte: string;
  fecha_fin_transporte: string;
  ruta: string | null;
  id_cliente: number | null;
  dest_identificacion: string;
  dest_razon_social: string;
  direccion_destino: string | null;
  motivo_traslado: string;
  detalles: DetalleGRInput[];
}

export interface GuiaRemisionFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const GuiaRemisionModel = {
  async findAllByEmpresa(empresaId: number, filtros: GuiaRemisionFiltros): Promise<GuiaRemision[]> {
    const condiciones: string[] = ['gr.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`gr.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`gr.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`gr.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(gr.dest_razon_social ILIKE $${idx} OR gr.dest_identificacion ILIKE $${idx} OR gr.numero_comprobante ILIKE $${idx} OR gr.ruc_transportista ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT gr.id, gr.id_empresa, gr.id_usuario, gr.id_punto_emision, gr.id_cliente,
              gr.cod_establecimiento, gr.cod_punto_emision, gr.secuencial, gr.numero_comprobante,
              gr.clave_acceso, gr.numero_autorizacion, gr.estado, gr.fecha_emision, gr.fecha_autorizacion,
              gr.ruc_transportista, gr.razon_social_transportista, gr.placa,
              gr.fecha_ini_transporte, gr.fecha_fin_transporte, gr.ruta,
              gr.dest_identificacion, gr.dest_razon_social, gr.direccion_destino, gr.motivo_traslado,
              gr.respuesta_sri, gr.motivo_rechazo, gr.created_at, gr.updated_at
       FROM guias_remision gr
       WHERE ${where}
       ORDER BY gr.fecha_emision DESC, gr.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<GuiaRemision | null> {
    const result = await pool.query<GuiaRemision>(
      'SELECT * FROM guias_remision WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<GuiaRemisionConDetalles | null> {
    const grResult = await pool.query(
      'SELECT * FROM guias_remision WHERE id = $1',
      [id]
    );
    const gr = grResult.rows[0];
    if (!gr) return null;

    const detResult = await pool.query<DetalleGuiaRemision>(
      'SELECT * FROM detalle_guias_remision WHERE id_guia = $1 ORDER BY orden',
      [id]
    );
    return { ...gr, detalles: detResult.rows };
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

  async create(data: GuiaRemisionCreateData): Promise<GuiaRemisionConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '06']
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) {
        throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');
      }

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAccesoGR(
        data.fecha_ini_transporte,
        data.ruc,
        data.id_ambiente,
        data.cod_establecimiento,
        data.cod_punto_emision,
        secuencial
      );

      const grResult = await client.query(
        `INSERT INTO guias_remision (
          id_empresa, id_usuario, id_punto_emision,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision, ruc_transportista, razon_social_transportista, placa,
          fecha_ini_transporte, fecha_fin_transporte, ruta,
          id_cliente, dest_identificacion, dest_razon_social, direccion_destino, motivo_traslado
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
        ) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_punto_emision,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision, data.ruc_transportista, data.razon_social_transportista, data.placa,
          data.fecha_ini_transporte, data.fecha_fin_transporte, data.ruta ?? null,
          data.id_cliente ?? null, data.dest_identificacion, data.dest_razon_social,
          data.direccion_destino ?? null, data.motivo_traslado,
        ]
      );
      const gr = grResult.rows[0];

      const detalles: DetalleGuiaRemision[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleGuiaRemision>(
          `INSERT INTO detalle_guias_remision (id_guia, id_empresa, id_producto, codigo, descripcion, cantidad, orden)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [gr.id, data.id_empresa, d.id_producto ?? null, d.codigo, d.descripcion, d.cantidad, d.orden]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...gr, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: GuiaRemisionUpdateData): Promise<GuiaRemisionConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const grResult = await client.query(
        `UPDATE guias_remision SET
          fecha_emision = $1, ruc_transportista = $2, razon_social_transportista = $3, placa = $4,
          fecha_ini_transporte = $5, fecha_fin_transporte = $6, ruta = $7,
          id_cliente = $8, dest_identificacion = $9, dest_razon_social = $10,
          direccion_destino = $11, motivo_traslado = $12, updated_at = NOW()
         WHERE id = $13 AND id_empresa = $14 RETURNING *`,
        [
          data.fecha_emision, data.ruc_transportista, data.razon_social_transportista, data.placa,
          data.fecha_ini_transporte, data.fecha_fin_transporte, data.ruta ?? null,
          data.id_cliente ?? null, data.dest_identificacion, data.dest_razon_social,
          data.direccion_destino ?? null, data.motivo_traslado, id, empresaId,
        ]
      );
      const gr = grResult.rows[0];
      if (!gr) throw new Error('Guía de remisión no encontrada.');

      await client.query('DELETE FROM detalle_guias_remision WHERE id_guia = $1', [id]);
      const detalles: DetalleGuiaRemision[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleGuiaRemision>(
          `INSERT INTO detalle_guias_remision (id_guia, id_empresa, id_producto, codigo, descripcion, cantidad, orden)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [id, empresaId, d.id_producto ?? null, d.codigo, d.descripcion, d.cantidad, d.orden]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...gr, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM guias_remision WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<GuiaRemision | null> {
    const result = await pool.query<GuiaRemision>(
      'UPDATE guias_remision SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0] ?? null;
  },

  async actualizarClaveAcceso(id: number, claveAcceso: string): Promise<void> {
    await pool.query(
      'UPDATE guias_remision SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
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
  ): Promise<GuiaRemision | null> {
    const result = await pool.query<GuiaRemision>(
      `UPDATE guias_remision SET
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
