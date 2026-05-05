import { Empresa } from '../models/empresas.model';
import { NotaCreditoConDetalles } from '../models/notas_credito.model';

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

function fechaDDMMYYYY(fecha: string): string {
  const [yyyy, mm, dd] = fecha.split('-');
  return `${dd}/${mm}/${yyyy}`;
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

function agruparIva(detalles: NotaCreditoConDetalles['detalles']): GrupoIva[] {
  const grupos = new Map<string, GrupoIva>();
  for (const d of detalles) {
    const cp = CODIGO_PORCENTAJE[d.codigo_iva] ?? '4';
    const g = grupos.get(cp);
    if (g) {
      g.baseImponible += d.subtotal;
      g.valor += d.valor_iva;
    } else {
      grupos.set(cp, { codigoPorcentaje: cp, tarifa: d.porcentaje_iva, baseImponible: d.subtotal, valor: d.valor_iva });
    }
  }
  return Array.from(grupos.values());
}

export function generarXmlNotaCredito(
  nc: NotaCreditoConDetalles,
  empresa: Empresa,
  dirEstablecimiento: string
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');
  if (!nc.cli_identificacion) throw new Error('La nota de crédito no tiene identificación del comprador.');
  if (!nc.cli_razon_social) throw new Error('La nota de crédito no tiene razón social del comprador.');
  if (!nc.factura_ref_numero) throw new Error('La nota de crédito no tiene número de documento modificado.');
  if (!nc.factura_ref_fecha) throw new Error('La nota de crédito no tiene fecha del documento de sustento.');

  const fechaXml = fechaDDMMYYYY(nc.fecha_emision);
  const fechaSustento = fechaDDMMYYYY(nc.factura_ref_fecha);
  const tipoIdComprador = inferirTipoId(nc.cli_identificacion);
  const grupos = agruparIva(nc.detalles);

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

  const detallesXml = nc.detalles
    .map((d) => {
      const cp = CODIGO_PORCENTAJE[d.codigo_iva] ?? '4';
      return (
        `<detalle>` +
        `<codigoInterno>${esc(d.codigo)}</codigoInterno>` +
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
        `</impuestos>` +
        `</detalle>`
      );
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<notaCredito id="comprobante" version="1.1.0">` +
    `<infoTributaria>` +
    `<ambiente>${nc.id_ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${nc.clave_acceso}</claveAcceso>` +
    `<codDoc>04</codDoc>` +
    `<estab>${nc.cod_establecimiento}</estab>` +
    `<ptoEmi>${nc.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${nc.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoNotaCredito>` +
    `<fechaEmision>${fechaXml}</fechaEmision>` +
    `<dirEstablecimiento>${esc(dirEstablecimiento)}</dirEstablecimiento>` +
    `<tipoIdentificacionComprador>${tipoIdComprador}</tipoIdentificacionComprador>` +
    `<razonSocialComprador>${esc(nc.cli_razon_social)}</razonSocialComprador>` +
    `<identificacionComprador>${nc.cli_identificacion}</identificacionComprador>` +
    `<obligadoContabilidad>${empresa.obligado_contabilidad ? 'SI' : 'NO'}</obligadoContabilidad>` +
    `<codDocModificado>01</codDocModificado>` +
    `<numDocModificado>${esc(nc.factura_ref_numero)}</numDocModificado>` +
    `<fechaEmisionDocSustento>${fechaSustento}</fechaEmisionDocSustento>` +
    `<totalSinImpuestos>${fmt2(nc.subtotal_sin_impuesto)}</totalSinImpuestos>` +
    `<valorModificacion>${fmt2(nc.total)}</valorModificacion>` +
    `<moneda>DOLAR</moneda>` +
    `<totalConImpuestos>${totalConImpuestosXml}</totalConImpuestos>` +
    `<motivo>${esc(nc.motivo)}</motivo>` +
    `</infoNotaCredito>` +
    `<detalles>${detallesXml}</detalles>` +
    `</notaCredito>`
  );
}
