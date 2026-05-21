import bcrypt from 'bcryptjs';
import { UsuarioModel } from '../models/usuarios.model';
import { PuntoEmisionModel } from '../models/puntos_emision.model';
import { validarCedula, validarEmail, validarPassword, validarTelefono } from '../utils/validators';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO'];

async function resolverPuntoEmisionDefault(
  body: Record<string, unknown>,
  empresaId: number
): Promise<number | null> {
  if (body['id_punto_emision_default'] === null || body['id_punto_emision_default'] === undefined) {
    return null;
  }
  const id = Number(body['id_punto_emision_default']);
  if (isNaN(id)) throw new Error('id_punto_emision_default inválido.');
  const pe = await PuntoEmisionModel.findById(id);
  if (!pe || pe.id_empresa !== empresaId)
    throw new Error('Punto de emisión no encontrado o no pertenece a la empresa.');
  if (pe.estado !== 'ACTIVO')
    throw new Error('El punto de emisión seleccionado no está activo.');
  return id;
}

export const UsuarioService = {
  async listar(empresaId: number) {
    return UsuarioModel.findAllByEmpresa(empresaId);
  },

  async verDetalle(id: number, empresaId: number) {
    const usuario = await UsuarioModel.findById(id, empresaId);
    if (!usuario) throw new Error('Usuario no encontrado.');
    return usuario;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const id_rol = Number(body['id_rol']);
    if (!id_rol || isNaN(id_rol)) throw new Error('El campo id_rol es requerido.');
    const rolExiste = await UsuarioModel.findRol(id_rol);
    if (!rolExiste) throw new Error('El rol especificado no existe o está inactivo.');

    const tipo_identificacion = '05';

    const identificacion = typeof body['identificacion'] === 'string' ? body['identificacion'].trim() : '';
    if (!identificacion) throw new Error('La identificación es requerida.');
    if (!validarCedula(identificacion))
      throw new Error('La identificación debe ser una cédula ecuatoriana válida (10 dígitos).');

    const nombre = typeof body['nombre'] === 'string' ? body['nombre'].trim() : '';
    if (!nombre) throw new Error('El nombre es requerido.');

    const apellido = typeof body['apellido'] === 'string' ? body['apellido'].trim() : '';
    if (!apellido) throw new Error('El apellido es requerido.');

    const email = typeof body['email'] === 'string' ? body['email'].trim().toLowerCase() : '';
    if (!email) throw new Error('El email es requerido.');
    if (!validarEmail(email)) throw new Error('El email no tiene un formato válido.');

    const password = typeof body['password'] === 'string' ? body['password'] : '';
    if (!password) throw new Error('La contraseña es requerida.');
    const { valido, mensaje } = validarPassword(password);
    if (!valido) throw new Error(mensaje);

    const telefono = typeof body['telefono'] === 'string' && body['telefono'].trim()
      ? body['telefono'].trim() : null;
    if (telefono && !validarTelefono(telefono))
      throw new Error('El teléfono debe tener exactamente 10 dígitos.');

    const direccion = typeof body['direccion'] === 'string' && body['direccion'].trim()
      ? body['direccion'].trim() : null;

    const emailExiste = await UsuarioModel.findByEmail(email, empresaId);
    if (emailExiste) throw new Error('Ya existe un usuario con ese email en esta empresa.');

    const identificacionExiste = await UsuarioModel.findByIdentificacion(identificacion, empresaId);
    if (identificacionExiste) throw new Error('Ya existe un usuario con esa identificación en esta empresa.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const id_punto_emision_default = await resolverPuntoEmisionDefault(body, empresaId);

    return UsuarioModel.create({
      id_empresa: empresaId,
      id_rol,
      tipo_identificacion,
      identificacion,
      nombre,
      apellido,
      email,
      password: hashedPassword,
      telefono,
      direccion,
      id_punto_emision_default,
    });
  },

  async editar(id: number, empresaId: number, usuarioActualId: number, body: Record<string, unknown>) {
    const usuario = await UsuarioModel.findById(id, empresaId);
    if (!usuario) throw new Error('Usuario no encontrado.');

    const id_rol = body['id_rol'] !== undefined ? Number(body['id_rol']) : usuario.id_rol;
    if (!id_rol || isNaN(id_rol)) throw new Error('El campo id_rol es requerido.');

    // No permitir que el admin se cambie su propio rol
    if (id === usuarioActualId && id_rol !== usuario.id_rol)
      throw new Error('No puedes cambiar tu propio rol.');

    const rolExiste = await UsuarioModel.findRol(id_rol);
    if (!rolExiste) throw new Error('El rol especificado no existe o está inactivo.');

    const tipo_identificacion = '05';

    const identificacion = typeof body['identificacion'] === 'string'
      ? body['identificacion'].trim() : usuario.identificacion;
    if (!identificacion) throw new Error('La identificación es requerida.');
    if (!validarCedula(identificacion))
      throw new Error('La identificación debe ser una cédula ecuatoriana válida (10 dígitos).');

    const nombre = typeof body['nombre'] === 'string' ? body['nombre'].trim() : usuario.nombre;
    if (!nombre) throw new Error('El nombre es requerido.');

    const apellido = typeof body['apellido'] === 'string' ? body['apellido'].trim() : usuario.apellido;
    if (!apellido) throw new Error('El apellido es requerido.');

    const email = typeof body['email'] === 'string'
      ? body['email'].trim().toLowerCase() : usuario.email;
    if (!email) throw new Error('El email es requerido.');
    if (!validarEmail(email)) throw new Error('El email no tiene un formato válido.');

    const telefono = typeof body['telefono'] === 'string' && body['telefono'].trim()
      ? body['telefono'].trim() : null;
    if (telefono && !validarTelefono(telefono))
      throw new Error('El teléfono debe tener exactamente 10 dígitos.');

    const direccion = typeof body['direccion'] === 'string' && body['direccion'].trim()
      ? body['direccion'].trim() : null;

    const emailExiste = await UsuarioModel.findByEmail(email, empresaId, id);
    if (emailExiste) throw new Error('Ya existe un usuario con ese email en esta empresa.');

    const identificacionExiste = await UsuarioModel.findByIdentificacion(identificacion, empresaId, id);
    if (identificacionExiste) throw new Error('Ya existe un usuario con esa identificación en esta empresa.');

    let hashedPassword: string | undefined;
    if (typeof body['password'] === 'string' && body['password']) {
      const { valido, mensaje } = validarPassword(body['password']);
      if (!valido) throw new Error(mensaje);
      hashedPassword = await bcrypt.hash(body['password'], 10);
    }

    const id_punto_emision_default = 'id_punto_emision_default' in body
      ? await resolverPuntoEmisionDefault(body, empresaId)
      : usuario.id_punto_emision_default;

    const updated = await UsuarioModel.update(id, empresaId, {
      id_rol, tipo_identificacion, identificacion, nombre, apellido, email,
      telefono, direccion, password: hashedPassword, id_punto_emision_default,
    });
    if (!updated) throw new Error('No se pudo actualizar el usuario.');
    return updated;
  },

  async cambiarEstado(id: number, empresaId: number, usuarioActualId: number, body: Record<string, unknown>) {
    const usuario = await UsuarioModel.findById(id, empresaId);
    if (!usuario) throw new Error('Usuario no encontrado.');

    if (id === usuarioActualId)
      throw new Error('No puedes cambiar el estado de tu propio usuario.');

    const estado = typeof body['estado'] === 'string' ? body['estado'].toUpperCase() : '';
    if (!ESTADOS_VALIDOS.includes(estado))
      throw new Error(`Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}.`);
    if (usuario.estado === estado)
      throw new Error(`El usuario ya se encuentra en estado ${estado}.`);

    const updated = await UsuarioModel.cambiarEstado(id, empresaId, estado);
    if (!updated) throw new Error('No se pudo actualizar el estado.');
    return updated;
  },

};
