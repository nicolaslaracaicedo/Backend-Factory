import { ProveedorModel, ProveedorCreate, ProveedorUpdate, ProveedorFiltros } from '../models/proveedores.model';
import { validarCedula, validarRuc, validarEmail, validarTelefono } from '../utils/validators';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO', 'TODOS'];

function validarIdentificacion(tipo: string, identificacion: string): void {
  switch (tipo) {
    case '04':
      if (!validarRuc(identificacion)) throw new Error('El RUC ingresado no es válido.');
      break;
    case '05':
      if (!validarCedula(identificacion)) throw new Error('La cédula ingresada no es válida.');
      break;
    case '06':
      if (!/^[a-zA-Z0-9]{1,20}$/.test(identificacion))
        throw new Error('El pasaporte debe ser alfanumérico y tener máximo 20 caracteres.');
      break;
  }
}

export const ProveedorService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado'] ? query['estado'].toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estado)) throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');

    const tipo_identificacion = query['tipo_identificacion'];
    if (tipo_identificacion) {
      const tipoValido = await ProveedorModel.findTipoIdentificacion(tipo_identificacion);
      if (!tipoValido) throw new Error('Tipo de identificación inválido.');
    }

    const filtros: ProveedorFiltros = {
      estado,
      tipo_identificacion,
      search: query['search'],
    };

    return ProveedorModel.findAllByEmpresa(empresaId, filtros);
  },

  async verDetalle(id: number, empresaId: number) {
    const proveedor = await ProveedorModel.findById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado.');
    if (proveedor.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este proveedor.');
    return proveedor;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const tipo_identificacion = body['tipo_identificacion'];
    const identificacion      = body['identificacion'];
    const razon_social        = body['razon_social'];
    const direccion           = body['direccion'];
    const telefono            = body['telefono'];
    const email               = body['email'];

    if (!tipo_identificacion || typeof tipo_identificacion !== 'string')
      throw new Error('El tipo_identificacion es requerido.');
    if (!identificacion || typeof identificacion !== 'string' || identificacion.trim() === '')
      throw new Error('La identificación es requerida.');
    if (!razon_social || typeof razon_social !== 'string' || razon_social.trim() === '')
      throw new Error('La razón social es requerida.');

    const tipoValido = await ProveedorModel.findTipoIdentificacion(tipo_identificacion);
    if (!tipoValido) {
      const tipos = await ProveedorModel.findTiposIdentificacion();
      const lista = tipos.map((t) => `${t.id} (${t.nombre})`).join(', ');
      throw new Error(`Tipo de identificación inválido. Válidos: ${lista}.`);
    }

    validarIdentificacion(tipo_identificacion, identificacion.trim());

    if (telefono !== undefined && typeof telefono === 'string' && telefono !== '') {
      if (!validarTelefono(telefono)) throw new Error('El teléfono debe tener exactamente 10 dígitos.');
    }
    if (email !== undefined && typeof email === 'string' && email !== '') {
      if (!validarEmail(email)) throw new Error('El correo electrónico no es válido.');
    }

    const existe = await ProveedorModel.findByIdentificacion(empresaId, identificacion.trim());
    if (existe) throw new Error(`Ya existe un proveedor con la identificación ${identificacion}.`);

    const data: ProveedorCreate = {
      id_empresa: empresaId,
      tipo_identificacion,
      identificacion: identificacion.trim(),
      razon_social: razon_social.trim(),
      direccion: typeof direccion === 'string' ? direccion.trim() : undefined,
      telefono: typeof telefono === 'string' ? telefono.trim() : undefined,
      email: typeof email === 'string' ? email.trim() : undefined,
    };

    return ProveedorModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const proveedor = await ProveedorModel.findById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado.');
    if (proveedor.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este proveedor.');

    const data: ProveedorUpdate = {};

    if (body['razon_social'] !== undefined) {
      const razon_social = body['razon_social'];
      if (typeof razon_social !== 'string' || razon_social.trim() === '')
        throw new Error('La razón social no puede estar vacía.');
      data.razon_social = razon_social.trim();
    }
    if (body['direccion'] !== undefined) {
      data.direccion = typeof body['direccion'] === 'string' ? body['direccion'].trim() : undefined;
    }
    if (body['telefono'] !== undefined) {
      const telefono = body['telefono'];
      if (typeof telefono === 'string' && telefono !== '' && !validarTelefono(telefono))
        throw new Error('El teléfono debe tener exactamente 10 dígitos.');
      data.telefono = typeof telefono === 'string' ? telefono.trim() : undefined;
    }
    if (body['email'] !== undefined) {
      const email = body['email'];
      if (typeof email === 'string' && email !== '' && !validarEmail(email))
        throw new Error('El correo electrónico no es válido.');
      data.email = typeof email === 'string' ? email.trim() : undefined;
    }

    if (Object.keys(data).length === 0) throw new Error('No se enviaron campos válidos para actualizar.');

    const actualizado = await ProveedorModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el proveedor.');
    return actualizado;
  },

  async cambiarEstado(id: number, empresaId: number) {
    const proveedor = await ProveedorModel.findById(id);
    if (!proveedor) throw new Error('Proveedor no encontrado.');
    if (proveedor.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este proveedor.');

    const nuevoEstado = proveedor.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    return ProveedorModel.cambiarEstado(id, nuevoEstado);
  },

  async getTiposIdentificacion() {
    return ProveedorModel.findTiposIdentificacion();
  },
};
