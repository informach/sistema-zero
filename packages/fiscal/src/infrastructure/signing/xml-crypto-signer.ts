import { SignedXml } from 'xml-crypto'
import { type A1Certificate, leafCertPem } from '../certificate/a1-certificate'

const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'
const SHA1_DIGEST = 'http://www.w3.org/2000/09/xmldsig#sha1'
const RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'

/**
 * Assinatura XMLDSig enveloped no padrão dos DF-e: C14N INCLUSIVO, transforms
 * [enveloped, c14n], Reference por Id, X509Certificate no KeyInfo, rsa-sha1 —
 * combinação ACEITA pela Sefin na Produção Restrita (spike 12/06).
 *
 * @param refElementLocalName 'infDPS' | 'infPedReg' — a Signature entra como
 *   irmã (append após o elemento), conforme o XSD.
 */
export function signXml(xml: string, refElementLocalName: string, cert: A1Certificate): string {
  const sig = new SignedXml({
    privateKey: cert.key,
    publicCert: leafCertPem(cert),
    canonicalizationAlgorithm: C14N,
    signatureAlgorithm: RSA_SHA1,
  })
  sig.addReference({
    xpath: `//*[local-name(.)='${refElementLocalName}']`,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: SHA1_DIGEST,
  })
  sig.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${refElementLocalName}']`, action: 'after' },
  })
  return sig.getSignedXml()
}
