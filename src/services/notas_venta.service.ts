import {
  NotaVentaModel,
  NotaVentaCreateData,
  NotaVentaUpdateData,
  DetalleNVInput,
  generarClaveAccesoNV,
} from '../models/notas_venta.model';
import { EmpresaModel } from '../models/empresas.model';
import { ClienteModel } from '../models/clientes.model';
import { FirmaService } from './firmas_electronicas.service';
import { generarXmlNotaVenta } from '../utils/xml-nota-venta';
import { firmarXml } from '../utils/firma-sri';
import { enviarRecepcion, consultarConReintentos } from '../utils/sri-client';
import { LogSriModel } from '../models/log_sri.model';

const ESTADOS_VALIDOS = ['BORRADOR', 'ENVIADO', 'AUTORIZADO', 'RECHAZADA', 'ANULADA'];

function round2(n: number): number {
  return Math.round(n * 100 + 1e-9) / 100;
}

function parseDetalles(raw: unknown[]): DetalleNVInput[] {
  return raw.map((item, i) => {
    const d = item as Record<string, unknown>;
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

    const subtotal = round2(cantidad * precio_unitario - descuento);
    const total = subtotal;

    const id_producto = d['id_producto'] ? Number(d['id_producto']) : undefined;

    return { id_producto, codigo, descripcion, unidad_medida, cantidad, precio_unitario, descuento, subtotal, total, orden };
  });
}

function calcularTotales(detalles: DetalleNVInput[]) {
  let subtotal_sin_impuesto = 0;
  let descuento_total = 0;

  for (const d of detalles) {
    subtotal_sin_impuesto += d.subtotal;
    descuento_total += d.descuento;
  }

  return {
    subtotal_sin_impuesto: round2(subtotal_sin_impuesto),
    descuento_total: round2(descuento_total),
    total: round2(subtotal_sin_impuesto),
  };
}

async function resolverCliente(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{
  id_cliente: number | null;
  cli_identificacion: string;
  cli_razon_social: string;
  cli_direccion: string | null;
  cli_telefono: string | null;
  cli_email: string | null;
}> {
  if (body['consumidor_final'] === true) {
    return {
      id_cliente: null,
      cli_identificacion: '9999999999',
      cli_razon_social: 'CONSUMIDOR FINAL',
      cli_direccion: null,
      cli_telefono: null,
      cli_email: null,
    };
  }

  if (body['id_cliente']) {
    const id_cliente = Number(body['id_cliente']);
    const cliente = await ClienteModel.findById(id_cliente);
    if (!cliente || cliente.id_empresa !== empresaId)
      throw new Error('Cliente no encontrado o no pertenece a la empresa.');
    return {
      id_cliente,
      cli_identificacion: cliente.identificacion,
      cli_razon_social: cliente.razon_social,
      cli_direccion: cliente.direccion ?? null,
      cli_telefono: cliente.telefono ?? null,
      cli_email: cliente.email ?? null,
    };
  }

  const cli_identificacion = typeof body['cli_identificacion'] === 'string' && body['cli_identificacion'].trim()
    ? body['cli_identificacion'].trim()
    : '9999999999';
  const cli_razon_social = typeof body['cli_razon_social'] === 'string' && body['cli_razon_social'].trim()
    ? body['cli_razon_social'].trim()
    : 'CONSUMIDOR FINAL';
  const cli_direccion = typeof body['cli_direccion'] === 'string' && body['cli_direccion'].trim()
    ? body['cli_direccion'].trim()
    : null;
  const cli_telefono = typeof body['cli_telefono'] === 'string' && body['cli_telefono'].trim()
    ? body['cli_telefono'].trim()
    : null;
  const cli_email = typeof body['cli_email'] === 'string' && body['cli_email'].trim()
    ? body['cli_email'].trim()
    : null;

  return { id_cliente: null, cli_identificacion, cli_razon_social, cli_direccion, cli_telefono, cli_email };
}

export const NotaVentaService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return NotaVentaModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const nv = await NotaVentaModel.findByIdConDetalles(id);
    if (!nv) throw new Error('Nota de venta no encontrada.');
    if (nv.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de venta.');
    return nv;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await NotaVentaModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');

    const fecha_emision = typeof body['fecha_emision'] === 'string' && body['fecha_emision'].trim()
      ? body['fecha_emision'].trim()
      : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const forma_pago = typeof body['forma_pago'] === 'string' && body['forma_pago'].trim()
      ? body['forma_pago'].trim()
      : '01';

    const observacion = typeof body['observacion'] === 'string' && body['observacion'].trim()
      ? body['observacion'].trim()
      : null;

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la nota de venta.');
    const detalles = parseDetalles(body['detalles'] as unknown[]);
    const totales = calcularTotales(detalles);

    const cliente = await resolverCliente(body, empresaId);

    const createData: NotaVentaCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_punto_emision,
      id_ambiente: empresa.ambiente,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      fecha_emision,
      ruc: empresa.ruc,
      forma_pago,
      observacion,
      ...cliente,
      ...totales,
      detalles,
    };

    return NotaVentaModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const nv = await NotaVentaModel.findById(id);
    if (!nv) throw new Error('Nota de venta no encontrada.');
    if (nv.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de venta.');
    if (!['BORRADOR', 'RECHAZADA'].includes(nv.estado))
      throw new Error('Solo se pueden editar notas de venta en estado BORRADOR o RECHAZADA.');

    const fecha_emision = typeof body['fecha_emision'] === 'string' && body['fecha_emision'].trim()
      ? body['fecha_emision'].trim()
      : String(nv.fecha_emision);

    const forma_pago = typeof body['forma_pago'] === 'string' && body['forma_pago'].trim()
      ? body['forma_pago'].trim()
      : nv.forma_pago;

    const observacion = typeof body['observacion'] === 'string' && body['observacion'].trim()
      ? body['observacion'].trim()
      : null;

    const cliente = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la nota de venta.');
    const detalles = parseDetalles(body['detalles'] as unknown[]);
    const totales = calcularTotales(detalles);

    const updateData: NotaVentaUpdateData = {
      fecha_emision,
      forma_pago,
      observacion,
      ...cliente,
      ...totales,
      detalles,
    };

    const updated = await NotaVentaModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la nota de venta.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const nv = await NotaVentaModel.findById(id);
    if (!nv) throw new Error('Nota de venta no encontrada.');
    if (nv.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de venta.');
    if (nv.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar notas de venta en estado BORRADOR.');

    const ok = await NotaVentaModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la nota de venta.');
    return { message: 'Nota de venta eliminada correctamente.' };
  },

  async emitir(id: number, empresaId: number) {
    const nv = await NotaVentaModel.findByIdConDetalles(id);
    if (!nv) throw new Error('Nota de venta no encontrada.');
    if (nv.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de venta.');
    if (!['BORRADOR', 'RECHAZADA'].includes(nv.estado))
      throw new Error('Solo se pueden emitir notas de venta en estado BORRADOR o RECHAZADA.');
    if (!nv.clave_acceso) throw new Error('La nota de venta no tiene clave de acceso generada.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const firma = await FirmaService.getActivaParaFirmar(empresaId);
    if (!firma) throw new Error('No hay firma electrónica activa. Configúrela en Empresa > Firma Electrónica.');

    const nuevaClave = generarClaveAccesoNV(
      String(nv.fecha_emision),
      empresa.ruc!,
      empresa.ambiente,
      nv.cod_establecimiento,
      nv.cod_punto_emision,
      nv.secuencial,
    );
    await NotaVentaModel.actualizarClaveAcceso(id, nuevaClave);
    nv.clave_acceso = nuevaClave;

    const dirEstablecimiento = await NotaVentaModel.findDireccionEstablecimiento(nv.id_punto_emision);

    const xmlSinFirmar = generarXmlNotaVenta(nv, empresa, dirEstablecimiento, empresa.ambiente);

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
      tipo_documento: '02',
      id_documento: id,
      clave_acceso: nv.clave_acceso,
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
      await NotaVentaModel.actualizarEmision(id, {
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
      autorizacion = await consultarConReintentos(nv.clave_acceso, empresa.ambiente);
    } catch (e: any) {
      await NotaVentaModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'ENVIADO',
        respuesta_sri: null,
        motivo_rechazo: null,
      });
      throw new Error(`Nota de venta enviada al SRI pero no se pudo consultar autorización: ${e.message}`);
    }

    const nuevoEstado =
      autorizacion.estado === 'AUTORIZADO' ? 'AUTORIZADO' :
      autorizacion.estado === 'EN PROCESAMIENTO' ? 'ENVIADO' : 'RECHAZADA';

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '02',
      id_documento: id,
      clave_acceso: nv.clave_acceso,
      accion: 'AUTORIZACION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: autorizacion.estado,
      response_xml: autorizacion.xmlAutorizado || null,
      mensaje: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
    }).catch(console.error);

    return NotaVentaModel.actualizarEmision(id, {
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
    const nv = await NotaVentaModel.findById(id);
    if (!nv) throw new Error('Nota de venta no encontrada.');
    if (nv.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de venta.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (nv.estado === nuevoEstado)
      throw new Error(`La nota de venta ya se encuentra en estado ${nuevoEstado}.`);
    if (nv.estado !== 'BORRADOR' && nuevoEstado !== 'ANULADA')
      throw new Error('Solo se puede anular una nota de venta que no está en BORRADOR.');

    const actualizada = await NotaVentaModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },
};
