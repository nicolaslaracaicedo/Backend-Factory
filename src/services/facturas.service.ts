import {
  FacturaModel,
  FacturaCreateData,
  FacturaUpdateData,
  DetalleInput,
  DatoAdicionalInput,
} from '../models/facturas.model';
import { EmpresaModel } from '../models/empresas.model';
import { FirmaService } from './firmas_electronicas.service';
import { SecuencialModel } from '../models/secuenciales.model';
import { ClienteModel } from '../models/clientes.model';
import { ProductoModel } from '../models/productos.model';
import { generarXmlFactura } from '../utils/xml-factura';
import { firmarXml } from '../utils/firma-sri';
import { enviarRecepcion, consultarConReintentos } from '../utils/sri-client';

const ESTADOS_VALIDOS = ['BORRADOR', 'ENVIADO', 'AUTORIZADO', 'RECHAZADA', 'ANULADA'];
const CODIGOS_IVA_VALIDOS = ['0', '2', '3', '4', '5'];
const FORMAS_PAGO_VALIDAS = ['01', '15', '16', '17', '18', '19', '20', '21'];
const TIPOS_PAGO_VALIDOS = ['CONTADO', 'CREDITO'];

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function calcularLinea(d: {
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  porcentaje_iva: number;
  valor_ice: number;
  valor_irbpnr: number;
}): { subtotal: number; valor_iva: number; total: number } {
  const subtotal = round4(d.cantidad * d.precio_unitario - d.descuento);
  const valor_iva = round4(subtotal * (d.porcentaje_iva / 100));
  const total = round4(subtotal + valor_iva + d.valor_ice + d.valor_irbpnr);
  return { subtotal, valor_iva, total };
}

function calcularTotalesFactura(detalles: DetalleInput[]): {
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
} {
  let sub0 = 0, subIva = 0, subNoObjeto = 0, subExento = 0;
  let descuentoTotal = 0, iceTotal = 0, irbpnrTotal = 0, ivaTotal = 0;

  for (const d of detalles) {
    descuentoTotal += d.descuento;
    iceTotal += d.valor_ice;
    irbpnrTotal += d.valor_irbpnr;
    ivaTotal += d.valor_iva;

    switch (d.codigo_iva) {
      case '0': sub0 += d.subtotal; break;
      case '2': subExento += d.subtotal; break;
      case '3': subNoObjeto += d.subtotal; break;
      default:  subIva += d.subtotal; break;
    }
  }

  const subtotal_sin_impuesto = round4(sub0 + subIva + subNoObjeto + subExento);
  const iva_porcentaje = detalles.find((d) => d.porcentaje_iva > 0)?.porcentaje_iva ?? 15.0;
  const total = round4(subtotal_sin_impuesto + ivaTotal + iceTotal + irbpnrTotal);

  return {
    subtotal_sin_impuesto,
    subtotal_0: round4(sub0),
    subtotal_iva: round4(subIva),
    subtotal_no_objeto_iva: round4(subNoObjeto),
    subtotal_exento_iva: round4(subExento),
    descuento_total: round4(descuentoTotal),
    valor_ice: round4(iceTotal),
    valor_irbpnr: round4(irbpnrTotal),
    iva_porcentaje,
    iva_total: round4(ivaTotal),
    total,
  };
}

async function parseDetalles(empresaId: number, raw: unknown[]): Promise<DetalleInput[]> {
  const detalles: DetalleInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

    if (!d['codigo'] || typeof d['codigo'] !== 'string' || d['codigo'].trim() === '')
      throw new Error(`Detalle ${orden}: 'codigo' es requerido.`);
    if (!d['descripcion'] || typeof d['descripcion'] !== 'string' || d['descripcion'].trim() === '')
      throw new Error(`Detalle ${orden}: 'descripcion' es requerido.`);

    const cantidad = Number(d['cantidad']);
    if (isNaN(cantidad) || cantidad <= 0)
      throw new Error(`Detalle ${orden}: 'cantidad' debe ser mayor a 0.`);

    const precio_unitario = Number(d['precio_unitario']);
    if (isNaN(precio_unitario) || precio_unitario < 0)
      throw new Error(`Detalle ${orden}: 'precio_unitario' debe ser mayor o igual a 0.`);

    const descuento = Number(d['descuento'] ?? 0);
    if (isNaN(descuento) || descuento < 0)
      throw new Error(`Detalle ${orden}: 'descuento' no puede ser negativo.`);
    if (descuento > cantidad * precio_unitario)
      throw new Error(`Detalle ${orden}: el descuento no puede ser mayor al subtotal bruto.`);

    const codigo_iva = String(d['codigo_iva'] ?? '4');
    if (!CODIGOS_IVA_VALIDOS.includes(codigo_iva))
      throw new Error(`Detalle ${orden}: 'codigo_iva' inválido. Válidos: ${CODIGOS_IVA_VALIDOS.join(', ')}.`);

    const porcentaje_iva = Number(d['porcentaje_iva'] ?? 0);
    if (isNaN(porcentaje_iva) || porcentaje_iva < 0)
      throw new Error(`Detalle ${orden}: 'porcentaje_iva' inválido.`);

    const valor_ice = Number(d['valor_ice'] ?? 0);
    const valor_irbpnr = Number(d['valor_irbpnr'] ?? 0);

    let id_producto: number | undefined;
    if (d['id_producto'] !== undefined && d['id_producto'] !== null) {
      id_producto = Number(d['id_producto']);
      if (isNaN(id_producto)) throw new Error(`Detalle ${orden}: 'id_producto' inválido.`);
      const producto = await ProductoModel.findById(id_producto);
      if (!producto || producto.id_empresa !== empresaId)
        throw new Error(`Detalle ${orden}: producto no encontrado.`);
      if (producto.estado !== 'ACTIVO')
        throw new Error(`Detalle ${orden}: el producto no está activo.`);
    }

    const { subtotal, valor_iva, total } = calcularLinea({
      cantidad, precio_unitario, descuento, porcentaje_iva, valor_ice, valor_irbpnr,
    });

    detalles.push({
      id_producto,
      codigo: (d['codigo'] as string).trim(),
      descripcion: (d['descripcion'] as string).trim(),
      unidad_medida: typeof d['unidad_medida'] === 'string' ? d['unidad_medida'].trim() : 'UNIDAD',
      cantidad,
      precio_unitario,
      descuento,
      subtotal,
      codigo_iva,
      porcentaje_iva,
      valor_iva,
      valor_ice,
      valor_irbpnr,
      total,
      orden,
    });
  }

  return detalles;
}

function parseDatosAdicionales(raw: unknown[]): DatoAdicionalInput[] {
  const result: DatoAdicionalInput[] = [];
  for (let i = 0; i < raw.length; i++) {
    const da = raw[i] as Record<string, unknown>;
    if (!da['nombre'] || typeof da['nombre'] !== 'string') continue;
    if (!da['valor'] || typeof da['valor'] !== 'string') continue;
    result.push({
      nombre: (da['nombre'] as string).trim(),
      valor: (da['valor'] as string).trim(),
      orden: i + 1,
    });
  }
  return result;
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

  if (!body['cli_identificacion'] || typeof body['cli_identificacion'] !== 'string')
    throw new Error('Se requiere id_cliente o cli_identificacion.');
  if (!body['cli_razon_social'] || typeof body['cli_razon_social'] !== 'string')
    throw new Error('Se requiere id_cliente o cli_razon_social.');

  return {
    id_cliente: null,
    cli_identificacion: (body['cli_identificacion'] as string).trim(),
    cli_razon_social: (body['cli_razon_social'] as string).trim(),
    cli_direccion: typeof body['cli_direccion'] === 'string' ? body['cli_direccion'].trim() : null,
    cli_telefono: typeof body['cli_telefono'] === 'string' ? body['cli_telefono'].trim() : null,
    cli_email: typeof body['cli_email'] === 'string' ? body['cli_email'].trim() : null,
  };
}

function validarPago(body: Record<string, unknown>, defaults?: { forma_pago: string; tipo_pago: string; dias_plazo: number }): {
  forma_pago: string;
  tipo_pago: string;
  dias_plazo: number;
} {
  const forma_pago = typeof body['forma_pago'] === 'string' ? body['forma_pago'] : (defaults?.forma_pago ?? '01');
  const tipo_pago = typeof body['tipo_pago'] === 'string' ? body['tipo_pago'].toUpperCase() : (defaults?.tipo_pago ?? 'CONTADO');
  const dias_plazo = body['dias_plazo'] !== undefined ? Number(body['dias_plazo']) : (defaults?.dias_plazo ?? 0);

  if (!FORMAS_PAGO_VALIDAS.includes(forma_pago))
    throw new Error(`forma_pago inválida. Válidas: ${FORMAS_PAGO_VALIDAS.join(', ')}.`);
  if (!TIPOS_PAGO_VALIDOS.includes(tipo_pago))
    throw new Error('tipo_pago debe ser CONTADO o CREDITO.');
  if (tipo_pago === 'CREDITO' && dias_plazo <= 0)
    throw new Error('Para tipo_pago CREDITO se deben indicar los dias_plazo.');

  return { forma_pago, tipo_pago, dias_plazo };
}

export const FacturaService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return FacturaModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const factura = await FacturaModel.findByIdConDetalles(id);
    if (!factura) throw new Error('Factura no encontrada.');
    if (factura.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta factura.');
    return factura;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await FacturaModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const secuencial = await SecuencialModel.findByUnique(id_punto_emision, '01', empresa.ambiente);
    if (!secuencial)
      throw new Error('No existe un secuencial de facturas para este punto de emisión. Configúrelo primero.');
    if (secuencial.estado !== 'ACTIVO') throw new Error('El secuencial de facturas no está activo.');

    const clienteData = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la factura.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const datos_adicionales = Array.isArray(body['datos_adicionales'])
      ? parseDatosAdicionales(body['datos_adicionales'] as unknown[])
      : [];

    const pago = validarPago(body);

    const fecha_emision =
      typeof body['fecha_emision'] === 'string'
        ? body['fecha_emision']
        : new Date().toISOString().split('T')[0]!;

    const totales = calcularTotalesFactura(detalles);

    const createData: FacturaCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_cliente: clienteData.id_cliente,
      id_punto_emision,
      id_ambiente: empresa.ambiente,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      cli_identificacion: clienteData.cli_identificacion,
      cli_razon_social: clienteData.cli_razon_social,
      cli_direccion: clienteData.cli_direccion,
      cli_telefono: clienteData.cli_telefono,
      cli_email: clienteData.cli_email,
      fecha_emision,
      forma_pago: pago.forma_pago,
      tipo_pago: pago.tipo_pago,
      dias_plazo: pago.dias_plazo,
      regimen: empresa.regimen,
      ruc: empresa.ruc,
      ...totales,
      observacion: typeof body['observacion'] === 'string' ? body['observacion'].trim() : null,
      detalles,
      datos_adicionales,
    };

    return FacturaModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const factura = await FacturaModel.findById(id);
    if (!factura) throw new Error('Factura no encontrada.');
    if (factura.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta factura.');
    if (factura.estado !== 'BORRADOR') throw new Error('Solo se pueden editar facturas en estado BORRADOR.');

    const clienteData = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la factura.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const datos_adicionales = Array.isArray(body['datos_adicionales'])
      ? parseDatosAdicionales(body['datos_adicionales'] as unknown[])
      : [];

    const pago = validarPago(body, {
      forma_pago: factura.forma_pago,
      tipo_pago: factura.tipo_pago,
      dias_plazo: factura.dias_plazo,
    });

    const fecha_emision =
      typeof body['fecha_emision'] === 'string'
        ? body['fecha_emision']
        : factura.fecha_emision;

    const totales = calcularTotalesFactura(detalles);

    const updateData: FacturaUpdateData = {
      id_cliente: clienteData.id_cliente,
      cli_identificacion: clienteData.cli_identificacion,
      cli_razon_social: clienteData.cli_razon_social,
      cli_direccion: clienteData.cli_direccion,
      cli_telefono: clienteData.cli_telefono,
      cli_email: clienteData.cli_email,
      fecha_emision,
      forma_pago: pago.forma_pago,
      tipo_pago: pago.tipo_pago,
      dias_plazo: pago.dias_plazo,
      ...totales,
      observacion: typeof body['observacion'] === 'string' ? body['observacion'].trim() : factura.observacion,
      detalles,
      datos_adicionales,
    };

    const updated = await FacturaModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la factura.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const factura = await FacturaModel.findById(id);
    if (!factura) throw new Error('Factura no encontrada.');
    if (factura.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta factura.');
    if (factura.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar facturas en estado BORRADOR.');

    const ok = await FacturaModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la factura.');
    return { message: 'Factura eliminada correctamente.' };
  },

  async cambiarEstado(id: number, empresaId: number, body: Record<string, unknown>) {
    const factura = await FacturaModel.findById(id);
    if (!factura) throw new Error('Factura no encontrada.');
    if (factura.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta factura.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (factura.estado === nuevoEstado)
      throw new Error(`La factura ya se encuentra en estado ${nuevoEstado}.`);
    if (factura.estado !== 'BORRADOR' && nuevoEstado !== 'ANULADA')
      throw new Error('Solo se puede anular una factura que no está en BORRADOR.');

    const actualizada = await FacturaModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },

  async emitir(id: number, empresaId: number) {
    const factura = await FacturaModel.findByIdConDetalles(id);
    if (!factura) throw new Error('Factura no encontrada.');
    if (factura.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta factura.');
    if (!['BORRADOR', 'RECHAZADA'].includes(factura.estado))
      throw new Error('Solo se pueden emitir facturas en estado BORRADOR o RECHAZADA.');
    if (!factura.clave_acceso) throw new Error('La factura no tiene clave de acceso generada.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const firma = await FirmaService.getActivaParaFirmar(empresaId);
    if (!firma) throw new Error('No hay firma electrónica activa. Configúrela en Empresa > Firma Electrónica.');

    const dirEstablecimiento = await FacturaModel.findDireccionEstablecimiento(factura.id_punto_emision);

    const xmlSinFirmar = generarXmlFactura(factura, empresa, dirEstablecimiento);

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
      const recepcion = await enviarRecepcion(xmlBase64, factura.id_ambiente);
      recepcionEstado = recepcion.estado;
      recepcionMensajes = recepcion.mensajes;
    } catch (e: any) {
      throw new Error(`Error al conectar con el SRI: ${e.message}`);
    }

    if (recepcionEstado === 'DEVUELTA') {
      await FacturaModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'RECHAZADA',
        respuesta_sri: recepcionMensajes.join(' | '),
        motivo_rechazo: recepcionMensajes.join(' | '),
      });
      throw new Error(`Comprobante devuelto por el SRI: ${recepcionMensajes.join('; ')}`);
    }

    // Estado RECIBIDA — consultar autorización
    let autorizacion;
    try {
      autorizacion = await consultarConReintentos(factura.clave_acceso, factura.id_ambiente);
    } catch (e: any) {
      await FacturaModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'ENVIADO',
        respuesta_sri: null,
        motivo_rechazo: null,
      });
      throw new Error(`Factura enviada al SRI pero no se pudo consultar autorización: ${e.message}`);
    }

    const nuevoEstado =
      autorizacion.estado === 'AUTORIZADO' ? 'AUTORIZADO' :
      autorizacion.estado === 'EN PROCESAMIENTO' ? 'ENVIADO' : 'RECHAZADA';

    const actualizada = await FacturaModel.actualizarEmision(id, {
      xml_generado: xmlFirmado,
      xml_autorizado: autorizacion.xmlAutorizado,
      numero_autorizacion: autorizacion.numeroAutorizacion,
      fecha_autorizacion: autorizacion.fechaAutorizacion || null,
      estado: nuevoEstado,
      respuesta_sri: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
      motivo_rechazo: nuevoEstado === 'RECHAZADA' ? autorizacion.mensajes.join(' | ') : null,
    });

    return actualizada;
  },
};
