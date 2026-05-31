import { readFileSync } from 'node:fs'
import * as forge from 'node-forge'

export interface EfiCertificate {
  /** Certificado(s) em PEM. */
  cert: string
  /** Chave privada em PEM. */
  key: string
}

/**
 * Carrega o certificado da Efí como PEM (cert + chave), aceitando:
 *  - arquivo `.p12`/`.pfx` (convertido em memória com node-forge), ou
 *  - PEM (arquivo já convertido), ou
 *  - o conteúdo em base64 (PaaS/Railway) de qualquer um dos dois.
 *
 * O PEM é usado no `tls` do `fetch` nativo do Bun para fazer o mTLS com a Efí —
 * o SDK oficial (baseado em `.p12`/pfx) não funciona sob o Bun.
 */
export function loadEfiCertificate(opts: { path?: string; base64?: string }): EfiCertificate {
  const buffer = readCertificateBytes(opts)
  const asText = buffer.toString('utf8')

  // Já é PEM? O Bun aceita o mesmo conteúdo PEM em `cert` e `key`.
  if (asText.includes('-----BEGIN')) {
    return { cert: asText, key: asText }
  }

  // Caso contrário, trata como P12/PFX (binário) e converte.
  return convertP12ToPem(buffer)
}

function readCertificateBytes(opts: { path?: string; base64?: string }): Buffer {
  const base64 = opts.base64?.trim()
  if (base64) return Buffer.from(base64, 'base64')

  const path = opts.path?.trim()
  if (path) return readFileSync(path)

  throw new Error('Certificado Efí ausente: defina EFI_CERTIFICATE_PATH ou EFI_CERTIFICATE_BASE64')
}

function convertP12ToPem(buffer: Buffer, password = ''): EfiCertificate {
  const der = forge.util.createBuffer(buffer.toString('binary'))
  const asn1 = forge.asn1.fromDer(der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password)

  const key = extractPrivateKeyPem(p12)
  const cert = extractCertificatesPem(p12)
  return { cert, key }
}

function extractPrivateKeyPem(p12: forge.pkcs12.Pkcs12Pfx): string {
  const shroudedOid = forge.pki.oids.pkcs8ShroudedKeyBag!
  const keyOid = forge.pki.oids.keyBag!
  const shrouded = p12.getBags({ bagType: shroudedOid })[shroudedOid] ?? []
  const plain = p12.getBags({ bagType: keyOid })[keyOid] ?? []
  const bag = shrouded[0] ?? plain[0]
  if (!bag?.key) throw new Error('Chave privada não encontrada no certificado P12')
  return forge.pki.privateKeyToPem(bag.key)
}

function extractCertificatesPem(p12: forge.pkcs12.Pkcs12Pfx): string {
  const certOid = forge.pki.oids.certBag!
  const bags = p12.getBags({ bagType: certOid })[certOid] ?? []
  const pems = bags
    .map((bag) => (bag.cert ? forge.pki.certificateToPem(bag.cert) : ''))
    .filter(Boolean)
  if (pems.length === 0) throw new Error('Certificado não encontrado no P12')
  return pems.join('')
}
