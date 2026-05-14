import { ProductoModel, ProductoCreate, ProductoUpdate, ProductoFiltros } from '../models/productos.model';
import { GrupoProductoModel } from '../models/grupos_productos.model';
import { CodigoIvaModel } from '../models/codigos_iva.model';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO', 'TODOS'];
const TIPOS_VALIDOS   = ['PRODUCTO', 'SERVICIO'];

function calcularPrecioFinal(p: {
  precio: number | string;
  porcentaje_iva: number | string;
  tiene_ice: boolean;
  porcentaje_ice: number | string;
  tiene_irbpnr: boolean;
  valor_unitario_irbpnr: number | string;
}): number {
  const precio    = Number(p.precio);
  const pctIva    = Number(p.porcentaje_iva);
  const pctIce    = Number(p.porcentaje_ice);
  const valIrbpnr = Number(p.valor_unitario_irbpnr);
  const ice       = p.tiene_ice    ? precio * (pctIce / 100) : 0;
  const iva       = (precio + ice) * (pctIva / 100);
  const irbpnr    = p.tiene_irbpnr ? valIrbpnr               : 0;
  return Math.round((precio + ice + iva + irbpnr) * 100) / 100;
}

export const ProductoService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado'] ? query['estado'].toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estado)) throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');

    const tipo = query['tipo'] ? query['tipo'].toUpperCase() : undefined;
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) throw new Error('El tipo debe ser PRODUCTO o SERVICIO.');

    const id_iva   = query['id_iva']   ? Number(query['id_iva'])   : undefined;
    const id_grupo = query['id_grupo'] ? Number(query['id_grupo']) : undefined;

    const filtros: ProductoFiltros = { estado, tipo, id_grupo, id_iva, search: query['search'] };
    const productos = await ProductoModel.findAllByEmpresa(empresaId, filtros);
    return productos.map((p) => ({ ...p, precio_final: calcularPrecioFinal(p) }));
  },

  async verDetalle(id: number, empresaId: number) {
    const producto = await ProductoModel.findById(id);
    if (!producto) throw new Error('Producto no encontrado.');
    if (producto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este producto.');
    return { ...producto, precio_final: calcularPrecioFinal(producto) };
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const codigo    = body['codigo'];
    const descripcion = body['descripcion'];
    const id_iva    = body['id_iva'];
    const precio    = body['precio'];
    const tipo      = body['tipo'];
    const id_grupo  = body['id_grupo'];
    const tiene_ice = body['tiene_ice'];

    if (!codigo || typeof codigo !== 'string' || codigo.trim() === '')
      throw new Error('El código es requerido.');
    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '')
      throw new Error('La descripción es requerida.');
    if (precio === undefined || precio === null || isNaN(Number(precio)) || Number(precio) < 0)
      throw new Error('El precio es requerido y debe ser mayor o igual a 0.');
    if (!id_iva || isNaN(Number(id_iva)))
      throw new Error('El id_iva es requerido.');

    const iva = await CodigoIvaModel.findById(Number(id_iva));
    if (!iva) throw new Error('Código IVA no encontrado.');
    if (iva.id_empresa !== empresaId) throw new Error('El código IVA no pertenece a esta empresa.');
    if (!iva.activo) throw new Error('El código IVA seleccionado está inactivo.');

    const tipoFinal = typeof tipo === 'string' ? tipo.toUpperCase() : 'PRODUCTO';
    if (!TIPOS_VALIDOS.includes(tipoFinal)) throw new Error('El tipo debe ser PRODUCTO o SERVICIO.');

    const porcentaje_ice = Number(body['porcentaje_ice'] ?? 0);
    const tieneIce = tiene_ice === true || tiene_ice === 'true';
    if (tieneIce && (isNaN(porcentaje_ice) || porcentaje_ice <= 0))
      throw new Error('Debe especificar un porcentaje_ice mayor a 0 cuando tiene_ice es verdadero.');

    if (id_grupo !== undefined && id_grupo !== null) {
      const grupo = await GrupoProductoModel.findById(Number(id_grupo));
      if (!grupo) throw new Error('Grupo de productos no encontrado.');
      if (grupo.id_empresa !== empresaId) throw new Error('El grupo no pertenece a esta empresa.');
    }

    const existe = await ProductoModel.findByCodigo(empresaId, codigo.trim());
    if (existe) throw new Error(`Ya existe un producto con el código "${codigo.trim()}".`);

    const tieneIrbpnr = body['tiene_irbpnr'] === true || body['tiene_irbpnr'] === 'true';
    const valor_unitario_irbpnr = tieneIrbpnr ? Number(body['valor_unitario_irbpnr'] ?? 0) : 0;

    const data: ProductoCreate = {
      id_empresa:    empresaId,
      id_grupo:      (id_grupo !== undefined && id_grupo !== null) ? Number(id_grupo) : undefined,
      id_iva:        Number(id_iva),
      tipo:          tipoFinal,
      codigo:        codigo.trim(),
      descripcion:   descripcion.trim(),
      unidad_medida: typeof body['unidad_medida'] === 'string' ? body['unidad_medida'].trim() : 'UNIDAD',
      precio:        Number(precio),
      porcentaje_iva: iva.porcentaje,
      tiene_ice:     tieneIce,
      porcentaje_ice: tieneIce ? porcentaje_ice : 0,
      codigo_ice: tieneIce && body['codigo_ice'] != null && String(body['codigo_ice']).trim()
        ? String(body['codigo_ice']).trim()
        : null,
      tiene_irbpnr: tieneIrbpnr,
      valor_unitario_irbpnr,
    };

    return ProductoModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const producto = await ProductoModel.findById(id);
    if (!producto) throw new Error('Producto no encontrado.');
    if (producto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este producto.');

    const data: ProductoUpdate = {};

    if (body['tipo'] !== undefined) {
      const tipo = (body['tipo'] as string).toUpperCase();
      if (!TIPOS_VALIDOS.includes(tipo)) throw new Error('El tipo debe ser PRODUCTO o SERVICIO.');
      data.tipo = tipo;
    }
    if (body['descripcion'] !== undefined) {
      const desc = body['descripcion'];
      if (typeof desc !== 'string' || desc.trim() === '') throw new Error('La descripción no puede estar vacía.');
      data.descripcion = desc.trim();
    }
    if (body['unidad_medida'] !== undefined) {
      data.unidad_medida = typeof body['unidad_medida'] === 'string' ? body['unidad_medida'].trim() : undefined;
    }
    if (body['precio'] !== undefined) {
      const precio = Number(body['precio']);
      if (isNaN(precio) || precio < 0) throw new Error('El precio debe ser mayor o igual a 0.');
      data.precio = precio;
    }
    if (body['id_iva'] !== undefined) {
      const iva = await CodigoIvaModel.findById(Number(body['id_iva']));
      if (!iva) throw new Error('Código IVA no encontrado.');
      if (iva.id_empresa !== empresaId) throw new Error('El código IVA no pertenece a esta empresa.');
      if (!iva.activo) throw new Error('El código IVA seleccionado está inactivo.');
      data.id_iva        = iva.id;
      data.porcentaje_iva = iva.porcentaje;
    }
    if (body['id_grupo'] !== undefined) {
      if (body['id_grupo'] === null) {
        data.id_grupo = null;
      } else {
        const grupo = await GrupoProductoModel.findById(Number(body['id_grupo']));
        if (!grupo) throw new Error('Grupo de productos no encontrado.');
        if (grupo.id_empresa !== empresaId) throw new Error('El grupo no pertenece a esta empresa.');
        data.id_grupo = Number(body['id_grupo']);
      }
    }
    if (body['tiene_ice'] !== undefined) {
      const tieneIce = body['tiene_ice'] === true || body['tiene_ice'] === 'true';
      data.tiene_ice = tieneIce;
      const porcentaje_ice = Number(body['porcentaje_ice'] ?? producto.porcentaje_ice);
      if (tieneIce && (isNaN(porcentaje_ice) || porcentaje_ice <= 0))
        throw new Error('Debe especificar un porcentaje_ice mayor a 0 cuando tiene_ice es verdadero.');
      data.porcentaje_ice = tieneIce ? porcentaje_ice : 0;
    } else if (body['porcentaje_ice'] !== undefined) {
      data.porcentaje_ice = Number(body['porcentaje_ice']);
    }
    if (body['codigo_ice'] !== undefined) {
      data.codigo_ice = body['codigo_ice'] === null || body['codigo_ice'] === ''
        ? null
        : String(body['codigo_ice']).trim();
    }
    if (body['tiene_irbpnr'] !== undefined) {
      data.tiene_irbpnr = body['tiene_irbpnr'] === true || body['tiene_irbpnr'] === 'true';
    }
    if (body['valor_unitario_irbpnr'] !== undefined) {
      data.valor_unitario_irbpnr = Number(body['valor_unitario_irbpnr']);
    }

    if (Object.keys(data).length === 0) throw new Error('No se enviaron campos válidos para actualizar.');

    const actualizado = await ProductoModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el producto.');
    return actualizado;
  },

  async cambiarEstado(id: number, empresaId: number) {
    const producto = await ProductoModel.findById(id);
    if (!producto) throw new Error('Producto no encontrado.');
    if (producto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este producto.');

    const nuevoEstado = producto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    return ProductoModel.cambiarEstado(id, nuevoEstado);
  },
};
