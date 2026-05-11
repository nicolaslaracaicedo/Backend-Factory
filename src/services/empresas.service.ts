import { EmpresaModel, EmpresaUpdate } from '../models/empresas.model';
import { validarEmail, validarTelefono } from '../utils/validators';
import { encryptSmtp } from '../utils/email.service';

const CAMPOS_PERMITIDOS: (keyof EmpresaUpdate)[] = [
  'razon_social', 'nombre_comercial', 'direccion_matriz', 'telefono', 'email',
  'logo_url', 'color_primario', 'color_secundario', 'color_acento',
  'fuente_principal', 'contribuyente_especial', 'nro_contribuyente_esp',
  'obligado_contabilidad', 'agente_retencion', 'rimpe', 'regimen', 'ambiente',
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password_enc', 'smtp_from_name', 'smtp_secure',
];

export const EmpresaService = {
  async obtener(empresaId: number) {
    const empresa = await EmpresaModel.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada.');
    const { smtp_password_enc: _, ...rest } = empresa as any;
    return { ...rest, smtp_configurado: !!empresa.smtp_host && !!empresa.smtp_user && !!empresa.smtp_password_enc };
  },

  async editar(empresaId: number, body: Record<string, unknown>) {
    const data: EmpresaUpdate = {};
    for (const campo of CAMPOS_PERMITIDOS) {
      if (Object.prototype.hasOwnProperty.call(body, campo)) {
        (data as Record<string, unknown>)[campo] = body[campo];
      }
    }

    // smtp_password se recibe en plano y se cifra antes de guardar
    if (typeof body['smtp_password'] === 'string' && body['smtp_password'].trim()) {
      data.smtp_password_enc = encryptSmtp(body['smtp_password'].trim());
    } else if (body['smtp_password'] === null || body['smtp_password'] === '') {
      data.smtp_password_enc = null;
    }

    if (Object.keys(data).length === 0) {
      throw new Error('No se enviaron campos válidos para actualizar.');
    }

    if (data.email !== undefined && data.email !== null && !validarEmail(data.email)) {
      throw new Error('Correo electrónico inválido.');
    }
    if (data.telefono !== undefined && data.telefono !== null && !validarTelefono(data.telefono)) {
      throw new Error('El teléfono debe tener exactamente 10 dígitos.');
    }
    if (data.ambiente !== undefined) {
      const amb = Number(data.ambiente);
      if (!Number.isInteger(amb) || ![1, 2].includes(amb)) {
        throw new Error('El ambiente debe ser 1 (Pruebas) o 2 (Producción).');
      }
      data.ambiente = amb;
    }
    if (data.smtp_port !== undefined && data.smtp_port !== null) {
      const port = Number(data.smtp_port);
      if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error('smtp_port debe ser un número de puerto válido (1-65535).');
      data.smtp_port = port;
    }
    if (data.smtp_user !== undefined && data.smtp_user !== null && data.smtp_user.trim()) {
      if (!validarEmail(data.smtp_user.trim()))
        throw new Error('smtp_user debe ser una dirección de correo válida.');
    }

    const empresa = await EmpresaModel.update(empresaId, data);
    if (!empresa) throw new Error('No se pudo actualizar la empresa.');

    // No devolver la contraseña cifrada al cliente
    const { smtp_password_enc: _, ...empresaSinPass } = empresa as any;
    return { ...empresaSinPass, smtp_configurado: !!empresa.smtp_host && !!empresa.smtp_user && !!empresa.smtp_password_enc };
  },
};
