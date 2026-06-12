/**
 * Spike 02 — emite a DPS na Produção Restrita (POST /nfse) e captura o shape
 * exato da resposta (chave de acesso, XML da NFS-e). EXIGE o A1 real.
 * A resposta crua é impressa e salva — é assim que aprendemos os nomes exatos
 * dos campos JSON (a doc não os publica e o swagger bloqueia curl).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { loadA1Certificate } from './lib/cert'
import { buildDpsXml } from './lib/dps'
import { baseUrls, dumpResponse, gunzipBase64, gzipBase64, mtlsFetch } from './lib/http'
import { dpsId, EMITTER } from './lib/profile'
import { signXml } from './lib/sign'

const cert = loadA1Certificate()
const { sefin, ambiente, tpAmb } = baseUrls()
if (ambiente === 'producao')
  throw new Error('Spike NÃO roda em produção. Remova NFSE_AMBIENTE=producao.')

const numero = Number(process.env['NFSE_DPS_NUMERO'] ?? 1)
const { xml, id } = buildDpsXml({
  numero,
  dCompet: process.env['NFSE_DCOMPET'] ?? new Date().toISOString().slice(0, 10),
  // Sem NFSE_TOMADOR_CPF → nota sem tomador (a Produção Restrita valida CPF no
  // cadastro real da Receita — E0207 p/ CPF inexistente).
  tomador: process.env['NFSE_TOMADOR_CPF']
    ? {
        cpf: process.env['NFSE_TOMADOR_CPF'],
        nome: process.env['NFSE_TOMADOR_NOME'] ?? 'Comprador de Teste do Spike',
      }
    : undefined,
  valor: process.env['NFSE_VALOR'] ?? '37.00',
  descricao:
    process.env['NFSE_DESCRICAO'] ??
    'Pack Do Zero ao Herói - curso online (TESTE produção restrita)',
  tpAmb,
})
const signed = signXml(xml, 'infDPS', cert)
mkdirSync(`${import.meta.dir}/out`, { recursive: true })
writeFileSync(`${import.meta.dir}/out/dps-signed.xml`, signed)

console.log('Emitindo DPS', id, 'em', sefin)
const res = await mtlsFetch(`${sefin}/nfse`, cert, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ dpsXmlGZipB64: gzipBase64(signed) }),
})
const body = await dumpResponse('POST /nfse', res)
writeFileSync(`${import.meta.dir}/out/emit-response.json`, body)

// Tenta extrair chave + XML da NFS-e dos nomes de campo mais prováveis.
try {
  const json = JSON.parse(body) as Record<string, unknown>
  const chave = (json['chaveAcesso'] ?? json['chave'] ?? json['idDps']) as string | undefined
  const nfseB64 = (json['nfseXmlGZipB64'] ?? json['xmlGZipB64']) as string | undefined
  if (chave) {
    writeFileSync(`${import.meta.dir}/out/chave-acesso.txt`, chave)
    console.log('\nChave de acesso salva em out/chave-acesso.txt:', chave)
  }
  if (nfseB64) {
    writeFileSync(`${import.meta.dir}/out/nfse.xml`, gunzipBase64(nfseB64))
    console.log('XML da NFS-e salvo em out/nfse.xml')
  }
} catch {
  console.log(
    '\n(Resposta não-JSON ou campos com outros nomes — ver out/emit-response.json e ajustar)',
  )
}

// Consulta de recuperação por Id da DPS (prova o caminho da resposta ambígua).
const lookup = await mtlsFetch(`${sefin}/dps/${dpsId(EMITTER.serie, numero)}`, cert)
await dumpResponse('GET /dps/{id}', lookup)
