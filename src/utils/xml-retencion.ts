import { Empresa } from '../models/empresas.model';
import { RetencionConDetalles } from '../models/retenciones.model';

const fmt2 = (n: number) => Number(n).toFixed(2);

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inferirTipoId(identificacion: string): string {
  if (identificacion.length === 13) return '04';
  if (identificacion.length === 10) return '05';
  return '06';
}

function fechaDDMMYYYY(fecha: string): string {
  const [yyyy, mm, dd] = fecha.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function periodoFiscal(fecha: string): string {
  const [yyyy, mm] = fecha.split('-');
  return `${mm}/${yyyy}`;
}

export function generarXmlRetencion(
  r: RetencionConDetalles,
  empresa: Empresa,
  ambiente: number,
  dirEstablecimiento: string
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');
  if (!r.prov_identificacion) throw new Error('La retención no tiene identificación del sujeto retenido.');
  if (!r.prov_razon_social) throw new Error('La retención no tiene razón social del sujeto retenido.');

  const fechaXml = fechaDDMMYYYY(r.fecha_emision);
  const periodo = periodoFiscal(r.fecha_emision);
  const tipoIdProveedor = inferirTipoId(r.prov_identificacion);

  const impuestosXml = r.detalles
    .map(
      (d) =>
        `<impuesto>` +
        `<codigo>${esc(d.tipo)}</codigo>` +
        `<codigoRetencion>${esc(d.codigo)}</codigoRetencion>` +
        `<baseImponible>${fmt2(d.base_imponible)}</baseImponible>` +
        `<porcentajeRetener>${fmt2(d.porcentaje)}</porcentajeRetener>` +
        `<valorRetenido>${fmt2(d.valor_retenido)}</valorRetenido>` +
        `</impuesto>`
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<comprobanteRetencion id="comprobante" version="1.0.0">` +
    `<infoTributaria>` +
    `<ambiente>${ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${r.clave_acceso}</claveAcceso>` +
    `<codDoc>07</codDoc>` +
    `<estab>${r.cod_establecimiento}</estab>` +
    `<ptoEmi>${r.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${r.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoCompRetencion>` +
    `<fechaEmision>${fechaXml}</fechaEmision>` +
    `<dirEstablecimiento>${esc(dirEstablecimiento)}</dirEstablecimiento>` +
    `<obligadoContabilidad>${empresa.obligado_contabilidad ? 'SI' : 'NO'}</obligadoContabilidad>` +
    `<tipoIdentificacionSujetoRetenido>${tipoIdProveedor}</tipoIdentificacionSujetoRetenido>` +
    `<razonSocialSujetoRetenido>${esc(r.prov_razon_social)}</razonSocialSujetoRetenido>` +
    `<identificacionSujetoRetenido>${r.prov_identificacion}</identificacionSujetoRetenido>` +
    `<periodoFiscal>${periodo}</periodoFiscal>` +
    `</infoCompRetencion>` +
    `<impuestos>${impuestosXml}</impuestos>` +
    `</comprobanteRetencion>`
  );
}
