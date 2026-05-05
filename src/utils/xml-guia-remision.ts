import { Empresa } from '../models/empresas.model';
import { GuiaRemisionConDetalles } from '../models/guias_remision.model';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fechaDDMMYYYY(fecha: string): string {
  const [yyyy, mm, dd] = fecha.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function fmt6(n: number): string {
  return Number(n).toFixed(6);
}

function inferirTipoIdTransportista(ruc: string): string {
  if (ruc.length === 13) return '04';
  if (ruc.length === 10) return '05';
  return '06';
}

export function generarXmlGuiaRemision(
  gr: GuiaRemisionConDetalles,
  empresa: Empresa,
  dirEstablecimiento: string
): string {
  if (!empresa.ruc) throw new Error('La empresa no tiene RUC configurado.');
  if (!empresa.razon_social) throw new Error('La empresa no tiene razón social configurada.');
  if (!empresa.direccion_matriz) throw new Error('La empresa no tiene dirección matriz configurada.');
  if (!gr.dest_identificacion) throw new Error('La guía de remisión no tiene identificación del destinatario.');
  if (!gr.dest_razon_social) throw new Error('La guía de remisión no tiene razón social del destinatario.');
  if (!gr.motivo_traslado) throw new Error('La guía de remisión no tiene motivo de traslado.');

  const ambiente = empresa.ambiente ?? 1;
  const dirEstab = esc(dirEstablecimiento || empresa.direccion_matriz);
  const tipoIdTransp = inferirTipoIdTransportista(gr.ruc_transportista);

  const detallesXml = gr.detalles
    .map((d) =>
      `<detalle>` +
      `<codigoInterno>${esc(d.codigo)}</codigoInterno>` +
      `<descripcion>${esc(d.descripcion)}</descripcion>` +
      `<cantidad>${fmt6(Number(d.cantidad))}</cantidad>` +
      `</detalle>`
    )
    .join('');

  const rutaXml = gr.ruta ? `<ruta>${esc(gr.ruta)}</ruta>` : '';
  const dirDestinatarioXml = gr.direccion_destino ? esc(gr.direccion_destino) : '';

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<guiaRemision id="comprobante" version="1.1.0">` +
    `<infoTributaria>` +
    `<ambiente>${ambiente}</ambiente>` +
    `<tipoEmision>1</tipoEmision>` +
    `<razonSocial>${esc(empresa.razon_social)}</razonSocial>` +
    `<nombreComercial>${esc(empresa.nombre_comercial ?? empresa.razon_social)}</nombreComercial>` +
    `<ruc>${empresa.ruc}</ruc>` +
    `<claveAcceso>${gr.clave_acceso}</claveAcceso>` +
    `<codDoc>06</codDoc>` +
    `<estab>${gr.cod_establecimiento}</estab>` +
    `<ptoEmi>${gr.cod_punto_emision}</ptoEmi>` +
    `<secuencial>${gr.secuencial}</secuencial>` +
    `<dirMatriz>${esc(empresa.direccion_matriz)}</dirMatriz>` +
    `</infoTributaria>` +
    `<infoGuiaRemision>` +
    `<dirEstablecimiento>${dirEstab}</dirEstablecimiento>` +
    `<dirPartida>${dirEstab}</dirPartida>` +
    `<razonSocialTransportista>${esc(gr.razon_social_transportista)}</razonSocialTransportista>` +
    `<tipoIdentificacionTransportista>${tipoIdTransp}</tipoIdentificacionTransportista>` +
    `<rucTransportista>${gr.ruc_transportista}</rucTransportista>` +
    `<obligadoContabilidad>${empresa.obligado_contabilidad ? 'SI' : 'NO'}</obligadoContabilidad>` +
    `<fechaIniTransporte>${fechaDDMMYYYY(gr.fecha_ini_transporte)}</fechaIniTransporte>` +
    `<fechaFinTransporte>${fechaDDMMYYYY(gr.fecha_fin_transporte)}</fechaFinTransporte>` +
    `<placa>${esc(gr.placa)}</placa>` +
    `</infoGuiaRemision>` +
    `<destinatarios>` +
    `<destinatario>` +
    `<identificacionDestinatario>${esc(gr.dest_identificacion)}</identificacionDestinatario>` +
    `<razonSocialDestinatario>${esc(gr.dest_razon_social)}</razonSocialDestinatario>` +
    `<dirDestinatario>${dirDestinatarioXml}</dirDestinatario>` +
    `<motivoTraslado>${esc(gr.motivo_traslado)}</motivoTraslado>` +
    rutaXml +
    `<detalles>${detallesXml}</detalles>` +
    `</destinatario>` +
    `</destinatarios>` +
    `</guiaRemision>`
  );
}
