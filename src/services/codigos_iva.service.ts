import { CodigoIvaModel, CodigoIvaCreate, CodigoIvaUpdate } from '../models/codigos_iva.model';

export const CodigoIvaService = {
  async listar(empresaId: number, soloActivos?: string) {
    const activos = soloActivos === 'true';
    return CodigoIvaModel.findAllByEmpresa(empresaId, activos);
  },

  async verDetalle(id: number, empresaId: number) {
    const iva = await CodigoIvaModel.findById(id);
    if (!iva) throw new Error('Código IVA no encontrado.');
    if (iva.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este código IVA.');
    return iva;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const codigo     = body['codigo'];
    const nombre     = body['nombre'];
    const porcentaje = body['porcentaje'];

    if (!codigo || typeof codigo !== 'string' || codigo.trim() === '')
      throw new Error('El código es requerido.');
    if (!/^\d{1,2}$/.test(codigo.trim()))
      throw new Error('El código debe ser numérico de 1 o 2 dígitos (ej: 0, 4, 15).');
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '')
      throw new Error('El nombre es requerido.');
    if (porcentaje === undefined || porcentaje === null || isNaN(Number(porcentaje)) || Number(porcentaje) < 0)
      throw new Error('El porcentaje es requerido y debe ser mayor o igual a 0.');

    const existe = await CodigoIvaModel.findByCodigo(empresaId, codigo.trim());
    if (existe) throw new Error(`Ya existe un código IVA con el código "${codigo.trim()}" para esta empresa.`);

    const data: CodigoIvaCreate = {
      id_empresa: empresaId,
      codigo:     codigo.trim(),
      nombre:     nombre.trim(),
      porcentaje: Number(porcentaje),
    };

    return CodigoIvaModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const iva = await CodigoIvaModel.findById(id);
    if (!iva) throw new Error('Código IVA no encontrado.');
    if (iva.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este código IVA.');

    const data: CodigoIvaUpdate = {};
    let nuevoPorcentaje: number | undefined;

    if (body['nombre'] !== undefined) {
      const nombre = body['nombre'];
      if (typeof nombre !== 'string' || nombre.trim() === '')
        throw new Error('El nombre no puede estar vacío.');
      data.nombre = nombre.trim();
    }
    if (body['porcentaje'] !== undefined) {
      const porcentaje = Number(body['porcentaje']);
      if (isNaN(porcentaje) || porcentaje < 0)
        throw new Error('El porcentaje debe ser mayor o igual a 0.');
      data.porcentaje = porcentaje;
      nuevoPorcentaje = porcentaje;
    }

    if (Object.keys(data).length === 0) throw new Error('No se enviaron campos válidos para actualizar.');

    const actualizado = await CodigoIvaModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el código IVA.');

    // Si cambió el porcentaje, sincronizar productos que usan este código
    let productos_actualizados = 0;
    if (nuevoPorcentaje !== undefined) {
      productos_actualizados = await CodigoIvaModel.syncProductosPorcentaje(id, nuevoPorcentaje);
    }

    return { ...actualizado, productos_actualizados };
  },

  async toggleActivo(id: number, empresaId: number) {
    const iva = await CodigoIvaModel.findById(id);
    if (!iva) throw new Error('Código IVA no encontrado.');
    if (iva.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este código IVA.');

    return CodigoIvaModel.toggleActivo(id, !iva.activo);
  },
};
