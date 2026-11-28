/**
 * Monta o conteúdo do Passo a passo de um Poder do Construtor (`recursos/<poder>/caderno-conteudo.json`
 * e `caderno-metadados.json`) a partir da fonte editorial do Poder: a experiência, uma folha por
 * montagem de cada aula, com a ideia, os passos, os encaixes que mudaram desde a etapa anterior
 * (desenhados dos próprios projetos da aula) e os testes. O caderno é um só, com as duas aulas, e
 * fica na Parte 2 da Aula 1.
 *
 *   bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/montar-caderno.ts escudo
 *   bun docs/aulas-interativas-tecnico/recursos/construtor-poderes/gerar-caderno.ts escudo
 *   python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py escudo --paginate
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { formatarJson } from '../../qa/formatar-json'
import { montagens, PODERES_DO_CADERNO } from './poderes'

const poder = process.argv[2] ?? ''
const p = PODERES_DO_CADERNO[poder]
if (!p) throw Error(`Poder desconhecido: ${poder}`)

const escapar = (t: string) =>
  t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const metadados = {
  course: p.curso,
  resource: poder,
  dimension: '2d',
  title: p.titulo,
  cover: `capa-${poder}.jpg`,
  line1: p.linha1,
  line2: p.linha2,
  phrase: p.frase,
  promise: 'Um Poder do Construtor',
  ui: {
    drawingTitle: 'Confira os encaixes desta etapa',
    testsTitle: 'Teste e observe',
    continuation: 'continuação',
    earlierBlocks: 'Blocos anteriores',
    drawingContinuation: 'Confira os encaixes',
    galleryTitle: 'Escolha a aparência',
    pageLabel: 'Passo a passo do projeto',
  },
}

const aulas = p.aulas()
const id = (aula: number, key: string) => `aula-${aula}-${key}`
const folhas: Record<string, unknown>[] = [
  {
    id: 'encontre',
    kicker: 'Seu passo a passo do projeto',
    title: 'Encontre seu passo',
    subtitle: 'Cada montagem do Poder, bloco por bloco, para consultar quando precisar.',
    items: [
      {
        kind: 'box',
        tone: 'azul',
        title: 'Use quando precisar',
        text: 'Os vídeos montam cada parte com você. Este caderno guarda os mesmos passos: o caminho na paleta, o bloco, onde encaixar e como testar. Volte aqui sempre que esquecer um passo.',
      },
      ...aulas.map((a, i) => ({
        kind: 'index',
        title: `Aula ${i + 1}. ${a.title}`,
        text: p.resumo[a.dimension],
        pages: `Páginas {{pagina:${id(i + 1, 'abertura')}}} a {{ultima-pagina:${id(i + 1, montagens(a).at(-1)!.key)}}}`,
      })),
      {
        kind: 'note',
        text: 'O jogo da trilha já vem pronto, com as peças novas do Poder. Você programa a regra nova e testa cada parte.',
      },
    ],
  },
  {
    id: 'experiencia',
    kicker: 'Aula 1 · Parte 3',
    title: p.experiencia.title,
    subtitle: escapar(p.experiencia.idea),
    items: [
      {
        kind: 'box',
        tone: 'amarelo',
        title: 'O que investigar',
        text: p.experiencia.goals.map(escapar).join('<br>'),
      },
      { kind: 'note', text: escapar(p.experiencia.observe) },
    ],
  },
]

for (const [i, aula] of aulas.entries()) {
  const d = aula.dimension
  folhas.push({
    id: id(i + 1, 'abertura'),
    lesson: aula.slug,
    part: 1,
    kicker: `Aula ${i + 1} · Parte 1`,
    title: aula.trechos[0]!.title,
    subtitle:
      d === '2d'
        ? 'Jogue a versão pronta antes de programar.'
        : 'O mesmo Poder, agora em três dimensões.',
    items: [
      {
        kind: 'box',
        tone: 'amarelo',
        title: 'Conheça o jogo pronto',
        text: escapar(p.jogoPronto[d]),
      },
    ],
  })
  const lista = montagens(aula)
  for (const t of lista) {
    const n = aula.trechos.indexOf(t)
    const etapa = t.etapa!
    const anterior = p.etapas[p.etapas.indexOf(etapa) - 1]!
    const itens: Record<string, unknown>[] = [
      { kind: 'box', tone: 'azul', title: 'A ideia desta etapa', text: escapar(t.objective) },
      ...t.steps.map((s, k) => ({ kind: 'step', number: k + 1, text: escapar(s) })),
      ...(
        p.divisoes?.[`${d}:${etapa}`] ?? [{ titulo: metadados.ui.drawingTitle, depois: etapa }]
      ).map((desenho, k, lista) => ({
        kind: 'drawings',
        title: desenho.titulo,
        before: `${d}:${k ? lista[k - 1]!.depois : anterior}`,
        after: `${d}:${desenho.depois}`,
      })),
      { kind: 'tests', title: metadados.ui.testsTitle, tests: t.tests.map(escapar) },
    ]
    if (t.kind === 'delivery')
      itens.push({
        kind: 'delivery',
        title: 'Envie o seu projeto',
        text: 'Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.',
      })
    folhas.push({
      id: id(i + 1, t.key),
      lesson: aula.slug,
      part: n + 1,
      kicker: `Aula ${i + 1} · Parte ${n + 1}`,
      title: t.title,
      subtitle: escapar(t.objective),
      items: itens,
    })
  }
}
folhas.push({
  id: 'poder-pronto',
  kicker: 'Poder do Construtor',
  title: 'Poder pronto',
  subtitle: 'A mesma regra nova em duas dimensões e em três.',
  items: [
    { kind: 'box', tone: 'verde', title: 'O que você programou', text: escapar(p.programou) },
    {
      kind: 'note',
      text: 'O Poder conta quando as duas aulas estão concluídas. Para subir de posto, a jornada pede dois Poderes diferentes.',
    },
  ],
})

const pasta = resolve(import.meta.dir, '..', poder)
mkdirSync(pasta, { recursive: true })
writeFileSync(resolve(pasta, 'caderno-metadados.json'), formatarJson(metadados))
writeFileSync(resolve(pasta, 'caderno-conteudo.json'), formatarJson(folhas))
console.log(`${poder}: caderno com ${folhas.length} folhas`)
