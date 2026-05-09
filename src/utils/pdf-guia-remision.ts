import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import type { GuiaRemisionConDetalles } from '../models/guias_remision.model';
import type { Empresa } from '../models/empresas.model';

const fmt = (n: number | string) => Number(n).toFixed(2);

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  const p = String(d).substring(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(d).substring(0, 10);
};

const fmtDateTime = (d: Date | string | null | undefined): string => {
  if (!d) return '-';
  const dt = new Date(d as string);
  if (isNaN(dt.getTime())) return String(d).substring(0, 19);
  return dt.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
};

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
function textOnBg(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e2939' : '#ffffff';
}
function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const n = (x: number) => Math.min(255, Math.round(x + (255 - x) * t)).toString(16).padStart(2, '0');
  return `#${n(r)}${n(g)}${n(b)}`;
}

async function makeBarcodeBuffer(text: string): Promise<Buffer | null> {
  try {
    return await (bwipjs as any).toBuffer({
      bcid: 'code128', text, scale: 2, height: 10,
      includetext: false, backgroundcolor: 'ffffff',
    });
  } catch (_) { return null; }
}

export async function generarPdfGuiaRemision(
  gr: GuiaRemisionConDetalles,
  empresa: Empresa,
): Promise<Buffer> {
  const PRIMARY   = empresa.color_primario   || '#1a56db';
  const SECONDARY = empresa.color_secundario || '#1e429f';
  const TEXT_ON_P = textOnBg(PRIMARY);
  const TEXT_ON_S = textOnBg(SECONDARY);
  const LIGHT_P   = lighten(PRIMARY, 0.92);
  const DARK      = '#1e2939';
  const MUTED     = '#64748b';
  const GRAY_LINE = '#cbd5e1';
  const GRAY_BG   = '#f8fafc';
  const BORDER    = '#cbd5e1';

  const isAutorizado = gr.estado === 'AUTORIZADO';
  const barcodeBuffer = gr.clave_acceso ? await makeBarcodeBuffer(gr.clave_acceso) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4', margin: 0,
      info: { Title: `Guía de Remisión ${gr.numero_comprobante ?? ''}`, Author: empresa.razon_social ?? '' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width;
    const PH = doc.page.height;
    const M  = 30;
    const CW = PW - M * 2;

    const hline = (y: number, x1 = M, x2 = M + CW, color = BORDER, w = 0.5) =>
      doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(w).stroke();

    const vline = (x: number, y1: number, y2: number, color = BORDER, w = 0.5) =>
      doc.moveTo(x, y1).lineTo(x, y2).strokeColor(color).lineWidth(w).stroke();

    const box = (x: number, y: number, w: number, h: number, fill?: string, stroke = BORDER) => {
      if (fill) doc.rect(x, y, w, h).fill(fill);
      doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(0.5).stroke();
    };

    const FOOTER_H   = 32;
    const BOTTOM_LIM = PH - FOOTER_H - M;

    const drawFooter = () => {
      const fy = PH - FOOTER_H;
      doc.rect(0, fy, PW, FOOTER_H).fill(GRAY_BG);
      doc.rect(0, fy, PW, 1).fill(PRIMARY);
      if (gr.clave_acceso) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(5.5)
           .text(`Clave de acceso: ${gr.clave_acceso}`, M, fy + 6, { width: CW, align: 'center', lineBreak: false });
      }
      const contact = [empresa.email, empresa.telefono].filter(Boolean).join('   |   ');
      doc.fillColor(DARK).font('Helvetica').fontSize(7)
         .text(contact || empresa.razon_social || '', M, fy + 16, { width: CW, align: 'center', lineBreak: false });
    };

    // ── ENCABEZADO ──────────────────────────────────────────────────────────
    const LOGO_W  = 148;
    const INFO_W  = 210;
    const BADGE_W = CW - LOGO_W - INFO_W - 4;
    const HDR_H   = 118;
    const LX = M;
    const IX = LX + LOGO_W + 2;
    const BX = IX + INFO_W + 2;

    doc.rect(M, M, CW, HDR_H).fill(GRAY_BG);
    doc.rect(M, M, CW, HDR_H).strokeColor(BORDER).lineWidth(0.6).stroke();
    vline(IX, M, M + HDR_H);
    vline(BX, M, M + HDR_H);

    if (empresa.logo_url) {
      const rel = empresa.logo_url.startsWith('/') ? empresa.logo_url.slice(1) : empresa.logo_url;
      const logoPath = path.join(__dirname, '../../', rel);
      if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, LX + 4, M + 4, { fit: [LOGO_W - 8, HDR_H - 8], align: 'center', valign: 'center' }); } catch (_) {}
      }
    }

    const IX_PAD = IX + 8;
    const INFO_W_INNER = INFO_W - 12;
    let iy = M + 8;

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(PRIMARY)
       .text(empresa.nombre_comercial ?? empresa.razon_social ?? '', IX_PAD, iy, { width: INFO_W_INNER, lineBreak: false });
    iy += 13;

    const infoRows: [string, string][] = [
      ['Razón Social:', empresa.razon_social ?? '-'],
      ['Dir. Matriz:', empresa.direccion_matriz ?? '-'],
    ];
    if (empresa.telefono) infoRows.push(['Teléfono:', empresa.telefono]);
    if (empresa.email)    infoRows.push(['Email:', empresa.email]);
    infoRows.push(['Obligado Contabilidad:', empresa.obligado_contabilidad ? 'Sí' : 'No']);

    for (const [lbl, val] of infoRows) {
      if (iy > M + HDR_H - 10) break;
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl, IX_PAD, iy, { width: 90, lineBreak: false });
      doc.font('Helvetica').fontSize(6.5).fillColor(DARK).text(val, IX_PAD + 92, iy, { width: INFO_W_INNER - 92, lineBreak: false });
      iy += 9.5;
    }

    // Badge
    doc.rect(BX, M, BADGE_W, HDR_H).fill(PRIMARY);
    const BX_PAD = BX + 8;
    const BADGE_IW = BADGE_W - 16;
    let by = M + 7;

    doc.font('Helvetica').fontSize(6.5).fillColor(TEXT_ON_P).text('RUC:', BX_PAD, by, { width: BADGE_IW, lineBreak: false });
    by += 9;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_ON_P).text(empresa.ruc ?? '-', BX_PAD, by, { width: BADGE_IW, lineBreak: false });
    by += 12;

    doc.rect(BX_PAD, by, BADGE_IW, 18).fill(SECONDARY);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_ON_S)
       .text('GUÍA DE REMISIÓN', BX_PAD, by + 5, { width: BADGE_IW, align: 'center', lineBreak: false });
    by += 22;

    doc.font('Helvetica').fontSize(6).fillColor(TEXT_ON_P).text('No. COMPROBANTE', BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
    by += 8;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEXT_ON_P).text(gr.numero_comprobante ?? '-', BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
    by += 11;

    doc.moveTo(BX_PAD, by).lineTo(BX_PAD + BADGE_IW, by).strokeColor(lighten(PRIMARY, 0.3)).lineWidth(0.4).stroke();
    by += 5;

    if (isAutorizado && gr.fecha_autorizacion) {
      doc.font('Helvetica').fontSize(5.8).fillColor(TEXT_ON_P).text('FECHA Y HORA DE AUTORIZACIÓN', BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
      by += 8;
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(TEXT_ON_P).text(fmtDateTime(gr.fecha_autorizacion), BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
      by += 10;
    }

    const ambLabel = (gr as any).id_ambiente === 2 ? 'PRODUCCIÓN' : 'PRUEBAS';
    doc.font('Helvetica').fontSize(6).fillColor(TEXT_ON_P).text(`Ambiente: ${ambLabel}`, BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });

    let y = M + HDR_H + 6;

    // ── CLAVE DE ACCESO + CÓDIGO DE BARRAS ──────────────────────────────────
    if (gr.clave_acceso) {
      const BC_H = barcodeBuffer ? 42 : 0;
      const SECTION_H = 10 + BC_H + 14;
      box(M, y, CW, SECTION_H, GRAY_BG);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK).text('CLAVE DE ACCESO:', M + 8, y + 6, { lineBreak: false });

      if (barcodeBuffer) {
        try { doc.image(barcodeBuffer, M + 8, y + 16, { width: CW - 16, height: BC_H }); } catch (_) {}
      }

      doc.font('Helvetica').fontSize(5.8).fillColor(MUTED).text(gr.clave_acceso, M + 8, y + 16 + BC_H + 2, { width: CW - 80, lineBreak: false });

      const ESTADO_COLOR: Record<string, string> = {
        AUTORIZADO: '#059669', BORRADOR: '#d97706', RECHAZADA: '#dc2626', ENVIADO: '#0284c7', ANULADA: '#64748b',
      };
      const ec = ESTADO_COLOR[gr.estado] ?? '#64748b';
      doc.rect(M + CW - 70, y + 16 + BC_H - 1, 62, 14).fill(ec);
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
         .text(gr.estado, M + CW - 70, y + 16 + BC_H + 3, { width: 62, align: 'center', lineBreak: false });

      y += SECTION_H + 5;
    }

    // ── DATOS DE TRANSPORTE ──────────────────────────────────────────────────
    const halfCW = CW / 2 - 1;
    const transportRows: Array<[string, string, string, string]> = [
      ['Transportista:', gr.razon_social_transportista ?? '-', 'Fecha Emisión:', fmtDate(gr.fecha_emision)],
      ['RUC Transportista:', gr.ruc_transportista ?? '-', 'Fecha Inicio:', fmtDate(gr.fecha_ini_transporte)],
      ['Placa:', gr.placa ?? '-', 'Fecha Fin:', fmtDate(gr.fecha_fin_transporte)],
      ['Ruta:', gr.ruta ?? '-', 'Motivo Traslado:', gr.motivo_traslado ?? '-'],
    ];

    const TRANS_H = 14 + transportRows.length * 18 + 4;
    box(M, y, CW, TRANS_H, GRAY_BG);
    doc.rect(M, y, CW, 14).fill(lighten(PRIMARY, 0.85));
    doc.font('Helvetica-Bold').fontSize(7).fillColor(PRIMARY).text('DATOS DEL TRANSPORTE', M + 8, y + 4, { lineBreak: false });
    vline(M + halfCW, y + 14, y + TRANS_H);

    let cy = y + 16;
    for (const [lbl1, val1, lbl2, val2] of transportRows) {
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl1, M + 8, cy, { width: 85, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(val1, M + 94, cy, { width: halfCW - 100, lineBreak: false });
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl2, M + halfCW + 8, cy, { width: 85, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(val2, M + halfCW + 94, cy, { width: halfCW - 100, lineBreak: false });
      cy += 18;
    }
    y += TRANS_H + 6;

    // ── DATOS DEL DESTINATARIO ───────────────────────────────────────────────
    const destRows: Array<[string, string, string, string]> = [
      ['Razón Social:', gr.dest_razon_social ?? '-', 'RUC / CI:', gr.dest_identificacion ?? '-'],
      ['Dirección Destino:', gr.direccion_destino ?? '-', '', ''],
    ];

    const DEST_H = 14 + destRows.length * 18 + 4;
    box(M, y, CW, DEST_H, GRAY_BG);
    doc.rect(M, y, CW, 14).fill(lighten(PRIMARY, 0.85));
    doc.font('Helvetica-Bold').fontSize(7).fillColor(PRIMARY).text('DATOS DEL DESTINATARIO', M + 8, y + 4, { lineBreak: false });
    vline(M + halfCW, y + 14, y + DEST_H);

    cy = y + 16;
    for (const [lbl1, val1, lbl2, val2] of destRows) {
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl1, M + 8, cy, { width: 85, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(val1, M + 94, cy, { width: halfCW - 100, lineBreak: false });
      if (lbl2) {
        doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl2, M + halfCW + 8, cy, { width: 85, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(val2, M + halfCW + 94, cy, { width: halfCW - 100, lineBreak: false });
      }
      cy += 18;
    }
    y += DEST_H + 6;

    // ── TABLA DE ÍTEMS ───────────────────────────────────────────────────────
    const TH_H = 20;
    const COL_COD_W  = 80;
    const COL_DESC_W = CW - 80 - 90;
    const COL_CANT_W = 90;

    const colsX = [
      { label: 'Código',      w: COL_COD_W,  x: M,                        align: 'center' },
      { label: 'Descripción', w: COL_DESC_W, x: M + COL_COD_W,            align: 'left'   },
      { label: 'Cantidad',    w: COL_CANT_W, x: M + COL_COD_W + COL_DESC_W, align: 'right'  },
    ] as const;

    const drawTH = (atY: number): number => {
      doc.rect(M, atY, CW, TH_H).fill(SECONDARY);
      for (const col of colsX) {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(TEXT_ON_S)
           .text(col.label, col.x + 3, atY + 6, { width: col.w - 6, align: col.align as any, lineBreak: false });
      }
      let lx = M;
      for (let i = 0; i < colsX.length - 1; i++) {
        lx += colsX[i]!.w;
        doc.moveTo(lx, atY + 3).lineTo(lx, atY + TH_H - 3).strokeColor(lighten(TEXT_ON_S, 0.4)).lineWidth(0.4).stroke();
      }
      return atY + TH_H;
    };

    y = drawTH(y);

    let alt = false;
    for (const d of gr.detalles) {
      doc.font('Helvetica').fontSize(7.5);
      const descH = doc.heightOfString(d.descripcion, { width: colsX[1]!.w - 6 });
      const rowH  = Math.max(18, descH + 8);

      if (y + rowH > BOTTOM_LIM) {
        drawFooter();
        doc.addPage();
        y = M;
        y = drawTH(y);
        alt = false;
      }

      if (alt) doc.rect(M, y, CW, rowH).fill(LIGHT_P);
      alt = !alt;

      vline(colsX[1]!.x, y + 2, y + rowH - 2, GRAY_LINE, 0.3);
      vline(colsX[2]!.x, y + 2, y + rowH - 2, GRAY_LINE, 0.3);

      const ty = y + 5;
      doc.fillColor(DARK).font('Helvetica').fontSize(7.5);
      doc.text(d.codigo,                colsX[0]!.x+3, ty, { width: colsX[0]!.w-6, align:'center', lineBreak:false });
      doc.text(d.descripcion,           colsX[1]!.x+3, ty, { width: colsX[1]!.w-6, align:'left' });
      doc.font('Helvetica-Bold')
         .text(fmt(d.cantidad),         colsX[2]!.x+3, ty, { width: colsX[2]!.w-6, align:'right', lineBreak:false });

      y += rowH;
      hline(y, M, M + CW, GRAY_LINE, 0.3);
    }

    drawFooter();
    (doc as any).y = 0;
    doc.end();
  });
}
