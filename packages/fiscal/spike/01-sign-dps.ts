/**
 * Spike 01 — monta e ASSINA uma DPS de exemplo, salva em spike/out/.
 * Funciona com o certificado de teste (bun spike/lib/make-test-cert.ts) —
 * valida o pipeline node-forge + xml-crypto sob Bun sem o A1 real.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadA1Certificate } from './lib/cert'
import { buildDpsXml } from './lib/dps'
import { signXml } from './lib/sign'

const cert = loadA1Certificate()
console.log('Assinando com:', cert.info.subject)

const numero = Number(process.env['NFSE_DPS_NUMERO'] ?? 1)
const { xml, id } = buildDpsXml({
  numero,
  dCompet: process.env['NFSE_DCOMPET'] ?? new Date().toISOString().slice(0, 10),
  tomador: {
    cpf: process.env['NFSE_TOMADOR_CPF'] ?? '52998224725', // CPF de teste válido (mesmo dos testes do payments)
    nome: process.env['NFSE_TOMADOR_NOME'] ?? 'Comprador de Teste do Spike',
  },
  valor: process.env['NFSE_VALOR'] ?? '37.00',
  descricao:
    process.env['NFSE_DESCRICAO'] ??
    'Pack Do Zero ao Herói - curso online (TESTE produção restrita)',
  tpAmb: '2',
})

const signed = signXml(xml, 'infDPS', cert)
mkdirSync(`${import.meta.dir}/out`, { recursive: true })
writeFileSync(`${import.meta.dir}/out/dps-signed.xml`, signed)
console.log('Id da DPS:', id)
console.log(`OK → spike/out/dps-signed.xml (${signed.length} bytes)`)
console.log(
  '\nValide contra o XSD (se tiver xmllint): xmllint --noout --schema docs/xsd/Schemas/1.01/DPS_v1.01.xsd out/dps-signed.xml',
)
