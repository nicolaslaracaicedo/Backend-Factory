import { EmpresaModel, EmpresaUpdate } from '../models/empresas.model';
import { validarEmail, validarTelefono } from '../utils/validators';

const CAMPOS_PERMITIDOS: (keyof EmpresaUpdate)[] = [
  'razon_social', 'nombre_comercial', 'direccion_matriz', 'telefono', 'email',
  'logo_url', 'color_primario', 'color_secundario', 'color_acento',
  'fuente_principal', 'contribuyente_especial', 'nro_contribuyente_esp',
  'obligado_contabilidad', 'agente_retencion', 'rimpe', 'regimen', 'ambiente',
];

export const EmpresaService = {
  async obtener(empresaId: number) {
    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    return empresa;
  },

  async editar(empresaId: number, body: Record<string, unknown>) {
    // Filtrar solo los campos permitidos que vengan en el body
    const data: EmpresaUpdate = {};
    for (const campo of CAMPOS_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(body, campo)) {
        (data as Record<string, unknown>)[campo] = body[campo];
      }
    }

    if (Object.keys(data).length === 0) {
      throw new Error('No se enviaron campos válidos para actualizar.');
    }

    if (data.email !== undefined && !validarEmail(data.email)) {
      throw new Error('Correo electrónico inválido.');
    }
    if (data.telefono !== undefined && !validarTelefono(data.telefono)) {
      throw new Error('El teléfono debe tener exactamente 10 dígitos.');
    }
    if (data.ambiente !== undefined) {
      const amb = Number(data.ambiente);
      if (!Number.isInteger(amb) || ![1, 2].includes(amb)) {
        throw new Error('El ambiente debe ser 1 (Pruebas) o 2 (Producción).');
      }
      data.ambiente = amb;
    }

    const empresa = await EmpresaModel.update(empresaId, data);
    if (!empresa) throw new Error('No se pudo actualizar la empresa.');
    return empresa;
  },
};
