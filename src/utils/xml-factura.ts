import { Empresa } from '../models/empresas.model';
import { FacturaConDetalles } from '../models/facturas.model';

const fmt2 = (n: number) => Number(n).toFixed(2);
const fmt6 = (n: number) => Number(n).toFixed(6);

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inferirTipoId(identificacion: string): string {
  if (identificacion === '9999999999' || identificacion === '9999999999999') return '07';
  if (identificacion.length === 13) return '04';
  if (identificacion.length === 10) return '05';
  return '06';
}

// codigo_iva del sistema → codigoPorcentaje SRI
const CODIGO_PORCENTAJE: Record<string, string> = {
  '0': '0',  // IVA 0%
  '2': '6',  // Exento
  '3': '3',  // No objeto
  '4': '4',  // IVA 15%
  '5': '5',  // IVA 5%
};

interface GrupoIva {
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

interface GrupoIce {
  tarifa: number;
  baseImponible: number;
  valor: number;
}

function agruparIva(detalles: FacturaConDetalles['detalles']): GrupoIva[] {
  const grupos = new Map<string, GrupoIva>();
  for (const d of detalles) {
    const cp = CODIGO_PORCENTAJE[d.codigo_iva] ?? '4';
    const subtotal = Number(d.subtotal);
    const valor_iva = Number(d.valor_iva);
    const g = grupos.get(cp);
    if (g) {
      g.baseImponible += subtotal;
      g.valor += valor_iva;
    } else {
      grupos.set(cp, {
        codigoPorcentaje: cp,
        tarifa: Number(d.porcentaje_iva),
        baseImponible: subtotal,
        valor: valor_iva,
      });
    }
  }
  return Array.from(grupos.values());
}

function agruparIce(detalles: FacturaConDetalles['detalles']): (GrupoIce & { codigoPorcentaje: string })[] {
  const grupos = new Map<string, GrupoIce & { codigoPorcentaje: string }>();
  for (const d of detalles) {
    const valIce = Number(d.valor_ice ?? 0);
    if (valIce <= 0) continue;
    const tarifa = Number(d.porcentaje_ice ?? 0);
    const codigoPorcentaje = (d as any).codigo_ice ?? String(Math.round(tarifa));
    const g = grupos.get(codigoPorcentaje);
    if (g) {
      g.baseImponible += Number(d.subtotal);
      g.valor += valIce;
    } else {
      grupos.set(codigoPorcentaje, { tarifa, codigoPorcentaje, baseImponible: Number(d.subtotal), valor: valIce });
    }
  }
  return Array.from(grupos.values());
}

export function generarXmlFactura(
  factura: FacturaConDetalles,
  empresa: Empresa,
  dirEstablecimiento: string
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');
  if (!factura.cli_identificacion) throw new Error('La factura no tiene identificación del cliente.');
  if (!factura.cli_razon_social) throw new Error('La factura no tiene razón social del cliente.');

  // Fecha: YYYY-MM-DD → DD/MM/YYYY
  const [yyyy, mm, dd] = factura.fecha_emision.split('-');
  const fechaXml = `${dd}/${mm}/${yyyy}`;

  // totalConImpuestos
  const grupos = agruparIva(factura.detalles);
  const gruposIce = agruparIce(factura.detalles);

  // importeTotal consistente con los valores redondeados declarados en el XML
  const subtotalRedondeado  = Number(fmt2(factura.subtotal_sin_impuesto));
  const ivaRedondeado       = grupos.reduce((s, g) => s + Number(fmt2(g.valor)), 0);
  const iceRedondeado       = gruposIce.reduce((s, g) => s + Number(fmt2(g.valor)), 0);
  const irbpnrRedondeado    = Number(fmt2(factura.valor_irbpnr));
  const importeTotalXml     = fmt2(subtotalRedondeado + ivaRedondeado + iceRedondeado + irbpnrRedondeado);

  const irbpnrXml = irbpnrRedondeado > 0
    ? `<totalImpuesto>` +
      `<codigo>5</codigo>` +
      `<codigoPorcentaje>5001</codigoPorcentaje>` +
      `<descuentoAdicional>0.00</descuentoAdicional>` +
      `<baseImponible>${fmt2(factura.subtotal_sin_impuesto)}</baseImponible>` +
      `<valor>${fmt2(irbpnrRedondeado)}</valor>` +
      `</totalImpuesto>`
    : '';

  const totalConImpuestosXml =
    grupos
      .map(
        (g) =>
          `<totalImpuesto>` +
          `<codigo>2</codigo>` +
          `<codigoPorcentaje>${g.codigoPorcentaje}</codigoPorcentaje>` +
          `<descuentoAdicional>0.00</descuentoAdicional>` +
          `<baseImponible>${fmt2(g.baseImponible)}</baseImponible>` +
          `<valor>${fmt2(g.valor)}</valor>` +
          `</totalImpuesto>`
      )
      .join('') +
    gruposIce
      .map(
        (g) =>
          `<totalImpuesto>` +
          `<codigo>3</codigo>` +
          `<codigoPorcentaje>${g.codigoPorcentaje}</codigoPorcentaje>` +
          `<descuentoAdicional>0.00</descuentoAdicional>` +
          `<baseImponible>${fmt2(g.baseImponible)}</baseImponible>` +
          `<valor>${fmt2(g.valor)}</valor>` +
          `</totalImpuesto>`
      )
      .join('') +
    irbpnrXml;

  // Contribuyente especial
  const contribEsp = empresa.contribuyente_especial && empresa.nro_contribuyente_esp
    ? `<contribuyenteEspecial>${esc(empresa.nro_contribuyente_esp)}</contribuyenteEspecial>`
    : '';

  // Detalles
  const detallesXml = factura.detalles
    .map((d) => {
      const cp = CODIGO_PORCENTAJE[d.codigo_iva] ?? '4';
      return (
        `<detalle>` +
        `<codigoPrincipal>${esc(d.codigo)}</codigoPrincipal>` +
        `<descripcion>${esc(d.descripcion)}</descripcion>` +
        `<cantidad>${fmt6(d.cantidad)}</cantidad>` +
        `<precioUnitario>${fmt6(d.precio_unitario)}</precioUnitario>` +
        `<descuento>${fmt2(d.descuento)}</descuento>` +
        `<precioTotalSinImpuesto>${fmt2(d.subtotal)}</precioTotalSinImpuesto>` +
        `<impuestos>` +
        `<impuesto>` +
        `<codigo>2</codigo>` +
        `<codigoPorcentaje>${cp}</codigoPorcentaje>` +
        `<tarifa>${fmt2(d.porcentaje_iva)}</tarifa>` +
        `<baseImponible>${fmt2(d.subtotal)}</baseImponible>` +
        `<valor>${fmt2(d.valor_iva)}</valor>` +
        `</impuesto>` +
        (Number(d.valor_ice ?? 0) > 0
          ? `<impuesto>` +
            `<codigo>3</codigo>` +
            `<codigoPorcentaje>${(d as any).codigo_ice ?? Math.round(Number(d.porcentaje_ice ?? 0))}</codigoPorcentaje>` +
            `<tarifa>${fmt2(Number(d.porcentaje_ice ?? 0))}</tarifa>` +
            `<baseImponible>${fmt2(d.subtotal)}</baseImponible>` +
            `<valor>${fmt2(Number(d.valor_ice))}</valor>` +
            `</impuesto>`
          : '') +
        (Number((d as any).valor_irbpnr ?? 0) > 0
          ? `<impuesto>` +
            `<codigo>5</codigo>` +
            `<codigoPorcentaje>5001</codigoPorcentaje>` +
            `<tarifa>0.02</tarifa>` +
            `<baseImponible>${fmt2(d.subtotal)}</baseImponible>` +
            `<valor>${fmt2(Number((d as any).valor_irbpnr))}</valor>` +
            `</impuesto>`
          : '') +
        `</impuestos>` +
        `</detalle>`
      );
    })
    .join('');

  // Datos adicionales
  const infoAdicionalXml =
    factura.datos_adicionales.length > 0
      ? `<infoAdicional>` +
        factura.datos_adicionales
          .map((da) => `<campoAdicional nombre="${esc(da.nombre)}">${esc(da.valor)}</campoAdicional>`)
          .join('') +
        `</infoAdicional>`
      : '';

  const tipoIdComprador = inferirTipoId(factura.cli_identificacion);

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<factura id="comprobante" version="2.1.0">` +
    `<infoTributaria>` +
    `<ambiente>${factura.id_ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${factura.clave_acceso}</claveAcceso>` +
    `<codDoc>01</codDoc>` +
    `<estab>${factura.cod_establecimiento}</estab>` +
    `<ptoEmi>${factura.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${factura.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoFactura>` +
    `<fechaEmision>${fechaXml}</fechaEmision>` +
    `<dirEstablecimiento>${esc(dirEstablecimiento)}</dirEstablecimiento>` +
    contribEsp +
    `<obligadoContabilidad>${empresa.obligado_contabilidad ? 'SI' : 'NO'}</obligadoContabilidad>` +
    `<tipoIdentificacionComprador>${tipoIdComprador}</tipoIdentificacionComprador>` +
    `<razonSocialComprador>${esc(factura.cli_razon_social)}</razonSocialComprador>` +
    `<identificacionComprador>${factura.cli_identificacion}</identificacionComprador>` +
    `<totalSinImpuestos>${fmt2(factura.subtotal_sin_impuesto)}</totalSinImpuestos>` +
    `<totalDescuento>${fmt2(factura.descuento_total)}</totalDescuento>` +
    `<totalConImpuestos>${totalConImpuestosXml}</totalConImpuestos>` +
    `<propina>0.00</propina>` +
    `<importeTotal>${importeTotalXml}</importeTotal>` +
    `<moneda>DOLAR</moneda>` +
    `<pagos>` +
    `<pago>` +
    `<formaPago>${factura.forma_pago}</formaPago>` +
    `<total>${fmt2(factura.total)}</total>` +
    `<plazo>${factura.dias_plazo}</plazo>` +
    `<unidadTiempo>dias</unidadTiempo>` +
    `</pago>` +
    `</pagos>` +
    `</infoFactura>` +
    `<detalles>${detallesXml}</detalles>` +
    infoAdicionalXml +
    `</factura>`
  );
}