import { readFileSync } from 'node:fs'
import * as forge from 'node-forge'

export interface A1Certificate {
  /** Certificado(s) em PEM. */
  cert: string
  /** Chave privada em PEM. */
  key: string
  /** Dados informativos extraídos do certificado de entidade final. */
  info: { subject: string; notBefore: Date; notAfter: Date }
}

/**
 * Carrega o certificado A1 (e-CNPJ) como PEM (cert + chave) a partir de
 * `NFSE_CERT_PFX_PATH` ou `NFSE_CERT_PFX_BASE64` + `NFSE_CERT_PASSWORD`.
 * Mesma técnica do payments (efi/certificate.ts): o `.pfx` é convertido em
 * memória com node-forge e o PEM vai no `tls` do fetch (mTLS sob Bun).
 */
export function loadA1Certificate(): A1Certificate {
  const base64 = process.env.NFSE_CERT_PFX_BASE64?.trim()
  const path = process.env.NFSE_CERT_PFX_PATH?.trim()
  const password = process.env.NFSE_CERT_PASSWORD ?? ''

  const buffer = base64 ? Buffer.from(base64, 'base64') : path ? readFileSync(path) : null
  if (!buffer) {
    throw new Error(
      'Certificado ausente: defina NFSE_CERT_PFX_PATH ou NFSE_CERT_PFX_BASE64 (e NFSE_CERT_PASSWORD)',
    )
  }

  const der = forge.util.createBuffer(buffer.toString('binary'))
  const asn1 = forge.asn1.fromDer(der)
  let p12: forge.pkcs12.Pkcs12Pfx
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password)
  } catch (error) {
    throw new Error(
      `Falha ao ler o PFX (${error instanceof Error ? error.message : String(error)}). Senha errada? Defina NFSE_CERT_PASSWORD.`,
    )
  }

  const shroudedOid = forge.pki.oids.pkcs8ShroudedKeyBag!
  const keyOid = forge.pki.oids.keyBag!
  const shrouded = p12.getBags({ bagType: shroudedOid })[shroudedOid] ?? []
  const plain = p12.getBags({ bagType: keyOid })[keyOid] ?? []
  const keyBag = shrouded[0] ?? plain[0]
  if (!keyBag?.key) throw new Error('Chave privada não encontrada no PFX')
  const key = forge.pki.privateKeyToPem(keyBag.key)

  const certOid = forge.pki.oids.certBag!
  const bags = p12.getBags({ bagType: certOid })[certOid] ?? []
  const certs = bags.map((b) => b.cert).filter((c): c is forge.pki.Certificate => Boolean(c))
  if (certs.length === 0) throw new Error('Certificado não encontrado no PFX')

  // Entidade final = o que NÃO é CA (ou o primeiro, se só houver um).
  const leaf =
    certs.find((c) => !c.extensions?.some((e) => e.name === 'basicConstraints' && e.cA)) ??
    certs[0]!
  const cert = certs.map((c) => forge.pki.certificateToPem(c)).join('')
  const cn = leaf.subject.getField('CN')?.value ?? '(sem CN)'

  return {
    cert,
    key,
    info: {
      subject: String(cn),
      notBefore: leaf.validity.notBefore,
      notAfter: leaf.validity.notAfter,
    },
  }
}

/** Só o PEM do certificado de entidade final, sem cabeçalhos, p/ o KeyInfo da assinatura. */
export function leafCertPem(cert: A1Certificate): string {
  const first = cert.cert.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)
  if (!first) throw new Error('PEM sem bloco de certificado')
  return first[0]
}
