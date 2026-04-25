import forge from 'node-forge';
import crypto from 'crypto';
import { FirmaModel, FirmaCreate } from '../models/firmas_electronicas.model';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env['ENCRYPTION_KEY'];
  if (!key) throw new Error('ENCRYPTION_KEY no configurada.');
  return Buffer.from(key, 'hex');
}

function encryptPassword(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex!, 'hex');
  const enc = Buffer.from(encHex!, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function extraerInfoP12(base64: string, password: string) {
  try {
    const der = forge.util.decode64(base64);
    const asn1 = forge.asn1.fromDer(der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const cert = bags[forge.pki.oids.certBag]?.[0]?.cert;
    if (!cert) throw new Error('No se encontró certificado en el archivo P12.');

    const attr = (shortName: string) =>
      cert.subject.attributes.find((a) => a.shortName === shortName)?.value as string | undefined;

    return {
      titular: attr('CN') ?? null,
      organizacion: attr('O') ?? null,
      unidad: attr('OU') ?? null,
      pais: attr('C') ?? null,
      validoDesde: cert.validity.notBefore,
      validoHasta: cert.validity.notAfter,
      emisor: cert.issuer.attributes.map((a) => `${a.shortName}=${a.value}`).join(', '),
      serial: cert.serialNumber,
    };
  } catch {
    throw new Error('Contraseña incorrecta o archivo P12 inválido.');
  }
}

export const FirmaService = {
  async listar(empresaId: number) {
    const firmas = await FirmaModel.findAllByEmpresa(empresaId);
    return firmas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      fecha_vencimiento: f.fecha_vencimiento,
      activo: f.activo,
      created_at: f.created_at,
    }));
  },

  async verDetalle(id: number, empresaId: number) {
    const firma = await FirmaModel.findById(id);
    if (!firma) throw new Error('Firma no encontrada.');
    if (firma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta firma.');

    const password = decryptPassword(firma.password);
    const info = extraerInfoP12(firma.archivo_p12, password);

    return {
      id: firma.id,
      nombre: firma.nombre,
      activo: firma.activo,
      fecha_vencimiento: firma.fecha_vencimiento,
      created_at: firma.created_at,
      certificado: info,
    };
  },

  async subir(empresaId: number, buffer: Buffer, password: string, nombre?: string) {
    const base64 = buffer.toString('base64');
    const info = extraerInfoP12(base64, password);

    if (info.validoHasta < new Date()) {
      throw new Error(`El certificado está vencido desde el ${info.validoHasta.toLocaleDateString('es-EC')}.`);
    }

    const passwordEncriptado = encryptPassword(password);

    // Desactivar firma anterior y crear la nueva como activa
    await FirmaModel.desactivarTodasDeEmpresa(empresaId);

    const data: FirmaCreate = {
      id_empresa: empresaId,
      nombre: nombre ?? info.titular ?? undefined,
      archivo_p12: base64,
      password: passwordEncriptado,
      fecha_vencimiento: info.validoHasta.toISOString().split('T')[0]!,
    };

    const firma = await FirmaModel.create(data);
    return { id: firma.id, nombre: firma.nombre, fecha_vencimiento: firma.fecha_vencimiento, info };
  },

  async verActiva(empresaId: number) {
    const firma = await FirmaModel.findActivaByEmpresa(empresaId);
    if (!firma) throw new Error('No hay firma activa para esta empresa.');

    // Obtener firma completa para leer el P12
    const firmaCompleta = await FirmaModel.findById(firma.id);
    if (!firmaCompleta) throw new Error('Firma no encontrada.');

    const password = decryptPassword(firmaCompleta.password);
    const info = extraerInfoP12(firmaCompleta.archivo_p12, password);

    return {
      id: firma.id,
      nombre: firma.nombre,
      activo: firma.activo,
      fecha_vencimiento: firma.fecha_vencimiento,
      created_at: firma.created_at,
      certificado: info,
    };
  },

  async reemplazar(id: number, empresaId: number, buffer: Buffer, password: string, nombre?: string) {
    const firma = await FirmaModel.findById(id);
    if (!firma) throw new Error('Firma no encontrada.');
    if (firma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta firma.');

    const base64 = buffer.toString('base64');
    const info = extraerInfoP12(base64, password);

    if (info.validoHasta < new Date()) {
      throw new Error(`El certificado está vencido desde el ${info.validoHasta.toLocaleDateString('es-EC')}.`);
    }

    const passwordEncriptado = encryptPassword(password);

    const actualizada = await FirmaModel.replace(id, {
      nombre: nombre ?? info.titular ?? undefined,
      archivo_p12: base64,
      password: passwordEncriptado,
      fecha_vencimiento: info.validoHasta.toISOString().split('T')[0]!,
    });

    return { id: actualizada!.id, nombre: actualizada!.nombre, fecha_vencimiento: actualizada!.fecha_vencimiento, info };
  },

  async getActivaParaFirmar(empresaId: number): Promise<{ archivo_p12: string; password: string } | null> {
    const firma = await FirmaModel.findActivaConP12ByEmpresa(empresaId);
    if (!firma) return null;
    return {
      archivo_p12: firma.archivo_p12,
      password: decryptPassword(firma.password),
    };
  },

  async activar(id: number, empresaId: number) {
    const firma = await FirmaModel.findById(id);
    if (!firma) throw new Error('Firma no encontrada.');
    if (firma.id_empresa !== empresaId) throw new Error('No tienes permiso sobre esta firma.');

    if (new Date(firma.fecha_vencimiento) < new Date()) {
      throw new Error(`No se puede activar: el certificado está vencido desde el ${new Date(firma.fecha_vencimiento).toLocaleDateString('es-EC')}.`);
    }

    await FirmaModel.desactivarTodasDeEmpresa(empresaId);
    const activada = await FirmaModel.activar(id);

    return { id: activada!.id, nombre: activada!.nombre, activo: activada!.activo };
  },
};
