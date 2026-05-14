import { RecurrenteModel, RecurrenteCreateData, RecurrenteUpdateData, DetalleRecurrenteInput } from '../models/recurrentes.model';
import { ClienteModel } from '../models/clientes.model';
import { ProductoModel } from '../models/productos.model';
import { EmpresaModel } from '../models/empresas.model';
import { FacturaModel } from '../models/facturas.model';
import { SecuencialModel } from '../models/secuenciales.model';

const FRECUENCIAS_VALIDAS = ['DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL', 'ANUAL'];
const FORMAS_PAGO_VALIDAS = ['01', '15', '16', '17', '18', '19', '20', '21'];
const CODIGOS_IVA_VALIDOS = ['0', '2', '3', '4', '5'];

function round2(n: number): number {
  return Math.round(n * 100 + 1e-9) / 100;
}

export function calcularProximaFecha(fecha: string, frecuencia: string): string {
  const d = new Date(fecha + 'T12:00:00Z');
  switch (frecuencia) {
    case 'DIARIA':    d.setUTCDate(d.getUTCDate() + 1); break;
    case 'SEMANAL':   d.setUTCDate(d.getUTCDate() + 7); break;
    case 'QUINCENAL': d.setUTCDate(d.getUTCDate() + 15); break;
    case 'MENSUAL':   d.setUTCMonth(d.getUTCMonth() + 1); break;
    case 'ANUAL':     d.setUTCFullYear(d.getUTCFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0]!;
}

async function parseDetalles(empresaId: number, raw: unknown[]): Promise<DetalleRecurrenteInput[]> {
  const detalles: DetalleRecurrenteInput[] = [];

  for (let i = 0; i < raw.length; i++) {
    const d = raw[i] as Record<string, unknown>;
    const orden = i + 1;

    let id_producto: number | undefined;
    let productoData: { codigo: string; descripcion: string; precio: number; porcentaje_iva: number; codigo_iva: string } | null = null;

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
        precio: producto.precio,
        porcentaje_iva: producto.porcentaje_iva,
        codigo_iva: (producto as any).iva_codigo ?? '4',
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

    const cantidad = Number(d['cantidad'] ?? 1);
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

    detalles.push({ id_producto, codigo, descripcion, cantidad, precio_unitario, descuento, codigo_iva, porcentaje_iva, orden });
  }

  return detalles;
}

export async function generarFacturaDesdeRecurrente(recurrenteId: number): Promise<{ facturaId: number; numero: string }> {
  const recurrente = await RecurrenteModel.findByIdConDetalles(recurrenteId);
  if (!recurrente) throw new Error(`Recurrente ${recurrenteId} no encontrado.`);

  const empresa = await EmpresaModel.findById(recurrente.id_empresa);
  if (!empresa?.ambiente) throw new Error(`Empresa sin ambiente configurado (recurrente ${recurrenteId}).`);

  const puntoEmision = await RecurrenteModel.findPuntoEmision(recurrente.id_punto_emision, recurrente.id_empresa);
  if (!puntoEmision || puntoEmision.estado !== 'ACTIVO')
    throw new Error(`Punto de emisión inactivo o no encontrado (recurrente ${recurrenteId}).`);

  const secuencial = await SecuencialModel.findByUnique(recurrente.id_punto_emision, '01');
  if (!secuencial || secuencial.estado !== 'ACTIVO')
    throw new Error(`Sin secuencial activo de facturas para el recurrente ${recurrenteId}.`);

  const cliente = await ClienteModel.findById(recurrente.id_cliente);
  if (!cliente) throw new Error(`Cliente no encontrado (recurrente ${recurrenteId}).`);

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  const detallesFactura = recurrente.detalles.map((d, i) => {
    const cantidad = Number(d.cantidad);
    const precio_unitario = Number(d.precio_unitario);
    const descuento = Number(d.descuento);
    const porcentaje_iva = Number(d.porcentaje_iva);
    const subtotal = round2(cantidad * precio_unitario - descuento);
    const valor_iva = round2(subtotal * (porcentaje_iva / 100));
    const total = round2(subtotal + valor_iva);
    return {
      id_producto: d.id_producto ?? undefined,
      codigo: d.codigo,
      descripcion: d.descripcion,
      unidad_medida: 'UNIDAD',
      cantidad,
      precio_unitario,
      descuento,
      subtotal,
      codigo_iva: d.codigo_iva,
      porcentaje_iva,
      valor_iva,
      porcentaje_ice: 0,
      codigo_ice: null,
      valor_ice: 0,
      valor_irbpnr: 0,
      total,
      orden: i + 1,
    };
  });

  let sub0 = 0, subIva = 0, descuentoTotal = 0, ivaTotal = 0;
  for (const d of detallesFactura) {
    descuentoTotal += d.descuento;
    ivaTotal += d.valor_iva;
    if (d.codigo_iva === '0') sub0 += d.subtotal;
    else subIva += d.subtotal;
  }
  const subtotal_sin_impuesto = round2(sub0 + subIva);
  const iva_porcentaje = detallesFactura.find((d) => d.porcentaje_iva > 0)?.porcentaje_iva ?? 15.0;

  const factura = await FacturaModel.create({
    id_empresa: recurrente.id_empresa,
    id_usuario: recurrente.id_usuario,
    id_cliente: recurrente.id_cliente,
    id_punto_emision: recurrente.id_punto_emision,
    id_ambiente: empresa.ambiente,
    cod_establecimiento: puntoEmision.cod_establecimiento,
    cod_punto_emision: puntoEmision.cod_punto_emision,
    cli_identificacion: cliente.identificacion,
    cli_razon_social: cliente.razon_social,
    cli_direccion: cliente.direccion ?? null,
    cli_telefono: cliente.telefono ?? null,
    cli_email: cliente.email ?? null,
    fecha_emision: hoy,
    forma_pago: recurrente.forma_pago,
    tipo_pago: 'CONTADO',
    dias_plazo: 0,
    regimen: empresa.regimen,
    ruc: empresa.ruc,
    subtotal_sin_impuesto,
    subtotal_0: round2(sub0),
    subtotal_iva: round2(subIva),
    subtotal_no_objeto_iva: 0,
    subtotal_exento_iva: 0,
    descuento_total: round2(descuentoTotal),
    valor_ice: 0,
    valor_irbpnr: 0,
    iva_porcentaje,
    iva_total: round2(ivaTotal),
    total: round2(subtotal_sin_impuesto + ivaTotal),
    observacion: recurrente.descripcion,
    monto_recibido: null,
    vuelto: null,
    detalles: detallesFactura,
    datos_adicionales: [],
  });

  const proximaFecha = calcularProximaFecha(hoy, recurrente.frecuencia);
  await RecurrenteModel.actualizarFechasPostGeneracion(recurrenteId, hoy, proximaFecha);

  return { facturaId: factura.id, numero: factura.numero_comprobante ?? '' };
}

export const RecurrenteService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado']?.toUpperCase();
    return RecurrenteModel.findAllByEmpresa(empresaId, estado === 'TODOS' ? undefined : estado);
  },

  async verDetalle(id: number, empresaId: number) {
    const recurrente = await RecurrenteModel.findByIdConDetalles(id);
    if (!recurrente) throw new Error('Recurrente no encontrado.');
    if (recurrente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este recurrente.');
    return recurrente;
  },

  async crear(empresaId: number, usuarioId: number, body: Record<string, unknown>) {
    const id_cliente = Number(body['id_cliente']);
    if (!id_cliente || isNaN(id_cliente)) throw new Error('El campo id_cliente es requerido.');
    const cliente = await ClienteModel.findById(id_cliente);
    if (!cliente || cliente.id_empresa !== empresaId)
      throw new Error('Cliente no encontrado o no pertenece a la empresa.');

    const id_punto_emision = Number(body['id_punto_emision']);
    if (!id_punto_emision || isNaN(id_punto_emision)) throw new Error('El campo id_punto_emision es requerido.');
    const puntoEmision = await RecurrenteModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const descripcion = typeof body['descripcion'] === 'string' && body['descripcion'].trim()
      ? body['descripcion'].trim()
      : null;
    if (!descripcion) throw new Error('El campo descripcion es requerido.');

    const frecuencia = typeof body['frecuencia'] === 'string' ? body['frecuencia'].toUpperCase() : 'MENSUAL';
    if (!FRECUENCIAS_VALIDAS.includes(frecuencia))
      throw new Error(`frecuencia inválida. Válidas: ${FRECUENCIAS_VALIDAS.join(', ')}.`);

    const dia_emision = Number(body['dia_emision'] ?? 1);
    if (isNaN(dia_emision) || dia_emision < 1 || dia_emision > 31)
      throw new Error('dia_emision debe ser un número entre 1 y 31.');

    if (!body['proxima_facturacion'] || typeof body['proxima_facturacion'] !== 'string')
      throw new Error('El campo proxima_facturacion es requerido (YYYY-MM-DD).');

    const forma_pago = typeof body['forma_pago'] === 'string' ? body['forma_pago'] : '01';
    if (!FORMAS_PAGO_VALIDAS.includes(forma_pago))
      throw new Error(`forma_pago inválida. Válidas: ${FORMAS_PAGO_VALIDAS.join(', ')}.`);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const createData: RecurrenteCreateData = {
      id_empresa: empresaId,
      id_cliente,
      id_usuario: usuarioId,
      id_punto_emision,
      descripcion,
      frecuencia,
      dia_emision,
      proxima_facturacion: body['proxima_facturacion'] as string,
      forma_pago,
      detalles,
    };

    return RecurrenteModel.create(createData);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const recurrente = await RecurrenteModel.findById(id);
    if (!recurrente) throw new Error('Recurrente no encontrado.');
    if (recurrente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este recurrente.');

    const id_cliente = Number(body['id_cliente'] ?? recurrente.id_cliente);
    const cliente = await ClienteModel.findById(id_cliente);
    if (!cliente || cliente.id_empresa !== empresaId)
      throw new Error('Cliente no encontrado o no pertenece a la empresa.');

    const id_punto_emision = Number(body['id_punto_emision'] ?? recurrente.id_punto_emision);
    const puntoEmision = await RecurrenteModel.findPuntoEmision(id_punto_emision, empresaId);
    if (!puntoEmision) throw new Error('Punto de emisión no encontrado.');
    if (puntoEmision.estado !== 'ACTIVO') throw new Error('El punto de emisión no está activo.');

    const descripcion = typeof body['descripcion'] === 'string' && body['descripcion'].trim()
      ? body['descripcion'].trim()
      : recurrente.descripcion;

    const frecuencia = typeof body['frecuencia'] === 'string'
      ? body['frecuencia'].toUpperCase()
      : recurrente.frecuencia;
    if (!FRECUENCIAS_VALIDAS.includes(frecuencia))
      throw new Error(`frecuencia inválida. Válidas: ${FRECUENCIAS_VALIDAS.join(', ')}.`);

    const dia_emision = body['dia_emision'] !== undefined ? Number(body['dia_emision']) : recurrente.dia_emision;
    const proxima_facturacion = typeof body['proxima_facturacion'] === 'string'
      ? body['proxima_facturacion']
      : recurrente.proxima_facturacion;

    const forma_pago = typeof body['forma_pago'] === 'string' ? body['forma_pago'] : recurrente.forma_pago;
    if (!FORMAS_PAGO_VALIDAS.includes(forma_pago))
      throw new Error(`forma_pago inválida. Válidas: ${FORMAS_PAGO_VALIDAS.join(', ')}.`);

    if (!Array.isArray(body['detalles']) || (body['detalles'] as unknown[]).length === 0)
      throw new Error('Se requiere al menos un detalle.');
    const detalles = await parseDetalles(empresaId, body['detalles'] as unknown[]);

    const updateData: RecurrenteUpdateData = {
      id_cliente, id_punto_emision, descripcion, frecuencia, dia_emision, proxima_facturacion, forma_pago, detalles,
    };

    const updated = await RecurrenteModel.update(id, empresaId, updateData);
    if (!updated) throw new Error('No se pudo actualizar el recurrente.');
    return updated;
  },

  async eliminar(id: number, empresaId: number) {
    const recurrente = await RecurrenteModel.findById(id);
    if (!recurrente) throw new Error('Recurrente no encontrado.');
    if (recurrente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este recurrente.');

    const ok = await RecurrenteModel.delete(id);
    if (!ok) throw new Error('No se pudo eliminar el recurrente.');
    return { message: 'Recurrente eliminado correctamente.' };
  },

  async cambiarEstado(id: number, empresaId: number, body: Record<string, unknown>) {
    const recurrente = await RecurrenteModel.findById(id);
    if (!recurrente) throw new Error('Recurrente no encontrado.');
    if (recurrente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este recurrente.');

    const nuevoEstado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!['ACTIVO', 'INACTIVO'].includes(nuevoEstado))
      throw new Error('Estado inválido. Válidos: ACTIVO, INACTIVO.');
    if (recurrente.estado === nuevoEstado)
      throw new Error(`El recurrente ya se encuentra en estado ${nuevoEstado}.`);

    const actualizado = await RecurrenteModel.cambiarEstado(id, nuevoEstado);
    if (!actualizado) throw new Error('No se pudo actualizar el estado.');
    return actualizado;
  },

  async generarManual(id: number, empresaId: number) {
    const recurrente = await RecurrenteModel.findById(id);
    if (!recurrente) throw new Error('Recurrente no encontrado.');
    if (recurrente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este recurrente.');
    if (recurrente.estado !== 'ACTIVO') throw new Error('El recurrente debe estar ACTIVO para generar una factura.');

    return generarFacturaDesdeRecurrente(id);
  },
};
