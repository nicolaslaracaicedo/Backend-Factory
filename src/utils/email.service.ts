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

export interface EnvioRecuperacionOpts {
  correoDestino: string;
  nombreUsuario: string;
  codigo: string;
}

function buildHtmlRecuperacion(empresa: Empresa, opts: EnvioRecuperacionOpts): string {
  const color = empresa.color_primario ?? '#1a56db';
  const contacto = [empresa.email, empresa.telefono].filter(Boolean).join(' | ');
  const nombreEmpresa = empresa.razon_social ?? empresa.nombre_comercial ?? '';
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <div style="background:${color};padding:24px 32px;">
    <h1 style="color:#fff;margin:0;font-size:20px;">Recuperación de Contraseña</h1>
    <p style="color:#fff;opacity:.85;margin:4px 0 0;font-size:13px;">${nombreEmpresa}</p>
  </div>
  <div style="padding:24px 32px;">
    <p style="color:#1e2939;">Estimado/a <strong>${opts.nombreUsuario}</strong>,</p>
    <p style="color:#374151;">Hemos recibido una solicitud para restablecer la contraseña de su cuenta. Utilice el siguiente código de verificación:</p>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:${color};color:#fff;font-size:34px;font-weight:bold;letter-spacing:10px;padding:18px 36px;border-radius:8px;">
        ${opts.codigo}
      </div>
    </div>
    <p style="color:#374151;">Este código es válido por <strong>15 minutos</strong>. Si no solicitó el restablecimiento de su contraseña, ignore este mensaje.</p>
    <p style="color:#64748b;font-size:13px;">Por seguridad, nunca comparta este código con nadie.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="color:#64748b;font-size:12px;margin:0;">${nombreEmpresa}${contacto ? ` | ${contacto}` : ''}</p>
  </div>
</div>`;
}

export async function enviarCodigoRecuperacion(empresa: Empresa, opts: EnvioRecuperacionOpts): Promise<void> {
  if (!empresa.smtp_host || !empresa.smtp_user || !empresa.smtp_password_enc)
    throw new Error('La empresa no tiene SMTP configurado. Configure el correo saliente en los datos de la empresa.');

  const password = decryptSmtp(empresa.smtp_password_enc);

  const transporter = nodemailer.createTransport({
    host: empresa.smtp_host,
    port: empresa.smtp_port ?? 587,
    secure: empresa.smtp_secure ?? false,
    auth: { user: empresa.smtp_user, pass: password },
  });

  const fromName = empresa.smtp_from_name ?? empresa.nombre_comercial ?? empresa.razon_social ?? '';

  await transporter.sendMail({
    from: `"${fromName}" <${empresa.smtp_user}>`,
    to: opts.correoDestino,
    subject: `Código de recuperación de contraseña - ${fromName}`,
    html: buildHtmlRecuperacion(empresa, opts),
  });
}

export interface EnvioVerificacionEmailOpts {
  correoDestino: string;
  nombreUsuario: string;
  codigo: string;
}

function buildHtmlVerificacion(opts: EnvioVerificacionEmailOpts): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Verificación de Correo — Factory</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(4,43,104,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#042B68 0%,#0D5FA8 60%,#1498A8 100%);padding:40px 40px 32px;text-align:center;">
              <div style="display:inline-block;background:#ffffff;border-radius:16px;padding:16px 32px;margin:0 auto 24px;box-shadow:0 4px 16px rgba(0,0,0,0.18);">
                <img
                  src="https://i.imgur.com/4N4tptH.png"
                  alt="Factory Sistema Contable"
                  style="max-width:220px;height:auto;display:block;margin:0 auto;"
                />
              </div>
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:20px;padding:7px 22px;">
                <span style="color:#7EE3E4;font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Verificación de Cuenta</span>
              </div>
            </td>
          </tr>

          <!-- CUERPO -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px;">

              <p style="margin:0 0 8px;color:#042B68;font-size:22px;font-weight:700;">
                ¡Hola, ${opts.nombreUsuario}!
              </p>
              <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.6;">
                Gracias por registrarte en <strong style="color:#0D5FA8;">Factory</strong>. Para activar tu cuenta e iniciar sesión, ingresa el siguiente código de verificación:
              </p>

              <!-- CÓDIGO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,#0D5FA8,#1498A8);border-radius:12px;padding:2px;">
                      <div style="background:#ffffff;border-radius:10px;padding:24px 48px;text-align:center;">
                        <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#042B68;font-family:'Courier New',monospace;">
                          ${opts.codigo}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- INFO VALIDEZ -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-left:4px solid #38C4CF;border-radius:0 8px 8px 0;margin:0 0 24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#042B68;font-size:13px;line-height:1.5;">
                      ⏱ &nbsp;Este código es válido por <strong>15 minutos</strong> a partir de la recepción de este correo.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#4a5568;font-size:14px;line-height:1.6;">
                Si no creaste una cuenta en Factory, puedes ignorar este mensaje con seguridad. Nadie podrá acceder a tu cuenta sin este código.
              </p>

              <!-- DIVIDER -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;"/>

              <p style="margin:0;color:#718096;font-size:12px;line-height:1.6;">
                🔒 &nbsp;Por tu seguridad, <strong>nunca compartas este código</strong> con nadie. Factory jamás te lo pedirá por teléfono o chat.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:linear-gradient(135deg,#042B68,#0D5FA8);padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#76C3E8;font-size:13px;font-weight:600;">Factory — Sistema Contable</p>
              <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function createSystemTransporter() {
  const user = process.env.SYSTEM_EMAIL_USER;
  const pass = process.env.SYSTEM_EMAIL_PASSWORD;
  if (!user || !pass)
    throw new Error('El correo del sistema no está configurado (SYSTEM_EMAIL_USER / SYSTEM_EMAIL_PASSWORD).');

  return nodemailer.createTransport({
    host: process.env.SYSTEM_EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SYSTEM_EMAIL_PORT ?? 587),
    secure: process.env.SYSTEM_EMAIL_SECURE === 'true',
    auth: { user, pass },
  });
}

export async function enviarVerificacionEmail(opts: EnvioVerificacionEmailOpts): Promise<void> {
  const transporter = createSystemTransporter();
  const fromName = process.env.SYSTEM_EMAIL_FROM_NAME ?? 'Factory Sistema Contable';
  const fromUser = process.env.SYSTEM_EMAIL_USER!;

  await transporter.sendMail({
    from: `"${fromName}" <${fromUser}>`,
    to: opts.correoDestino,
    subject: `Código de verificación de correo - Factory`,
    html: buildHtmlVerificacion(opts),
  });
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
