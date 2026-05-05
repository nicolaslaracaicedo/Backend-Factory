import { Empresa } from '../models/empresas.model';
import { NotaDebitoConDetalles } from '../models/notas_debito.model';

const fmt2 = (n: number) => Number(n).toFixed(2);

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

// Deriva el codigoPorcentaje del SRI a partir del porcentaje calculado
function inferirCodigoPorcentaje(porcentaje: number): string {
  if (porcentaje === 0) return '0';
  if (porcentaje <= 5) return '5';
  if (porcentaje <= 12) return '3';
  return '4'; // 15%
}

export function generarXmlNotaDebito(
  nd: NotaDebitoConDetalles,
  empresa: Empresa,
  dirEstablecimiento: string
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');
  if (!nd.cli_identificacion) throw new Error('La nota de débito no tiene identificación del comprador.');
  if (!nd.cli_razon_social) throw new Error('La nota de débito no tiene razón social del comprador.');
  if (!nd.factura_ref_numero) throw new Error('La nota de débito no tiene número de documento modificado.');
  if (!nd.factura_ref_fecha) throw new Error('La nota de débito no tiene fecha del documento de sustento.');

  const fechaXml = fechaDDMMYYYY(nd.fecha_emision);
  const fechaSustento = fechaDDMMYYYY(nd.factura_ref_fecha);
  const tipoIdComprador = inferirTipoId(nd.cli_identificacion);

  // Deriva la tarifa IVA a partir de los totales almacenados
  const subtotal = Number(nd.subtotal);
  const iva_total = Number(nd.iva_total);
  const tarifa = subtotal > 0 ? Math.round((iva_total / subtotal) * 10000) / 100 : 0;
  const codigoPorcentaje = inferirCodigoPorcentaje(tarifa);

  const impuestosXml =
    `<impuesto>` +
    `<codigo>2</codigo>` +
    `<codigoPorcentaje>${codigoPorcentaje}</codigoPorcentaje>` +
    `<tarifa>${fmt2(tarifa)}</tarifa>` +
    `<baseImponible>${fmt2(subtotal)}</baseImponible>` +
    `<valor>${fmt2(iva_total)}</valor>` +
    `</impuesto>`;

  const motivosXml = nd.detalles
    .map(
      (d) =>
        `<motivo>` +
        `<razon>${esc(d.razon)}</razon>` +
        `<valor>${fmt2(d.valor)}</valor>` +
        `</motivo>`
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<notaDebito id="comprobante" version="1.0.0">` +
    `<infoTributaria>` +
    `<ambiente>${nd.id_ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${nd.clave_acceso}</claveAcceso>` +
    `<codDoc>05</codDoc>` +
    `<estab>${nd.cod_establecimiento}</estab>` +
    `<ptoEmi>${nd.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${nd.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoNotaDebito>` +
    `<fechaEmision>${fechaXml}</fechaEmision>` +
    `<dirEstablecimiento>${esc(dirEstablecimiento)}</dirEstablecimiento>` +
    `<tipoIdentificacionComprador>${tipoIdComprador}</tipoIdentificacionComprador>` +
    `<razonSocialComprador>${esc(nd.cli_razon_social)}</razonSocialComprador>` +
    `<identificacionComprador>${nd.cli_identificacion}</identificacionComprador>` +
    `<obligadoContabilidad>${empresa.obligado_contabilidad ? 'SI' : 'NO'}</obligadoContabilidad>` +
    `<codDocModificado>01</codDocModificado>` +
    `<numDocModificado>${esc(nd.factura_ref_numero)}</numDocModificado>` +
    `<fechaEmisionDocSustento>${fechaSustento}</fechaEmisionDocSustento>` +
    `<totalSinImpuestos>${fmt2(subtotal)}</totalSinImpuestos>` +
    `<impuestos>${impuestosXml}</impuestos>` +
    `<valorTotal>${fmt2(Number(nd.total))}</valorTotal>` +
    `<pagos>` +
    `<pago>` +
    `<formaPago>01</formaPago>` +
    `<total>${fmt2(Number(nd.total))}</total>` +
    `</pago>` +
    `</pagos>` +
    `</infoNotaDebito>` +
    `<motivos>${motivosXml}</motivos>` +
    `</notaDebito>`
  );
}
