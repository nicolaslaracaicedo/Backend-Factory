import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import type { RetencionConDetalles } from '../models/retenciones.model';
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

export async function generarPdfRetencion(
  ret: RetencionConDetalles,
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

  const totalRetenido = Number(ret.total_retenido);
  const isAutorizado  = ret.estado === 'AUTORIZADO';

  const barcodeBuffer = ret.clave_acceso ? await makeBarcodeBuffer(ret.clave_acceso) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4', margin: 0,
      info: { Title: `Comprobante de Retención ${ret.numero_comprobante ?? ''}`, Author: empresa.razon_social ?? '' },
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
      if (ret.clave_acceso) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(5.5)
           .text(`Clave de acceso: ${ret.clave_acceso}`, M, fy + 6, { width: CW, align: 'center', lineBreak: false });
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
    if (empresa.agente_retencion) infoRows.push(['Agente de Retención:', 'Sí']);
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
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEXT_ON_S)
       .text('COMP. DE RETENCIÓN', BX_PAD, by + 5, { width: BADGE_IW, align: 'center', lineBreak: false });
    by += 22;

    doc.font('Helvetica').fontSize(6).fillColor(TEXT_ON_P).text('No. COMPROBANTE', BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
    by += 8;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(TEXT_ON_P).text(ret.numero_comprobante ?? '-', BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
    by += 11;

    doc.moveTo(BX_PAD, by).lineTo(BX_PAD + BADGE_IW, by).strokeColor(lighten(PRIMARY, 0.3)).lineWidth(0.4).stroke();
    by += 5;

    if (isAutorizado && ret.fecha_autorizacion) {
      doc.font('Helvetica').fontSize(5.8).fillColor(TEXT_ON_P).text('FECHA Y HORA DE AUTORIZACIÓN', BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
      by += 8;
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(TEXT_ON_P).text(fmtDateTime(ret.fecha_autorizacion), BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });
      by += 10;
    }

    const ambLabel = (ret as any).id_ambiente === 2 ? 'PRODUCCIÓN' : 'PRUEBAS';
    doc.font('Helvetica').fontSize(6).fillColor(TEXT_ON_P).text(`Ambiente: ${ambLabel}`, BX_PAD, by, { width: BADGE_IW, align: 'center', lineBreak: false });

    let y = M + HDR_H + 6;

    // ── CLAVE DE ACCESO + CÓDIGO DE BARRAS ──────────────────────────────────
    if (ret.clave_acceso) {
      const BC_H = barcodeBuffer ? 42 : 0;
      const SECTION_H = 10 + BC_H + 14;
      box(M, y, CW, SECTION_H, GRAY_BG);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(DARK).text('CLAVE DE ACCESO:', M + 8, y + 6, { lineBreak: false });

      if (barcodeBuffer) {
        try { doc.image(barcodeBuffer, M + 8, y + 16, { width: CW - 16, height: BC_H }); } catch (_) {}
      }

      doc.font('Helvetica').fontSize(5.8).fillColor(MUTED).text(ret.clave_acceso, M + 8, y + 16 + BC_H + 2, { width: CW - 80, lineBreak: false });

      const ESTADO_COLOR: Record<string, string> = {
        AUTORIZADO: '#059669', BORRADOR: '#d97706', RECHAZADA: '#dc2626', ENVIADO: '#0284c7', ANULADA: '#64748b',
      };
      const ec = ESTADO_COLOR[ret.estado] ?? '#64748b';
      doc.rect(M + CW - 70, y + 16 + BC_H - 1, 62, 14).fill(ec);
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#ffffff')
         .text(ret.estado, M + CW - 70, y + 16 + BC_H + 3, { width: 62, align: 'center', lineBreak: false });

      y += SECTION_H + 5;
    }

    // ── DATOS DEL PROVEEDOR Y REFERENCIA ────────────────────────────────────
    const halfCW = CW / 2 - 1;
    const provRows: Array<[string, string, string, string]> = [
      ['Razón Social:', ret.prov_razon_social ?? '-', 'Fecha Emisión:', fmtDate(ret.fecha_emision)],
      ['RUC / CI:', ret.prov_identificacion ?? '-', 'Doc. Referencia:', ret.comprobante_ref_numero ?? '-'],
      ['', '', 'Fecha Doc. Ref.:', fmtDate(ret.comprobante_ref_fecha)],
    ];

    const CL_H = 14 + provRows.length * 18 + 4;
    box(M, y, CW, CL_H, GRAY_BG);
    doc.rect(M, y, CW, 14).fill(lighten(PRIMARY, 0.85));
    doc.font('Helvetica-Bold').fontSize(7).fillColor(PRIMARY).text('DATOS DEL PROVEEDOR / SUJETO RETENIDO', M + 8, y + 4, { lineBreak: false });
    vline(M + halfCW, y + 14, y + CL_H);

    let cy = y + 16;
    for (const [lbl1, val1, lbl2, val2] of provRows) {
      if (lbl1) {
        doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl1, M + 8, cy, { width: 75, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(val1, M + 84, cy, { width: halfCW - 90, lineBreak: false });
      }
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(lbl2, M + halfCW + 8, cy, { width: 75, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(val2, M + halfCW + 84, cy, { width: halfCW - 90, lineBreak: false });
      cy += 18;
    }
    y += CL_H + 6;

    // ── TABLA DE RETENCIONES ─────────────────────────────────────────────────
    const TH_H = 20;
    const COL_TIPO_W   = 60;
    const COL_COD_W    = 60;
    const COL_DESC_W   = CW - 60 - 60 - 90 - 80 - 80;
    const COL_BASE_W   = 90;
    const COL_PCT_W    = 80;
    const COL_VAL_W    = 80;

    const colsX = [
      { label: 'Tipo',        w: COL_TIPO_W,  x: M,                                              align: 'center' },
      { label: 'Código',      w: COL_COD_W,   x: M + COL_TIPO_W,                                  align: 'center' },
      { label: 'Descripción', w: COL_DESC_W,  x: M + COL_TIPO_W + COL_COD_W,                      align: 'left'   },
      { label: 'Base Imp.',   w: COL_BASE_W,  x: M + COL_TIPO_W + COL_COD_W + COL_DESC_W,         align: 'right'  },
      { label: '%',           w: COL_PCT_W,   x: M + COL_TIPO_W + COL_COD_W + COL_DESC_W + COL_BASE_W, align: 'right'  },
      { label: 'Valor Ret.',  w: COL_VAL_W,   x: M + COL_TIPO_W + COL_COD_W + COL_DESC_W + COL_BASE_W + COL_PCT_W, align: 'right' },
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
    for (const d of ret.detalles) {
      const rowH = 20;

      if (y + rowH > BOTTOM_LIM) {
        drawFooter();
        doc.addPage();
        y = M;
        y = drawTH(y);
        alt = false;
      }

      if (alt) doc.rect(M, y, CW, rowH).fill(LIGHT_P);
      alt = !alt;

      for (let i = 0; i < colsX.length - 1; i++) {
        vline(colsX[i]!.x + colsX[i]!.w, y + 2, y + rowH - 2, GRAY_LINE, 0.3);
      }

      doc.fillColor(DARK).font('Helvetica').fontSize(7.5);
      doc.text(d.tipo,                          colsX[0]!.x+3, y+6, { width: colsX[0]!.w-6, align:'center', lineBreak:false });
      doc.text(d.codigo,                        colsX[1]!.x+3, y+6, { width: colsX[1]!.w-6, align:'center', lineBreak:false });
      doc.text(d.descripcion,                   colsX[2]!.x+3, y+6, { width: colsX[2]!.w-6, align:'left',   lineBreak:false });
      doc.text(`$${fmt(d.base_imponible)}`,     colsX[3]!.x+3, y+6, { width: colsX[3]!.w-6, align:'right',  lineBreak:false });
      doc.text(`${d.porcentaje}%`,              colsX[4]!.x+3, y+6, { width: colsX[4]!.w-6, align:'right',  lineBreak:false });
      doc.font('Helvetica-Bold')
         .text(`$${fmt(d.valor_retenido)}`,     colsX[5]!.x+3, y+6, { width: colsX[5]!.w-6, align:'right',  lineBreak:false });

      y += rowH;
      hline(y, M, M + CW, GRAY_LINE, 0.3);
    }

    y += 8;

    // ── TOTAL RETENIDO ───────────────────────────────────────────────────────
    const TOT_W = 265;
    const TOT_X = M + CW - TOT_W;
    const TOT_H = 26;

    if (y + TOT_H > BOTTOM_LIM) {
      drawFooter();
      doc.addPage();
      y = M;
    }

    hline(y, TOT_X, TOT_X + TOT_W, PRIMARY, 1.5);
    y += 2;
    doc.rect(TOT_X, y, TOT_W, TOT_H).fill(SECONDARY);
    const LW2 = 170;
    const VW2 = TOT_W - LW2 - 16;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_ON_S).text('TOTAL RETENIDO:', TOT_X + 8, y + 8, { width: LW2, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_ON_S).text(`$${fmt(totalRetenido)}`, TOT_X + 8 + LW2, y + 8, { width: VW2, align: 'right', lineBreak: false });

    drawFooter();
    (doc as any).y = 0;
    doc.end();
  });
}
