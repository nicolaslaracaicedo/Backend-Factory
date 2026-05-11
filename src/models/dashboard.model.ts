import pool from '../config/database';

export const DashboardModel = {

  async ventasResumen(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN fecha_emision = CURRENT_DATE THEN total ELSE 0 END), 0)                              AS ventas_hoy,
         COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fecha_emision::date) = DATE_TRUNC('month', CURRENT_DATE) THEN total ELSE 0 END), 0) AS ventas_mes,
         COALESCE(SUM(CASE WHEN DATE_TRUNC('year',  fecha_emision::date) = DATE_TRUNC('year',  CURRENT_DATE) THEN total ELSE 0 END), 0) AS ventas_anio,
         COALESCE(SUM(total), 0)                                                                                    AS total_facturado,
         COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fecha_emision::date) = DATE_TRUNC('month', CURRENT_DATE) THEN iva_total ELSE 0 END), 0) AS iva_mes,
         COALESCE(SUM(iva_total), 0)                                                                                AS iva_total_anio
       FROM facturas
       WHERE id_empresa = $1 AND estado = 'AUTORIZADO'`,
      [empresaId]
    );
    return rows[0];
  },

  async ventasPorDia(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT fecha_emision AS fecha,
              COALESCE(SUM(total), 0) AS total,
              COUNT(*) AS cantidad
       FROM facturas
       WHERE id_empresa = $1
         AND estado = 'AUTORIZADO'
         AND fecha_emision::date >= CURRENT_DATE - INTERVAL '29 days'
       GROUP BY fecha_emision
       ORDER BY fecha_emision`,
      [empresaId]
    );
    return rows;
  },

  async ventasPorMes(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', fecha_emision::date), 'YYYY-MM') AS mes,
              COALESCE(SUM(total), 0) AS total,
              COUNT(*) AS cantidad
       FROM facturas
       WHERE id_empresa = $1
         AND estado = 'AUTORIZADO'
         AND fecha_emision::date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
       GROUP BY DATE_TRUNC('month', fecha_emision::date)
       ORDER BY mes`,
      [empresaId]
    );
    return rows;
  },

  async metodosPago(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT forma_pago,
              COUNT(*)               AS cantidad,
              COALESCE(SUM(total), 0) AS total
       FROM facturas
       WHERE id_empresa = $1 AND estado = 'AUTORIZADO'
         AND DATE_TRUNC('year', fecha_emision::date) = DATE_TRUNC('year', CURRENT_DATE)
       GROUP BY forma_pago
       ORDER BY cantidad DESC`,
      [empresaId]
    );
    return rows;
  },

  async conteoDocumentos(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT
         -- FACTURAS
         COUNT(CASE WHEN t = 'F' THEN 1 END)                                       AS facturas_total,
         COUNT(CASE WHEN t = 'F' AND estado = 'AUTORIZADO'  THEN 1 END)            AS facturas_autorizadas,
         COUNT(CASE WHEN t = 'F' AND estado = 'RECHAZADA'   THEN 1 END)            AS facturas_rechazadas,
         COUNT(CASE WHEN t = 'F' AND estado IN ('BORRADOR','ENVIADO') THEN 1 END)  AS facturas_pendientes,
         -- NOTAS CREDITO
         COUNT(CASE WHEN t = 'NC' THEN 1 END)                                      AS nc_total,
         COUNT(CASE WHEN t = 'NC' AND estado = 'AUTORIZADO' THEN 1 END)            AS nc_autorizadas,
         COUNT(CASE WHEN t = 'NC' AND estado = 'RECHAZADA'  THEN 1 END)            AS nc_rechazadas,
         -- NOTAS DEBITO
         COUNT(CASE WHEN t = 'ND' THEN 1 END)                                      AS nd_total,
         COUNT(CASE WHEN t = 'ND' AND estado = 'AUTORIZADO' THEN 1 END)            AS nd_autorizadas,
         COUNT(CASE WHEN t = 'ND' AND estado = 'RECHAZADA'  THEN 1 END)            AS nd_rechazadas,
         -- RETENCIONES
         COUNT(CASE WHEN t = 'R'  THEN 1 END)                                      AS ret_total,
         COUNT(CASE WHEN t = 'R'  AND estado = 'AUTORIZADO' THEN 1 END)            AS ret_autorizadas,
         COUNT(CASE WHEN t = 'R'  AND estado = 'RECHAZADA'  THEN 1 END)            AS ret_rechazadas,
         -- GUIAS
         COUNT(CASE WHEN t = 'GR' THEN 1 END)                                      AS gr_total,
         COUNT(CASE WHEN t = 'GR' AND estado = 'AUTORIZADO' THEN 1 END)            AS gr_autorizadas,
         COUNT(CASE WHEN t = 'GR' AND estado = 'RECHAZADA'  THEN 1 END)            AS gr_rechazadas,
         -- LIQUIDACIONES
         COUNT(CASE WHEN t = 'LC' THEN 1 END)                                      AS lc_total,
         COUNT(CASE WHEN t = 'LC' AND estado = 'AUTORIZADO' THEN 1 END)            AS lc_autorizadas,
         COUNT(CASE WHEN t = 'LC' AND estado = 'RECHAZADA'  THEN 1 END)            AS lc_rechazadas,
         -- TOTALES GLOBALES
         COUNT(CASE WHEN estado = 'AUTORIZADO'              THEN 1 END)            AS total_autorizados,
         COUNT(CASE WHEN estado = 'RECHAZADA'               THEN 1 END)            AS total_rechazados,
         COUNT(CASE WHEN estado IN ('BORRADOR','ENVIADO')   THEN 1 END)            AS total_pendientes
       FROM (
         SELECT id_empresa, estado, 'F'  AS t FROM facturas            WHERE id_empresa = $1
         UNION ALL
         SELECT id_empresa, estado, 'NC' AS t FROM notas_credito        WHERE id_empresa = $1
         UNION ALL
         SELECT id_empresa, estado, 'ND' AS t FROM notas_debito         WHERE id_empresa = $1
         UNION ALL
         SELECT id_empresa, estado, 'R'  AS t FROM retenciones          WHERE id_empresa = $1
         UNION ALL
         SELECT id_empresa, estado, 'GR' AS t FROM guias_remision       WHERE id_empresa = $1
         UNION ALL
         SELECT id_empresa, estado, 'LC' AS t FROM liquidaciones_compra WHERE id_empresa = $1
       ) docs`,
      [empresaId]
    );
    return rows[0];
  },

  async totalRetenido(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fecha_emision::date) = DATE_TRUNC('month', CURRENT_DATE) THEN total_retenido ELSE 0 END), 0) AS retenido_mes,
         COALESCE(SUM(total_retenido), 0) AS retenido_anio
       FROM retenciones
       WHERE id_empresa = $1 AND estado = 'AUTORIZADO'`,
      [empresaId]
    );
    return rows[0];
  },

  async totalesClientes(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM clientes  WHERE id_empresa = $1 AND estado = 'ACTIVO') AS clientes_activos,
         (SELECT COUNT(*) FROM clientes  WHERE id_empresa = $1)                        AS clientes_total,
         (SELECT COUNT(*) FROM proveedores WHERE id_empresa = $1 AND estado = 'ACTIVO') AS proveedores_activos,
         (SELECT COUNT(*) FROM productos  WHERE id_empresa = $1 AND estado = 'ACTIVO') AS productos_activos,
         (SELECT COUNT(*) FROM productos  WHERE id_empresa = $1)                        AS productos_total,
         (SELECT COUNT(*) FROM usuarios   WHERE id_empresa = $1 AND estado = 'ACTIVO') AS usuarios_activos`,
      [empresaId]
    );
    return rows[0];
  },

  async topClientes(empresaId: number, limit = 5) {
    const { rows } = await pool.query(
      `SELECT cli_identificacion,
              cli_razon_social,
              COUNT(*)               AS facturas,
              COALESCE(SUM(total), 0) AS total_comprado
       FROM facturas
       WHERE id_empresa = $1
         AND estado = 'AUTORIZADO'
         AND cli_identificacion != '9999999999999'
         AND DATE_TRUNC('year', fecha_emision::date) = DATE_TRUNC('year', CURRENT_DATE)
       GROUP BY cli_identificacion, cli_razon_social
       ORDER BY total_comprado DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return rows;
  },

  async productosMasVendidos(empresaId: number, limit = 5) {
    const { rows } = await pool.query(
      `SELECT df.codigo,
              df.descripcion,
              COALESCE(SUM(df.cantidad), 0)  AS cantidad_vendida,
              COALESCE(SUM(df.subtotal), 0)  AS total_vendido
       FROM detalle_facturas df
       JOIN facturas f ON f.id = df.id_factura
       WHERE f.id_empresa = $1
         AND f.estado = 'AUTORIZADO'
         AND DATE_TRUNC('year', f.fecha_emision::date) = DATE_TRUNC('year', CURRENT_DATE)
       GROUP BY df.codigo, df.descripcion
       ORDER BY cantidad_vendida DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return rows;
  },

  async facturasCredito(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)               AS cantidad,
              COALESCE(SUM(total), 0) AS total_por_cobrar
       FROM facturas
       WHERE id_empresa = $1
         AND estado = 'AUTORIZADO'
         AND tipo_pago = 'CREDITO'`,
      [empresaId]
    );
    return rows[0];
  },

  async ultimosComprobantes(empresaId: number, limit = 15) {
    const { rows } = await pool.query(
      `SELECT tipo, id, numero_comprobante, estado, destinatario, total, created_at
       FROM (
         SELECT 'Factura'             AS tipo, id, numero_comprobante, estado, cli_razon_social AS destinatario, total::numeric, created_at FROM facturas            WHERE id_empresa = $1
         UNION ALL
         SELECT 'Nota de Crédito',        id, numero_comprobante, estado, cli_razon_social,                total::numeric, created_at FROM notas_credito        WHERE id_empresa = $1
         UNION ALL
         SELECT 'Nota de Débito',         id, numero_comprobante, estado, cli_razon_social,                total::numeric, created_at FROM notas_debito         WHERE id_empresa = $1
         UNION ALL
         SELECT 'Retención',              id, numero_comprobante, estado, prov_razon_social,               total_retenido::numeric, created_at FROM retenciones  WHERE id_empresa = $1
         UNION ALL
         SELECT 'Guía de Remisión',       id, numero_comprobante, estado, dest_razon_social,               NULL::numeric, created_at FROM guias_remision         WHERE id_empresa = $1
         UNION ALL
         SELECT 'Liquidación de Compra',  id, numero_comprobante, estado, razon_social_prov,               total::numeric, created_at FROM liquidaciones_compra  WHERE id_empresa = $1
       ) docs
       ORDER BY created_at DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return rows;
  },

  async actividadReciente(empresaId: number, limit = 10) {
    const { rows } = await pool.query(
      `SELECT id, tipo_documento, accion, ambiente, estado, mensaje, created_at
       FROM log_sri
       WHERE id_empresa = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return rows;
  },

  async firmaActiva(empresaId: number) {
    const { rows } = await pool.query(
      `SELECT id, nombre, fecha_vencimiento, activo,
              (fecha_vencimiento::date - CURRENT_DATE) AS dias_restantes
       FROM firmas_electronicas
       WHERE id_empresa = $1 AND activo = TRUE
       LIMIT 1`,
      [empresaId]
    );
    return rows[0] ?? null;
  },

  async secuencialesPorAgotar(empresaId: number, umbral = 999000000) {
    const { rows } = await pool.query(
      `SELECT s.id, s.tipo_documento, s.secuencial_actual, s.estado,
              (999999999 - s.secuencial_actual) AS restantes,
              e.nombre  AS establecimiento,
              e.codigo  AS cod_establecimiento,
              pe.codigo AS cod_punto_emision,
              td.nombre AS tipo_nombre
       FROM secuenciales s
       JOIN puntos_emision  pe ON pe.id = s.id_punto_emision
       JOIN establecimientos e  ON e.id  = pe.id_establecimiento
       JOIN tipos_documento  td ON td.codigo = s.tipo_documento
       WHERE s.id_empresa = $1
         AND s.estado = 'ACTIVO'
         AND s.secuencial_actual >= $2
       ORDER BY s.secuencial_actual DESC`,
      [empresaId, umbral]
    );
    return rows;
  },
};
