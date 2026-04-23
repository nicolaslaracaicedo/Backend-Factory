import { PuntoEmisionModel, PuntoEmisionCreate, PuntoEmisionUpdate } from '../models/puntos_emision.model';
import { EstablecimientoModel } from '../models/establecimientos.model';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO', 'TODOS'];

export const PuntoEmisionService = {
  async listar(empresaId: number, estado?: string) {
    const estadoFiltro = estado ? estado.toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estadoFiltro)) {
      throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');
    }
    return PuntoEmisionModel.findAllByEmpresa(empresaId, estadoFiltro);
  },

  async listarPorEstablecimiento(establecimientoId: number, empresaId: number, estado?: string) {
    const est = await EstablecimientoModel.findById(establecimientoId);
    if (!est) throw new Error('Establecimiento no encontrado.');
    if (est.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este establecimiento.');

    const estadoFiltro = estado ? estado.toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estadoFiltro)) {
      throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');
    }
    return PuntoEmisionModel.findByEstablecimiento(establecimientoId, estadoFiltro);
  },

  async verDetalle(id: number, empresaId: number) {
    const punto = await PuntoEmisionModel.findById(id);
    if (!punto) throw new Error('Punto de emisión no encontrado.');
    if (punto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este punto de emisión.');
    return punto;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const idEstablecimiento = Number(body['id_establecimiento']);
    const codigo = body['codigo'];
    const descripcion = body['descripcion'];

    if (!idEstablecimiento || isNaN(idEstablecimiento)) throw new Error('El id_establecimiento es requerido.');
    if (!codigo || typeof codigo !== 'string') throw new Error('El código es requerido.');
    if (!/^\d{3}$/.test(codigo)) throw new Error('El código debe ser exactamente 3 dígitos numéricos (ej: 001).');

    const est = await EstablecimientoModel.findById(idEstablecimiento);
    if (!est) throw new Error('Establecimiento no encontrado.');
    if (est.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este establecimiento.');

    const existe = await PuntoEmisionModel.findByCodigo(idEstablecimiento, codigo);
    if (existe) throw new Error(`Ya existe un punto de emisión con el código ${codigo} en este establecimiento.`);

    const data: PuntoEmisionCreate = {
      id_empresa: empresaId,
      id_establecimiento: idEstablecimiento,
      codigo,
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : undefined,
    };

    return PuntoEmisionModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const punto = await PuntoEmisionModel.findById(id);
    if (!punto) throw new Error('Punto de emisión no encontrado.');
    if (punto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este punto de emisión.');

    if (body['descripcion'] === undefined) throw new Error('No se enviaron campos válidos para actualizar.');

    const data: PuntoEmisionUpdate = {
      descripcion: typeof body['descripcion'] === 'string' ? body['descripcion'].trim() : undefined,
    };

    const actualizado = await PuntoEmisionModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el punto de emisión.');
    return actualizado;
  },

  async cambiarEstado(id: number, empresaId: number) {
    const punto = await PuntoEmisionModel.findById(id);
    if (!punto) throw new Error('Punto de emisión no encontrado.');
    if (punto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este punto de emisión.');

    const nuevoEstado = punto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    return PuntoEmisionModel.cambiarEstado(id, nuevoEstado);
  },
};
