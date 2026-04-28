import forge from 'node-forge';
import crypto from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { C14nCanonicalization } from 'xml-crypto';

// Proper inclusive C14N via xml-crypto
function canonicalize(xmlString: string): string {
  const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
  const root = doc.documentElement;
  if (!root) throw new Error('No se pudo parsear XML para C14N');
  const c14n = new C14nCanonicalization();
  return c14n.process(root as unknown as Node, {});
}

function sha1Base64(data: string): string {
  return crypto.createHash('sha1').update(Buffer.from(data, 'utf8')).digest('base64');
}

function sha256Base64Binary(data: string): string {
  return crypto.createHash('sha256').update(Buffer.from(data, 'binary')).digest('base64');
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
  // 1. Parse P12
  const { cert, privateKey } = parseP12(p12Base64, password);

  // 2. Certificate data
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const certBase64 = forge.util.encode64(certDer);
  const certDigest = sha256Base64Binary(certDer); // SHA256 for certificate (XAdES standard)

  const issuerDN = cert.issuer.attributes
    .map((a) => `${a.shortName}=${a.value}`)
    .join(', ');
  const serialDecimal = BigInt('0x' + cert.serialNumber).toString(10);

  const now = new Date();
  const ecuadorMs = now.getTime() - 5 * 60 * 60 * 1000;
  const signingTime = new Date(ecuadorMs).toISOString().replace(/\.\d{3}Z$/, '-05:00');

  // 3. SignedProperties — SHA1 digest, xmlns:ds and xmlns:xades declared here
  const signedPropsXml =
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
  const spDigest = sha1Base64(canonicalize(signedPropsXml));

  // 4. Document digest — SHA1 of canonical document
  const docDigest = sha1Base64(canonicalize(xmlSinFirmar));

  // 5. SignedInfo — RSA-SHA1, SHA1 digests
  const signedInfoXml =
    `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
    `<ds:Reference Id="SignedPropertiesID" Type="http://uri.etsi.org/01903#SignedProperties" URI="#SignatureProperties">` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<ds:DigestValue>${spDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `<ds:Reference URI="#comprobante">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<ds:DigestValue>${docDigest}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`;

  // 6. Sign canonical SignedInfo with RSA-SHA1
  const canonicalSignedInfo = canonicalize(signedInfoXml);
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(canonicalSignedInfo);
  const signatureValue = sign.sign(forge.pki.privateKeyToPem(privateKey), 'base64');

  // 7. Assemble ds:Signature
  const dsSignature =
    `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature">` +
    signedInfoXml +
    `<ds:SignatureValue Id="SignatureValue">${signatureValue}</ds:SignatureValue>` +
    `<ds:KeyInfo Id="Certificate">` +
    `<ds:X509Data>` +
    `<ds:X509Certificate>${certBase64}</ds:X509Certificate>` +
    `</ds:X509Data>` +
    `</ds:KeyInfo>` +
    `<ds:Object Id="Signature-xades">` +
    `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature">` +
    signedPropsXml +
    `</xades:QualifyingProperties>` +
    `</ds:Object>` +
    `</ds:Signature>`;

  // 8. Insert signature before closing root tag
  const lastClose = xmlSinFirmar.lastIndexOf('</');
  if (lastClose === -1) throw new Error('No se encontró la etiqueta de cierre de la raíz en el XML.');
  return xmlSinFirmar.slice(0, lastClose) + dsSignature + xmlSinFirmar.slice(lastClose);
}
