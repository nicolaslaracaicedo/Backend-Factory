import { LogSriModel } from '../models/log_sri.model';

const ACCIONES_VALIDAS = ['RECEPCION', 'AUTORIZACION'];
const TIPOS_DOCUMENTO_VALIDOS = ['01', '03', '04', '05', '06', '07'];

export const LogSriService = {
  async listar(empresaId: number, query: Record<string, string | undefined>) {
    const tipo_documento = query['tipo_documento'];
    if (tipo_documento && !TIPOS_DOCUMENTO_VALIDOS.includes(tipo_documento))
      throw new Error(`tipo_documento inválido. Válidos: ${TIPOS_DOCUMENTO_VALIDOS.join(', ')}.`);

    const accion = query['accion']?.toUpperCase();
    if (accion && !ACCIONES_VALIDAS.includes(accion))
      throw new Error(`accion inválida. Válidas: ${ACCIONES_VALIDAS.join(', ')}.`);

    const id_documento = query['id_documento'] ? Number(query['id_documento']) : undefined;
    const limit = query['limit'] ? Number(query['limit']) : undefined;

    return LogSriModel.findByEmpresa(empresaId, {
      tipo_documento,
      id_documento,
      accion,
      fecha_desde: query['fecha_desde'],
      fecha_hasta: query['fecha_hasta'],
      limit,
    });
  },

  async verDetalle(id: number, empresaId: number) {
    const log = await LogSriModel.findById(id, empresaId);
    if (!log) throw new Error('Registro de log no encontrado.');
    return log;
  },
};
