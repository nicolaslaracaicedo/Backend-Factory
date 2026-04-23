import { ClienteModel, ClienteCreate, ClienteUpdate, ClienteFiltros } from '../models/clientes.model';
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
    case '07':
      if (identificacion !== '9999999999')
        throw new Error('Para Consumidor Final la identificación debe ser "9999999999".');
      break;
  }
}

export const ClienteService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado'] ? query['estado'].toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estado)) throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');

    const tipo_identificacion = query['tipo_identificacion'];
    if (tipo_identificacion) {
      const tipoValido = await ClienteModel.findTipoIdentificacion(tipo_identificacion);
      if (!tipoValido) throw new Error('Tipo de identificación inválido.');
    }

    const filtros: ClienteFiltros = {
      estado,
      tipo_identificacion,
      search: query['search'],
    };

    return ClienteModel.findAllByEmpresa(empresaId, filtros);
  },

  async verDetalle(id: number, empresaId: number) {
    const cliente = await ClienteModel.findById(id);
    if (!cliente) throw new Error('Cliente no encontrado.');
    if (cliente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este cliente.');
    return cliente;
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

    const tipoValido = await ClienteModel.findTipoIdentificacion(tipo_identificacion);
    if (!tipoValido) {
      const tipos = await ClienteModel.findAllTiposIdentificacion();
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

    const existe = await ClienteModel.findByIdentificacion(empresaId, identificacion.trim());
    if (existe) throw new Error(`Ya existe un cliente con la identificación ${identificacion}.`);

    const data: ClienteCreate = {
      id_empresa: empresaId,
      tipo_identificacion,
      identificacion: identificacion.trim(),
      razon_social: razon_social.trim(),
      direccion: typeof direccion === 'string' ? direccion.trim() : undefined,
      telefono: typeof telefono === 'string' ? telefono.trim() : undefined,
      email: typeof email === 'string' ? email.trim() : undefined,
      es_recurrente: body['es_recurrente'] === true || body['es_recurrente'] === 'true',
    };

    return ClienteModel.create(data);
  },

  async editar(id: number, empresaId: number, body: Record<string, unknown>) {
    const cliente = await ClienteModel.findById(id);
    if (!cliente) throw new Error('Cliente no encontrado.');
    if (cliente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este cliente.');

    const data: ClienteUpdate = {};

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
    if (body['es_recurrente'] !== undefined) {
      data.es_recurrente = body['es_recurrente'] === true || body['es_recurrente'] === 'true';
    }

    if (Object.keys(data).length === 0) throw new Error('No se enviaron campos válidos para actualizar.');

    const actualizado = await ClienteModel.update(id, data);
    if (!actualizado) throw new Error('No se pudo actualizar el cliente.');
    return actualizado;
  },

  async cambiarEstado(id: number, empresaId: number) {
    const cliente = await ClienteModel.findById(id);
    if (!cliente) throw new Error('Cliente no encontrado.');
    if (cliente.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este cliente.');

    const nuevoEstado = cliente.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    return ClienteModel.cambiarEstado(id, nuevoEstado);
  },

  async getTiposIdentificacion() {
    return ClienteModel.findAllTiposIdentificacion();
  },
};
