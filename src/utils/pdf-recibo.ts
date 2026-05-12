import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { FacturaConDetalles } from '../models/facturas.model';
import type { Empresa } from '../models/empresas.model';

const fmt = (n: number | string) => Number(n).toFixed(2);

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  const p = String(d).substring(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(d).substring(0, 10);
};

const FORMA_PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '15': 'Comp. deudas', '16': 'T. débito',
  '17': 'Dinero electrónico', '18': 'T. prepago', '19': 'T. crédito',
  '20': 'Otros financiero', '21': 'Endoso títulos',
};

// 80mm en puntos PDF (1mm = 2.8346 pts)
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

export function generarPdfRecibo(
  factura: FacturaConDetalles,
  empresa: Empresa,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Calculamos la altura estimada para el papel térmico
    const baseH = 480 + factura.detalles.length * 30 + (factura.datos_adicionales?.length ?? 0) * 14;

    const doc = new PDFDocument({
      size: [PW, baseH],
      margin: 0,
      info: { Title: `Recibo ${factura.numero_comprobante ?? ''}`, Author: empresa.razon_social ?? '' },
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
       .text('FACTURA', M, y, { width: CW, align: 'center' });
    y = doc.y + 1;

    doc.font('Helvetica').fontSize(7.5)
       .text(factura.numero_comprobante ?? '-', M, y, { width: CW, align: 'center' });
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

    info('Fecha:', fmtDate(factura.fecha_emision));
    info('Cliente:', factura.cli_razon_social ?? 'Consumidor Final');
    if (factura.cli_identificacion && factura.cli_identificacion !== '9999999999' && factura.cli_identificacion !== '9999999999999')
      info('CI/RUC:', factura.cli_identificacion);
    info('Forma pago:', FORMA_PAGO_LABEL[factura.forma_pago] ?? factura.forma_pago);

    y += 3;
    y = line(doc, y, 'dashed');
    y += 2;

    // ── ENCABEZADO ÍTEMS ─────────────────────────────────────────────────────
    const C1 = M;         // descripción
    const C2 = M + 88;    // cant x precio
    const C3 = M + 155;   // total
    const W1 = 86;
    const W2 = 65;
    const W3 = CW - 155;

    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000000')
       .text('Descripción', C1, y, { width: W1 })
       .text('Cant x P.Unit', C2, y, { width: W2, align: 'right' })
       .text('Total', C3, y, { width: W3, align: 'right' });
    y = doc.y + 1;
    y = line(doc, y);
    y += 1;

    // ── ÍTEMS ─────────────────────────────────────────────────────────────────
    for (const d of factura.detalles) {
      const descLine = `${d.descripcion}`;
      const detLine  = `${fmt(d.cantidad)} x $${fmt(d.precio_unitario)}`;

      doc.font('Helvetica').fontSize(7).fillColor('#000000')
         .text(descLine, C1, y, { width: W1 });
      const descH = doc.y;

      doc.font('Helvetica').fontSize(7).fillColor('#333333')
         .text(detLine, C2, y, { width: W2, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000')
         .text(`$${fmt(d.total)}`, C3, y, { width: W3, align: 'right' });

      y = Math.max(descH, doc.y) + 2;

      if (d.descuento > 0) {
        doc.font('Helvetica').fontSize(6.5).fillColor('#666666')
           .text(`  Dto: -$${fmt(d.descuento)}`, C1, y, { width: CW });
        y = doc.y + 1;
      }
    }

    y += 2;
    y = line(doc, y, 'dashed');
    y += 2;

    // ── TOTALES ───────────────────────────────────────────────────────────────
    const totRow = (label: string, val: string, bold = false) => {
      const LW2 = 100;
      const VW2 = CW - LW2;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 8 : 7)
         .fillColor('#000000')
         .text(label, M, y, { width: LW2 });
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 8 : 7)
         .text(val, M + LW2, y, { width: VW2, align: 'right' });
      y = doc.y + (bold ? 2 : 1);
    };

    const descTotal    = Number(factura.descuento_total);
    const total        = Number(factura.total);

    // Agrupación desde los ítems
    let sub0 = 0, subExento = 0, subNoObjeto = 0;
    const ivaMap = new Map<number, { subtotal: number; iva: number }>();
    const iceMap = new Map<number, { subtotal: number; ice: number }>();

    for (const d of factura.detalles) {
      const pct    = Number(d.porcentaje_iva);
      const pctIce = Number(d.porcentaje_ice ?? 0);
      const valIce = Number(d.valor_ice ?? 0);

      if (pctIce > 0 || valIce > 0) {
        const key = pctIce > 0 ? pctIce : -1;
        const bi = iceMap.get(key) ?? { subtotal: 0, ice: 0 };
        bi.subtotal += Number(d.subtotal);
        bi.ice      += valIce;
        iceMap.set(key, bi);
      }

      if (d.codigo_iva === '0') {
        sub0 += Number(d.subtotal);
      } else if (d.codigo_iva === '2') {
        subExento += Number(d.subtotal);
      } else if (d.codigo_iva === '3') {
        subNoObjeto += Number(d.subtotal);
      } else {
        const b = ivaMap.get(pct) ?? { subtotal: 0, iva: 0 };
        b.subtotal += Number(d.subtotal);
        b.iva      += Number(d.valor_iva);
        ivaMap.set(pct, b);
      }
    }

    const ivaMainPct = Array.from(ivaMap.keys()).sort((a, b) => b - a)[0] ?? 15;
    const ivaMainB   = ivaMap.get(ivaMainPct) ?? { subtotal: 0, iva: 0 };
    totRow('Subtotal 0%:', `$${fmt(sub0)}`);
    totRow('Subtotal Exento IVA:', `$${fmt(subExento)}`);
    totRow('Subtotal No Objeto:', `$${fmt(subNoObjeto)}`);
    totRow(`Subtotal IVA ${ivaMainPct}%:`, `$${fmt(ivaMainB.subtotal)}`);
    for (const [pct, b] of Array.from(iceMap.entries()).sort((a, z) => z[0] - a[0])) {
      totRow(pct > 0 ? `Subtotal ICE ${pct}%:` : 'Subtotal ICE:', `$${fmt(b.subtotal)}`);
    }
    totRow('Sub. Sin Impuestos:', `$${fmt(Number(factura.subtotal_sin_impuesto))}`);
    totRow('Total Descuento:', `$${fmt(descTotal)}`);
    for (const [pct, b] of Array.from(iceMap.entries()).sort((a, z) => z[0] - a[0])) {
      totRow(pct > 0 ? `ICE ${pct}%:` : 'ICE:', `$${fmt(b.ice)}`);
    }
    totRow(`IVA ${ivaMainPct}%:`, `$${fmt(ivaMainB.iva)}`);

    y += 1;
    y = line(doc, y);
    y += 2;

    totRow('TOTAL:', `$${fmt(total)}`, true);

    const montoRecibido = Number(factura.monto_recibido);
    if (factura.monto_recibido !== null && factura.monto_recibido !== undefined && montoRecibido > 0) {
      y += 3;
      y = line(doc, y, 'dashed');
      y += 2;
      totRow('Efectivo recibido:', `$${fmt(montoRecibido)}`);
      totRow('Vuelto:', `$${fmt(Math.max(0, montoRecibido - total))}`, true);
    }

    y += 4;
    y = line(doc, y, 'dashed');
    y += 3;

    // ── CLAVE DE ACCESO ───────────────────────────────────────────────────────
    if (factura.clave_acceso) {
      doc.font('Helvetica').fontSize(5.5).fillColor('#666666')
         .text('Clave de acceso:', M, y, { width: CW, align: 'center' });
      y = doc.y + 1;
      doc.font('Helvetica').fontSize(5.5).fillColor('#444444')
         .text(factura.clave_acceso, M, y, { width: CW, align: 'center' });
      y = doc.y + 3;
    }

    // ── PIE ───────────────────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(7).fillColor('#444444')
       .text('¡Gracias por su compra!', M, y, { width: CW, align: 'center' });
    y = doc.y + 2;

    doc.font('Helvetica').fontSize(6).fillColor('#888888')
       .text(`Generado: ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
             M, y, { width: CW, align: 'center' });

    doc.end();
  });
}
