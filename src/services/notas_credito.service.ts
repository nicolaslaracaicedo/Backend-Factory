import {
  NotaCreditoModel,
  NotaCreditoCreateData,
  NotaCreditoUpdateData,
  DetalleNCInput,
  generarClaveAccesoNC,
} from '../models/notas_credito.model';
import { EmpresaModel } from '../models/empresas.model';
import { SecuencialModel } from '../models/secuenciales.model';
import { ClienteModel } from '../models/clientes.model';
import { ProductoModel } from '../models/productos.model';
import { FacturaModel } from '../models/facturas.model';
import { FirmaService } from './firmas_electronicas.service';
import { generarXmlNotaCredito } from '../utils/xml-nota-credito';
import { firmarXml } from '../utils/firma-sri';
import { enviarRecepcion, consultarConReintentos } from '../utils/sri-client';
import { LogSriModel } from '../models/log_sri.model';

const ESTADOS_VALIDOS = ['BORRADOR', 'ENVIADO', 'AUTORIZADO', 'RECHAZADA', 'ANULADA'];
const CODIGOS_IVA_VALIDOS = ['0', '2', '3', '4', '5'];

function round2(n: number): number {
  return Math.round(n * 100 + 1e-9) / 100;
}

function calcularLinea(d: {
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  porcentaje_iva: number;
  valor_ice: number;
  valor_irbpnr: number;
}): { subtotal: number; valor_iva: number; total: number } {
  const subtotal = round2(d.cantidad * d.precio_unitario - d.descuento);
  const valor_iva = round2((subtotal + d.valor_ice) * (d.porcentaje_iva / 100));
  const total = round2(subtotal + valor_iva + d.valor_ice + d.valor_irbpnr);
  return { subtotal, valor_iva, total };
}

function calcularTotales(detalles: DetalleNCInput[]): {
  subtotal_sin_impuesto: number;
  subtotal_0: number;
  subtotal_iva: number;
  descuento_total: number;
  iva_total: number;
  total: number;
} {
  let sub0 = 0, subIva = 0, descuentoTotal = 0, ivaTotal = 0, iceTotal = 0, irbpnrTotal = 0;

  for (const d of detalles) {
    descuentoTotal += d.descuento;
    ivaTotal += d.valor_iva;
    iceTotal += d.valor_ice;
    irbpnrTotal += d.valor_irbpnr;
    if (['0', '2', '3'].includes(d.codigo_iva)) {
      sub0 += d.subtotal;
    } else {
      subIva += d.subtotal;
    }
  }

  const subtotal_sin_impuesto = round2(sub0 + subIva);
  const total = round2(subtotal_sin_impuesto + ivaTotal + iceTotal + irbpnrTotal);

  return {
    subtotal_sin_impuesto,
    subtotal_0: round2(sub0),
    subtotal_iva: round2(subIva),
    descuento_total: round2(descuentoTotal),
    iva_total: round2(ivaTotal),
    total,
  };
}

async function parseDetalles(empresaId: number, raw: unknown[]): Promise<DetalleNCInput[]> {
  const detalles: DetalleNCInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

    // Cargar producto si se provee id_producto y autocompletar campos faltantes
    let id_producto: number | undefined;
    let productoData: {
      codigo: string; descripcion: string; unidad_medida: string; precio: number;
      porcentaje_iva: number; codigo_iva: string; porcentaje_ice: number;
      codigo_ice: string | null; tiene_irbpnr: boolean; valor_unitario_irbpnr: number;
    } | null = null;

    if (d['id_producto'] !== undefined && d['id_producto'] !== null) {
      id_producto = Number(d['id_producto']);
      if (isNaN(id_producto)) throw new Error(`Detalle ${orden}: 'id_producto' inválido.`);
      const producto = await ProductoModel.findById(id_producto);
      if (!producto || producto.id_empresa !== empresaId)
        throw new Error(`Detalle ${orden}: producto no encontrado.`);
      if (producto.estado !== 'ACTIVO')
        throw new Error(`Detalle ${orden}: el producto no está activo.`);
      productoData = {
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        unidad_medida: producto.unidad_medida,
        precio: producto.precio,
        porcentaje_iva: producto.porcentaje_iva,
        codigo_iva: (producto as any).iva_codigo ?? '4',
        porcentaje_ice: producto.porcentaje_ice ?? 0,
        codigo_ice: producto.codigo_ice ?? null,
        tiene_irbpnr: producto.tiene_irbpnr ?? false,
        valor_unitario_irbpnr: producto.valor_unitario_irbpnr ?? 0,
      };
    }

    const codigo = typeof d['codigo'] === 'string' && d['codigo'].trim()
      ? d['codigo'].trim()
      : productoData?.codigo ?? '';
    if (!codigo) throw new Error(`Detalle ${orden}: 'codigo' es requerido.`);

    const descripcion = typeof d['descripcion'] === 'string' && d['descripcion'].trim()
      ? d['descripcion'].trim()
      : productoData?.descripcion ?? '';
    if (!descripcion) throw new Error(`Detalle ${orden}: 'descripcion' es requerido.`);

    const unidad_medida = typeof d['unidad_medida'] === 'string' && d['unidad_medida'].trim()
      ? d['unidad_medida'].trim()
      : productoData?.unidad_medida ?? 'UNIDAD';

    const cantidad = Number(d['cantidad']);
    if (isNaN(cantidad) || cantidad <= 0)
      throw new Error(`Detalle ${orden}: 'cantidad' debe ser mayor a 0.`);

    const precio_unitario = d['precio_unitario'] !== undefined && d['precio_unitario'] !== null
      ? Number(d['precio_unitario'])
      : productoData?.precio ?? NaN;
    if (isNaN(precio_unitario) || precio_unitario < 0)
      throw new Error(`Detalle ${orden}: 'precio_unitario' es requerido y debe ser mayor o igual a 0.`);

    const descuento = Number(d['descuento'] ?? 0);
    if (isNaN(descuento) || descuento < 0)
      throw new Error(`Detalle ${orden}: 'descuento' no puede ser negativo.`);
    if (descuento > cantidad * precio_unitario)
      throw new Error(`Detalle ${orden}: el descuento no puede ser mayor al subtotal bruto.`);

    const codigo_iva = d['codigo_iva'] !== undefined
      ? String(d['codigo_iva'])
      : productoData?.codigo_iva ?? '4';
    if (!CODIGOS_IVA_VALIDOS.includes(codigo_iva))
      throw new Error(`Detalle ${orden}: 'codigo_iva' inválido. Válidos: ${CODIGOS_IVA_VALIDOS.join(', ')}.`);

    const porcentaje_iva = d['porcentaje_iva'] !== undefined
      ? Number(d['porcentaje_iva'])
      : productoData?.porcentaje_iva ?? 0;
    if (isNaN(porcentaje_iva) || porcentaje_iva < 0)
      throw new Error(`Detalle ${orden}: 'porcentaje_iva' inválido.`);

    const porcentaje_ice = d['porcentaje_ice'] !== undefined
      ? Number(d['porcentaje_ice'])
      : productoData?.porcentaje_ice ?? 0;
    const codigo_ice = d['codigo_ice'] != null && String(d['codigo_ice']).trim()
      ? String(d['codigo_ice']).trim()
      : productoData?.codigo_ice ?? null;

    const subtotalBruto = round2(cantidad * precio_unitario - descuento);
    const valor_ice = porcentaje_ice > 0
      ? round2(subtotalBruto * (porcentaje_ice / 100))
      : Number(d['valor_ice'] ?? 0);
    const valor_irbpnr = productoData?.tiene_irbpnr
      ? round2(cantidad * productoData.valor_unitario_irbpnr)
      : Number(d['valor_irbpnr'] ?? 0);

    const { subtotal, valor_iva, total } = calcularLinea({
      cantidad, precio_unitario, descuento, porcentaje_iva, valor_ice, valor_irbpnr,
    });

    detalles.push({
      id_producto,
      codigo,
      descripcion,
      unidad_medida,
      cantidad,
      precio_unitario,
      descuento,
      subtotal,
      codigo_iva,
      porcentaje_iva,
      valor_iva,
      porcentaje_ice,
      valor_ice,
      codigo_ice,
      valor_irbpnr,
      total,
      orden,
    });
  }

  return detalles;
}

async function validarCantidadesContraFactura(
  idFacturaRef: number,
  detallesNc: DetalleNCInput[],
  excluirNcId?: number
): Promise<void> {
  const factura = await FacturaModel.findByIdConDetalles(idFacturaRef);
  if (!factura) return;

  const acreditado = await NotaCreditoModel.cantidadAcreditadaPorFactura(idFacturaRef, excluirNcId);
  const yaAcreditado = new Map<string, number>();
  for (const row of acreditado) {
    yaAcreditado.set(row.codigo, Number(row.cantidad_acreditada));
  }

  const cantidadOriginal = new Map<string, number>();
  for (const d of factura.detalles) {
    cantidadOriginal.set(d.codigo, Number(d.cantidad));
  }

  for (const d of detallesNc) {
    const original = cantidadOriginal.get(d.codigo);
    if (original === undefined) {
      throw new Error(
        `El producto con código "${d.codigo}" no existe en la factura referenciada.`
      );
    }
    const disponible = original - (yaAcreditado.get(d.codigo) ?? 0);
    if (d.cantidad > disponible + 1e-9) {
      throw new Error(
        `Detalle "${d.codigo}": la cantidad a acreditar (${d.cantidad}) supera la cantidad disponible (${disponible}) de la factura original.`
      );
    }

    const detOriginal = factura.detalles.find((fd) => fd.codigo === d.codigo)!;
    if (d.precio_unitario > Number(detOriginal.precio_unitario) + 1e-9) {
      throw new Error(
        `Detalle "${d.codigo}": el precio unitario (${d.precio_unitario}) no puede ser mayor al precio original (${detOriginal.precio_unitario}).`
      );
    }
  }
}

async function resolverFacturaRef(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{
  id_factura_ref: number | null;
  factura_ref_numero: string | null;
  factura_ref_fecha: string | null;
  factura_ref_autorizacion: string | null;
}> {
  if (body['id_factura_ref']) {
    const id_factura_ref = Number(body['id_factura_ref']);
    if (isNaN(id_factura_ref)) throw new Error('id_factura_ref inválido.');
    const factura = await FacturaModel.findById(id_factura_ref);
    if (!factura || factura.id_empresa !== empresaId)
      throw new Error('Factura de referencia no encontrada o no pertenece a la empresa.');
    return {
      id_factura_ref,
      factura_ref_numero: factura.numero_comprobante,
      factura_ref_fecha: factura.fecha_emision,
      factura_ref_autorizacion: factura.numero_autorizacion,
    };
  }

  const factura_ref_numero = typeof body['factura_ref_numero'] === 'string' ? body['factura_ref_numero'].trim() : null;
  const factura_ref_fecha = typeof body['factura_ref_fecha'] === 'string' ? body['factura_ref_fecha'].trim() : null;
  const factura_ref_autorizacion = typeof body['factura_ref_autorizacion'] === 'string' ? body['factura_ref_autorizacion'].trim() : null;

  if (!factura_ref_numero) throw new Error('Se requiere id_factura_ref o factura_ref_numero.');
  if (!factura_ref_fecha) throw new Error('Se requiere factura_ref_fecha (YYYY-MM-DD).');
  if (!factura_ref_autorizacion) throw new Error('Se requiere factura_ref_autorizacion.');

  return { id_factura_ref: null, factura_ref_numero, factura_ref_fecha, factura_ref_autorizacion };
}

async function resolverCliente(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{ id_cliente: number | null; cli_identificacion: string; cli_razon_social: string }> {
  if (body['consumidor_final'] === true) {
    return {
      id_cliente: null,
      cli_identificacion: '9999999999999',
      cli_razon_social: 'CONSUMIDOR FINAL',
    };
  }

  if (body['id_cliente']) {
    const id_cliente = Number(body['id_cliente']);
    const cliente = await ClienteModel.findById(id_cliente);
    if (!cliente || cliente.id_empresa !== empresaId)
      throw new Error('Cliente no encontrado o no pertenece a la empresa.');
    return { id_cliente, cli_identificacion: cliente.identificacion, cli_razon_social: cliente.razon_social };
  }

  if (!body['cli_identificacion'] || typeof body['cli_identificacion'] !== 'string')
    throw new Error('Se requiere id_cliente o cli_identificacion.');
  if (!body['cli_razon_social'] || typeof body['cli_razon_social'] !== 'string')
    throw new Error('Se requiere id_cliente o cli_razon_social.');

  return {
    id_cliente: null,
    cli_identificacion: (body['cli_identificacion'] as string).trim(),
    cli_razon_social: (body['cli_razon_social'] as string).trim(),
  };
}

export const NotaCreditoService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return NotaCreditoModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const nc = await NotaCreditoModel.findByIdConDetalles(id);
    if (!nc) throw new Error('Nota de crédito no encontrada.');
    if (nc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de crédito.');
    return nc;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await NotaCreditoModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const secuencial = await SecuencialModel.findByUnique(id_punto_emision, '04');
    if (!secuencial)
      throw new Error('No existe un secuencial de notas de crédito para este punto de emisión. Configúrelo primero.');
    if (secuencial.estado !== 'ACTIVO') throw new Error('El secuencial de notas de crédito no está activo.');

    const motivo = typeof body['motivo'] === 'string' ? body['motivo'].trim() : '';
    if (!motivo) throw new Error('El campo motivo es requerido.');

    const facturaRef = await resolverFacturaRef(body, empresaId);
    const clienteData = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la nota de crédito.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    if (facturaRef.id_factura_ref) {
      await validarCantidadesContraFactura(facturaRef.id_factura_ref, detalles);
    }

    const fecha_emision =
      typeof body['fecha_emision'] === 'string'
        ? body['fecha_emision']
        : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const totales = calcularTotales(detalles);

    const createData: NotaCreditoCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_cliente: clienteData.id_cliente,
      id_factura_ref: facturaRef.id_factura_ref,
      id_punto_emision,
      id_ambiente: empresa.ambiente,
      factura_ref_numero: facturaRef.factura_ref_numero,
      factura_ref_fecha: facturaRef.factura_ref_fecha,
      factura_ref_autorizacion: facturaRef.factura_ref_autorizacion,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      cli_identificacion: clienteData.cli_identificacion,
      cli_razon_social: clienteData.cli_razon_social,
      fecha_emision,
      motivo,
      ruc: empresa.ruc!,
      ...totales,
      detalles,
    };

    return NotaCreditoModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const nc = await NotaCreditoModel.findById(id);
    if (!nc) throw new Error('Nota de crédito no encontrada.');
    if (nc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de crédito.');
    if (!['BORRADOR', 'RECHAZADA'].includes(nc.estado))
      throw new Error('Solo se pueden editar notas de crédito en estado BORRADOR o RECHAZADA.');

    const motivo = typeof body['motivo'] === 'string' ? body['motivo'].trim() : nc.motivo;
    if (!motivo) throw new Error('El campo motivo es requerido.');

    const facturaRef = await resolverFacturaRef(body, empresaId);
    const clienteData = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la nota de crédito.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    if (facturaRef.id_factura_ref) {
      await validarCantidadesContraFactura(facturaRef.id_factura_ref, detalles, id);
    }

    const fecha_emision =
      typeof body['fecha_emision'] === 'string' ? body['fecha_emision'] : nc.fecha_emision;

    const totales = calcularTotales(detalles);

    const updateData: NotaCreditoUpdateData = {
      id_cliente: clienteData.id_cliente,
      id_factura_ref: facturaRef.id_factura_ref,
      factura_ref_numero: facturaRef.factura_ref_numero,
      factura_ref_fecha: facturaRef.factura_ref_fecha,
      factura_ref_autorizacion: facturaRef.factura_ref_autorizacion,
      cli_identificacion: clienteData.cli_identificacion,
      cli_razon_social: clienteData.cli_razon_social,
      fecha_emision,
      motivo,
      ...totales,
      detalles,
    };

    const updated = await NotaCreditoModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la nota de crédito.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const nc = await NotaCreditoModel.findById(id);
    if (!nc) throw new Error('Nota de crédito no encontrada.');
    if (nc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de crédito.');
    if (nc.estado !== 'BORRADOR') throw new Error('Solo se pueden eliminar notas de crédito en estado BORRADOR.');

    const ok = await NotaCreditoModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la nota de crédito.');
    return { message: 'Nota de crédito eliminada correctamente.' };
  },

  async emitir(id: number, empresaId: number) {
    const nc = await NotaCreditoModel.findByIdConDetalles(id);
    if (!nc) throw new Error('Nota de crédito no encontrada.');
    if (nc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de crédito.');
    if (!['BORRADOR', 'RECHAZADA'].includes(nc.estado))
      throw new Error('Solo se pueden emitir notas de crédito en estado BORRADOR o RECHAZADA.');
    if (!nc.clave_acceso) throw new Error('La nota de crédito no tiene clave de acceso generada.');
    if (!nc.factura_ref_numero) throw new Error('La nota de crédito no tiene número de documento de referencia.');
    if (!nc.factura_ref_fecha) throw new Error('La nota de crédito no tiene fecha del documento de referencia.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const firma = await FirmaService.getActivaParaFirmar(empresaId);
    if (!firma) throw new Error('No hay firma electrónica activa. Configúrela en Empresa > Firma Electrónica.');

    if (nc.estado === 'RECHAZADA') {
      const nuevaClave = generarClaveAccesoNC(
        nc.fecha_emision,
        empresa.ruc!,
        empresa.ambiente,
        nc.cod_establecimiento,
        nc.cod_punto_emision,
        nc.secuencial
      );
      await NotaCreditoModel.actualizarClaveAcceso(id, nuevaClave);
      nc.clave_acceso = nuevaClave;
    }

    const dirEstablecimiento = await NotaCreditoModel.findDireccionEstablecimiento(nc.id_punto_emision);

    const xmlSinFirmar = generarXmlNotaCredito(nc, empresa, dirEstablecimiento);

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
      const recepcion = await enviarRecepcion(xmlBase64, nc.id_ambiente);
      recepcionEstado = recepcion.estado;
      recepcionMensajes = recepcion.mensajes;
    } catch (e: any) {
      throw new Error(`Error al conectar con el SRI: ${e.message}`);
    }

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '04',
      id_documento: id,
      clave_acceso: nc.clave_acceso,
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
      await NotaCreditoModel.actualizarEmision(id, {
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
      autorizacion = await consultarConReintentos(nc.clave_acceso, nc.id_ambiente);
    } catch (e: any) {
      await NotaCreditoModel.actualizarEmision(id, {
        xml_generado: xmlFirmado,
        xml_autorizado: '',
        numero_autorizacion: '',
        fecha_autorizacion: null,
        estado: 'ENVIADO',
        respuesta_sri: null,
        motivo_rechazo: null,
      });
      throw new Error(`Nota de crédito enviada al SRI pero no se pudo consultar autorización: ${e.message}`);
    }

    const nuevoEstado =
      autorizacion.estado === 'AUTORIZADO' ? 'AUTORIZADO' :
      autorizacion.estado === 'EN PROCESAMIENTO' ? 'ENVIADO' : 'RECHAZADA';

    LogSriModel.registrar({
      id_empresa: empresaId,
      tipo_documento: '04',
      id_documento: id,
      clave_acceso: nc.clave_acceso,
      accion: 'AUTORIZACION',
      ambiente: empresa.ambiente === 1 ? 'PRUEBAS' : 'PRODUCCION',
      estado: autorizacion.estado,
      response_xml: autorizacion.xmlAutorizado || null,
      mensaje: autorizacion.mensajes.length > 0 ? autorizacion.mensajes.join(' | ') : null,
    }).catch(console.error);

    return NotaCreditoModel.actualizarEmision(id, {
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
    const nc = await NotaCreditoModel.findById(id);
    if (!nc) throw new Error('Nota de crédito no encontrada.');
    if (nc.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta nota de crédito.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (nc.estado === nuevoEstado)
      throw new Error(`La nota de crédito ya se encuentra en estado ${nuevoEstado}.`);
    if (nc.estado !== 'BORRADOR' && nuevoEstado !== 'ANULADA')
      throw new Error('Solo se puede anular una nota de crédito que no está en BORRADOR.');

    const actualizada = await NotaCreditoModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },
};
