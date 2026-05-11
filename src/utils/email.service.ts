import nodemailer from 'nodemailer';
import crypto from 'crypto';
import type { Empresa } from '../models/empresas.model';

const ALGO = 'aes-256-cbc';

function getKey(): Buffer {
  const hex = process.env.SMTP_ENCRYPTION_KEY ?? '';
  if (hex.length < 64)
    throw new Error('SMTP_ENCRYPTION_KEY no configurada (debe ser una cadena hex de 64 caracteres).');
  return Buffer.from(hex.slice(0, 64), 'hex');
}

export function encryptSmtp(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSmtp(enc: string): string {
  const key = getKey();
  const [ivHex, dataHex] = enc.split(':');
  if (!ivHex || !dataHex) throw new Error('Contraseña SMTP cifrada inválida o corrupta.');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf8');
}

export interface EnvioDocumentoOpts {
  correoDestino: string;
  destinatarioNombre: string;
  tipoDocumento: string;
  numeroComprobante: string;
  pdfBuffer: Buffer;
  pdfNombre: string;
  xmlContent: string | null;
  xmlNombre: string;
}

function buildHtml(empresa: Empresa, opts: EnvioDocumentoOpts): string {
  const color = empresa.color_primario ?? '#1a56db';
  const contacto = [empresa.email, empresa.telefono].filter(Boolean).join(' | ');
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <div style="background:${color};padding:24px 32px;">
    <h1 style="color:#fff;margin:0;font-size:20px;">${opts.tipoDocumento}</h1>
    <p style="color:#fff;opacity:.85;margin:4px 0 0;font-size:13px;">${opts.numeroComprobante}</p>
  </div>
  <div style="padding:24px 32px;">
    <p style="color:#1e2939;">Estimado/a <strong>${opts.destinatarioNombre}</strong>,</p>
    <p style="color:#374151;">Adjunto encontrará el comprobante electrónico <strong>${opts.numeroComprobante}</strong> emitido por <strong>${empresa.razon_social ?? empresa.nombre_comercial ?? ''}</strong>.</p>
    <ul style="color:#374151;">
      <li> <strong>${opts.pdfNombre}</strong> — documento en formato PDF</li>
      ${opts.xmlContent ? `<li> <strong>${opts.xmlNombre}</strong> — comprobante electrónico XML autorizado por el SRI</li>` : ''}
    </ul>
    <p style="color:#374151;">Si tiene alguna consulta, no dude en contactarnos.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="color:#64748b;font-size:12px;margin:0;">${empresa.razon_social ?? ''} ${contacto ? `| ${contacto}` : ''}</p>
  </div>
</div>`;
}

export async function enviarDocumentoPorCorreo(empresa: Empresa, opts: EnvioDocumentoOpts): Promise<void> {
  if (!empresa.smtp_host || !empresa.smtp_user || !empresa.smtp_password_enc)
    throw new Error('La empresa no tiene SMTP configurado. Configure el correo saliente en los datos de la empresa.');

  const password = decryptSmtp(empresa.smtp_password_enc);

  const transporter = nodemailer.createTransport({
    host: empresa.smtp_host,
    port: empresa.smtp_port ?? 587,
    secure: empresa.smtp_secure ?? false,
    auth: { user: empresa.smtp_user, pass: password },
  });

  const attachments: any[] = [
    { filename: opts.pdfNombre, content: opts.pdfBuffer, contentType: 'application/pdf' },
  ];

  if (opts.xmlContent) {
    attachments.push({
      filename: opts.xmlNombre,
      content: Buffer.from(opts.xmlContent, 'utf8'),
      contentType: 'application/xml',
    });
  }

  const fromName = empresa.smtp_from_name ?? empresa.nombre_comercial ?? empresa.razon_social ?? '';

  await transporter.sendMail({
    from: `"${fromName}" <${empresa.smtp_user}>`,
    to: opts.correoDestino,
    subject: `${opts.tipoDocumento} ${opts.numeroComprobante} - ${fromName}`,
    html: buildHtml(empresa, opts),
    attachments,
  });
}
