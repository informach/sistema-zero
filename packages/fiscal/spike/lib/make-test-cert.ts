/**
 * Gera um certificado AUTOASSINADO de teste (spike/secrets/test-cert.pfx) para
 * validar o pipeline de carga do PFX + assinatura XML SEM o A1 real.
 * ⚠️ A Sefin (mTLS) REJEITA este certificado — serve só p/ os scripts 01 e
 * para testes locais de assinatura.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import * as forge from 'node-forge'

const keys = forge.pki.rsa.generateKeyPair(2048)
const cert = forge.pki.createCertificate()
cert.publicKey = keys.publicKey
cert.serialNumber = '01'
cert.validity.notBefore = new Date()
cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000)
const attrs = [
  { name: 'commonName', value: 'INFORMACH TESTE:43588758000103' },
  { name: 'countryName', value: 'BR' },
  { name: 'organizationName', value: 'Teste Spike Fiscal' },
]
cert.setSubject(attrs)
cert.setIssuer(attrs)
cert.sign(keys.privateKey, forge.md.sha256.create())

const password = 'spike-teste'
const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: '3des' })
const der = forge.asn1.toDer(p12).getBytes()

mkdirSync(`${import.meta.dir}/../secrets`, { recursive: true })
const path = `${import.meta.dir}/../secrets/test-cert.pfx`
writeFileSync(path, Buffer.from(der, 'binary'))
console.log(`Certificado de teste gerado: ${path} (senha: ${password})`)
console.log(
  'Use: NFSE_CERT_PFX_PATH=spike/secrets/test-cert.pfx NFSE_CERT_PASSWORD=spike-teste bun spike/01-sign-dps.ts',
)
