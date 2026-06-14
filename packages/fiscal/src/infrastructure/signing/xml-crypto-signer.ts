import { SignedXml } from 'xml-crypto'
import type { A1Certificate } from '../certificate/a1-certificate'

export type SigAlgo = 'sha1' | 'sha256'

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
 * Assinatura XMLDSig enveloped no padrão dos DF-e: C14N INCLUSIVO, transforms
 * [enveloped, c14n], Reference por Id, X509Certificate no KeyInfo. Algoritmo
 * default `sha1` — combinação ACEITA pela Sefin na Produção Restrita (spike
 * 12/06). `NFSE_SIG_ALGO=sha256` é o escape se a Sefin endurecer (SHA-1 em
 * XMLDSig está em depreciação) — sem precisar mexer no código numa emergência.
 *
 * @param refElementLocalName 'infDPS' | 'infPedReg' — a Signature entra como
 *   irmã (append após o elemento), conforme o XSD.
 */
export function signXml(
  xml: string,
  refElementLocalName: string,
  cert: A1Certificate,
  algo: SigAlgo = 'sha1',
): string {
  const { digest, signature } = ALGOS[algo]
  const sig = new SignedXml({
    privateKey: cert.key,
    // Leaf explícito (NÃO o 1º bloco da cadeia concatenada) — ver a1-certificate.ts.
    publicCert: cert.leafCertPem,
    canonicalizationAlgorithm: C14N,
    signatureAlgorithm: signature,
  })
  sig.addReference({
    xpath: `//*[local-name(.)='${refElementLocalName}']`,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: digest,
  })
  sig.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${refElementLocalName}']`, action: 'after' },
  })
  return sig.getSignedXml()
}
