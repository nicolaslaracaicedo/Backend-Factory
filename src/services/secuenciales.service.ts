import { SecuencialModel, SecuencialCreate } from '../models/secuenciales.model';
import { PuntoEmisionModel } from '../models/puntos_emision.model';
import { EmpresaModel } from '../models/empresas.model';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO', 'TODOS'];
const AMBIENTES_VALIDOS = [1, 2];

export const SecuencialService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const estado = query['estado'] ? query['estado'].toUpperCase() : 'TODOS';
    if (!ESTADOS_VALIDOS.includes(estado)) throw new Error('El estado debe ser ACTIVO, INACTIVO o TODOS.');

    const ambiente = query['ambiente'] ? Number(query['ambiente']) : undefined;
    if (ambiente !== undefined && !AMBIENTES_VALIDOS.includes(ambiente)) {
      throw new Error('El ambiente debe ser 1 (Pruebas) o 2 (Producción).');
    }

    const tipo_documento = query['tipo_documento'];
    if (tipo_documento) {
      const tipoValido = await SecuencialModel.findTipoDocumento(tipo_documento);
      if (!tipoValido) throw new Error('Tipo de documento inválido.');
    }

    return SecuencialModel.findAllByEmpresa(empresaId, { estado, ambiente, tipo_documento });
  },

  async listarPorPunto(puntoEmisionId: number, empresaId: number) {
    const punto = await PuntoEmisionModel.findById(puntoEmisionId);
    if (!punto) throw new Error('Punto de emisión no encontrado.');
    if (punto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este punto de emisión.');
    return SecuencialModel.findByPuntoEmision(puntoEmisionId);
  },

  async verDetalle(id: number, empresaId: number) {
    const sec = await SecuencialModel.findById(id);
    if (!sec) throw new Error('Secuencial no encontrado.');
    if (sec.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este secuencial.');
    return sec;
  },

  async crear(empresaId: number, body: Record<string, unknown>) {
    const idPuntoEmision = Number(body['id_punto_emision']);
    const tipoDocumento  = body['tipo_documento'];

    if (!idPuntoEmision || isNaN(idPuntoEmision)) throw new Error('El id_punto_emision es requerido.');
    if (!tipoDocumento || typeof tipoDocumento !== 'string') throw new Error('El tipo_documento es requerido.');

    const tipoValido = await SecuencialModel.findTipoDocumento(tipoDocumento);
    if (!tipoValido) {
      const tipos = await SecuencialModel.findAllTiposDocumento();
      const lista = tipos.map((t) => `${t.codigo} (${t.nombre})`).join(', ');
      throw new Error(`Tipo de documento inválido. Válidos: ${lista}.`);
    }

    const punto = await PuntoEmisionModel.findById(idPuntoEmision);
    if (!punto) throw new Error('Punto de emisión no encontrado.');
    if (punto.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este punto de emisión.');

    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa?.ambiente) throw new Error('La empresa no tiene ambiente configurado. Configúrelo primero.');

    const existe = await SecuencialModel.findByUnique(idPuntoEmision, tipoDocumento);
    if (existe) throw new Error('Ya existe un secuencial para ese punto de emisión y tipo de documento en el ambiente actual.');

    const data: SecuencialCreate = {
      id_empresa: empresaId,
      id_punto_emision: idPuntoEmision,
      tipo_documento: tipoDocumento,
      ambiente: empresa.ambiente,
    };

    return SecuencialModel.create(data);
  },

  async cambiarEstado(id: number, empresaId: number) {
    const sec = await SecuencialModel.findById(id);
    if (!sec) throw new Error('Secuencial no encontrado.');
    if (sec.id_empresa !== empresaId) throw new Error('No tienes permiso sobre este secuencial.');

    const nuevoEstado = sec.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    return SecuencialModel.cambiarEstado(id, nuevoEstado);
  },

  async getTiposDocumento() {
    return SecuencialModel.findAllTiposDocumento();
  },
};
