import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import type { ProformaConDetalles } from '../models/proformas.model';
import type { Empresa } from '../models/empresas.model';

const fmt = (n: number | string) => Number(n).toFixed(2);

const fmtDate = (d: string | null): string => {
  if (!d) return '-';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
};

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

/** Retorna texto oscuro para fondos claros, blanco para fondos oscuros */
function textOnBg(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e2939' : '#ffffff';
}

function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const n = (x: number) => Math.min(255, Math.round(x + (255 - x) * t)).toString(16).padStart(2, '0');
  return `#${n(r)}${n(g)}${n(b)}`;
}

function blend(fg: string, bg: string, alpha: number): string {
  const [fr, fg2, fb] = hexToRgb(fg);
  const [br, bg2, bb] = hexToRgb(bg);
  const n = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return `#${n(fr * alpha + br * (1 - alpha))}${n(fg2 * alpha + bg2 * (1 - alpha))}${n(fb * alpha + bb * (1 - alpha))}`;
}

function darkenForBadge(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum <= 0.35) return hex;
  const factor = 0.25 / Math.max(lum, 0.01);
  const n = (x: number) => Math.min(255, Math.round(x * factor)).toString(16).padStart(2, '0');
  return `#${n(r)}${n(g)}${n(b)}`;
}

interface IvaBucket { subtotal: number; iva: number; }

export function generarPdfProforma(
  proforma: ProformaConDetalles,
  empresa: Empresa,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `Proforma ${proforma.numero}`, Author: empresa.razon_social ?? '' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W  = doc.page.width;
    const H  = doc.page.height;
    const M  = 40;
    const CW = W - M * 2;

    const PRIMARY   = empresa.color_primario   || '#1a56db';
    const SECONDARY = empresa.color_secundario || '#1e429f';
    const BADGE_BG  = darkenForBadge(SECONDARY);
    const LIGHT_P   = lighten(PRIMARY, 0.93);
    const TEXT_ON_P = textOnBg(PRIMARY);
    const TEXT_ON_S = textOnBg(SECONDARY);
    const DARK      = '#1e2939';
    const MUTED     = '#64748b';
    const GRAY      = '#e2e8f0';

    const HEADER_FLAT = 112;
    const WAVE_PEAK   = 130;
    const CONTENT_START = WAVE_PEAK + 12;
    const FOOTER_H    = 46;
    const BOTTOM_LIM  = H - FOOTER_H - 20;

    // ── CÁLCULO DE TOTALES DETALLADOS desde ítems ────────────────────────────
    let sub0 = 0, subExento = 0, subNoObjeto = 0, descTotal = 0;
    const ivaMap = new Map<number, IvaBucket>();
    const iceMap = new Map<number, { subtotal: number; ice: number }>();

    for (const d of proforma.detalles) {
      descTotal += Number(d.descuento);
      const code   = d.codigo_iva;
      const pct    = Number(d.porcentaje_iva);
      const sub    = Number(d.subtotal);
      const iva    = Number(d.valor_iva);
      const pctIce = Number((d as any).porcentaje_ice ?? 0);
      const valIce = Number((d as any).valor_ice ?? 0);

      if (pctIce > 0 || valIce > 0) {
        const key = pctIce > 0 ? pctIce : -1;
        const bi = iceMap.get(key) ?? { subtotal: 0, ice: 0 };
        bi.subtotal += sub;
        bi.ice      += valIce;
        iceMap.set(key, bi);
      }

      if (code === '0') {
        sub0 += sub;
      } else if (code === '2') {
        subExento += sub;
      } else if (code === '3') {
        subNoObjeto += sub;
      } else {
        const b = ivaMap.get(pct) ?? { subtotal: 0, iva: 0 };
        b.subtotal += sub;
        b.iva += iva;
        ivaMap.set(pct, b);
      }
    }
    const subtotalSinImp = Number(proforma.subtotal_sin_impuesto);
    const ivaTotal       = Number(proforma.iva_total);
    const total          = Number(proforma.total);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const drawFooter = () => {
      const fy = H - FOOTER_H;
      doc.rect(0, fy, W, FOOTER_H).fill('#f8fafc');
      doc.rect(0, fy, W, 2.5).fill(PRIMARY);
      doc.fillColor(MUTED).font('Helvetica').fontSize(7)
         .text('Este documento es una proforma y no tiene validez tributaria.',
               M, fy + 9, { width: CW, align: 'center', lineBreak: false });
      const contact = [empresa.email, empresa.telefono].filter(Boolean).join('   |   ');
      if (contact)
        doc.fillColor(DARK).font('Helvetica').fontSize(7.5)
           .text(contact, M, fy + 21, { width: CW, align: 'center', lineBreak: false });
      doc.fillColor(MUTED).font('Helvetica').fontSize(7)
         .text(`Generado: ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
               M, fy + 33, { width: CW, align: 'center', lineBreak: false });
    };

    // ── CABECERA CON CURVA ────────────────────────────────────────────────────
    doc.moveTo(0, 0)
       .lineTo(W, 0)
       .lineTo(W, HEADER_FLAT)
       .quadraticCurveTo(W / 2, WAVE_PEAK, 0, HEADER_FLAT)
       .closePath()
       .fill(PRIMARY);

    // ── LOGO ──────────────────────────────────────────────────────────────────
    const LBX = M - 5;  // logo box x
    const LBY = 13;     // logo box y
    const LBW = 134;    // logo box width
    const LBH = 84;     // logo box height

    let logoRight = M;
    if (empresa.logo_url) {
      const rel = empresa.logo_url.startsWith('/') ? empresa.logo_url.slice(1) : empresa.logo_url;
      const logoPath = path.join(__dirname, '../../', rel);
      if (fs.existsSync(logoPath)) {
        try {
          doc.roundedRect(LBX, LBY, LBW, LBH, 9).fill('#ffffff');
          // align:'center' + valign:'center' centra la imagen dentro del fit box
          doc.image(logoPath, LBX, LBY, {
            fit: [LBW, LBH],
            align: 'center',
            valign: 'center',
          });
          logoRight = LBX + LBW + 10;
        } catch (_) { /* logo inaccesible */ }
      }
    }

    // ── INFO DE LA EMPRESA ────────────────────────────────────────────────────
    const BADGE_W = 136;
    const infoW   = W - logoRight - M - BADGE_W - 8;

    doc.fillColor(TEXT_ON_P); // adaptativo: blanco en colores oscuros, oscuro en claros
    doc.font('Helvetica-Bold').fontSize(12)
       .text(empresa.nombre_comercial ?? empresa.razon_social ?? '', logoRight, 20, { width: infoW, lineBreak: false });
    doc.font('Helvetica').fontSize(8.5);
    doc.text(`RUC: ${empresa.ruc}`, logoRight, 38, { width: infoW, lineBreak: false });
    let infoY = 50;
    if (empresa.direccion_matriz) {
      doc.text(empresa.direccion_matriz, logoRight, infoY, { width: infoW });
      infoY = doc.y + 2;
    }
    if (empresa.telefono) {
      doc.text(`Tel: ${empresa.telefono}`, logoRight, infoY, { width: infoW, lineBreak: false });
      infoY += 12;
    }
    if (empresa.email)
      doc.text(empresa.email, logoRight, infoY, { width: infoW, lineBreak: false });

    // ── BADGE PROFORMA ────────────────────────────────────────────────────────
    const BX = W - M - BADGE_W;
    const BY = 7;
    const BH = 101;

    const BADGE_TEXT = textOnBg(SECONDARY); // oscuro en fondos claros, blanco en fondos oscuros

    doc.roundedRect(BX, BY, BADGE_W, BH, 12).fill(SECONDARY);

    doc.roundedRect(BX + 5, BY + 5, BADGE_W - 10, BH - 10, 8)
       .lineWidth(0.8).strokeColor(blend(BADGE_TEXT, SECONDARY, 0.22)).stroke();

    doc.fillColor(BADGE_TEXT).font('Helvetica-Bold').fontSize(17)
       .text('PROFORMA', BX, BY + 14, { width: BADGE_W, align: 'center', lineBreak: false });

    doc.strokeColor(blend(BADGE_TEXT, SECONDARY, 0.30)).lineWidth(0.7)
       .moveTo(BX + 14, BY + 38).lineTo(BX + BADGE_W - 14, BY + 38).stroke();

    doc.fillColor(blend(BADGE_TEXT, SECONDARY, 0.65)).font('Helvetica').fontSize(7)
       .text('Nº DE PROFORMA', BX, BY + 43, { width: BADGE_W, align: 'center', lineBreak: false });

    doc.fillColor(BADGE_TEXT).font('Helvetica-Bold').fontSize(8.5)
       .text(proforma.numero, BX + 6, BY + 54, { width: BADGE_W - 12, align: 'center', lineBreak: false });

    // Estado chip
    const ESTADO_COLOR: Record<string, string> = {
      APROBADA: '#059669', PENDIENTE: '#d97706',
      RECHAZADA: '#dc2626', VENCIDA: '#64748b', CONVERTIDA: '#7c3aed',
    };
    const chipColor = ESTADO_COLOR[proforma.estado] ?? '#64748b';
    const chipY = BY + 72;
    doc.roundedRect(BX + 12, chipY, BADGE_W - 24, 18, 9).fill(chipColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5)
       .text(proforma.estado, BX + 12, chipY + 5, { width: BADGE_W - 24, align: 'center', lineBreak: false });

    // ── BARRA DE FECHAS (colores neutros) ─────────────────────────────────────
    let y = CONTENT_START;

    const dateItems: Array<[string, string]> = [
      ['FECHA DE EMISIÓN', fmtDate(proforma.fecha_emision)],
    ];
    if (proforma.fecha_vencimiento)
      dateItems.push(['VÁLIDO HASTA', fmtDate(proforma.fecha_vencimiento)]);

    const INFO_H = 40;
    doc.rect(M, y, CW, INFO_H).fill('#f1f5f9');
    doc.rect(M, y, 3.5, INFO_H).fill('#94a3b8'); // acento gris neutro

    const iW = CW / dateItems.length;
    dateItems.forEach(([label, val], i) => {
      const ix = M + 14 + i * iW;
      doc.fillColor('#64748b').font('Helvetica').fontSize(7)
         .text(label, ix, y + 8, { width: iW - 20, lineBreak: false });
      doc.fillColor('#1e2939').font('Helvetica-Bold').fontSize(10)
         .text(val, ix, y + 20, { width: iW - 20, lineBreak: false });
    });

    y += INFO_H + 12;

    // ── DATOS DEL CLIENTE (colores neutros) ───────────────────────────────────
    const clientRows: Array<[string, string]> = [
      ['Nombre / Razón Social', proforma.cli_razon_social ?? 'Consumidor Final'],
    ];
    if (proforma.cli_identificacion)
      clientRows.push(['RUC / Cédula', proforma.cli_identificacion]);

    const CL_H = 14 + clientRows.length * 22 + 8;
    const CL_W = Math.min(CW, 320);

    doc.rect(M, y, CL_W, CL_H).fill('#f8fafc');
    doc.rect(M, y, 3.5, CL_H).fill('#94a3b8'); // acento gris neutro

    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5)
       .text('DATOS DEL CLIENTE', M + 10, y + 5, { lineBreak: false });

    let cy = y + 16;
    for (const [label, val] of clientRows) {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
         .text(label, M + 10, cy, { width: CL_W - 20, lineBreak: false });
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
         .text(val, M + 10, cy + 9, { width: CL_W - 20, lineBreak: false });
      cy += 22;
    }

    y += CL_H + 16;

    // ── TABLA DE ÍTEMS ────────────────────────────────────────────────────────
    type Align = 'center' | 'left' | 'right';
    const COLS: Array<{ label: string; w: number; align: Align }> = [
      { label: 'Código',      w: 52,  align: 'center' },
      { label: 'Descripción', w: 195, align: 'left'   },
      { label: 'Cant.',       w: 44,  align: 'right'  },
      { label: 'P. Unit.',    w: 62,  align: 'right'  },
      { label: 'Dto.',        w: 52,  align: 'right'  },
      { label: 'IVA%',        w: 36,  align: 'center' },
      { label: 'Total',       w: 74,  align: 'right'  },
    ]; // 52+195+44+62+52+36+74 = 515

    let xc = M;
    const TC = COLS.map(c => { const col = { ...c, x: xc }; xc += c.w; return col; });

    const drawTH = (atY: number): number => {
      const TH_H = 22;
      doc.rect(M, atY, CW, TH_H).fill(SECONDARY);
      TC.forEach(col => {
        doc.fillColor(TEXT_ON_S).font('Helvetica-Bold').fontSize(8)
           .text(col.label, col.x + 3, atY + 7, { width: col.w - 6, align: col.align, lineBreak: false });
      });
      doc.strokeColor(blend(TEXT_ON_S, SECONDARY, 0.20)).lineWidth(0.5);
      let lx = M;
      for (let i = 0; i < TC.length - 1; i++) {
        lx += TC[i].w;
        doc.moveTo(lx, atY + 4).lineTo(lx, atY + TH_H - 4).stroke();
      }
      return atY + TH_H;
    };

    y = drawTH(y);

    let alt = false;
    for (const d of proforma.detalles) {
      doc.font('Helvetica').fontSize(7.5);
      const descH = doc.heightOfString(d.descripcion, { width: TC[1].w - 6 });
      const rowH  = Math.max(18, descH + 8);

      if (y + rowH > BOTTOM_LIM) {
        drawFooter();
        doc.addPage();
        y = M;
        y = drawTH(y);
        alt = false;
      }

      if (alt) doc.rect(M, y, CW, rowH).fill('#f5f7ff');
      alt = !alt;

      doc.strokeColor(GRAY).lineWidth(0.3);
      let lx2 = M;
      for (let i = 0; i < TC.length - 1; i++) {
        lx2 += TC[i].w;
        doc.moveTo(lx2, y + 2).lineTo(lx2, y + rowH - 2).stroke();
      }

      doc.fillColor(DARK).font('Helvetica').fontSize(7.5);
      const ty = y + 5;
      doc.text(d.codigo,               TC[0].x+3, ty, { width: TC[0].w-6, align:'center', lineBreak:false });
      doc.text(d.descripcion,          TC[1].x+3, ty, { width: TC[1].w-6, align:'left' });
      doc.text(fmt(d.cantidad),        TC[2].x+3, ty, { width: TC[2].w-6, align:'right', lineBreak:false });
      doc.text(fmt(d.precio_unitario), TC[3].x+3, ty, { width: TC[3].w-6, align:'right', lineBreak:false });
      doc.text(fmt(d.descuento),       TC[4].x+3, ty, { width: TC[4].w-6, align:'right', lineBreak:false });
      doc.text(`${d.porcentaje_iva}%`, TC[5].x+3, ty, { width: TC[5].w-6, align:'center', lineBreak:false });
      doc.text(fmt(d.total),           TC[6].x+3, ty, { width: TC[6].w-6, align:'right', lineBreak:false });

      y += rowH;
      doc.strokeColor(GRAY).lineWidth(0.3).moveTo(M, y).lineTo(M + CW, y).stroke();
    }

    y += 14;

    // ── TOTALES DETALLADOS ────────────────────────────────────────────────────
    const TW = 240;
    const TX = M + CW - TW;
    const LW = 148; // ancho de etiqueta
    const VW = TW - LW - 16;

    doc.rect(TX, y - 4, TW, 2.5).fill(PRIMARY);
    y += 4;

    const addTotRow = (label: string, value: number, hi = false) => {
      const h = hi ? 26 : 17;
      if (hi) {
        doc.roundedRect(TX, y, TW, h, 4).fill(SECONDARY);
        doc.fillColor(TEXT_ON_S).font('Helvetica-Bold').fontSize(10);
        doc.text(label,        TX + 8,    y + 8, { width: LW,  align: 'left',  lineBreak: false });
        doc.text(`$${fmt(value)}`, TX+LW+8, y + 8, { width: VW,  align: 'right', lineBreak: false });
      } else {
        doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
           .text(label, TX + 8, y + 3, { width: LW, align: 'left', lineBreak: false });
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8.5)
           .text(`$${fmt(value)}`, TX+LW+8, y + 3, { width: VW, align: 'right', lineBreak: false });
        doc.strokeColor(GRAY).lineWidth(0.3).moveTo(TX, y + h).lineTo(TX + TW, y + h).stroke();
      }
      y += h + 2;
    };

    const ivaMainPct = Array.from(ivaMap.keys()).sort((a, b) => b - a)[0] ?? 15;
    const ivaMainBucket = ivaMap.get(ivaMainPct) ?? { subtotal: 0, iva: 0 };

    addTotRow('Subtotal 0%:', sub0);
    addTotRow('Subtotal Exento de IVA:', subExento);
    addTotRow('Subtotal No Objeto de IVA:', subNoObjeto);
    addTotRow(`Subtotal IVA ${ivaMainPct}%:`, ivaMainBucket.subtotal);
    for (const [pct, b] of Array.from(iceMap.entries()).sort((a, z) => z[0] - a[0])) {
      addTotRow(pct > 0 ? `Subtotal ICE ${pct}%:` : 'Subtotal ICE:', b.subtotal);
    }
    doc.strokeColor(LIGHT_P).lineWidth(0.8).moveTo(TX, y).lineTo(TX + TW, y).stroke();
    y += 2;
    addTotRow('Subtotal Sin Impuestos:', subtotalSinImp);
    addTotRow('Total Descuento:', descTotal);
    for (const [pct, b] of Array.from(iceMap.entries()).sort((a, z) => z[0] - a[0])) {
      addTotRow(pct > 0 ? `ICE ${pct}%:` : 'ICE:', b.ice);
    }
    addTotRow(`IVA ${ivaMainPct}%:`, ivaMainBucket.iva);
    y += 5;
    addTotRow('TOTAL A PAGAR:', total, true);

    y += 18;

    // ── OBSERVACIONES ─────────────────────────────────────────────────────────
    if (proforma.observaciones) {
      if (y + 55 > BOTTOM_LIM) {
        drawFooter();
        doc.addPage();
        y = M;
      }
      doc.rect(M, y, CW, 16).fill('#f1f5f9');
      doc.rect(M, y, 3.5, 16).fill('#94a3b8');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8)
         .text('OBSERVACIONES', M + 10, y + 4, { lineBreak: false });
      y += 16;
      doc.fillColor(DARK).font('Helvetica').fontSize(8.5)
         .text(proforma.observaciones, M + 10, y + 5, { width: CW - 20 });
    }

    drawFooter();
    (doc as any).y = 0;

    doc.end();
  });
}
