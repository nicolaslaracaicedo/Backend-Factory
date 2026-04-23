import { GrupoProductoModel, GrupoProductoCreate, GrupoProductoUpdate } from '../models/grupos_productos.model';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO', 'TODOS'];

export const GrupoProductoService = {
  async listar(empresaId: number, estado?: string) {
    const estadoFiltro = estado ? estado.toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estadoFiltro)) throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');
    return GrupoProductoModel.findAllByEmpresa(empresaId, estadoFiltro);
  },

  async verDetalle(id: number, empresaId: number) {
    const grupo = await GrupoProductoModel.findById(id);
    if (!grupo) throw new Error('Grupo de productos no encontrado.');
    if (grupo.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este grupo.');
    return grupo;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const nombre      = body['nombre'];
    const descripcion = body['descripcion'];

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '')
      throw new Error('El nombre es requerido.');

    const existe = await GrupoProductoModel.findByNombre(empresaId, nombre.trim());
    if (existe) throw new Error(`Ya existe un grupo con el nombre "${nombre.trim()}".`);

    const data: GrupoProductoCreate = {
      id_empresa: empresaId,
      nombre: nombre.trim(),
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : undefined,
    };

    return GrupoProductoModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const grupo = await GrupoProductoModel.findById(id);
    if (!grupo) throw new Error('Grupo de productos no encontrado.');
    if (grupo.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este grupo.');

    const data: GrupoProductoUpdate = {};

    if (body['nombre'] !== undefined) {
      const nombre = body['nombre'];
      if (typeof nombre !== 'string' || nombre.trim() === '')
        throw new Error('El nombre no puede estar vacío.');

      const existe = await GrupoProductoModel.findByNombre(empresaId, nombre.trim());
      if (existe && existe.id !== id) throw new Error(`Ya existe un grupo con el nombre "${nombre.trim()}".`);

      data.nombre = nombre.trim();
    }
    if (body['descripcion'] !== undefined) {
      data.descripcion = typeof body['descripcion'] === 'string' ? body['descripcion'].trim() : undefined;
    }

    if (Object.keys(data).length === 0) throw new Error('No se enviaron campos válidos para actualizar.');

    const actualizado = await GrupoProductoModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el grupo.');
    return actualizado;
  },

  async cambiarEstado(id: number, empresaId: number) {
    const grupo = await GrupoProductoModel.findById(id);
    if (!grupo) throw new Error('Grupo de productos no encontrado.');
    if (grupo.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este grupo.');

    const nuevoEstado = grupo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    return GrupoProductoModel.cambiarEstado(id, nuevoEstado);
  },
};
