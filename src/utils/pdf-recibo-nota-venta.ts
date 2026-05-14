import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { NotaVentaConDetalles } from '../models/notas_venta.model';
import type { Empresa } from '../models/empresas.model';

const fmt = (n: number | string) => (Math.trunc(Number(n) * 100) / 100).toFixed(2);

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  const p = String(d).substring(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(d).substring(0, 10);
};

const FORMA_PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '15': 'Compensación de deudas', '16': 'Tarjeta de débito',
  '17': 'Dinero electrónico', '18': 'Tarjeta prepago', '19': 'Tarjeta de crédito',
  '20': 'Transferencia / Otros', '21': 'Endoso de títulos',
};

export async function generarReciboNotaVenta(
  nv: NotaVentaConDetalles,
  empresa: Empresa,
): Promise<Buffer> {
  const PW = 226.77;
  const M  = 10;
  const CW = PW - M * 2;
  const baseH = 520 + nv.detalles.length * 30;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PW, baseH],
      margin: 0,
      info: { Title: `Nota de Venta ${nv.numero_comprobante ?? ''}`, Author: empresa.razon_social ?? '' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const hline = (y: number, x1 = M, x2 = M + CW, dash = false) => {
      doc.moveTo(x1, y).lineTo(x2, y);
      if (dash) doc.dash(3, { space: 2 });
      doc.strokeColor('#000000').lineWidth(0.5).stroke();
      if (dash) doc.undash();
    };

    let y = M;

    // Logo
    if (empresa.logo_url) {
      const rel = empresa.logo_url.startsWith('/') ? empresa.logo_url.slice(1) : empresa.logo_url;
      const logoPath = path.join(__dirname, '../../', rel);
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, M, y, { fit: [CW, 45], align: 'center', valign: 'center' });
          y += 48;
        } catch (_) {}
      }
    }

    // Encabezado empresa
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
       .text(empresa.nombre_comercial ?? empresa.razon_social ?? '', M, y, { width: CW, align: 'center' });
    y += 12;
    doc.font('Helvetica').fontSize(7).fillColor('#000000')
       .text(`RUC: ${empresa.ruc ?? '-'}`, M, y, { width: CW, align: 'center' });
    y += 9;
    if (empresa.direccion_matriz) {
      doc.font('Helvetica').fontSize(7).fillColor('#000000')
         .text(empresa.direccion_matriz, M, y, { width: CW, align: 'center' });
      y += 9;
    }
    if (empresa.telefono) {
      doc.font('Helvetica').fontSize(7).fillColor('#000000')
         .text(`Tel: ${empresa.telefono}`, M, y, { width: CW, align: 'center' });
      y += 9;
    }
    y += 3;

    // Título
    hline(y); y += 4;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
       .text('NOTA DE VENTA', M, y, { width: CW, align: 'center' });
    y += 11;
    doc.font('Helvetica').fontSize(7).fillColor('#000000')
       .text('(RISE - Sin IVA)', M, y, { width: CW, align: 'center' });
    y += 9;
    hline(y); y += 5;

    // Info comprobante
    const row2 = (lbl: string, val: string) => {
      doc.font('Helvetica').fontSize(7).fillColor('#000000').text(lbl, M, y, { width: 70, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000').text(val, M + 72, y, { width: CW - 72, lineBreak: false });
      y += 10;
    };

    row2('No. Comprobante:', nv.numero_comprobante ?? '-');
    row2('Fecha Emisión:', fmtDate(nv.fecha_emision));
    row2('Estado:', nv.estado);
    if (nv.numero_autorizacion) row2('No. Autorización:', nv.numero_autorizacion);
    y += 2;

    // Datos cliente
    hline(y, M, M + CW, true); y += 5;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000')
       .text('COMPRADOR', M, y, { width: CW }); y += 10;
    row2('Nombre:', nv.cli_razon_social ?? 'CONSUMIDOR FINAL');
    row2('Identificación:', nv.cli_identificacion ?? '9999999999');
    if (nv.cli_direccion) row2('Dirección:', nv.cli_direccion);
    if (nv.cli_email) row2('Email:', nv.cli_email);
    row2('Forma de Pago:', FORMA_PAGO_LABEL[nv.forma_pago] ?? nv.forma_pago);
    y += 2;

    // Ítems — encabezado
    hline(y); y += 4;
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
    doc.text('DESCRIPCIÓN',     M + 2,        y, { width: 100, lineBreak: false });
    doc.text('CANT',            M + 104,      y, { width: 28,  align: 'right', lineBreak: false });
    doc.text('P.U.',            M + 134,      y, { width: 32,  align: 'right', lineBreak: false });
    doc.text('TOTAL',           M + CW - 32,  y, { width: 30,  align: 'right', lineBreak: false });
    y += 10;
    hline(y); y += 4;

    for (const d of nv.detalles) {
      doc.font('Helvetica').fontSize(7.5);
      const descH = doc.heightOfString(d.descripcion, { width: 100 });
      const rowH  = Math.max(18, descH + 6);

      doc.fillColor('#000000')
         .text(d.descripcion,         M + 2,       y + 3, { width: 100 })
         .text(fmt(d.cantidad),       M + 104,     y + 3, { width: 28, align: 'right', lineBreak: false })
         .text(fmt(d.precio_unitario),M + 134,     y + 3, { width: 32, align: 'right', lineBreak: false });
      doc.font('Helvetica-Bold')
         .text(`$${fmt(d.subtotal)}`, M + CW - 32, y + 3, { width: 30, align: 'right', lineBreak: false });

      y += rowH;
      hline(y, M, M + CW, true);
    }

    y += 5;

    // Totales
    const totLine = (lbl: string, val: string, bold = false) => {
      const fnt = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(fnt).fontSize(7.5).fillColor('#000000').text(lbl, M, y, { width: CW - 50, lineBreak: false });
      doc.font(fnt).fontSize(7.5).fillColor('#000000').text(val, M + CW - 48, y, { width: 46, align: 'right', lineBreak: false });
      y += 10;
    };

    hline(y); y += 4;
    totLine('Subtotal Sin Impuestos:', `$${fmt(nv.subtotal_sin_impuesto)}`);
    if (Number(nv.descuento_total) > 0)
      totLine('Descuento Total:', `-$${fmt(nv.descuento_total)}`);

    hline(y); y += 3;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
       .text('TOTAL:', M + 4, y, { width: CW - 60, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
       .text(`$${fmt(nv.total)}`, M, y, { width: CW - 4, align: 'right', lineBreak: false });
    y += 14;
    hline(y); y += 6;

    // Observación
    if (nv.observacion) {
      doc.font('Helvetica').fontSize(7).fillColor('#000000')
         .text(`Obs: ${nv.observacion}`, M, y, { width: CW });
      y += doc.heightOfString(nv.observacion, { width: CW }) + 6;
      hline(y, M, M + CW, true); y += 5;
    }

    // Clave de acceso
    if (nv.clave_acceso) {
      doc.font('Helvetica').fontSize(6).fillColor('#000000')
         .text('Clave de acceso:', M, y, { width: CW, align: 'center' });
      y += 9;
      doc.font('Helvetica').fontSize(5.5).fillColor('#000000')
         .text(nv.clave_acceso, M, y, { width: CW, align: 'center' });
      y += 10;
      hline(y); y += 5;
    }

    // Pie
    doc.font('Helvetica').fontSize(6.5).fillColor('#000000')
       .text('Documento generado electrónicamente', M, y, { width: CW, align: 'center' });
    y += 9;
    if (empresa.email) {
      doc.font('Helvetica').fontSize(6.5).fillColor('#000000')
         .text(empresa.email, M, y, { width: CW, align: 'center' });
    }

    doc.end();
  });
}
