import { Empresa } from '../models/empresas.model';
import { NotaVentaConDetalles } from '../models/notas_venta.model';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt2(n: number): string { return Number(n).toFixed(2); }
function fmt6(n: number): string { return Number(n).toFixed(6); }

const FORMA_PAGO_LABEL: Record<string, string> = {
  '01': 'Efectivo', '15': 'Compensación de deudas', '16': 'Tarjeta de débito',
  '17': 'Dinero electrónico', '18': 'Tarjeta prepago', '19': 'Tarjeta de crédito',
  '20': 'Otros con utilización del sistema financiero', '21': 'Endoso de títulos',
};

export function generarXmlNotaVenta(
  nv: NotaVentaConDetalles,
  empresa: Empresa,
  dirEstablecimiento: string,
  ambiente: number,
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');

  const [yyyy, mm, dd] = nv.fecha_emision.split('-');
  const fechaXml = `${dd}/${mm}/${yyyy}`;
  const dirEstab = esc(dirEstablecimiento || empresa.direccion_matriz);

  const tipoIdComprador = nv.cli_identificacion === '9999999999' ? '07' :
    nv.cli_identificacion?.length === 13 ? '04' :
    nv.cli_identificacion?.length === 10 ? '05' : '07';

  // RISE no aplica IVA — se declara como "no objeto" con valor 0
  const totalImpuestosXml =
    `<totalImpuesto>` +
    `<codigo>2</codigo>` +
    `<codigoPorcentaje>6</codigoPorcentaje>` +
    `<baseImponible>${fmt2(nv.subtotal_sin_impuesto)}</baseImponible>` +
    `<valor>0.00</valor>` +
    `</totalImpuesto>`;

  const detallesXml = nv.detalles.map(d =>
    `<detalle>` +
    `<codigoPrincipal>${esc(d.codigo)}</codigoPrincipal>` +
    `<descripcion>${esc(d.descripcion)}</descripcion>` +
    `<cantidad>${fmt6(d.cantidad)}</cantidad>` +
    `<precioUnitario>${fmt6(d.precio_unitario)}</precioUnitario>` +
    `<descuento>${fmt2(d.descuento)}</descuento>` +
    `<precioTotalSinImpuesto>${fmt2(d.subtotal)}</precioTotalSinImpuesto>` +
    `</detalle>`
  ).join('');

  const contribEsp = empresa.contribuyente_especial && empresa.nro_contribuyente_esp
    ? `<contribuyenteEspecial>${esc(empresa.nro_contribuyente_esp)}</contribuyenteEspecial>`
    : '';

  const infoAdicionalXml = [
    nv.cli_email    ? `<campoAdicional nombre="email">${esc(nv.cli_email)}</campoAdicional>` : '',
    nv.cli_telefono ? `<campoAdicional nombre="telefono">${esc(nv.cli_telefono)}</campoAdicional>` : '',
    nv.observacion  ? `<campoAdicional nombre="observacion">${esc(nv.observacion)}</campoAdicional>` : '',
  ].filter(Boolean).join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<notaVenta id="comprobante" version="1.1.0">` +
    `<infoTributaria>` +
    `<ambiente>${ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${nv.clave_acceso}</claveAcceso>` +
    `<codDoc>02</codDoc>` +
    `<estab>${nv.cod_establecimiento}</estab>` +
    `<ptoEmi>${nv.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${nv.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoNotaVenta>` +
    `<fechaEmision>${fechaXml}</fechaEmision>` +
    `<dirEstablecimiento>${dirEstab}</dirEstablecimiento>` +
    contribEsp +
    `<obligadoContabilidad>NO</obligadoContabilidad>` +
    `<tipoIdentificacionComprador>${tipoIdComprador}</tipoIdentificacionComprador>` +
    `<razonSocialComprador>${esc(nv.cli_razon_social ?? 'CONSUMIDOR FINAL')}</razonSocialComprador>` +
    `<identificacionComprador>${nv.cli_identificacion ?? '9999999999'}</identificacionComprador>` +
    `<totalSinImpuestos>${fmt2(nv.subtotal_sin_impuesto)}</totalSinImpuestos>` +
    `<totalDescuento>${fmt2(nv.descuento_total)}</totalDescuento>` +
    `<totalConImpuestos>${totalImpuestosXml}</totalConImpuestos>` +
    `<propina>0.00</propina>` +
    `<importeTotal>${fmt2(nv.total)}</importeTotal>` +
    `<moneda>DOLAR</moneda>` +
    `<pagos>` +
    `<pago>` +
    `<formaPago>${nv.forma_pago}</formaPago>` +
    `<total>${fmt2(nv.total)}</total>` +
    `<plazo>0</plazo>` +
    `<unidadTiempo>dias</unidadTiempo>` +
    `</pago>` +
    `</pagos>` +
    `</infoNotaVenta>` +
    `<detalles>${detallesXml}</detalles>` +
    (infoAdicionalXml ? `<infoAdicional>${infoAdicionalXml}</infoAdicional>` : '') +
    `</notaVenta>`
  );
}
