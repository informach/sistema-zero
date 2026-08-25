/**
 * spike:06 — DANFSe LOCAL lado a lado com o OFICIAL do governo.
 *
 * Renderiza `spike/out/danfse-local.pdf` a partir do XML REAL autorizado na
 * Produção Restrita (`spike/out/nfse.xml`, gerado pelo spike:02) para comparação
 * visual com `spike/out/danfse.pdf` (baixado do gerador do governo pela MESMA
 * chave, antes da API ser desligada — NT 008/2026). Também gera a variante
 * carimbada `danfse-local-cancelada.pdf` (a nota do spike foi cancelada no 03).
 *
 * Uso: `bun run spike:06` (de dentro de packages/fiscal; não precisa de cert).
 */
import { existsSync } from 'node:fs'
import { type EmitterProfile, INFORMACH_BASE } from '../src/domain/dps/emitter-profile'
import type { Invoice } from '../src/domain/ports/invoice-repository.port'
import { LocalDanfseRenderer } from '../src/infrastructure/danfse/danfse-renderer'
import { applyStatusStamp } from '../src/infrastructure/danfse/status-stamp'

const XML_PATH = 'spike/out/nfse.xml'
const KEY_PATH = 'spike/out/chave-acesso.txt'
if (!existsSync(XML_PATH)) {
  console.error(`✗ ${XML_PATH} não existe — rode o spike:02 antes (ou traga o out/ desta máquina)`)
  process.exit(1)
}

const nfseXml = await Bun.file(XML_PATH).text()
const accessKey = (await Bun.file(KEY_PATH).text()).trim()

const profile: EmitterProfile = {
  ...INFORMACH_BASE,
  tpAmb: '2',
  im: '13372670018',
  serie: '2',
  cTribMun: '001',
  pTotTribSN: '8.24',
}

// Só os campos que o renderer/fallback leem — o resto é irrelevante aqui.
const invoice = {
  id: 'spike-06',
  status: 'EMITTED',
  customer: { name: 'Spike', email: 'spike@example.com', document: '' },
  amountInCents: 3700n,
  serviceDescription: 'Pack Do Zero ao Herói - curso online (TESTE produção restrita)',
  dpsSeries: '2',
  dpsNumber: 1n,
  ambiente: 'producao-restrita',
} as unknown as Invoice

const renderer = new LocalDanfseRenderer(profile)
const pdf = await renderer.render({
  invoice,
  accessKey,
  nfseXml,
  competenceDate: '2026-06-12',
  emittedAt: new Date('2026-06-12T15:42:48Z'),
})
await Bun.write('spike/out/danfse-local.pdf', pdf)
console.log(`✓ spike/out/danfse-local.pdf (${pdf.length} bytes)`)

const cancelled = await applyStatusStamp(pdf, 'CANCELADA')
await Bun.write('spike/out/danfse-local-cancelada.pdf', cancelled)
console.log(`✓ spike/out/danfse-local-cancelada.pdf (${cancelled.length} bytes)`)
console.log('→ compare com spike/out/danfse.pdf (o oficial do governo, mesma chave)')
