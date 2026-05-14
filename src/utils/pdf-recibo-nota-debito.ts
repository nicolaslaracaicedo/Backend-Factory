import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { NotaDebitoConDetalles } from '../models/notas_debito.model';
import type { Empresa } from '../models/empresas.model';

const fmt = (n: number | string) => (Math.trunc(Number(n) * 100) / 100).toFixed(2);

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  const p = String(d).substring(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(d).substring(0, 10);
};

// 80mm en puntos PDF
const PW = 226.77;
const M  = 8;
const CW = PW - M * 2;

function line(doc: InstanceType<typeof PDFDocument>, y: number, style: 'solid' | 'dashed' = 'solid'): number {
  if (style === 'dashed') {
    doc.save().dash(3, { space: 2 }).moveTo(M, y).lineTo(M + CW, y).stroke('#aaaaaa').restore();
  } else {
    doc.moveTo(M, y).lineTo(M + CW, y).strokeColor('#333333').lineWidth(0.5).stroke();
  }
  return y + 4;
}

export function generarReciboNotaDebito(
  nd: NotaDebitoConDetalles,
  empresa: Empresa,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const baseH = 420 + nd.detalles.length * 28;

    const doc = new PDFDocument({
      size: [PW, baseH],
      margin: 0,
      info: { Title: `Nota de Débito ${nd.numero_comprobante ?? ''}`, Author: empresa.razon_social ?? '' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = M;

    // ── LOGO ──────────────────────────────────────────────────────────────────
    if (empresa.logo_url) {
      const rel = empresa.logo_url.startsWith('/') ? empresa.logo_url.slice(1) : empresa.logo_url;
      const logoPath = path.join(__dirname, '../../', rel);
      if (fs.existsSync(logoPath)) {
        try {
          const logoH = 40;
          doc.image(logoPath, M, y, { fit: [CW, logoH], align: 'center', valign: 'center' });
          y += logoH + 4;
        } catch (_) {}
      }
    }

    // ── CABECERA EMPRESA ──────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
       .text(empresa.nombre_comercial ?? empresa.razon_social ?? '', M, y, { width: CW, align: 'center' });
    y = doc.y + 2;

    doc.font('Helvetica').fontSize(7).fillColor('#333333');
    doc.text(`RUC: ${empresa.ruc}`, M, y, { width: CW, align: 'center' });
    y = doc.y + 1;

    if (empresa.direccion_matriz) {
      doc.text(empresa.direccion_matriz, M, y, { width: CW, align: 'center' });
      y = doc.y + 1;
    }
    if (empresa.telefono) {
      doc.text(`Tel: ${empresa.telefono}`, M, y, { width: CW, align: 'center' });
      y = doc.y + 1;
    }
    if (empresa.email) {
      doc.text(empresa.email, M, y, { width: CW, align: 'center' });
      y = doc.y + 1;
    }

    y += 3;
    y = line(doc, y);
    y += 2;

    // ── TIPO DOCUMENTO ────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
       .text('NOTA DE DÉBITO', M, y, { width: CW, align: 'center' });
    y = doc.y + 1;

    doc.font('Helvetica').fontSize(7.5)
       .text(nd.numero_comprobante ?? '-', M, y, { width: CW, align: 'center' });
    y = doc.y + 3;

    y = line(doc, y, 'dashed');
    y += 2;

    // ── DATOS ─────────────────────────────────────────────────────────────────
    const info = (label: string, val: string) => {
      doc.font('Helvetica').fontSize(7).fillColor('#555555')
         .text(label, M, y, { continued: false, width: CW });
      const labelY = doc.y - doc.currentLineHeight();
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000')
         .text(val, M + 60, labelY, { width: CW - 60 });
      y = doc.y + 1;
    };

    info('Fecha:', fmtDate(nd.fecha_emision));
    info('Cliente:', nd.cli_razon_social ?? 'Consumidor Final');
    if (nd.cli_identificacion) info('CI/RUC:', nd.cli_identificacion);
    if (nd.factura_ref_numero) info('Doc. Ref.:', nd.factura_ref_numero);
    if (nd.factura_ref_fecha)  info('F. Doc. Ref.:', fmtDate(nd.factura_ref_fecha));
    info('Motivo:', nd.motivo ?? '-');

    y += 3;
    y = line(doc, y, 'dashed');
    y += 2;

    // ── ENCABEZADO ÍTEMS ─────────────────────────────────────────────────────
    const C1 = M;
    const C2 = M + 130;
    const W1 = 128;
    const W2 = CW - 130;

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000000')
       .text('Razón / Concepto', C1, y, { width: W1 })
       .text('Valor', C2, y, { width: W2, align: 'right' });
    y = doc.y + 1;
    y = line(doc, y);
    y += 1;

    // ── ÍTEMS ─────────────────────────────────────────────────────────────────
    for (const d of nd.detalles) {
      doc.font('Helvetica').fontSize(7).fillColor('#000000')
         .text(d.razon, C1, y, { width: W1 });
      const razonH = doc.y;

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000')
         .text(`$${fmt(d.valor)}`, C2, y, { width: W2, align: 'right' });

      y = Math.max(razonH, doc.y) + 2;
    }

    y += 2;
    y = line(doc, y, 'dashed');
    y += 2;

    // ── TOTALES ───────────────────────────────────────────────────────────────
    const totRow = (label: string, val: string, bold = false) => {
      const LW = 100;
      const VW = CW - LW;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 8 : 7)
         .fillColor('#000000')
         .text(label, M, y, { width: LW });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 8 : 7)
         .text(val, M + LW, y, { width: VW, align: 'right' });
      y = doc.y + (bold ? 2 : 1);
    };

    totRow('Subtotal:', `$${fmt(Number(nd.subtotal))}`);
    totRow('IVA (15%):', `$${fmt(Number(nd.iva_total))}`);

    y += 1;
    y = line(doc, y);
    y += 2;

    totRow('TOTAL:', `$${fmt(Number(nd.total))}`, true);

    y += 4;
    y = line(doc, y, 'dashed');
    y += 3;

    // ── CLAVE DE ACCESO ───────────────────────────────────────────────────────
    if (nd.clave_acceso) {
      doc.font('Helvetica').fontSize(5.5).fillColor('#666666')
         .text('Clave de acceso:', M, y, { width: CW, align: 'center' });
      y = doc.y + 1;
      doc.font('Helvetica').fontSize(5.5).fillColor('#444444')
         .text(nd.clave_acceso, M, y, { width: CW, align: 'center' });
      y = doc.y + 3;
    }

    // ── PIE ───────────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(7).fillColor('#444444')
       .text('Gracias por su preferencia', M, y, { width: CW, align: 'center' });
    y = doc.y + 2;

    doc.font('Helvetica').fontSize(6).fillColor('#888888')
       .text(`Generado: ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
             M, y, { width: CW, align: 'center' });

    doc.end();
  });
}
