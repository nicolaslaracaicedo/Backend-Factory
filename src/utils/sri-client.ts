import https from 'https';

const URLS = {
  recepcion: {
    1: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
    2: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
  },
  autorizacion: {
    1: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
    2: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
  },
};

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        SOAPAction: '""',
      },
      rejectUnauthorized: false, // SRI usa certificados propios
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al conectar con el SRI.'));
    });
    req.write(body, 'utf8');
    req.end();
  });
}

function extraer(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m?.[1]?.trim() ?? '';
}

function extraerTodos(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  const result: string[] = [];
  for (const m of xml.matchAll(re)) {
    if (m[1]) result.push(m[1].trim());
  }
  return result;
}

// El SRI usa <mensaje> tanto para el bloque como para el texto del error.
// Extrae solo los <mensaje> que contienen texto plano (no sub-etiquetas).
function extraerTextosMensaje(xml: string): string[] {
  const re = /<mensaje[^>]*>([\s\S]*?)<\/mensaje>/g;
  const result: string[] = [];
  for (const m of xml.matchAll(re)) {
    const content = m[1]?.trim() ?? '';
    if (content && !content.includes('<')) result.push(content);
  }
  return result;
}

// Parsea el bloque <mensajes> del SRI y arma strings legibles.
function parsearMensajes(contenedor: string): string[] {
  const tipos = extraerTodos(contenedor, 'tipo');
  if (tipos.length === 0) return [];
  const textos = extraerTextosMensaje(contenedor);
  const infos = extraerTodos(contenedor, 'informacionAdicional');
  const ids = extraerTodos(contenedor, 'identificador');
  return tipos.map((tipo, i) => {
    const id = ids[i] ? `${ids[i]} - ` : '';
    const msg = textos[i] ?? '';
    const info = infos[i] ?? '';
    return `[${tipo}] ${id}${msg}${info ? ': ' + info : ''}`.trim();
  });
}

// ── Recepción ────────────────────────────────────────────────────────────────

export interface RespuestaRecepcion {
  estado: string;          // RECIBIDA | DEVUELTA
  mensajes: string[];
}

export async function enviarRecepcion(
  xmlFirmadoBase64: string,
  ambiente: number
): Promise<RespuestaRecepcion> {
  const url = URLS.recepcion[ambiente as 1 | 2];
  if (!url) throw new Error('Ambiente inválido para el SRI.');

  const soap =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:ec="http://ec.gob.sri.ws.recepcion">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<ec:validarComprobante>` +
    `<xml>${xmlFirmadoBase64}</xml>` +
    `</ec:validarComprobante>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;

  const respuesta = await httpPost(url, soap);
  const estado = extraer(respuesta, 'estado');
  const mensajesBloque = extraer(extraer(respuesta, 'comprobantes'), 'mensajes');
  const mensajes = parsearMensajes(mensajesBloque);

  return { estado, mensajes };
}

// ── Autorización ─────────────────────────────────────────────────────────────

export interface RespuestaAutorizacion {
  estado: string;             // AUTORIZADO | NO AUTORIZADO | EN PROCESAMIENTO
  numeroAutorizacion: string;
  fechaAutorizacion: string;
  xmlAutorizado: string;
  mensajes: string[];
}

export async function consultarAutorizacion(
  claveAcceso: string,
  ambiente: number
): Promise<RespuestaAutorizacion> {
  const url = URLS.autorizacion[ambiente as 1 | 2];
  if (!url) throw new Error('Ambiente inválido para el SRI.');

  const soap =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ` +
    `xmlns:ec="http://ec.gob.sri.ws.autorizacion">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<ec:autorizacionComprobante>` +
    `<claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>` +
    `</ec:autorizacionComprobante>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;

  const respuesta = await httpPost(url, soap);
  const autBloque = extraer(respuesta, 'autorizacion');
  const estado = extraer(autBloque, 'estado');
  const numeroAutorizacion = extraer(autBloque, 'numeroAutorizacion');
  const fechaAutorizacion = extraer(autBloque, 'fechaAutorizacion');

  // El SRI puede devolver el XML autorizado como CDATA o como entidades XML escapadas (&lt; &gt; &quot;)
  let xmlAutorizado = '';
  const cdataMatch = autBloque.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    xmlAutorizado = cdataMatch[1]?.trim() ?? '';
  } else {
    const compMatch = autBloque.match(/<comprobante[^>]*>([\s\S]*?)<\/comprobante>/);
    if (compMatch?.[1]) {
      xmlAutorizado = compMatch[1].trim()
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'");
    }
  }

  const mensajesBloque = extraer(autBloque, 'mensajes');
  const mensajes = parsearMensajes(mensajesBloque);

  return { estado, numeroAutorizacion, fechaAutorizacion, xmlAutorizado, mensajes };
}

// ── Retry para autorización (SRI a veces tarda) ───────────────────────────

export async function consultarConReintentos(
  claveAcceso: string,
  ambiente: number,
  maxIntentos = 3,
  delayMs = 3000
): Promise<RespuestaAutorizacion> {
  for (let i = 0; i < maxIntentos; i++) {
    const resp = await consultarAutorizacion(claveAcceso, ambiente);
    if (resp.estado !== 'EN PROCESAMIENTO') return resp;
    if (i < maxIntentos - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return consultarAutorizacion(claveAcceso, ambiente);
}
