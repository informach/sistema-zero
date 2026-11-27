/**
 * As capas das partes de A Estação de Reciclagem, no molde das capas do Jardim Secreto (a missão do
 * Faísca): a ilustração do galpão em cima (`caderno-visual/arte/capa-estacao-reciclagem.jpg`), o
 * selo "AULA N DE 2", o título com a última palavra em amarelo e o cartão com o que a parte pede e
 * "SEÇÃO N DE 6". Gera o HTML de cada capa e fotografa no Chromium do Playwright, em 1672 × 941,
 * recusando texto fora do lugar.
 *
 *   bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/capas-das-aulas/gerar-capas.ts
 *
 * Os PNG vão para docs/aulas-interativas/construtor/estacao-de-reciclagem/capas-das-aulas.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { FONTE as baloo } from '../../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'
import { estacaoAulas } from '../../../qa/estacao-conteudo'
import { ESTACAO_REGRAS } from '../../../qa/estacao-projeto'

const raiz = resolve(import.meta.dir, '../../../../..')
const arte = readFileSync(
  resolve(
    raiz,
    'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-estacao-reciclagem.jpg',
  ),
).toString('base64')

/** Uma frase curta por parte: o que a parte pede (a mesma ordem das aulas). */
const TEXTOS: Record<string, string[]> = {
  'aula-1': [
    'Jogue a estação pronta e conheça a sua missão.',
    'Os relógios trazem as peças só durante a partida.',
    'Reciclável vale um ponto; pilha e lâmpada tiram vida.',
    'Sem vidas, derrota. Na meta, vitória.',
    `A equipe pediu meta ${ESTACAO_REGRAS['2d'].metaNova}. A vitória acompanha?`,
    'A estação 2D funciona. Confira o Passo a passo.',
  ],
  'aula-2': [
    'A mesma partida, agora num galpão em 3D.',
    'As bocas do fundo soltam as peças pelo relógio.',
    'Os encontros do coletor no galpão, só na partida.',
    'Vida zero termina em derrota; a meta, em vitória.',
    `Meta ${ESTACAO_REGRAS['3d'].metaNova} no galpão. Envie o seu projeto.`,
    'A estação funciona em 2D e em 3D.',
  ],
}
const bandeira =
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>'

const css = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1672px;height:941px;overflow:hidden;background:#102a4a}
.capa{position:relative;width:1672px;height:941px;overflow:hidden;background:#102a4a}
.arte{position:absolute;left:0;top:-330px;width:1672px;height:auto}
.fundo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,42,74,0) 0,rgba(16,42,74,0) 55%,rgba(18,60,108,.8) 66%,#14406f 74%,#0f2a4d 100%)}
.selo{position:absolute;left:126px;top:600px;display:flex;align-items:center;gap:10px;height:52px;padding:0 26px 0 20px;border-radius:26px;background:#ffd84a;color:#14406f;font:800 23px/1 Nunito,sans-serif;letter-spacing:.04em}
.titulo{position:absolute;left:126px;top:668px;width:700px;color:#fff;font:800 92px/.94 'Baloo 2',sans-serif;letter-spacing:-.01em;text-shadow:0 3px 0 rgba(0,0,0,.08)}
.titulo.longo{font-size:76px}
.titulo b{color:#ffd84a;font-weight:800}
.cartao{position:absolute;left:856px;top:612px;width:682px;height:280px;border-radius:24px;background:rgba(10,30,58,.9);border:1px solid rgba(255,255,255,.08);padding:44px 44px 0 46px}
.cartao:before{content:'';position:absolute;left:0;top:44px;width:7px;height:108px;border-radius:0 5px 5px 0;background:#ffd84a}
.texto{color:#fff;font:800 35px/1.28 Nunito,sans-serif}
.secao{position:absolute;left:46px;bottom:52px;color:#fff;font:800 25px/1 Nunito,sans-serif;letter-spacing:.06em}`

const pasta = resolve(raiz, 'tmp/capas-estacao')
const saida = resolve(
  raiz,
  'docs/aulas-interativas/construtor/estacao-de-reciclagem/capas-das-aulas',
)
mkdirSync(pasta, { recursive: true })
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1672, height: 941 } })
let total = 0
for (const [a, aula] of estacaoAulas.entries()) {
  const textos = TEXTOS[aula.slug]!
  if (textos.length !== aula.trechos.length) throw new Error(`${aula.slug}: uma frase por parte`)
  for (const [i, t] of aula.trechos.entries()) {
    const palavras = t.title.split(' ')
    const ultima = palavras.pop()
    const titulo = `${palavras.join(' ')} <b>${ultima}</b>`
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="capa"><img class="arte" src="data:image/jpeg;base64,${arte}"><div class="fundo"></div><div class="selo">${bandeira}AULA ${a + 1} DE 2</div><div class="titulo${t.title.length > 24 ? ' longo' : ''}">${titulo}</div><div class="cartao"><p class="texto">${textos[i]}</p><p class="secao">SEÇÃO ${i + 1} DE ${aula.trechos.length}</p></div></div></body></html>`
    const nome = `aula-${String(a + 1).padStart(2, '0')}-parte-${String(i + 1).padStart(2, '0')}`
    writeFileSync(resolve(pasta, `${nome}.html`), html)
    await pagina.goto(pathToFileURL(resolve(pasta, `${nome}.html`)).href, { waitUntil: 'load' })
    await pagina.evaluate(() => document.fonts.ready)
    const fora = await pagina.evaluate(() =>
      [...document.querySelectorAll('.titulo,.texto,.secao,.selo')]
        .filter((e) => {
          const b = e.getBoundingClientRect()
          return (
            b.right > 1672 ||
            b.bottom > 941 ||
            (e.classList.contains('titulo') && b.bottom > 930) ||
            (e.classList.contains('texto') && b.bottom > 812)
          )
        })
        .map((e) => e.className),
    )
    if (fora.length) throw new Error(`${nome}: fora do lugar ${fora.join(', ')}`)
    await pagina.screenshot({ path: resolve(saida, `${nome}.png`) })
    total++
  }
}
await navegador.close()
console.log(`${total} capas em ${saida}`)
