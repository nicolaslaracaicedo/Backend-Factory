import {
  GuiaRemisionModel,
  GuiaRemisionCreateData,
  GuiaRemisionUpdateData,
  DetalleGRInput,
  generarClaveAccesoGR,
} from '../models/guias_remision.model';
import { EmpresaModel } from '../models/empresas.model';
import { SecuencialModel } from '../models/secuenciales.model';
import { ClienteModel } from '../models/clientes.model';
import { ProductoModel } from '../models/productos.model';
import { FirmaService } from './firmas_electronicas.service';
import { generarXmlGuiaRemision } from '../utils/xml-guia-remision';
import { firmarXml } from '../utils/firma-sri';
import { enviarRecepcion, consultarConReintentos } from '../utils/sri-client';
import { LogSriModel } from '../models/log_sri.model';

const ESTADOS_VALIDOS = ['BORRADOR', 'ENVIADO', 'AUTORIZADO', 'RECHAZADA', 'ANULADA'];

async function parseDetalles(empresaId: number, raw: unknown[]): Promise<DetalleGRInput[]> {
  const detalles: DetalleGRInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

    let id_producto: number | undefined;
    let productoData: { codigo: string; descripcion: string } | null = null;

    if (d['id_producto'] !== undefined && d['id_producto'] !== null) {
      id_producto = Number(d['id_producto']);
      if (isNaN(id_producto)) throw new Error(`Detalle ${orden}: 'id_producto' inválido.`);
      const producto = await ProductoModel.findById(id_producto);
      if (!producto || producto.id_empresa !== empresaId)
        throw new Error(`Detalle ${orden}: producto no encontrado.`);
      if (producto.estado !== 'ACTIVO')
        throw new Error(`Detalle ${orden}: el producto no está activo.`);
      productoData = { codigo: producto.codigo, descripcion: producto.descripcion };
    }

    const codigo = typeof d['codigo'] === 'string' && d['codigo'].trim()
      ? d['codigo'].trim()
      : productoData?.codigo ?? '';
    if (!codigo) throw new Error(`Detalle ${orden}: 'codigo' es requerido.`);

    const descripcion = typeof d['descripcion'] === 'string' && d['descripcion'].trim()
      ? d['descripcion'].trim()
      : productoData?.descripcion ?? '';
    if (!descripcion) throw new Error(`Detalle ${orden}: 'descripcion' es requerido.`);

    const cantidad = Number(d['cantidad'] ?? 1);
    if (isNaN(cantidad) || cantidad <= 0)
      throw new Error(`Detalle ${orden}: 'cantidad' debe ser mayor a 0.`);

    detalles.push({ id_producto, codigo, descripcion, cantidad, orden });
  }

  return detalles;
}

async function resolverDestinatario(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{ id_cliente: number | null; dest_identificacion: string; dest_razon_social: string }> {
  if (body['id_cliente']) {
    const id_cliente = Number(body['id_cliente']);
    const cliente = await ClienteModel.findById(id_cliente);
    if (!cliente || cliente.id_empresa !== empresaId)
      throw new Error('Cliente no encontrado o no pertenece a la empresa.');
    return { id_cliente, dest_identificacion: cliente.identificacion, dest_razon_social: cliente.razon_social };
  }

  if (!body['dest_identificacion'] || typeof body['dest_identificacion'] !== 'string')
    throw new Error('Se requiere id_cliente o dest_identificacion.');
  if (!body['dest_razon_social'] || typeof body['dest_razon_social'] !== 'string')
    throw new Error('Se requiere id_cliente o dest_razon_social.');

  return {
    id_cliente: null,
    dest_identificacion: (body['dest_identificacion'] as string).trim(),
    dest_razon_social: (body['dest_razon_social'] as string).trim(),
  };
}

export const GuiaRemisionService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return GuiaRemisionModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const gr = await GuiaRemisionModel.findByIdConDetalles(id);
    if (!gr) throw new Error('Guía de remisión no encontrada.');
    if (gr.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta guía de remisión.');
    return gr;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await GuiaRemisionModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const secuencial = await SecuencialModel.findByUnique(id_punto_emision, '06');
    if (!secuencial)
      throw new Error('No existe un secuencial de guías de remisión para este punto de emisión. Configúrelo primero.');
    if (secuencial.estado !== 'ACTIVO') throw new Error('El secuencial de guías de remisión no está activo.');

    const ruc_transportista = typeof body['ruc_transportista'] === 'string' ? body['ruc_transportista'].trim() : '';
    if (!ruc_transportista) throw new Error('El campo ruc_transportista es requerido.');

    const razon_social_transportista = typeof body['razon_social_transportista'] === 'string' ? body['razon_social_transportista'].trim() : '';
    if (!razon_social_transportista) throw new Error('El campo razon_social_transportista es requerido.');

    const placa = typeof body['placa'] === 'string' ? body['placa'].trim() : '';
    if (!placa) throw new Error('El campo placa es requerido.');

    const fecha_ini_transporte = typeof body['fecha_ini_transporte'] === 'string' ? body['fecha_ini_transporte'].trim() : '';
    if (!fecha_ini_transporte) throw new Error('El campo fecha_ini_transporte es requerido (YYYY-MM-DD).');

    const fecha_fin_transporte = typeof body['fecha_fin_transporte'] === 'string' ? body['fecha_fin_transporte'].trim() : '';
    if (!fecha_fin_transporte) throw new Error('El campo fecha_fin_transporte es requerido (YYYY-MM-DD).');

    if (fecha_fin_transporte < fecha_ini_transporte)
      throw new Error('La fecha_fin_transporte no puede ser anterior a fecha_ini_transporte.');

    const motivo_traslado = typeof body['motivo_traslado'] === 'string' ? body['motivo_traslado'].trim() : '';
    if (!motivo_traslado) throw new Error('El campo motivo_traslado es requerido.');

    const ruta = typeof body['ruta'] === 'string' && body['ruta'].trim() ? body['ruta'].trim() : null;
    const direccion_destino = typeof body['direccion_destino'] === 'string' && body['direccion_destino'].trim()
      ? body['direccion_destino'].trim()
      : null;

    const destinatario = await resolverDestinatario(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la guía de remisión.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const fecha_emision =
      typeof body['fecha_emision'] === 'string'
        ? body['fecha_emision']
        : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const createData: GuiaRemisionCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_punto_emision,
      id_ambiente: empresa.ambiente,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      fecha_emision,
      ruc: empresa.ruc!,
      ruc_transportista,
      razon_social_transportista,
      placa,
      fecha_ini_transporte,
      fecha_fin_transporte,
      ruta,
      id_cliente: destinatario.id_cliente,
      dest_identificacion: destinatario.dest_identificacion,
      dest_razon_social: destinatario.dest_razon_social,
      direccion_destino,
      motivo_traslado,
      detalles,
    };

    return GuiaRemisionModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const gr = await GuiaRemisionModel.findById(id);
    if (!gr) throw new Error('Guía de remisión no encontrada.');
    if (gr.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta guía de remisión.');
    if (!['BORRADOR', 'RECHAZADA'].includes(gr.estado))
      throw new Error('Solo se pueden editar guías de remisión en estado BORRADOR o RECHAZADA.');

    const ruc_transportista = typeof body['ruc_transportista'] === 'string'
      ? body['ruc_transportista'].trim()
      : gr.ruc_transportista;
    if (!ruc_transportista) throw new Error('El campo ruc_transportista es requerido.');

    const razon_social_transportista = typeof body['razon_social_transportista'] === 'string'
      ? body['razon_social_transportista'].trim()
      : gr.razon_social_transportista;
    if (!razon_social_transportista) throw new Error('El campo razon_social_transportista es requerido.');

    const placa = typeof body['placa'] === 'string' ? body['placa'].trim() : gr.placa;
    if (!placa) throw new Error('El campo placa es requerido.');

    const fecha_ini_transporte = typeof body['fecha_ini_transporte'] === 'string'
      ? body['fecha_ini_transporte'].trim()
      : gr.fecha_ini_transporte;
    const fecha_fin_transporte = typeof body['fecha_fin_transporte'] === 'string'
      ? body['fecha_fin_transporte'].trim()
      : gr.fecha_fin_transporte;

    if (fecha_fin_transporte < fecha_ini_transporte)
      throw new Error('La fecha_fin_transporte no puede ser anterior a fecha_ini_transporte.');

    const motivo_traslado = typeof body['motivo_traslado'] === 'string'
      ? body['motivo_traslado'].trim()
      : gr.motivo_traslado ?? '';
    if (!motivo_traslado) throw new Error('El campo motivo_traslado es requerido.');

    const ruta = typeof body['ruta'] === 'string' && body['ruta'].trim()
      ? body['ruta'].trim()
      : gr.ruta ?? null;
    const direccion_destino = typeof body['direccion_destino'] === 'string' && body['direccion_destino'].trim()
      ? body['direccion_destino'].trim()
      : gr.direccion_destino ?? null;

    const destinatario = await resolverDestinatario(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la guía de remisión.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const fecha_emision = typeof body['fecha_emision'] === 'string' ? body['fecha_emision'] : gr.fecha_emision;

    const updateData: GuiaRemisionUpdateData = {
      fecha_emision,
      ruc_transportista,
      razon_social_transportista,
      placa,
      fecha_ini_transporte,
      fecha_fin_transporte,
      ruta,
      id_cliente: destinatario.id_cliente,
      dest_identificacion: destinatario.dest_identificacion,
      dest_razon_social: destinatario.dest_razon_social,
      direccion_destino,
      motivo_traslado,
      detalles,
    };

    const updated = await GuiaRemisionModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la guía de remisión.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const gr = await GuiaRemisionModel.findById(id);
    if (!gr) throw new Error('Guía de remisión no encontrada.');
    if (gr.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta guía de remisión.');
    if (gr.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar guías de remisión en estado BORRADOR.');

    const ok = await GuiaRemisionModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la guía de remisión.');
    return { message: 'Guía de remisión eliminada correctamente.' };
  },

  async emitir(id: number, empresaId: number) {
    const gr = await GuiaRemisionModel.findByIdConDetalles(id);
    if (!gr) throw new Error('Guía de remisión no encontrada.');
    if (gr.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta guía de remisión.');
    if (!['BORRADOR', 'RECHAZADA'].includes(gr.estado))
      throw new Error('Solo se pueden emitir guías de remisión en estado BORRADOR o RECHAZADA.');
    if (!gr.clave_acceso) throw new Error('La guía de remisión no tiene clave de acceso generada.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const firma = await FirmaService.getActivaParaFirmar(empresaId);
    if (!firma) throw new Error('No hay firma electrónica activa. Configúrela en Empresa > Firma Electrónica.');

    // Siempre regenerar la clave usando fecha_ini_transporte (requerido por el SRI para guías de remisión)
    const nuevaClave = generarClaveAccesoGR(
      gr.fecha_ini_transporte,
      empresa.ruc!,
      empresa.ambiente,
      gr.cod_establecimiento,
      gr.cod_punto_emision,
      gr.secuencial
    );
    await GuiaRemisionModel.actualizarClaveAcceso(id, nuevaClave);
    gr.clave_acceso = nuevaClave;

    const dirEstablecimiento = await GuiaRemisionModel.findDireccionEstablecimiento(gr.id_punto_emision);

    const xmlSinFirmar = generarXmlGuiaRemision(gr, empresa, dirEstablecimiento);

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
      tipo_documento: '06',
      id_documento: id,
      clave_acceso: gr.clave_acceso,
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
      await GuiaRemisionModel.actualizarEmision(id, {
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
      autorizacion = await consultarConReintentos(gr.clave_acceso, empresa.ambiente);
    } catch (e: any) {
      await GuiaRemisionModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'ENVIADO',
        respuesta_sri: null,
        motivo_rechazo: null,
      });
      throw new Error(`Guía de remisión enviada al SRI pero no se pudo consultar autorización: ${e.message}`);
    }

    const nuevoEstado =
      autorizacion.estado === 'AUTORIZADO' ? 'AUTORIZADO' :
      autorizacion.estado === 'EN PROCESAMIENTO' ? 'ENVIADO' : 'RECHAZADA';

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '06',
      id_documento: id,
      clave_acceso: gr.clave_acceso,
      accion: 'AUTORIZACION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: autorizacion.estado,
      response_xml: autorizacion.xmlAutorizado || null,
      mensaje: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
    }).catch(console.error);

    return GuiaRemisionModel.actualizarEmision(id, {
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
    const gr = await GuiaRemisionModel.findById(id);
    if (!gr) throw new Error('Guía de remisión no encontrada.');
    if (gr.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta guía de remisión.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (gr.estado === nuevoEstado)
      throw new Error(`La guía de remisión ya se encuentra en estado ${nuevoEstado}.`);
    if (gr.estado !== 'BORRADOR' && nuevoEstado !== 'ANULADA')
      throw new Error('Solo se puede anular una guía de remisión que no está en BORRADOR.');

    const actualizada = await GuiaRemisionModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },
};
