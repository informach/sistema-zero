import { readFileSync } from 'node:fs'
import * as forge from 'node-forge'

export interface A1Certificate {
  /** Certificado(s) em PEM (cadeia completa do PFX). */
  cert: string
  /** Chave privada em PEM. */
  key: string
  info: { subject: string; notBefore: Date; notAfter: Date }
}

/**
 * Converte o A1 (.pfx) em PEM em memória (node-forge) — o PEM vai no `tls` do
 * fetch (mTLS sob Bun; mesma técnica do payments/efi). Validado no spike com o
 * certificado real da Informach.
 */
export function loadA1Certificate(opts: {
  base64?: string
  path?: string
  password?: string
}): A1Certificate {
  const buffer = opts.base64?.trim()
    ? Buffer.from(opts.base64.trim(), 'base64')
    : opts.path?.trim()
      ? readFileSync(opts.path.trim())
      : null
  if (!buffer) {
    throw new Error('Certificado ausente: defina NFSE_CERT_PFX_BASE64 ou NFSE_CERT_PFX_PATH')
  }

  const der = forge.util.createBuffer(buffer.toString('binary'))
  const asn1 = forge.asn1.fromDer(der)
  let p12: forge.pkcs12.Pkcs12Pfx
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, opts.password ?? '')
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

  const leaf =
    certs.find((c) => !c.extensions?.some((e) => e.name === 'basicConstraints' && e.cA)) ??
    certs[0]!
  return {
    cert: certs.map((c) => forge.pki.certificateToPem(c)).join(''),
    key,
    info: {
      subject: String(leaf.subject.getField('CN')?.value ?? '(sem CN)'),
      notBefore: leaf.validity.notBefore,
      notAfter: leaf.validity.notAfter,
    },
  }
}

/** Só o PEM da entidade final — vai no KeyInfo/X509Certificate da assinatura. */
export function leafCertPem(cert: A1Certificate): string {
  const first = cert.cert.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)
  if (!first) throw new Error('PEM sem bloco de certificado')
  return first[0]
}

/** Dias restantes de validade (negativo = expirado). */
export function certDaysLeft(cert: A1Certificate, now = Date.now()): number {
  return Math.floor((cert.info.notAfter.getTime() - now) / (24 * 3600_000))
}
