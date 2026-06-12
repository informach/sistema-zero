import { SignedXml } from 'xml-crypto'
import type { A1Certificate } from './cert'
import { leafCertPem } from './cert'

const ALGOS = {
  sha1: {
    digest: 'http://www.w3.org/2000/09/xmldsig#sha1',
    signature: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  },
  sha256: {
    digest: 'http://www.w3.org/2001/04/xmlenc#sha256',
    signature: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  },
} as const

const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature'

/**
 * Assinatura XMLDSig enveloped no padrão dos DF-e brasileiros: C14N inclusivo,
 * transforms [enveloped, c14n], Reference por Id, X509Certificate no KeyInfo.
 * Algoritmo default sha1 (convenção NF-e) — troque com NFSE_SIG_ALGO=sha256 se
 * a Sefin rejeitar (item a confirmar no spike 02).
 *
 * @param refElementLocalName ex.: 'infDPS' ou 'infPedReg' — a Signature entra
 *   como irmã (append no elemento raiz), conforme o XSD (DPS/pedRegEvento).
 */
export function signXml(xml: string, refElementLocalName: string, cert: A1Certificate): string {
  const algo = ALGOS[(process.env['NFSE_SIG_ALGO'] as keyof typeof ALGOS) ?? 'sha1']

  const sig = new SignedXml({
    privateKey: cert.key,
    publicCert: leafCertPem(cert),
    canonicalizationAlgorithm: C14N,
    signatureAlgorithm: algo.signature,
  })
  sig.addReference({
    xpath: `//*[local-name(.)='${refElementLocalName}']`,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: algo.digest,
  })
  sig.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${refElementLocalName}']`, action: 'after' },
  })
  return sig.getSignedXml()
}
