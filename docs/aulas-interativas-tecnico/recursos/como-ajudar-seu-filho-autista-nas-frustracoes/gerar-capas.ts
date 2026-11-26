/** Capas no modelo HTML dos cursos Kids; a arte original é preservada. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FONTE as baloo } from '../../../../packages/studio/src/official-extensions/gameUiFonts/baloo2'
import { FONTE as nunito } from '../../../../packages/studio/src/official-extensions/gameUiFonts/nunito'

const root = resolve(import.meta.dir, '../../../..')
const slug = 'como-ajudar-seu-filho-autista-nas-frustracoes'
const folder = resolve(root, 'docs/aulas-interativas/pais', slug)
const temporary = resolve(root, 'tmp/capas-frustracoes')
mkdirSync(temporary, { recursive: true })
const art = `data:image/png;base64,${readFileSync(resolve(folder, 'arte-base.png')).toString('base64')}`
const htmlEscape = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const css = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${nunito.base64});font-weight:400 800}
@font-face{font-family:Baloo;src:url(data:font/woff2;base64,${baloo.base64});font-weight:400 800}
*{box-sizing:border-box;margin:0}html,body,.capa{width:1672px;height:941px;overflow:hidden;background:#fbf1e8}.capa{position:relative}
.arte{position:absolute;inset:0;width:1672px;height:941px;object-fit:cover}
.fundo{position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,transparent 49%,rgba(69,39,94,.55) 61%,#45275e 70%,#2d1b44 100%)}
.selo{position:absolute;left:92px;top:591px;display:flex;align-items:center;height:52px;padding:0 25px;border-radius:26px;background:#ffdb78;color:#38204e;font:800 23px Nunito;letter-spacing:.05em}
.titulo{position:absolute;left:92px;top:663px;width:730px;color:white;font:800 82px/.99 Baloo}.titulo.longo{font-size:66px}.titulo.muito-longo{font-size:57px}.titulo b{color:#ffdb78}
.cartao{position:absolute;left:862px;top:610px;width:714px;height:282px;padding:38px 43px;background:rgba(38,22,58,.86);border-radius:24px;border:1px solid #ffffff22}
.cartao:before{content:'';position:absolute;left:0;top:40px;width:7px;height:110px;background:#ffdb78;border-radius:0 5px 5px 0}
.texto{font:800 33px/1.27 Nunito;color:white}.secao{position:absolute;bottom:37px;left:43px;font:800 23px Nunito;letter-spacing:.06em;color:#f1ddff}

`
const list: { html: string; png: string; output: string }[] = []
function save(name: string, body: string, output: string) {
  const html = resolve(temporary, `${name}.html`)
  writeFileSync(
    html,
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>${css}</style><body>${body}</body></html>`,
  )
  list.push({ html, png: `${name}.png`, output })
}
const summaries = [
  [
    'Conheça a Vivi e o caminho das cinco aulas.',
    'Observe o que pode estar difícil para seu filho.',
  ],
  [
    'Conheça fatores que podem se combinar na frustração.',
    'Observe o contexto antes de interpretar a crise.',
  ],
  [
    'Prepare a criança para o que vai acontecer.',
    'Pratique pequenas esperas em momentos tranquilos.',
    'Amplie os recursos para a criança pedir ajuda.',
  ],
  ['Reduza a sobrecarga e cuide da segurança.', 'Ofereça presença, tempo e poucas palavras.'],
  [
    'Acolha o sentimento e retome o que está aprendendo.',
    'Observe padrões e ajuste os apoios com a equipe.',
    'Leve os cuidados de antes, durante e depois.',
  ],
]
for (let a = 1; a <= 5; a++) {
  const doc = JSON.parse(
    readFileSync(resolve(folder, `${slug}-aula-${a}.manifesto.json`), 'utf8'),
  ) as {
    sections: { title: string; blockKeys: string[] }[]
    blocks: { key: string; plannedVideo?: string }[]
  }
  for (const [p, section] of doc.sections.entries()) {
    if (
      !section.blockKeys.some((key: string) => doc.blocks.find((b) => b.key === key)?.plannedVideo)
    )
      continue
    const words = section.title.split(' ')
    const last = words.pop()
    const title = `${htmlEscape(words.join(' '))} <b>${htmlEscape(last ?? '')}</b>`
    const size =
      section.title.length > 37 ? ' muito-longo' : section.title.length > 27 ? ' longo' : ''
    const name = `aula-${String(a).padStart(2, '0')}-parte-${String(p + 1).padStart(2, '0')}`
    save(
      name,
      `<div class="capa"><img class="arte" src="${art}"><div class="fundo"></div><div class="selo">AULA ${a} DE 5</div><h1 class="titulo${size}">${title}</h1><div class="cartao"><p class="texto">${summaries[a - 1][p]}</p><p class="secao">SEÇÃO ${p + 1} DE ${doc.sections.length}</p></div></div>`,
      resolve(folder, 'capas-das-aulas', `${name}.png`),
    )
  }
}
writeFileSync(resolve(temporary, 'lista.json'), JSON.stringify(list, null, 2))
console.log(`${list.length} capas preparadas em ${temporary}`)
