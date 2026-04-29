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

export function generarClaveAccesoRet(
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
  const cuerpo = `${fecha}07${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

export interface Retencion {
  id: number;
  id_empresa: number;
  id_usuario: number;
  id_proveedor: number | null;
  id_factura_ref: number | null;
  id_punto_emision: number;
  comprobante_ref_numero: string | null;
  comprobante_ref_fecha: string | null;
  cod_establecimiento: string;
  cod_punto_emision: string;
  secuencial: string;
  numero_comprobante: string | null;
  clave_acceso: string | null;
  numero_autorizacion: string | null;
  estado: string;
  fecha_emision: string;
  fecha_autorizacion: Date | null;
  prov_identificacion: string | null;
  prov_razon_social: string | null;
  total_retenido: number;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DetalleRetencion {
  id: number;
  id_retencion: number;
  id_empresa: number;
  tipo: string;
  codigo: string;
  descripcion: string;
  base_imponible: number;
  porcentaje: number;
  valor_retenido: number;
  orden: number;
}

export interface RetencionConDetalles extends Retencion {
  detalles: DetalleRetencion[];
}

export interface DetalleRetInput {
  tipo: string;
  codigo: string;
  descripcion: string;
  base_imponible: number;
  porcentaje: number;
  valor_retenido: number;
  orden: number;
}

export interface RetencionCreateData {
  id_empresa: number;
  id_usuario: number;
  id_proveedor: number | null;
  id_factura_ref: number | null;
  id_punto_emision: number;
  comprobante_ref_numero: string | null;
  comprobante_ref_fecha: string | null;
  cod_establecimiento: string;
  cod_punto_emision: string;
  prov_identificacion: string;
  prov_razon_social: string;
  fecha_emision: string;
  total_retenido: number;
  ruc: string;
  ambiente: number;
  detalles: DetalleRetInput[];
}

export interface RetencionUpdateData {
  id_proveedor: number | null;
  id_factura_ref: number | null;
  comprobante_ref_numero: string | null;
  comprobante_ref_fecha: string | null;
  prov_identificacion: string;
  prov_razon_social: string;
  fecha_emision: string;
  total_retenido: number;
  detalles: DetalleRetInput[];
}

export interface RetencionFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const RetencioneModel = {
  async findAllByEmpresa(empresaId: number, filtros: RetencionFiltros): Promise<Retencion[]> {
    const condiciones: string[] = ['r.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`r.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`r.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`r.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(r.prov_razon_social ILIKE $${idx} OR r.prov_identificacion ILIKE $${idx} OR r.numero_comprobante ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT r.id, r.id_empresa, r.id_usuario, r.id_proveedor, r.id_factura_ref,
              r.id_punto_emision, r.comprobante_ref_numero, r.comprobante_ref_fecha,
              r.cod_establecimiento, r.cod_punto_emision, r.secuencial, r.numero_comprobante,
              r.clave_acceso, r.numero_autorizacion, r.estado, r.fecha_emision, r.fecha_autorizacion,
              r.prov_identificacion, r.prov_razon_social, r.total_retenido,
              r.created_at, r.updated_at
       FROM retenciones r
       WHERE ${where}
       ORDER BY r.fecha_emision DESC, r.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Retencion | null> {
    const result = await pool.query(
      'SELECT * FROM retenciones WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<RetencionConDetalles | null> {
    const rResult = await pool.query('SELECT * FROM retenciones WHERE id = $1', [id]);
    const r = rResult.rows[0];
    if (!r) return null;

    const detResult = await pool.query<DetalleRetencion>(
      'SELECT * FROM detalle_retenciones WHERE id_retencion = $1 ORDER BY orden',
      [id]
    );
    return { ...r, detalles: detResult.rows };
  },

  async findPuntoEmision(puntoEmisionId: number, empresaId: number) {
    const result = await pool.query(
      `SELECT pe.id, e.codigo AS cod_establecimiento, pe.codigo AS cod_punto_emision, pe.estado
       FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1 AND pe.id_empresa = $2`,
      [puntoEmisionId, empresaId]
    );
    return result.rows[0] ?? null;
  },

  async findDireccionEstablecimiento(puntoEmisionId: number): Promise<string> {
    const result = await pool.query<{ direccion: string | null }>(
      `SELECT e.direccion FROM puntos_emision pe
       JOIN establecimientos e ON e.id = pe.id_establecimiento
       WHERE pe.id = $1`,
      [puntoEmisionId]
    );
    return result.rows[0]?.direccion ?? '';
  },

  async create(data: RetencionCreateData): Promise<RetencionConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '07']
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAccesoRet(
        data.fecha_emision, data.ruc, data.ambiente,
        data.cod_establecimiento, data.cod_punto_emision, secuencial
      );

      const rResult = await client.query(
        `INSERT INTO retenciones (
          id_empresa, id_usuario, id_proveedor, id_factura_ref, id_punto_emision, id_ambiente,
          comprobante_ref_numero, comprobante_ref_fecha,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision, prov_identificacion, prov_razon_social, total_retenido
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_proveedor, data.id_factura_ref,
          data.id_punto_emision, data.ambiente,
          data.comprobante_ref_numero, data.comprobante_ref_fecha,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision, data.prov_identificacion, data.prov_razon_social, data.total_retenido,
        ]
      );
      const r = rResult.rows[0];

      const detalles: DetalleRetencion[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleRetencion>(
          `INSERT INTO detalle_retenciones (id_retencion, id_empresa, tipo, codigo, descripcion, base_imponible, porcentaje, valor_retenido, orden)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [r.id, data.id_empresa, d.tipo, d.codigo, d.descripcion, d.base_imponible, d.porcentaje, d.valor_retenido, d.orden]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...r, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: RetencionUpdateData): Promise<RetencionConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rResult = await client.query(
        `UPDATE retenciones SET
          id_proveedor = $1, id_factura_ref = $2,
          comprobante_ref_numero = $3, comprobante_ref_fecha = $4,
          prov_identificacion = $5, prov_razon_social = $6,
          fecha_emision = $7, total_retenido = $8, updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [
          data.id_proveedor, data.id_factura_ref,
          data.comprobante_ref_numero, data.comprobante_ref_fecha,
          data.prov_identificacion, data.prov_razon_social,
          data.fecha_emision, data.total_retenido, id,
        ]
      );
      const r = rResult.rows[0];
      if (!r) throw new Error('Retención no encontrada.');

      await client.query('DELETE FROM detalle_retenciones WHERE id_retencion = $1', [id]);
      const detalles: DetalleRetencion[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleRetencion>(
          `INSERT INTO detalle_retenciones (id_retencion, id_empresa, tipo, codigo, descripcion, base_imponible, porcentaje, valor_retenido, orden)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [id, empresaId, d.tipo, d.codigo, d.descripcion, d.base_imponible, d.porcentaje, d.valor_retenido, d.orden]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...r, detalles };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async actualizarClaveAcceso(id: number, claveAcceso: string): Promise<void> {
    await pool.query(
      'UPDATE retenciones SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
      [claveAcceso, id]
    );
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM retenciones WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<Retencion | null> {
    const result = await pool.query<Retencion>(
      'UPDATE retenciones SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
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
  ): Promise<Retencion | null> {
    const result = await pool.query<Retencion>(
      `UPDATE retenciones SET
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
