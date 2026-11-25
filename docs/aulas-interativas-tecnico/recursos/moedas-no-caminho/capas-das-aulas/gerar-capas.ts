/**
 * As capas das partes de Moedas no caminho (25/11/2026), no molde das capas de O Jardim Secreto: a
 * ilustração do curso em cima, o selo "AULA N DE 2", o título com a última palavra em amarelo e o
 * cartão com o que a parte pede e "SEÇÃO N DE M". A ilustração é o render da ilha 3D do curso
 * (caderno-visual/arte/capa-moedas-no-caminho.jpg), nos tons do mar dela, e as fontes são as do
 * Estúdio e do caderno. Só as partes com vídeo têm capa (o quiz do fim de cada aula não tem vídeo).
 *
 * Gera um HTML por capa em tmp/capas-moedas; `renderizar-capas.py` fotografa cada um em 1672 × 941 e
 * grava os PNG em docs/aulas-interativas/faisca/poder-moedas-no-caminho/capas-das-aulas.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FONTE as baloo } from '../../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'

const raiz = resolve(import.meta.dir, '../../../../..')
const arte = readFileSync(
  resolve(
    raiz,
    'docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-moedas-no-caminho.jpg',
  ),
).toString('base64')

/** As partes de cada aula (o título é o do manifesto) e, nas que têm vídeo, o que a parte pede. */
const AULAS: { secoes: number; partes: { parte: number; titulo: string; texto: string }[] }[] = [
  {
    secoes: 9,
    partes: [
      {
        parte: 1,
        titulo: 'Moedas no caminho do Farol',
        texto: 'Jogue o Farol pronto e tente abrir o baú.',
      },
      {
        parte: 2,
        titulo: 'O seu Passo a passo do projeto',
        texto: 'Conheça o caderno que guia o seu projeto.',
      },
      {
        parte: 3,
        titulo: 'O contador de moedas',
        texto: 'Descubra quando o número de moedas muda.',
      },
      { parte: 4, titulo: 'Crie o contador', texto: 'Crie a variável que guarda as moedas.' },
      {
        parte: 5,
        titulo: 'Cada moeda soma um',
        texto: 'Faça cada moeda que o personagem pega somar um.',
      },
      {
        parte: 6,
        titulo: 'Mostre as moedas na tela',
        texto: 'Mostre no placar quantas moedas o personagem tem.',
      },
      {
        parte: 7,
        titulo: 'O baú abre com pelo menos 5',
        texto: 'Ensine o baú a abrir com 5 moedas ou mais.',
      },
      { parte: 8, titulo: 'Os avisos do baú', texto: 'Faça o baú avisar e envie o projeto.' },
    ],
  },
  {
    secoes: 6,
    partes: [
      {
        parte: 1,
        titulo: 'As moedas chegaram à ilha',
        texto: 'Jogue a ilha 3D pronta e tente abrir o baú.',
      },
      {
        parte: 2,
        titulo: 'Conte as moedas da ilha',
        texto: 'Crie o contador e faça cada moeda somar um.',
      },
      {
        parte: 3,
        titulo: 'O número na tela da ilha',
        texto: 'Escreva na tela quantas moedas o personagem tem.',
      },
      {
        parte: 4,
        titulo: 'O baú da ilha abre com pelo menos 5',
        texto: 'Ensine o baú da ilha a abrir com 5 moedas ou mais.',
      },
      {
        parte: 5,
        titulo: 'Os avisos do baú da ilha',
        texto: 'Faça o baú da ilha avisar e envie o projeto.',
      },
    ],
  },
]

const bandeira =
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>'

const css = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64}) format('woff2');font-weight:400 800}
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo.base64}) format('woff2');font-weight:400 800}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1672px;height:941px;overflow:hidden;background:#1c3a80}
.capa{position:relative;width:1672px;height:941px;overflow:hidden;background:#1c3a80}
.arte{position:absolute;left:0;top:-330px;width:1672px;height:auto}
.fundo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(28,58,128,0) 0,rgba(28,58,128,0) 57%,rgba(31,64,140,.8) 67%,#1f418c 74%,#173170 100%)}
.selo{position:absolute;left:126px;top:600px;display:flex;align-items:center;gap:10px;height:52px;padding:0 26px 0 20px;border-radius:26px;background:#ffd84a;color:#173170;font:800 23px/1 Nunito,sans-serif;letter-spacing:.04em}
.titulo{position:absolute;left:126px;top:668px;width:700px;color:#fff;font:800 92px/.94 'Baloo 2',sans-serif;letter-spacing:-.01em;text-shadow:0 3px 0 rgba(0,0,0,.08)}
.titulo.longo{font-size:76px}
.titulo.muito-longo{font-size:64px}
.titulo b{color:#ffd84a;font-weight:800}
.cartao{position:absolute;left:856px;top:612px;width:682px;height:280px;border-radius:24px;background:rgba(15,34,80,.88);border:1px solid rgba(255,255,255,.08);padding:44px 44px 0 46px}
.cartao:before{content:'';position:absolute;left:0;top:44px;width:7px;height:108px;border-radius:0 5px 5px 0;background:#ffd84a}
.texto{color:#fff;font:800 35px/1.28 Nunito,sans-serif}
.secao{position:absolute;left:46px;bottom:52px;color:#fff;font:800 25px/1 Nunito,sans-serif;letter-spacing:.06em}`

const pasta = resolve(raiz, 'tmp/capas-moedas')
mkdirSync(pasta, { recursive: true })
const lista: { html: string; png: string }[] = []
for (const [a, aula] of AULAS.entries())
  for (const p of aula.partes) {
    const palavras = p.titulo.split(' ')
    const ultima = palavras.pop()
    const titulo = `${palavras.join(' ')} <b>${ultima}</b>`
    const tamanho = p.titulo.length > 30 ? ' muito-longo' : p.titulo.length > 24 ? ' longo' : ''
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="capa"><img class="arte" src="data:image/jpeg;base64,${arte}"><div class="fundo"></div><div class="selo">${bandeira}AULA ${a + 1} DE 2</div><div class="titulo${tamanho}">${titulo}</div><div class="cartao"><p class="texto">${p.texto}</p><p class="secao">SEÇÃO ${p.parte} DE ${aula.secoes}</p></div></div></body></html>`
    const nome = `aula-${String(a + 1).padStart(2, '0')}-parte-${String(p.parte).padStart(2, '0')}`
    writeFileSync(resolve(pasta, `${nome}.html`), html)
    lista.push({ html: resolve(pasta, `${nome}.html`), png: `${nome}.png` })
  }
writeFileSync(resolve(pasta, 'lista.json'), JSON.stringify(lista, null, 1))
console.log(`${lista.length} capas preparadas em tmp/capas-moedas`)
