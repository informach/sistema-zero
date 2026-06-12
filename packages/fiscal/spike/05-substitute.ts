/**
 * Spike 05 — testa SUBSTITUIÇÃO: emite a nota A, depois emite a nota B com o
 * grupo subst apontando a chave de A (o sistema cancela A por substituição).
 * Usa números de DPS sequenciais a partir de NFSE_DPS_NUMERO+1.
 */
import { writeFileSync } from 'node:fs'
import { loadA1Certificate } from './lib/cert'
import { buildDpsXml } from './lib/dps'
import { baseUrls, dumpResponse, gzipBase64, mtlsFetch } from './lib/http'
import { signXml } from './lib/sign'

const cert = loadA1Certificate()
const { sefin, ambiente, tpAmb } = baseUrls()
if (ambiente === 'producao') throw new Error('Spike NÃO roda em produção.')

const base = Number(process.env['NFSE_DPS_NUMERO'] ?? 1)
const hoje = new Date().toISOString().slice(0, 10)

async function emit(numero: number, descricao: string, substituicao?: { chaveOriginal: string }) {
  const { xml, id } = buildDpsXml({
    numero,
    dCompet: hoje,
    valor: '37.00',
    descricao,
    tpAmb,
    ...(substituicao
      ? {
          substituicao: {
            ...substituicao,
            cMotivo: '99' as const,
            xMotivo: 'Correção de dados da nota (teste spike)',
          },
        }
      : {}),
  })
  const signed = signXml(xml, 'infDPS', cert)
  const res = await mtlsFetch(`${sefin}/nfse`, cert, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dpsXmlGZipB64: gzipBase64(signed) }),
  })
  const body = await dumpResponse(`POST /nfse (DPS ${id})`, res)
  const json = JSON.parse(body) as { chaveAcesso?: string }
  return json.chaveAcesso
}

const chaveA = await emit(base + 1, 'Nota A — será substituída (teste spike)')
if (!chaveA) throw new Error('Nota A não foi emitida')
console.log('\nNota A emitida:', chaveA)

const chaveB = await emit(base + 2, 'Nota B — substituta com dados corrigidos (teste spike)', {
  chaveOriginal: chaveA,
})
if (!chaveB) throw new Error('Nota B (substituta) não foi emitida')
console.log('\nNota B (substituta) emitida:', chaveB)
writeFileSync(
  `${import.meta.dir}/out/substituicao.json`,
  JSON.stringify({ chaveA, chaveB }, null, 2),
)
