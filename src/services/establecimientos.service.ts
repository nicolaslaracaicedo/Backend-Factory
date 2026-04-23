import { EstablecimientoModel, EstablecimientoCreate, EstablecimientoUpdate } from '../models/establecimientos.model';

export const EstablecimientoService = {
  async listar(empresaId: number, estado?: string) {
    const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO', 'TODOS'];
    const estadoFiltro = estado ? estado.toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estadoFiltro)) {
      throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');
    }
    return EstablecimientoModel.findAllByEmpresa(empresaId, estadoFiltro);
  },

  async verDetalle(id: number, empresaId: number) {
    const est = await EstablecimientoModel.findById(id);
    if (!est) throw new Error('Establecimiento no encontrado.');
    if (est.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este establecimiento.');
    return est;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const codigo = body['codigo'];
    const nombre = body['nombre'];
    const direccion = body['direccion'];

    if (!codigo || typeof codigo !== 'string') throw new Error('El código es requerido.');
    if (!/^\d{3}$/.test(codigo)) throw new Error('El código debe ser exactamente 3 dígitos numéricos (ej: 001).');
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') throw new Error('El nombre es requerido.');

    const existe = await EstablecimientoModel.findByCodigo(empresaId, codigo);
    if (existe) throw new Error(`Ya existe un establecimiento con el código ${codigo}.`);

    const data: EstablecimientoCreate = {
      id_empresa: empresaId,
      codigo,
      nombre: nombre.trim(),
      direccion: typeof direccion === 'string' ? direccion.trim() : undefined,
      es_matriz: body['es_matriz'] === true || body['es_matriz'] === 'true',
    };

    if (data.es_matriz) {
      await EstablecimientoModel.quitarMatriz(empresaId);
    }

    return EstablecimientoModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const est = await EstablecimientoModel.findById(id);
    if (!est) throw new Error('Establecimiento no encontrado.');
    if (est.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este establecimiento.');

    const data: EstablecimientoUpdate = {};

    if (body['nombre'] !== undefined) {
      const nombre = body['nombre'];
      if (typeof nombre !== 'string' || nombre.trim() === '') throw new Error('El nombre no puede estar vacío.');
      data.nombre = nombre.trim();
    }
    if (body['direccion'] !== undefined) {
      data.direccion = typeof body['direccion'] === 'string' ? body['direccion'].trim() : undefined;
    }
    if (body['es_matriz'] !== undefined) {
      data.es_matriz = body['es_matriz'] === true || body['es_matriz'] === 'true';
    }

    if (Object.keys(data).length === 0) throw new Error('No se enviaron campos válidos para actualizar.');

    if (data.es_matriz) {
      await EstablecimientoModel.quitarMatriz(empresaId);
    }

    const actualizado = await EstablecimientoModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el establecimiento.');
    return actualizado;
  },

  async cambiarEstado(id: number, empresaId: number) {
    const est = await EstablecimientoModel.findById(id);
    if (!est) throw new Error('Establecimiento no encontrado.');
    if (est.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este establecimiento.');

    const nuevoEstado = est.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const actualizado = await EstablecimientoModel.cambiarEstado(id, nuevoEstado);
    return actualizado;
  },
};
