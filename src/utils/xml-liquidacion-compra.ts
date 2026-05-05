import { Empresa } from '../models/empresas.model';
import { LiquidacionCompraConDetalles } from '../models/liquidaciones_compra.model';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt2(n: number): string {
  return Number(n).toFixed(2);
}

function fmt6(n: number): string {
  return Number(n).toFixed(6);
}

const CODIGO_PORCENTAJE: Record<string, string> = {
  '0': '0',
  '2': '6',
  '3': '3',
  '4': '4',
  '5': '5',
};

interface GrupoIva {
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

function agruparIva(detalles: LiquidacionCompraConDetalles['detalles']): GrupoIva[] {
  const grupos = new Map<string, GrupoIva>();
  for (const d of detalles) {
    const cp = CODIGO_PORCENTAJE[d.codigo_iva] ?? '4';
    const g = grupos.get(cp);
    if (g) {
      g.baseImponible += d.subtotal;
      g.valor += d.valor_iva;
    } else {
      grupos.set(cp, {
        codigoPorcentaje: cp,
        tarifa: d.porcentaje_iva,
        baseImponible: d.subtotal,
        valor: d.valor_iva,
      });
    }
  }
  return Array.from(grupos.values());
}

export function generarXmlLiquidacionCompra(
  lc: LiquidacionCompraConDetalles,
  empresa: Empresa,
  dirEstablecimiento: string,
  ambiente: number
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');

  const [yyyy, mm, dd] = lc.fecha_emision.split('-');
  const fechaXml = `${dd}/${mm}/${yyyy}`;

  const dirEstab = esc(dirEstablecimiento || empresa.direccion_matriz);

  const grupos = agruparIva(lc.detalles);
  const totalConImpuestosXml = grupos
    .map(
      (g) =>
        `<totalImpuesto>` +
        `<codigo>2</codigo>` +
        `<codigoPorcentaje>${g.codigoPorcentaje}</codigoPorcentaje>` +
        `<baseImponible>${fmt2(g.baseImponible)}</baseImponible>` +
        `<valor>${fmt2(g.valor)}</valor>` +
        `</totalImpuesto>`
    )
    .join('');

  const contribEsp = empresa.contribuyente_especial && empresa.nro_contribuyente_esp
    ? `<contribuyenteEspecial>${esc(empresa.nro_contribuyente_esp)}</contribuyenteEspecial>`
    : '';

  const detallesXml = lc.detalles
    .map((d) => {
      const cp = CODIGO_PORCENTAJE[d.codigo_iva] ?? '4';
      return (
        `<detalle>` +
        `<codigoPrincipal>${esc(d.codigo)}</codigoPrincipal>` +
        `<descripcion>${esc(d.descripcion)}</descripcion>` +
        `<unidadMedida>${esc(d.unidad_medida)}</unidadMedida>` +
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
        `</impuestos>` +
        `</detalle>`
      );
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<liquidacionCompra id="comprobante" version="1.1.0">` +
    `<infoTributaria>` +
    `<ambiente>${ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${lc.clave_acceso}</claveAcceso>` +
    `<codDoc>03</codDoc>` +
    `<estab>${lc.cod_establecimiento}</estab>` +
    `<ptoEmi>${lc.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${lc.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoLiquidacionCompra>` +
    `<fechaEmision>${fechaXml}</fechaEmision>` +
    `<dirEstablecimiento>${dirEstab}</dirEstablecimiento>` +
    contribEsp +
    `<obligadoContabilidad>${empresa.obligado_contabilidad ? 'SI' : 'NO'}</obligadoContabilidad>` +
    `<tipoIdentificacionProveedor>${lc.tipo_identificacion_prov}</tipoIdentificacionProveedor>` +
    `<razonSocialProveedor>${esc(lc.razon_social_prov)}</razonSocialProveedor>` +
    `<identificacionProveedor>${lc.identificacion_prov}</identificacionProveedor>` +
    `<totalSinImpuestos>${fmt2(lc.subtotal_sin_impuesto)}</totalSinImpuestos>` +
    `<totalDescuento>${fmt2(lc.descuento_total)}</totalDescuento>` +
    `<totalConImpuestos>${totalConImpuestosXml}</totalConImpuestos>` +
    `<importeTotal>${fmt2(lc.total)}</importeTotal>` +
    `<moneda>DOLAR</moneda>` +
    `<pagos>` +
    `<pago>` +
    `<formaPago>01</formaPago>` +
    `<total>${fmt2(lc.total)}</total>` +
    `<plazo>0</plazo>` +
    `<unidadTiempo>dias</unidadTiempo>` +
    `</pago>` +
    `</pagos>` +
    `</infoLiquidacionCompra>` +
    `<detalles>${detallesXml}</detalles>` +
    `</liquidacionCompra>`
  );
}
