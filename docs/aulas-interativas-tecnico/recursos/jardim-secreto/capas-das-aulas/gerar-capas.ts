/**
 * As capas das partes de O Jardim Secreto (24/11/2026), no molde das capas de A Ilha do Farol: a
 * ilustração do curso em cima, o selo "AULA N DE 2", o título com a última palavra em amarelo e o
 * cartão com o que a parte pede e "SEÇÃO N DE 5". A ilustração é o render do jardim 3D
 * (caderno-visual/arte/capa-o-jardim-secreto.jpg), e as fontes são as do Estúdio e do caderno.
 *
 * Gera um HTML por capa em tmp/capas-jardim; `renderizar-capas.py` fotografa cada um em 1672 × 941 e
 * grava os PNG em docs/aulas-interativas/faisca/o-jardim-secreto/capas-das-aulas.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FONTE as baloo } from '../../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'

const raiz = resolve(import.meta.dir, '../../../../..')
const arte = readFileSync(
  resolve(
    raiz,
    'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-o-jardim-secreto.jpg',
  ),
).toString('base64')

/** O que cada parte pede, numa frase curta (o cartão da direita). */
const PARTES: { aula: 1 | 2; titulo: string; texto: string }[][] = [
  [
    {
      aula: 1,
      titulo: 'Conheça sua missão',
      texto: 'Jogue o jardim pronto e descubra o que a missão pede.',
    },
    { aula: 1, titulo: 'Ande pelo jardim', texto: 'Faça o personagem andar sem sair do jardim.' },
    {
      aula: 1,
      titulo: 'A flor só abre com o regador',
      texto: 'Programe o regador e a flor que só abre com ele.',
    },
    {
      aula: 1,
      titulo: 'Um lugar novo para o regador',
      texto: 'Escolha outro lugar para o regador e envie o projeto.',
    },
    {
      aula: 1,
      titulo: 'Seu jardim 2D está pronto',
      texto: 'Confira cada etapa no Passo a passo do projeto.',
    },
  ],
  [
    {
      aula: 2,
      titulo: 'O mesmo desafio, com profundidade',
      texto: 'Jogue o jardim em três dimensões e veja o desafio.',
    },
    {
      aula: 2,
      titulo: 'Ande e recolha o regador',
      texto: 'Faça o personagem andar no chão e recolher o regador.',
    },
    {
      aula: 2,
      titulo: 'A flor abre uma vez só',
      texto: 'Faça a flor florescer com o regador, uma vez só.',
    },
    {
      aula: 2,
      titulo: 'Um lugar novo no chão',
      texto: 'Escolha um lugar novo no chão e envie o projeto.',
    },
    {
      aula: 2,
      titulo: 'Missão cumprida!',
      texto: 'Você programou O Jardim Secreto em 2D e em 3D.',
    },
  ],
]

const bandeira =
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>'

const css = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1672px;height:941px;overflow:hidden;background:#14532d}
.capa{position:relative;width:1672px;height:941px;overflow:hidden;background:#14532d}
.arte{position:absolute;left:0;top:-165px;width:1672px;height:auto}
.fundo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,83,45,0) 0,rgba(20,83,45,0) 57%,rgba(23,96,52,.78) 67%,#17603a 74%,#124a2b 100%)}
.selo{position:absolute;left:126px;top:600px;display:flex;align-items:center;gap:10px;height:52px;padding:0 26px 0 20px;border-radius:26px;background:#ffd84a;color:#134e2a;font:800 23px/1 Nunito,sans-serif;letter-spacing:.04em}
.titulo{position:absolute;left:126px;top:668px;width:700px;color:#fff;font:800 92px/.94 'Baloo 2',sans-serif;letter-spacing:-.01em;text-shadow:0 3px 0 rgba(0,0,0,.08)}
.titulo.longo{font-size:76px}
.titulo b{color:#ffd84a;font-weight:800}
.cartao{position:absolute;left:856px;top:612px;width:682px;height:280px;border-radius:24px;background:rgba(12,52,30,.88);border:1px solid rgba(255,255,255,.08);padding:44px 44px 0 46px}
.cartao:before{content:'';position:absolute;left:0;top:44px;width:7px;height:108px;border-radius:0 5px 5px 0;background:#ffd84a}
.texto{color:#fff;font:800 35px/1.28 Nunito,sans-serif}
.secao{position:absolute;left:46px;bottom:52px;color:#fff;font:800 25px/1 Nunito,sans-serif;letter-spacing:.06em}`

const pasta = resolve(raiz, 'tmp/capas-jardim')
mkdirSync(pasta, { recursive: true })
const lista: { html: string; png: string }[] = []
for (const [a, partes] of PARTES.entries())
  for (const [i, p] of partes.entries()) {
    const palavras = p.titulo.split(' ')
    const ultima = palavras.pop()
    const titulo = `${palavras.join(' ')} <b>${ultima}</b>`
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="capa"><img class="arte" src="data:image/jpeg;base64,${arte}"><div class="fundo"></div><div class="selo">${bandeira}AULA ${p.aula} DE 2</div><div class="titulo${p.titulo.length > 24 ? ' longo' : ''}">${titulo}</div><div class="cartao"><p class="texto">${p.texto}</p><p class="secao">SEÇÃO ${i + 1} DE ${partes.length}</p></div></div></body></html>`
    const nome = `aula-${String(a + 1).padStart(2, '0')}-parte-${String(i + 1).padStart(2, '0')}`
    writeFileSync(resolve(pasta, `${nome}.html`), html)
    lista.push({ html: resolve(pasta, `${nome}.html`), png: `${nome}.png` })
  }
writeFileSync(resolve(pasta, 'lista.json'), JSON.stringify(lista, null, 1))
console.log(`${lista.length} capas preparadas em tmp/capas-jardim`)
