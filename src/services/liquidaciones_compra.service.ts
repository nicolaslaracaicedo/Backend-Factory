import {
  LiquidacionCompraModel,
  LiquidacionCompraCreateData,
  LiquidacionCompraUpdateData,
  DetalleLC_Input,
  generarClaveAccesoLC,
} from '../models/liquidaciones_compra.model';
import { EmpresaModel } from '../models/empresas.model';
import { SecuencialModel } from '../models/secuenciales.model';
import { ProveedorModel } from '../models/proveedores.model';
import { FirmaService } from './firmas_electronicas.service';
import { generarXmlLiquidacionCompra } from '../utils/xml-liquidacion-compra';
import { firmarXml } from '../utils/firma-sri';
import { enviarRecepcion, consultarConReintentos } from '../utils/sri-client';
import { LogSriModel } from '../models/log_sri.model';

const ESTADOS_VALIDOS = ['BORRADOR', 'ENVIADO', 'AUTORIZADO', 'RECHAZADA', 'ANULADA'];
const CODIGOS_IVA_VALIDOS = ['0', '2', '3', '4', '5'];

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function inferirTipoIdProveedor(identificacion: string): string {
  if (identificacion.length === 13) return '04';
  if (identificacion.length === 10) return '05';
  return '06';
}

function calcularLinea(cantidad: number, precio_unitario: number, descuento: number, porcentaje_iva: number, valor_ice = 0, valor_irbpnr = 0) {
  const subtotal = round4(cantidad * precio_unitario - descuento);
  const valor_iva = round4(subtotal * (porcentaje_iva / 100));
  const total = round4(subtotal + valor_iva + valor_ice + valor_irbpnr);
  return { subtotal, valor_iva, total };
}

function calcularTotales(detalles: DetalleLC_Input[]) {
  let sub0 = 0, subIva = 0, descuentoTotal = 0, ivaTotal = 0, iceTotal = 0, irbpnrTotal = 0;

  for (const d of detalles) {
    descuentoTotal += d.descuento;
    ivaTotal += d.valor_iva;
    iceTotal += d.valor_ice;
    irbpnrTotal += d.valor_irbpnr;
    if (d.codigo_iva === '0' || d.codigo_iva === '2' || d.codigo_iva === '3') {
      sub0 += d.subtotal;
    } else {
      subIva += d.subtotal;
    }
  }

  const subtotal_sin_impuesto = round4(sub0 + subIva);
  const total = round4(subtotal_sin_impuesto + ivaTotal + iceTotal + irbpnrTotal);

  return {
    subtotal_sin_impuesto,
    subtotal_0: round4(sub0),
    subtotal_iva: round4(subIva),
    descuento_total: round4(descuentoTotal),
    iva_total: round4(ivaTotal),
    total,
  };
}

async function parseDetalles(raw: unknown[]): Promise<DetalleLC_Input[]> {
  const detalles: DetalleLC_Input[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

    const codigo = typeof d['codigo'] === 'string' && d['codigo'].trim() ? d['codigo'].trim() : '';
    if (!codigo) throw new Error(`Detalle ${orden}: 'codigo' es requerido.`);

    const descripcion = typeof d['descripcion'] === 'string' && d['descripcion'].trim() ? d['descripcion'].trim() : '';
    if (!descripcion) throw new Error(`Detalle ${orden}: 'descripcion' es requerido.`);

    const unidad_medida = typeof d['unidad_medida'] === 'string' && d['unidad_medida'].trim()
      ? d['unidad_medida'].trim()
      : 'UNIDAD';

    const cantidad = Number(d['cantidad'] ?? 1);
    if (isNaN(cantidad) || cantidad <= 0)
      throw new Error(`Detalle ${orden}: 'cantidad' debe ser mayor a 0.`);

    const precio_unitario = Number(d['precio_unitario'] ?? 0);
    if (isNaN(precio_unitario) || precio_unitario < 0)
      throw new Error(`Detalle ${orden}: 'precio_unitario' inválido.`);

    const descuento = Number(d['descuento'] ?? 0);
    if (isNaN(descuento) || descuento < 0)
      throw new Error(`Detalle ${orden}: 'descuento' inválido.`);

    const codigo_iva = typeof d['codigo_iva'] === 'string' ? d['codigo_iva'].trim() : '4';
    if (!CODIGOS_IVA_VALIDOS.includes(codigo_iva))
      throw new Error(`Detalle ${orden}: 'codigo_iva' inválido. Válidos: ${CODIGOS_IVA_VALIDOS.join(', ')}.`);

    const porcentaje_iva = Number(d['porcentaje_iva'] ?? 15);
    if (isNaN(porcentaje_iva) || porcentaje_iva < 0)
      throw new Error(`Detalle ${orden}: 'porcentaje_iva' inválido.`);

    const porcentaje_ice = Number(d['porcentaje_ice'] ?? 0);
    const codigo_ice = d['codigo_ice'] != null && String(d['codigo_ice']).trim()
      ? String(d['codigo_ice']).trim()
      : null;
    const subtotalBruto = round4(cantidad * precio_unitario - descuento);
    const valor_ice = porcentaje_ice > 0
      ? round4(subtotalBruto * (porcentaje_ice / 100))
      : Number(d['valor_ice'] ?? 0);
    const tieneIrbpnr = d['tiene_irbpnr'] === true || d['tiene_irbpnr'] === 'true';
    const valor_unitario_irbpnr = Number(d['valor_unitario_irbpnr'] ?? 0);
    const valor_irbpnr = tieneIrbpnr && valor_unitario_irbpnr > 0
      ? round4(cantidad * valor_unitario_irbpnr)
      : Number(d['valor_irbpnr'] ?? 0);

    const { subtotal, valor_iva, total } = calcularLinea(cantidad, precio_unitario, descuento, porcentaje_iva, valor_ice, valor_irbpnr);

    detalles.push({ codigo, descripcion, unidad_medida, cantidad, precio_unitario, descuento, subtotal, codigo_iva, porcentaje_iva, valor_iva, porcentaje_ice, valor_ice, codigo_ice, valor_irbpnr, total, orden });
  }

  return detalles;
}

async function resolverProveedor(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{ tipo_identificacion_prov: string; identificacion_prov: string; razon_social_prov: string; direccion_prov: string | null }> {
  if (body['id_proveedor']) {
    const id_proveedor = Number(body['id_proveedor']);
    const proveedor = await ProveedorModel.findById(id_proveedor);
    if (!proveedor || proveedor.id_empresa !== empresaId)
      throw new Error('Proveedor no encontrado o no pertenece a la empresa.');
    if (proveedor.estado !== 'ACTIVO')
      throw new Error('El proveedor no está activo.');
    return {
      tipo_identificacion_prov: proveedor.tipo_identificacion,
      identificacion_prov: proveedor.identificacion,
      razon_social_prov: proveedor.razon_social,
      direccion_prov: proveedor.direccion ?? null,
    };
  }

  const identificacion_prov = typeof body['identificacion_prov'] === 'string' ? body['identificacion_prov'].trim() : '';
  if (!identificacion_prov) throw new Error('Se requiere id_proveedor o identificacion_prov.');

  const razon_social_prov = typeof body['razon_social_prov'] === 'string' ? body['razon_social_prov'].trim() : '';
  if (!razon_social_prov) throw new Error('Se requiere id_proveedor o razon_social_prov.');

  const tipo_identificacion_prov = typeof body['tipo_identificacion_prov'] === 'string' && body['tipo_identificacion_prov'].trim()
    ? body['tipo_identificacion_prov'].trim()
    : inferirTipoIdProveedor(identificacion_prov);

  const direccion_prov = typeof body['direccion_prov'] === 'string' && body['direccion_prov'].trim()
    ? body['direccion_prov'].trim()
    : null;

  return { tipo_identificacion_prov, identificacion_prov, razon_social_prov, direccion_prov };
}

export const LiquidacionCompraService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return LiquidacionCompraModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const lc = await LiquidacionCompraModel.findByIdConDetalles(id);
    if (!lc) throw new Error('Liquidación de compra no encontrada.');
    if (lc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta liquidación de compra.');
    return lc;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await LiquidacionCompraModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const secuencial = await SecuencialModel.findByUnique(id_punto_emision, '03');
    if (!secuencial)
      throw new Error('No existe un secuencial de liquidaciones de compra para este punto de emisión. Configúrelo primero.');
    if (secuencial.estado !== 'ACTIVO') throw new Error('El secuencial de liquidaciones de compra no está activo.');

    const fecha_emision = typeof body['fecha_emision'] === 'string' && body['fecha_emision'].trim()
      ? body['fecha_emision'].trim()
      : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const proveedor = await resolverProveedor(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la liquidación de compra.');
    const detalles = await parseDetalles(body['detalles'] as unknown[]);
    const totales = calcularTotales(detalles);

    const createData: LiquidacionCompraCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_punto_emision,
      id_ambiente: empresa.ambiente,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      fecha_emision,
      ruc: empresa.ruc!,
      ...proveedor,
      ...totales,
      detalles,
    };

    return LiquidacionCompraModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const lc = await LiquidacionCompraModel.findById(id);
    if (!lc) throw new Error('Liquidación de compra no encontrada.');
    if (lc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta liquidación de compra.');
    if (!['BORRADOR', 'RECHAZADA'].includes(lc.estado))
      throw new Error('Solo se pueden editar liquidaciones en estado BORRADOR o RECHAZADA.');

    const fecha_emision = typeof body['fecha_emision'] === 'string' && body['fecha_emision'].trim()
      ? body['fecha_emision'].trim()
      : lc.fecha_emision;

    const proveedor = await resolverProveedor(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la liquidación de compra.');
    const detalles = await parseDetalles(body['detalles'] as unknown[]);
    const totales = calcularTotales(detalles);

    const updateData: LiquidacionCompraUpdateData = {
      fecha_emision,
      ...proveedor,
      ...totales,
      detalles,
    };

    const updated = await LiquidacionCompraModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la liquidación de compra.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const lc = await LiquidacionCompraModel.findById(id);
    if (!lc) throw new Error('Liquidación de compra no encontrada.');
    if (lc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta liquidación de compra.');
    if (lc.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar liquidaciones en estado BORRADOR.');

    const ok = await LiquidacionCompraModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la liquidación de compra.');
    return { message: 'Liquidación de compra eliminada correctamente.' };
  },

  async emitir(id: number, empresaId: number) {
    const lc = await LiquidacionCompraModel.findByIdConDetalles(id);
    if (!lc) throw new Error('Liquidación de compra no encontrada.');
    if (lc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta liquidación de compra.');
    if (!['BORRADOR', 'RECHAZADA'].includes(lc.estado))
      throw new Error('Solo se pueden emitir liquidaciones en estado BORRADOR o RECHAZADA.');
    if (!lc.clave_acceso) throw new Error('La liquidación de compra no tiene clave de acceso generada.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const firma = await FirmaService.getActivaParaFirmar(empresaId);
    if (!firma) throw new Error('No hay firma electrónica activa. Configúrela en Empresa > Firma Electrónica.');

    const nuevaClave = generarClaveAccesoLC(
      lc.fecha_emision,
      empresa.ruc!,
      empresa.ambiente,
      lc.cod_establecimiento,
      lc.cod_punto_emision,
      lc.secuencial
    );
    await LiquidacionCompraModel.actualizarClaveAcceso(id, nuevaClave);
    lc.clave_acceso = nuevaClave;

    const dirEstablecimiento = await LiquidacionCompraModel.findDireccionEstablecimiento(lc.id_punto_emision);

    const xmlSinFirmar = generarXmlLiquidacionCompra(lc, empresa, dirEstablecimiento, empresa.ambiente);

    let xmlFirmado: string;
    try {
      xmlFirmado = firmarXml(xmlSinFirmar, firma.archivo_p12, firma.password);
    } catch (e: any) {
      throw new Error(`Error al firmar el XML: ${e.message}`);
    }

    const xmlBase64 = Buffer.from(xmlFirmado, 'utf8').toString('base64');

    let recepcionEstado: string;
    let recepcionMensajes: string[];
    try {
      const recepcion = await enviarRecepcion(xmlBase64, empresa.ambiente);
      recepcionEstado = recepcion.estado;
      recepcionMensajes = recepcion.mensajes;
    } catch (e: any) {
      throw new Error(`Error al conectar con el SRI: ${e.message}`);
    }

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '03',
      id_documento: id,
      clave_acceso: lc.clave_acceso,
      accion: 'RECEPCION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: recepcionEstado,
      request_xml: xmlFirmado,
      mensaje: recepcionMensajes.length > 0 ? recepcionMensajes.join(' | ') : null,
    }).catch(console.error);

    if (recepcionEstado !== 'RECIBIDA') {
      const motivo = recepcionMensajes.length > 0
        ? recepcionMensajes.join(' | ')
        : `Respuesta inesperada del SRI en recepción: "${recepcionEstado || 'sin respuesta'}"`;
      await LiquidacionCompraModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'RECHAZADA',
        respuesta_sri: motivo,
        motivo_rechazo: motivo,
      });
      throw new Error(`Comprobante no recibido por el SRI: ${motivo}`);
    }

    let autorizacion;
    try {
      autorizacion = await consultarConReintentos(lc.clave_acceso, empresa.ambiente);
    } catch (e: any) {
      await LiquidacionCompraModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'ENVIADO',
        respuesta_sri: null,
        motivo_rechazo: null,
      });
      throw new Error(`Liquidación enviada al SRI pero no se pudo consultar autorización: ${e.message}`);
    }

    const nuevoEstado =
      autorizacion.estado === 'AUTORIZADO' ? 'AUTORIZADO' :
      autorizacion.estado === 'EN PROCESAMIENTO' ? 'ENVIADO' : 'RECHAZADA';

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '03',
      id_documento: id,
      clave_acceso: lc.clave_acceso,
      accion: 'AUTORIZACION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: autorizacion.estado,
      response_xml: autorizacion.xmlAutorizado || null,
      mensaje: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
    }).catch(console.error);

    return LiquidacionCompraModel.actualizarEmision(id, {
      xml_generado: xmlFirmado,
      xml_autorizado: autorizacion.xmlAutorizado,
      numero_autorizacion: autorizacion.numeroAutorizacion,
      fecha_autorizacion: autorizacion.fechaAutorizacion || null,
      estado: nuevoEstado,
      respuesta_sri: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
      motivo_rechazo: nuevoEstado === 'RECHAZADA'
        ? (autorizacion.mensajes.join(' | ') || `Estado SRI: ${autorizacion.estado || 'sin respuesta'}`)
        : null,
    });
  },

  async cambiarEstado(id: number, empresaId: number, body: Record<string, unknown>) {
    const lc = await LiquidacionCompraModel.findById(id);
    if (!lc) throw new Error('Liquidación de compra no encontrada.');
    if (lc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta liquidación de compra.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (lc.estado === nuevoEstado)
      throw new Error(`La liquidación ya se encuentra en estado ${nuevoEstado}.`);
    if (lc.estado !== 'BORRADOR' && nuevoEstado !== 'ANULADA')
      throw new Error('Solo se puede anular una liquidación que no está en BORRADOR.');

    const actualizada = await LiquidacionCompraModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },
};
