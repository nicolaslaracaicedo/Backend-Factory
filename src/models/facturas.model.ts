import pool from '../config/database';

// ----- helpers clave de acceso SRI -----

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

export function generarClaveAcceso(
  fechaEmision: string,       // YYYY-MM-DD
  ruc: string,
  ambiente: number,
  codEstablecimiento: string,
  codPuntoEmision: string,
  secuencial: string          // 9 dígitos
): string {
  const [yyyy, mm, dd] = fechaEmision.split('-');
  const fecha = `${dd}${mm}${yyyy}`;
  const codigoNumerico = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const cuerpo = `${fecha}01${ruc}${ambiente}${codEstablecimiento}${codPuntoEmision}${secuencial}${codigoNumerico}1`;
  return `${cuerpo}${modulo11(cuerpo)}`;
}

// ---------------------------------------

export interface Factura {
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
  fecha_emision: string;       // YYYY-MM-DD
  fecha_autorizacion: Date | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  forma_pago: string;
  tipo_pago: string;
  dias_plazo: number;
  regimen: string;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  subtotal_no_objeto_iva: number;
  subtotal_exento_iva: number;
  descuento_total: number;
  valor_ice: number;
  valor_irbpnr: number;
  iva_porcentaje: number;
  iva_total: number;
  total: number;
  xml_generado: string | null;
  xml_autorizado: string | null;
  pdf_url: string | null;
  respuesta_sri: string | null;
  motivo_rechazo: string | null;
  observacion: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DetalleFactura {
  id: number;
  id_factura: number;
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
  valor_ice: number;
  valor_irbpnr: number;
  total: number;
  orden: number;
}

export interface DatoAdicional {
  id: number;
  id_factura: number;
  id_empresa: number;
  nombre: string;
  valor: string;
  orden: number;
}

export interface FacturaConDetalles extends Factura {
  detalles: DetalleFactura[];
  datos_adicionales: DatoAdicional[];
}

export interface DetalleInput {
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
  valor_ice: number;
  valor_irbpnr: number;
  total: number;
  orden: number;
}

export interface DatoAdicionalInput {
  nombre: string;
  valor: string;
  orden: number;
}

export interface FacturaCreateData {
  id_empresa: number;
  id_usuario: number;
  id_cliente: number | null;
  id_punto_emision: number;
  id_ambiente: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  cli_identificacion: string;
  cli_razon_social: string;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  fecha_emision: string;
  forma_pago: string;
  tipo_pago: string;
  dias_plazo: number;
  regimen: string;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  subtotal_no_objeto_iva: number;
  subtotal_exento_iva: number;
  descuento_total: number;
  valor_ice: number;
  valor_irbpnr: number;
  iva_porcentaje: number;
  iva_total: number;
  total: number;
  observacion: string | null;
  ruc: string;
  detalles: DetalleInput[];
  datos_adicionales: DatoAdicionalInput[];
}

export interface FacturaUpdateData {
  id_cliente: number | null;
  cli_identificacion: string;
  cli_razon_social: string;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
  fecha_emision: string;
  forma_pago: string;
  tipo_pago: string;
  dias_plazo: number;
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  subtotal_no_objeto_iva: number;
  subtotal_exento_iva: number;
  descuento_total: number;
  valor_ice: number;
  valor_irbpnr: number;
  iva_porcentaje: number;
  iva_total: number;
  total: number;
  observacion: string | null;
  detalles: DetalleInput[];
  datos_adicionales: DatoAdicionalInput[];
}

export interface FacturaFiltros {
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export interface PuntoEmisionInfo {
  id: number;
  id_establecimiento: number;
  cod_establecimiento: string;
  cod_punto_emision: string;
  estado: string;
}

export const FacturaModel = {
  async findAllByEmpresa(empresaId: number, filtros: FacturaFiltros): Promise<Factura[]> {
    const condiciones: string[] = ['f.id_empresa = $1'];
    const params: unknown[] = [empresaId];
    let idx = 2;

    if (filtros.estado) {
      condiciones.push(`f.estado = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.fecha_desde) {
      condiciones.push(`f.fecha_emision >= $${idx++}`);
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      condiciones.push(`f.fecha_emision <= $${idx++}`);
      params.push(filtros.fecha_hasta);
    }
    if (filtros.search) {
      condiciones.push(
        `(f.cli_razon_social ILIKE $${idx} OR f.cli_identificacion ILIKE $${idx} OR f.numero_comprobante ILIKE $${idx})`
      );
      params.push(`%${filtros.search}%`);
      idx++;
    }

    const where = condiciones.join(' AND ');
    const result = await pool.query(
      `SELECT f.id, f.id_empresa, f.id_usuario, f.id_cliente, f.id_punto_emision, f.id_ambiente,
              f.cod_establecimiento, f.cod_punto_emision, f.secuencial, f.numero_comprobante,
              f.clave_acceso, f.numero_autorizacion, f.estado, f.fecha_emision, f.fecha_autorizacion,
              f.cli_identificacion, f.cli_razon_social, f.cli_email,
              f.forma_pago, f.tipo_pago, f.dias_plazo, f.regimen,
              f.subtotal_sin_impuesto, f.descuento_total, f.iva_total, f.total,
              f.created_at, f.updated_at,
              a.nombre AS ambiente_nombre
       FROM facturas f
       JOIN ambiente a ON a.id = f.id_ambiente
       WHERE ${where}
       ORDER BY f.fecha_emision DESC, f.id DESC`,
      params
    );
    return result.rows;
  },

  async findById(id: number): Promise<Factura | null> {
    const result = await pool.query(
      `SELECT f.*, a.nombre AS ambiente_nombre
       FROM facturas f
       JOIN ambiente a ON a.id = f.id_ambiente
       WHERE f.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdConDetalles(id: number): Promise<FacturaConDetalles | null> {
    const factResult = await pool.query(
      `SELECT f.*, a.nombre AS ambiente_nombre
       FROM facturas f
       JOIN ambiente a ON a.id = f.id_ambiente
       WHERE f.id = $1`,
      [id]
    );
    const factura = factResult.rows[0];
    if (!factura) return null;

    const detResult = await pool.query<DetalleFactura>(
      'SELECT * FROM detalle_facturas WHERE id_factura = $1 ORDER BY orden',
      [id]
    );
    const adResult = await pool.query<DatoAdicional>(
      'SELECT * FROM datos_adicionales_factura WHERE id_factura = $1 ORDER BY orden',
      [id]
    );

    return { ...factura, detalles: detResult.rows, datos_adicionales: adResult.rows };
  },

  async findPuntoEmision(puntoEmisionId: number, empresaId: number): Promise<PuntoEmisionInfo | null> {
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

  async create(data: FacturaCreateData): Promise<FacturaConDetalles> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const secResult = await client.query<{ sec: string }>(
        'SELECT get_next_secuencial($1, $2) AS sec',
        [data.id_punto_emision, '01']
      );
      const secNum = secResult.rows[0]?.sec;
      if (!secNum) {
        throw new Error('No se pudo obtener el secuencial. Verifique que esté configurado y activo.');
      }

      const secuencial = String(secNum).padStart(9, '0');
      const numero_comprobante = `${data.cod_establecimiento}-${data.cod_punto_emision}-${secuencial}`;
      const clave_acceso = generarClaveAcceso(
        data.fecha_emision,
        data.ruc,
        data.id_ambiente,
        data.cod_establecimiento,
        data.cod_punto_emision,
        secuencial
      );

      const factResult = await client.query(
        `INSERT INTO facturas (
          id_empresa, id_usuario, id_cliente, id_punto_emision, id_ambiente,
          cod_establecimiento, cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          fecha_emision, cli_identificacion, cli_razon_social, cli_direccion,
          cli_telefono, cli_email, forma_pago, tipo_pago, dias_plazo, regimen,
          subtotal_sin_impuesto, subtotal_0, subtotal_iva, subtotal_no_objeto_iva,
          subtotal_exento_iva, descuento_total, valor_ice, valor_irbpnr,
          iva_porcentaje, iva_total, total, observacion
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
          $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
        ) RETURNING *`,
        [
          data.id_empresa, data.id_usuario, data.id_cliente, data.id_punto_emision, data.id_ambiente,
          data.cod_establecimiento, data.cod_punto_emision, secuencial, numero_comprobante, clave_acceso,
          data.fecha_emision, data.cli_identificacion, data.cli_razon_social, data.cli_direccion,
          data.cli_telefono, data.cli_email, data.forma_pago, data.tipo_pago, data.dias_plazo, data.regimen,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva, data.subtotal_no_objeto_iva,
          data.subtotal_exento_iva, data.descuento_total, data.valor_ice, data.valor_irbpnr,
          data.iva_porcentaje, data.iva_total, data.total, data.observacion,
        ]
      );
      const factura = factResult.rows[0];

      const detalles: DetalleFactura[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleFactura>(
          `INSERT INTO detalle_facturas (
            id_factura, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, valor_ice, valor_irbpnr, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
          [
            factura.id, data.id_empresa, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.valor_ice, d.valor_irbpnr, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      const datosAdicionales: DatoAdicional[] = [];
      for (const da of data.datos_adicionales) {
        const daRes = await client.query<DatoAdicional>(
          `INSERT INTO datos_adicionales_factura (id_factura, id_empresa, nombre, valor, orden)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [factura.id, data.id_empresa, da.nombre, da.valor, da.orden]
        );
        datosAdicionales.push(daRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...factura, detalles, datos_adicionales: datosAdicionales };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id: number, empresaId: number, data: FacturaUpdateData): Promise<FacturaConDetalles | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const factResult = await client.query(
        `UPDATE facturas SET
          id_cliente = $1, cli_identificacion = $2, cli_razon_social = $3,
          cli_direccion = $4, cli_telefono = $5, cli_email = $6,
          fecha_emision = $7, forma_pago = $8, tipo_pago = $9, dias_plazo = $10,
          subtotal_sin_impuesto = $11, subtotal_0 = $12, subtotal_iva = $13,
          subtotal_no_objeto_iva = $14, subtotal_exento_iva = $15, descuento_total = $16,
          valor_ice = $17, valor_irbpnr = $18, iva_porcentaje = $19, iva_total = $20,
          total = $21, observacion = $22, updated_at = NOW()
         WHERE id = $23 RETURNING *`,
        [
          data.id_cliente, data.cli_identificacion, data.cli_razon_social,
          data.cli_direccion, data.cli_telefono, data.cli_email,
          data.fecha_emision, data.forma_pago, data.tipo_pago, data.dias_plazo,
          data.subtotal_sin_impuesto, data.subtotal_0, data.subtotal_iva,
          data.subtotal_no_objeto_iva, data.subtotal_exento_iva, data.descuento_total,
          data.valor_ice, data.valor_irbpnr, data.iva_porcentaje, data.iva_total,
          data.total, data.observacion, id,
        ]
      );
      const factura = factResult.rows[0];
      if (!factura) throw new Error('Factura no encontrada.');

      await client.query('DELETE FROM detalle_facturas WHERE id_factura = $1', [id]);
      const detalles: DetalleFactura[] = [];
      for (const d of data.detalles) {
        const dRes = await client.query<DetalleFactura>(
          `INSERT INTO detalle_facturas (
            id_factura, id_empresa, id_producto, codigo, descripcion, unidad_medida,
            cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva,
            valor_iva, valor_ice, valor_irbpnr, total, orden
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
          [
            id, empresaId, d.id_producto ?? null, d.codigo, d.descripcion, d.unidad_medida,
            d.cantidad, d.precio_unitario, d.descuento, d.subtotal, d.codigo_iva, d.porcentaje_iva,
            d.valor_iva, d.valor_ice, d.valor_irbpnr, d.total, d.orden,
          ]
        );
        detalles.push(dRes.rows[0]!);
      }

      await client.query('DELETE FROM datos_adicionales_factura WHERE id_factura = $1', [id]);
      const datosAdicionales: DatoAdicional[] = [];
      for (const da of data.datos_adicionales) {
        const daRes = await client.query<DatoAdicional>(
          `INSERT INTO datos_adicionales_factura (id_factura, id_empresa, nombre, valor, orden)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [id, empresaId, da.nombre, da.valor, da.orden]
        );
        datosAdicionales.push(daRes.rows[0]!);
      }

      await client.query('COMMIT');
      return { ...factura, detalles, datos_adicionales: datosAdicionales };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM facturas WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async cambiarEstado(id: number, estado: string): Promise<Factura | null> {
    const result = await pool.query<Factura>(
      'UPDATE facturas SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id]
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

  async actualizarClaveAcceso(id: number, claveAcceso: string): Promise<void> {
    await pool.query(
      'UPDATE facturas SET clave_acceso = $1, updated_at = NOW() WHERE id = $2',
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
  ): Promise<Factura | null> {
    const result = await pool.query<Factura>(
      `UPDATE facturas SET
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
