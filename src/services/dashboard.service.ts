import { DashboardModel } from '../models/dashboard.model';
import { EmpresaModel } from '../models/empresas.model';

const FORMA_PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '15': 'Compensación de deudas', '16': 'Tarjeta de débito',
  '17': 'Dinero electrónico', '18': 'Tarjeta prepago', '19': 'Tarjeta de crédito',
  '20': 'Otros con sistema financiero', '21': 'Endoso de títulos',
};

const TIPO_DOC_LABEL: Record<string, string> = {
  '01': 'Factura', '04': 'Nota de Crédito', '05': 'Nota de Débito',
  '06': 'Guía de Remisión', '07': 'Retención', '03': 'Liquidación de Compra',
};

export const DashboardService = {
  async obtener(empresaId: number) {
    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');

    const [
      ventasResumen,
      ventasPorDia,
      ventasPorMes,
      metodosPago,
      conteoDocumentos,
      totalRetenido,
      totalesClientes,
      topClientes,
      productosMasVendidos,
      facturasCredito,
      ultimosComprobantes,
      actividadReciente,
      firma,
      secuencialesPorAgotar,
    ] = await Promise.all([
      DashboardModel.ventasResumen(empresaId),
      DashboardModel.ventasPorDia(empresaId),
      DashboardModel.ventasPorMes(empresaId),
      DashboardModel.metodosPago(empresaId),
      DashboardModel.conteoDocumentos(empresaId),
      DashboardModel.totalRetenido(empresaId),
      DashboardModel.totalesClientes(empresaId),
      DashboardModel.topClientes(empresaId),
      DashboardModel.productosMasVendidos(empresaId),
      DashboardModel.facturasCredito(empresaId),
      DashboardModel.ultimosComprobantes(empresaId),
      DashboardModel.actividadReciente(empresaId),
      DashboardModel.firmaActiva(empresaId),
      DashboardModel.secuencialesPorAgotar(empresaId),
    ]);

    const metodosPagoLabeled = metodosPago.map((m: any) => ({
      ...m,
      label: FORMA_PAGO_LABEL[m.forma_pago] ?? m.forma_pago,
    }));

    const actividadLabeled = actividadReciente.map((a: any) => ({
      ...a,
      tipo_label: TIPO_DOC_LABEL[a.tipo_documento] ?? a.tipo_documento,
    }));

    // Alertas del sistema
    const alertas: Array<{ tipo: string; mensaje: string }> = [];

    if (!empresa.smtp_host || !empresa.smtp_user || !empresa.smtp_password_enc) {
      alertas.push({ tipo: 'warning', mensaje: 'El correo SMTP no está configurado. Los documentos no se enviarán automáticamente.' });
    }
    if (!firma) {
      alertas.push({ tipo: 'danger', mensaje: 'No hay firma electrónica activa. No se pueden emitir documentos.' });
    } else if (Number(firma.dias_restantes) <= 30) {
      alertas.push({ tipo: 'danger', mensaje: `La firma electrónica vence en ${firma.dias_restantes} día(s).` });
    } else if (Number(firma.dias_restantes) <= 90) {
      alertas.push({ tipo: 'warning', mensaje: `La firma electrónica vence en ${firma.dias_restantes} día(s).` });
    }
    if (secuencialesPorAgotar.length > 0) {
      alertas.push({ tipo: 'warning', mensaje: `${secuencialesPorAgotar.length} secuencial(es) próximos a agotarse.` });
    }
    if (empresa.ambiente === 1) {
      alertas.push({ tipo: 'info', mensaje: 'La empresa está en ambiente de PRUEBAS. Los documentos no tienen validez tributaria.' });
    }

    return {
      ventas: {
        hoy:           Number(ventasResumen.ventas_hoy),
        mes:           Number(ventasResumen.ventas_mes),
        anio:          Number(ventasResumen.ventas_anio),
        total_facturado: Number(ventasResumen.total_facturado),
        por_dia:       ventasPorDia.map((r: any) => ({ fecha: r.fecha, total: Number(r.total), cantidad: Number(r.cantidad) })),
        por_mes:       ventasPorMes.map((r: any) => ({ mes: r.mes, total: Number(r.total), cantidad: Number(r.cantidad) })),
        metodos_pago:  metodosPagoLabeled,
      },
      documentos: {
        facturas:           { total: Number(conteoDocumentos.facturas_total),   autorizados: Number(conteoDocumentos.facturas_autorizadas),   rechazados: Number(conteoDocumentos.facturas_rechazadas),   pendientes: Number(conteoDocumentos.facturas_pendientes) },
        notas_credito:      { total: Number(conteoDocumentos.nc_total),         autorizados: Number(conteoDocumentos.nc_autorizadas),         rechazados: Number(conteoDocumentos.nc_rechazadas) },
        notas_debito:       { total: Number(conteoDocumentos.nd_total),         autorizados: Number(conteoDocumentos.nd_autorizadas),         rechazados: Number(conteoDocumentos.nd_rechazadas) },
        retenciones:        { total: Number(conteoDocumentos.ret_total),        autorizados: Number(conteoDocumentos.ret_autorizadas),        rechazados: Number(conteoDocumentos.ret_rechazadas) },
        guias_remision:     { total: Number(conteoDocumentos.gr_total),         autorizados: Number(conteoDocumentos.gr_autorizadas),         rechazados: Number(conteoDocumentos.gr_rechazadas) },
        liquidaciones_compra: { total: Number(conteoDocumentos.lc_total),       autorizados: Number(conteoDocumentos.lc_autorizadas),         rechazados: Number(conteoDocumentos.lc_rechazadas) },
        total_autorizados:  Number(conteoDocumentos.total_autorizados),
        total_rechazados:   Number(conteoDocumentos.total_rechazados),
        total_pendientes:   Number(conteoDocumentos.total_pendientes),
        recientes:          ultimosComprobantes,
      },
      tributario: {
        iva_mes:        Number(ventasResumen.iva_mes),
        iva_anio:       Number(ventasResumen.iva_total_anio),
        retenido_mes:   Number(totalRetenido.retenido_mes),
        retenido_anio:  Number(totalRetenido.retenido_anio),
      },
      clientes_productos: {
        clientes_activos:    Number(totalesClientes.clientes_activos),
        clientes_total:      Number(totalesClientes.clientes_total),
        proveedores_activos: Number(totalesClientes.proveedores_activos),
        productos_activos:   Number(totalesClientes.productos_activos),
        productos_total:     Number(totalesClientes.productos_total),
        top_clientes:        topClientes,
        productos_mas_vendidos: productosMasVendidos,
      },
      pagos: {
        facturas_credito:  Number(facturasCredito.cantidad),
        total_por_cobrar:  Number(facturasCredito.total_por_cobrar),
      },
      sistema: {
        empresa:           { razon_social: empresa.razon_social, ruc: empresa.ruc, ambiente: empresa.ambiente === 2 ? 'PRODUCCIÓN' : 'PRUEBAS' },
        smtp_configurado:  !!(empresa.smtp_host && empresa.smtp_user && empresa.smtp_password_enc),
        firma:             firma ? (() => {
          const dias = Number(firma.dias_restantes);
          const estado_firma = dias < 0 ? 'VENCIDA' : dias <= 30 ? 'CRITICO' : dias <= 90 ? 'POR_VENCER' : 'VIGENTE';
          return { activa: true, nombre: firma.nombre, fecha_vencimiento: firma.fecha_vencimiento, dias_restantes: dias, estado: estado_firma };
        })() : { activa: false, estado: 'SIN_FIRMA' },
        usuarios_activos:  Number(totalesClientes.usuarios_activos),
        secuenciales_por_agotar: secuencialesPorAgotar,
        alertas,
      },
      actividad_reciente: actividadLabeled,
    };
  },
};
