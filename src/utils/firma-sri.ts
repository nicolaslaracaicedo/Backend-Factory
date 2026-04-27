import forge from 'node-forge';
import crypto from 'crypto';

function sha256Base64(data: string, encoding: 'utf8' | 'binary' = 'utf8'): string {
  const md = forge.md.sha256.create();
  if (encoding === 'utf8') {
    md.update(forge.util.encodeUtf8(data));
  } else {
    md.update(data);
  }
  return forge.util.encode64(md.digest().bytes());
}

// C14N simplificado
function c14n(xml: string): string {
  return xml
    .replace(/<\?xml[^?]*\?>\s*/g, '')
    .replace(/<([a-zA-Z0-9_:]+)([^>]*?)\/>/g, '<$1$2></$1>');
}

function parseP12(
  p12Base64: string,
  password: string
): { cert: forge.pki.Certificate; privateKey: forge.pki.rsa.PrivateKey } {
  const p12Der = forge.util.decode64(p12Base64);

  try {
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
    if (cert && key) return { cert, privateKey: key as forge.pki.rsa.PrivateKey };
    throw new Error('No se pudo extraer el certificado o la clave privada del P12.');
  } catch (e: any) {
    if (!e.message?.includes('MAC')) throw e;
  }

  const p12AsnNoMac = forge.asn1.fromDer(p12Der);
  if (Array.isArray(p12AsnNoMac.value) && (p12AsnNoMac.value as unknown[]).length > 2) {
    (p12AsnNoMac.value as unknown[]).splice(2);
  }

  const p12 = forge.pkcs12.pkcs12FromAsn1(p12AsnNoMac, false, password);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
  if (!cert || !key) throw new Error('No se pudo extraer el certificado o la clave privada del P12.');
  return { cert, privateKey: key as forge.pki.rsa.PrivateKey };
}

export function firmarXml(xmlSinFirmar: string, p12Base64: string, password: string): string {
  // 1. Parsear el P12
  const { cert, privateKey } = parseP12(p12Base64, password);

  // 2. Datos del certificado
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const certBase64 = forge.util.encode64(certDer);
  const certDigest = sha256Base64(certDer, 'binary');

  const issuerDN = cert.issuer.attributes
    .map((a) => `${a.shortName}=${a.value}`)
    .join(', ');
  const serialDecimal = BigInt('0x' + cert.serialNumber).toString(10);
  
  // Hora Ecuador
  const now = new Date();
  const ecuadorMs = now.getTime() - 5 * 60 * 60 * 1000;
  const signingTime = new Date(ecuadorMs).toISOString().replace(/\.\d{3}Z$/, '-05:00');

  // 3. SignedProperties
  const signedPropsDigestable =
    `<xades:SignedProperties xmlns:ds="http://www.w3.org/2000/09/xmldsig#" ` +
    `xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="SignatureProperties">` +
    `<xades:SignedSignatureProperties>` +
    `<xades:SigningTime>${signingTime}</xades:SigningTime>` +
    `<xades:SigningCertificate>` +
    `<xades:Cert>` +
    `<xades:CertDigest>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue>${certDigest}</ds:DigestValue>` +
    `</xades:CertDigest>` +
    `<xades:IssuerSerial>` +
    `<ds:X509IssuerName>${issuerDN}</ds:X509IssuerName>` +
    `<ds:X509SerialNumber>${serialDecimal}</ds:X509SerialNumber>` +
    `</xades:IssuerSerial>` +
    `</xades:Cert>` +
    `</xades:SigningCertificate>` +
    `</xades:SignedSignatureProperties>` +
    `</xades:SignedProperties>`;
  const spDigest = sha256Base64(c14n(signedPropsDigestable));

  // 4. Digest del documento original
  const docDigest = sha256Base64(c14n(xmlSinFirmar));

  // 5. SignedInfo CORREGIDO
  const signedInfo =
    `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<ds:Reference Id="SignedPropertiesID" Type="http://uri.etsi.org/01903#SignedProperties" URI="#SignatureProperties">` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue>${spDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `<ds:Reference URI="#comprobante">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue>${docDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`;

  // 6. Firmar el SignedInfo con RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(c14n(signedInfo));
  const signatureValue = sign.sign(forge.pki.privateKeyToPem(privateKey), 'base64');

  // 7. Ensamblar ds:Signature completo
  const dsSignature =
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature">` +
    signedInfo +
    `<ds:SignatureValue Id="SignatureValue">${signatureValue}</ds:SignatureValue>` +
    `<ds:KeyInfo Id="Certificate">` +
    `<ds:X509Data>` +
    `<ds:X509Certificate>${certBase64}</ds:X509Certificate>` +
    `</ds:X509Data>` +
    `</ds:KeyInfo>` +
    `<ds:Object Id="Signature-xades">` +
    `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">` +
    signedPropsDigestable +
    `</xades:QualifyingProperties>` +
    `</ds:Object>` +
    `</ds:Signature>`;

  // 8. Insertar la firma antes del cierre de la etiqueta raíz
  const lastClose = xmlSinFirmar.lastIndexOf('</');
  if (lastClose === -1) {
    throw new Error('No se encontró la etiqueta de cierre de la raíz en el XML.');
  }
  return xmlSinFirmar.slice(0, lastClose) + dsSignature + xmlSinFirmar.slice(lastClose);
}