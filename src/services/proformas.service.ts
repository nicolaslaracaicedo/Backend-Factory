import {
  ProformaModel,
  ProformaCreateData,
  ProformaUpdateData,
  DetalleProformaInput,
} from '../models/proformas.model';
import { ClienteModel } from '../models/clientes.model';
import { ProductoModel } from '../models/productos.model';
import { FacturaModel } from '../models/facturas.model';
import { EmpresaModel } from '../models/empresas.model';
import { SecuencialModel } from '../models/secuenciales.model';

const ESTADOS_VALIDOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA'];
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

function calcularTotales(detalles: DetalleProformaInput[]): {
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
    if (d.codigo_iva === '0' || d.codigo_iva === '2' || d.codigo_iva === '3') {
      sub0 += d.subtotal;
    } else {
      subIva += d.subtotal;
    }
  }

  const subtotal_sin_impuesto = round2(sub0 + subIva);
  return {
    subtotal_sin_impuesto,
    subtotal_0: round2(sub0),
    subtotal_iva: round2(subIva),
    descuento_total: round2(descuentoTotal),
    iva_total: round2(ivaTotal),
    total: round2(subtotal_sin_impuesto + ivaTotal + iceTotal + irbpnrTotal),
  };
}

async function parseDetalles(empresaId: number, raw: unknown[]): Promise<DetalleProformaInput[]> {
  const detalles: DetalleProformaInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

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

async function resolverCliente(
  body: Record<string, unknown>,
  empresaId: number
): Promise<{
  id_cliente: number | null;
  cli_identificacion: string | null;
  cli_razon_social: string | null;
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
    };
  }

  return {
    id_cliente: null,
    cli_identificacion: typeof body['cli_identificacion'] === 'string'
      ? body['cli_identificacion'].trim() : null,
    cli_razon_social: typeof body['cli_razon_social'] === 'string'
      ? body['cli_razon_social'].trim() : null,
  };
}

export const ProformaService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    if (estado && estado !== 'TODOS' && !ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);

    return ProformaModel.findAllByEmpresa(empresaId, {
      estado: estado === 'TODOS' ? undefined : estado,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      search: query['search'],
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const proforma = await ProformaModel.findByIdConDetalles(id);
    if (!proforma) throw new Error('Proforma no encontrada.');
    if (proforma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta proforma.');
    return proforma;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision))
      throw new Error('El campo id_punto_emision es requerido.');

    const puntoEmision = await ProformaModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const clienteData = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la proforma.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const fecha_emision = typeof body['fecha_emision'] === 'string'
      ? body['fecha_emision']
      : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    const fecha_vencimiento = typeof body['fecha_vencimiento'] === 'string' && body['fecha_vencimiento'].trim()
      ? body['fecha_vencimiento'].trim()
      : null;

    const totales = calcularTotales(detalles);

    const createData: ProformaCreateData = {
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_cliente: clienteData.id_cliente,
      id_punto_emision,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      fecha_emision,
      fecha_vencimiento,
      cli_identificacion: clienteData.cli_identificacion,
      cli_razon_social: clienteData.cli_razon_social,
      ...totales,
      observaciones: typeof body['observaciones'] === 'string' ? body['observaciones'].trim() : null,
      detalles,
    };

    return ProformaModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const proforma = await ProformaModel.findById(id);
    if (!proforma) throw new Error('Proforma no encontrada.');
    if (proforma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta proforma.');
    if (!['PENDIENTE', 'RECHAZADA'].includes(proforma.estado))
      throw new Error('Solo se pueden editar proformas en estado PENDIENTE o RECHAZADA.');

    const clienteData = await resolverCliente(body, empresaId);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle en la proforma.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const fecha_emision = typeof body['fecha_emision'] === 'string'
      ? body['fecha_emision']
      : proforma.fecha_emision;

    const fecha_vencimiento = body['fecha_vencimiento'] !== undefined
      ? (typeof body['fecha_vencimiento'] === 'string' && body['fecha_vencimiento'].trim()
          ? body['fecha_vencimiento'].trim()
          : null)
      : proforma.fecha_vencimiento;

    const totales = calcularTotales(detalles);

    const updateData: ProformaUpdateData = {
      id_cliente: clienteData.id_cliente,
      fecha_emision,
      fecha_vencimiento,
      cli_identificacion: clienteData.cli_identificacion,
      cli_razon_social: clienteData.cli_razon_social,
      ...totales,
      observaciones: typeof body['observaciones'] === 'string'
        ? body['observaciones'].trim()
        : proforma.observaciones,
      detalles,
    };

    const updated = await ProformaModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar la proforma.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const proforma = await ProformaModel.findById(id);
    if (!proforma) throw new Error('Proforma no encontrada.');
    if (proforma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta proforma.');
    if (!['PENDIENTE', 'RECHAZADA'].includes(proforma.estado))
      throw new Error('Solo se pueden eliminar proformas en estado PENDIENTE o RECHAZADA.');

    const ok = await ProformaModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar la proforma.');
    return { message: 'Proforma eliminada correctamente.' };
  },

  async cambiarEstado(id: number, empresaId: number, body: Record<string, unknown>) {
    const proforma = await ProformaModel.findById(id);
    if (!proforma) throw new Error('Proforma no encontrada.');
    if (proforma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta proforma.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (proforma.estado === nuevoEstado)
      throw new Error(`La proforma ya se encuentra en estado ${nuevoEstado}.`);
    if (proforma.estado === 'CONVERTIDA')
      throw new Error('No se puede cambiar el estado de una proforma convertida a factura.');

    const actualizada = await ProformaModel.cambiarEstado(id, nuevoEstado);
    if (!actualizada) throw new Error('No se pudo actualizar el estado.');
    return actualizada;
  },

  async convertirAFactura(id: number, empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const proforma = await ProformaModel.findByIdConDetalles(id);
    if (!proforma) throw new Error('Proforma no encontrada.');
    if (proforma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta proforma.');
    if (proforma.estado !== 'APROBADA')
      throw new Error('Solo se pueden convertir proformas en estado APROBADA.');
    if (proforma.detalles.length === 0)
      throw new Error('La proforma no tiene detalles.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    if (!empresa.ambiente) throw new Error('La empresa no tiene ambiente configurado.');

    const puntoEmision = await FacturaModel.findPuntoEmision(proforma.id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const secuencial = await SecuencialModel.findByUnique(proforma.id_punto_emision, '01');
    if (!secuencial)
      throw new Error('No existe un secuencial de facturas para este punto de emisión. Configúrelo primero.');
    if (secuencial.estado !== 'ACTIVO') throw new Error('El secuencial de facturas no está activo.');

    const FORMAS_PAGO_VALIDAS = ['01', '15', '16', '17', '18', '19', '20', '21'];
    const TIPOS_PAGO_VALIDOS = ['CONTADO', 'CREDITO'];

    const forma_pago = typeof body['forma_pago'] === 'string' ? body['forma_pago'] : '01';
    const tipo_pago = typeof body['tipo_pago'] === 'string' ? body['tipo_pago'].toUpperCase() : 'CONTADO';
    const dias_plazo = body['dias_plazo'] !== undefined ? Number(body['dias_plazo']) : 0;

    if (!FORMAS_PAGO_VALIDAS.includes(forma_pago))
      throw new Error(`forma_pago inválida. Válidas: ${FORMAS_PAGO_VALIDAS.join(', ')}.`);
    if (!TIPOS_PAGO_VALIDOS.includes(tipo_pago))
      throw new Error('tipo_pago debe ser CONTADO o CREDITO.');
    if (tipo_pago === 'CREDITO' && dias_plazo <= 0)
      throw new Error('Para tipo_pago CREDITO se deben indicar los dias_plazo.');

    const fecha_emision = typeof body['fecha_emision'] === 'string'
      ? body['fecha_emision']
      : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    let cli_direccion: string | null = null;
    let cli_telefono: string | null = null;
    let cli_email: string | null = null;

    if (proforma.id_cliente) {
      const cliente = await ClienteModel.findById(proforma.id_cliente);
      if (cliente) {
        cli_direccion = cliente.direccion ?? null;
        cli_telefono = cliente.telefono ?? null;
        cli_email = cliente.email ?? null;
      }
    }

    const detallesFactura = proforma.detalles.map((d, i) => ({
      id_producto: d.id_producto ?? undefined,
      codigo: d.codigo,
      descripcion: d.descripcion,
      unidad_medida: d.unidad_medida,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      descuento: Number(d.descuento),
      subtotal: Number(d.subtotal),
      codigo_iva: d.codigo_iva,
      porcentaje_iva: Number(d.porcentaje_iva),
      valor_iva: Number(d.valor_iva),
      porcentaje_ice: Number(d.porcentaje_ice ?? 0),
      codigo_ice: d.codigo_ice ?? null,
      valor_ice: Number(d.valor_ice ?? 0),
      valor_irbpnr: Number(d.valor_irbpnr ?? 0),
      total: Number(d.total),
      orden: i + 1,
    }));

    const iva_porcentaje = detallesFactura.find((d) => d.porcentaje_iva > 0)?.porcentaje_iva ?? 15.0;
    const valor_ice_total = detallesFactura.reduce((s, d) => s + d.valor_ice, 0);
    const valor_irbpnr_total = detallesFactura.reduce((s, d) => s + d.valor_irbpnr, 0);

    const factura = await FacturaModel.create({
      id_empresa: empresaId,
      id_usuario: usuarioId,
      id_cliente: proforma.id_cliente,
      id_punto_emision: proforma.id_punto_emision,
      id_ambiente: empresa.ambiente,
      cod_establecimiento: puntoEmision.cod_establecimiento,
      cod_punto_emision: puntoEmision.cod_punto_emision,
      cli_identificacion: proforma.cli_identificacion ?? '',
      cli_razon_social: proforma.cli_razon_social ?? '',
      cli_direccion,
      cli_telefono,
      cli_email,
      fecha_emision,
      forma_pago,
      tipo_pago,
      dias_plazo,
      regimen: empresa.regimen,
      ruc: empresa.ruc,
      subtotal_sin_impuesto: Number(proforma.subtotal_sin_impuesto),
      subtotal_0: Number(proforma.subtotal_0),
      subtotal_iva: Number(proforma.subtotal_iva),
      subtotal_no_objeto_iva: 0,
      subtotal_exento_iva: 0,
      descuento_total: Number(proforma.descuento_total),
      valor_ice: valor_ice_total,
      valor_irbpnr: valor_irbpnr_total,
      iva_porcentaje,
      iva_total: Number(proforma.iva_total),
      total: Number(proforma.total),
      observacion: proforma.observaciones,
      monto_recibido: null,
      vuelto: null,
      detalles: detallesFactura,
      datos_adicionales: [],
    });

    await ProformaModel.vincularFactura(id, factura.id);

    return factura;
  },
};
