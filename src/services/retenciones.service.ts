import {
  RetencioneModel,
  RetencionCreateData,
  RetencionUpdateData,
  DetalleRetInput,
  generarClaveAccesoRet,
} from '../models/retenciones.model';
import { EmpresaModel } from '../models/empresas.model';
import { SecuencialModel } from '../models/secuenciales.model';
import { ProveedorModel } from '../models/proveedores.model';
import { FacturaModel } from '../models/facturas.model';
import { FirmaService } from './firmas_electronicas.service';
import { generarXmlRetencion } from '../utils/xml-retencion';
import { firmarXml } from '../utils/firma-sri';
import { enviarRecepcion, consultarConReintentos } from '../utils/sri-client';
import { LogSriModel } from '../models/log_sri.model';

const ESTADOS_VALIDOS = ['BORRADOR', 'ENVIADO', 'AUTORIZADO', 'RECHAZADA', 'ANULADA'];
const TIPOS_RETENCION_VALIDOS = ['1', '2', '6'];

function round2(n: number): number {
  return Math.round(n * 100 + 1e-9) / 100;
}

function parseDetalles(raw: unknown[]): DetalleRetInput[] {
  const detalles: DetalleRetInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

    const tipo = typeof d['tipo'] === 'string' ? d['tipo'].trim() : '';
    if (!TIPOS_RETENCION_VALIDOS.includes(tipo))
      throw new Error(`Detalle ${orden}: 'tipo' inválido. Válidos: 1 (Renta), 2 (IVA), 6 (ISD).`);

    const codigo = typeof d['codigo'] === 'string' ? d['codigo'].trim() : '';
    if (!codigo) throw new Error(`Detalle ${orden}: 'codigo' es requerido.`);

    const descripcion = typeof d['descripcion'] === 'string' ? d['descripcion'].trim() : '';
    if (!descripcion) throw new Error(`Detalle ${orden}: 'descripcion' es requerido.`);

    const base_imponible = Number(d['base_imponible']);
    if (isNaN(base_imponible) || base_imponible <= 0)
      throw new Error(`Detalle ${orden}: 'base_imponible' debe ser mayor a 0.`);

    const porcentaje = Number(d['porcentaje']);
    if (isNaN(porcentaje) || porcentaje < 0)
      throw new Error(`Detalle ${orden}: 'porcentaje' inválido.`);

    const valor_retenido = round2(base_imponible * (porcentaje / 100));

    detalles.push({ tipo, codigo, descripcion, base_imponible: round2(base_imponible), porcentaje, valor_retenido, orden });
  }

  return detalles;
}

async function resolverProveedor(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{ id_proveedor: number | null; prov_identificacion: string; prov_razon_social: string }> {
  if (body['id_proveedor']) {
    const id_proveedor = Number(body['id_proveedor']);
    const proveedor = await ProveedorModel.findById(id_proveedor);
    if (!proveedor || proveedor.id_empresa !== empresaId)
      throw new Error('Proveedor no encontrado o no pertenece a la empresa.');
    return { id_proveedor, prov_identificacion: proveedor.identificacion, prov_razon_social: proveedor.razon_social };
  }

  if (!body['prov_identificacion'] || typeof body['prov_identificacion'] !== 'string')
    throw new Error('Se requiere id_proveedor o prov_identificacion.');
  if (!body['prov_razon_social'] || typeof body['prov_razon_social'] !== 'string')
    throw new Error('Se requiere id_proveedor o prov_razon_social.');

  return {
    id_proveedor: null,
    prov_identificacion: (body['prov_identificacion'] as string).trim(),
    prov_razon_social: (body['prov_razon_social'] as string).trim(),
  };
}

async function resolverComprobanteRef(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{ id_factura_ref: number | null; comprobante_ref_numero: string | null; comprobante_ref_fecha: string | null }> {
  if (body['id_factura_ref']) {
    const id_factura_ref = Number(body['id_factura_ref']);
    if (isNaN(id_factura_ref)) throw new Error('id_factura_ref inválido.');
    const factura = await FacturaModel.findById(id_factura_ref);
    if (!factura || factura.id_empresa !== empresaId)
      throw new Error('Factura de referencia no encontrada o no pertenece a la empresa.');
    return {
      id_factura_ref,
      comprobante_ref_numero: factura.numero_comprobante,
      comprobante_ref_fecha: factura.fecha_emision,
    };
  }

  const comprobante_ref_numero = typeof body['comprobante_ref_numero'] === 'string'
    ? body['comprobante_ref_numero'].trim() : null;
  const comprobante_ref_fecha = typeof body['comprobante_ref_fecha'] === 'string'
    ? body['comprobante_ref_fecha'].trim() : null;

  return { id_factura_ref: null, comprobante_ref_numero, comprobante_ref_fecha };
}

export const RetencioneService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return RetencioneModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const r = await RetencioneModel.findByIdConDetalles(id);
    if (!r) throw new Error('Retención no encontrada.');
    if (r.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta retención.');
    return r;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await RetencioneModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const secuencial = await SecuencialModel.findByUnique(id_punto_emision, '07');
    if (!secuencial)
      throw new Error('No existe un secuencial de retenciones para este punto de emisión. Configúrelo primero.');
    if (secuencial.estado !== 'ACTIVO') throw new Error('El secuencial de retenciones no está activo.');

    const proveedorData = await resolverProveedor(body, empresaId);
    const comprobanteRef = await resolverComprobanteRef(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la retención.');
    const detalles = parseDetalles(body['detalles'] as unknown[]);

    const total_retenido = round2(detalles.reduce((sum, d) => sum + d.valor_retenido, 0));

    const fecha_emision = typeof body['fecha_emision'] === 'string'
      ? body['fecha_emision']
      : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const createData: RetencionCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_proveedor: proveedorData.id_proveedor,
      id_factura_ref: comprobanteRef.id_factura_ref,
      id_punto_emision,
      comprobante_ref_numero: comprobanteRef.comprobante_ref_numero,
      comprobante_ref_fecha: comprobanteRef.comprobante_ref_fecha,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      prov_identificacion: proveedorData.prov_identificacion,
      prov_razon_social: proveedorData.prov_razon_social,
      fecha_emision,
      total_retenido,
      ruc: empresa.ruc!,
      ambiente: empresa.ambiente,
      detalles,
    };

    return RetencioneModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const r = await RetencioneModel.findById(id);
    if (!r) throw new Error('Retención no encontrada.');
    if (r.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta retención.');
    if (!['BORRADOR', 'RECHAZADA'].includes(r.estado))
      throw new Error('Solo se pueden editar retenciones en estado BORRADOR o RECHAZADA.');

    const proveedorData = await resolverProveedor(body, empresaId);
    const comprobanteRef = await resolverComprobanteRef(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la retención.');
    const detalles = parseDetalles(body['detalles'] as unknown[]);

    const total_retenido = round2(detalles.reduce((sum, d) => sum + d.valor_retenido, 0));
    const fecha_emision = typeof body['fecha_emision'] === 'string' ? body['fecha_emision'] : r.fecha_emision;

    const updateData: RetencionUpdateData = {
      id_proveedor: proveedorData.id_proveedor,
      id_factura_ref: comprobanteRef.id_factura_ref,
      comprobante_ref_numero: comprobanteRef.comprobante_ref_numero,
      comprobante_ref_fecha: comprobanteRef.comprobante_ref_fecha,
      prov_identificacion: proveedorData.prov_identificacion,
      prov_razon_social: proveedorData.prov_razon_social,
      fecha_emision,
      total_retenido,
      detalles,
    };

    const updated = await RetencioneModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la retención.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const r = await RetencioneModel.findById(id);
    if (!r) throw new Error('Retención no encontrada.');
    if (r.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta retención.');
    if (r.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar retenciones en estado BORRADOR.');

    const ok = await RetencioneModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la retención.');
    return { message: 'Retención eliminada correctamente.' };
  },

  async emitir(id: number, empresaId: number) {
    const r = await RetencioneModel.findByIdConDetalles(id);
    if (!r) throw new Error('Retención no encontrada.');
    if (r.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta retención.');
    if (!['BORRADOR', 'RECHAZADA'].includes(r.estado))
      throw new Error('Solo se pueden emitir retenciones en estado BORRADOR o RECHAZADA.');
    if (!r.clave_acceso) throw new Error('La retención no tiene clave de acceso generada.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const firma = await FirmaService.getActivaParaFirmar(empresaId);
    if (!firma) throw new Error('No hay firma electrónica activa. Configúrela en Empresa > Firma Electrónica.');

    if (r.estado === 'RECHAZADA') {
      const nuevaClave = generarClaveAccesoRet(
        r.fecha_emision, empresa.ruc!, empresa.ambiente,
        r.cod_establecimiento, r.cod_punto_emision, r.secuencial
      );
      await RetencioneModel.actualizarClaveAcceso(id, nuevaClave);
      r.clave_acceso = nuevaClave;
    }

    const dirEstablecimiento = await RetencioneModel.findDireccionEstablecimiento(r.id_punto_emision);
    const xmlSinFirmar = generarXmlRetencion(r, empresa, empresa.ambiente, dirEstablecimiento);

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
      tipo_documento: '07',
      id_documento: id,
      clave_acceso: r.clave_acceso,
      accion: 'RECEPCION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: recepcionEstado,
      request_xml: xmlFirmado,
      mensaje: recepcionMensajes.length > 0 ? recepcionMensajes.join(' | ') : null,
    }).catch(console.error);

    if (recepcionEstado !== 'RECIBIDA') {
      const motivo = recepcionMensajes.length > 0
        ? recepcionMensajes.join(' | ')
        : `Respuesta inesperada del SRI: "${recepcionEstado || 'sin respuesta'}"`;
      await RetencioneModel.actualizarEmision(id, {
        xml_generado: xmlFirmado, xml_autorizado: '', numero_autorizacion: '',
        fecha_autorizacion: null, estado: 'RECHAZADA', respuesta_sri: motivo, motivo_rechazo: motivo,
      });
      throw new Error(`Comprobante no recibido por el SRI: ${motivo}`);
    }

    let autorizacion;
    try {
      autorizacion = await consultarConReintentos(r.clave_acceso, empresa.ambiente);
    } catch (e: any) {
      await RetencioneModel.actualizarEmision(id, {
        xml_generado: xmlFirmado, xml_autorizado: '', numero_autorizacion: '',
        fecha_autorizacion: null, estado: 'ENVIADO', respuesta_sri: null, motivo_rechazo: null,
      });
      throw new Error(`Retención enviada al SRI pero no se pudo consultar autorización: ${e.message}`);
    }

    const nuevoEstado =
      autorizacion.estado === 'AUTORIZADO' ? 'AUTORIZADO' :
      autorizacion.estado === 'EN PROCESAMIENTO' ? 'ENVIADO' : 'RECHAZADA';

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '07',
      id_documento: id,
      clave_acceso: r.clave_acceso,
      accion: 'AUTORIZACION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: autorizacion.estado,
      response_xml: autorizacion.xmlAutorizado || null,
      mensaje: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
    }).catch(console.error);

    return RetencioneModel.actualizarEmision(id, {
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
    const r = await RetencioneModel.findById(id);
    if (!r) throw new Error('Retención no encontrada.');
    if (r.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta retención.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (r.estado === nuevoEstado)
      throw new Error(`La retención ya se encuentra en estado ${nuevoEstado}.`);
    if (r.estado !== 'BORRADOR' && nuevoEstado !== 'ANULADA')
      throw new Error('Solo se puede anular una retención que no está en BORRADOR.');

    const actualizada = await RetencioneModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },
};
