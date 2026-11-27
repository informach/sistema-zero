/**
 * Monta o conteúdo do Passo a passo da Estação de Reciclagem (`caderno-conteudo.json` e
 * `caderno-metadados.json`) a partir da fonte editorial da missão (`qa/estacao-conteudo.ts`): uma
 * folha por etapa de cada aula, com a ideia, os passos, os encaixes que mudaram desde a etapa
 * anterior (desenhados dos próprios projetos da aula) e os testes. O caderno é um só, com as duas
 * aulas, e chega no fim da Aula 1 (2D), depois do envio.
 *
 *   bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/montar-caderno.ts
 *   bun docs/aulas-interativas-tecnico/recursos/estacao-reciclagem/gerar-caderno.ts
 *   python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py estacao-reciclagem --paginate
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { estacaoAjuda, estacaoAulas } from '../../qa/estacao-conteudo'
import { ESTACAO_ETAPAS, ESTACAO_REGRAS } from '../../qa/estacao-projeto'
import { formatarJson } from '../../qa/formatar-json'

const escapar = (t: string) =>
  t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const metadados = {
  course: 'estacao-de-reciclagem',
  resource: 'estacao-reciclagem',
  dimension: '2d',
  title: 'A Estação de Reciclagem',
  cover: 'capa-estacao-reciclagem.jpg',
  line1: 'Estação de',
  line2: 'Reciclagem',
  phrase: 'Um jeito de montar cada etapa da missão, em 2D e no galpão 3D.',
  promise: 'A missão do Construtor',
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

const folhas: Record<string, unknown>[] = []
const ids = (aula: number, key: string) => `aula-${aula}-${key}`
folhas.push({
  id: 'encontre',
  kicker: 'Seu passo a passo do projeto',
  title: 'Encontre seu passo',
  subtitle: 'Um jeito de montar a missão, para conferir o seu jogo e entender cada escolha.',
  items: [
    {
      kind: 'box',
      tone: 'azul',
      title: 'Use para conferir',
      text: 'Na missão, quem programa o jogo é você. Este caderno mostra um jeito de montar cada etapa, bloco por bloco. O seu jeito pode ser diferente e estar certo também, porque o Verificar projeto confere o que o jogo faz.',
    },
    ...estacaoAulas.map((a, i) => ({
      kind: 'index',
      title: `Aula ${i + 1}. ${a.title}`,
      text:
        a.dimension === '2d'
          ? `As peças descem pelas esteiras, o coletor recolhe as recicláveis e perde vida com as pilhas e lâmpadas, e a partida termina com vitória ou derrota. No fim, a meta muda para ${ESTACAO_REGRAS['2d'].metaNova}.`
          : `A mesma partida num galpão em três dimensões: as bocas soltam as peças, o coletor recolhe e perde vida, e a partida termina. No fim, a meta muda para ${ESTACAO_REGRAS['3d'].metaNova}.`,
      pages: `Páginas {{pagina:${ids(i + 1, 'abertura')}}} a {{ultima-pagina:${ids(i + 1, 'meta-nova')}}}`,
    })),
    {
      kind: 'note',
      text: 'As telas, o Enter, o coletor e o recomeço já vêm prontos. Você programa as regras da partida e testa cada uma.',
    },
  ],
})

for (const [i, aula] of estacaoAulas.entries()) {
  const d = aula.dimension
  const r = ESTACAO_REGRAS[d]
  const ajuda = estacaoAjuda(d)
  folhas.push({
    id: ids(i + 1, 'abertura'),
    lesson: aula.slug,
    part: 1,
    kicker: `Aula ${i + 1} · Parte 1`,
    title: aula.trechos[0]!.title,
    subtitle:
      d === '2d'
        ? 'Jogue a estação pronta antes de programar.'
        : 'A mesma partida, agora no galpão.',
    items: [
      {
        kind: 'box',
        tone: 'amarelo',
        title: 'Conheça o jogo pronto',
        text: `Clique no jogo e aperte Enter. As setas movem o coletor. As peças do aro verde são recicláveis e valem um ponto; as do aro vermelho são pilhas e lâmpadas e tiram uma vida. Junte ${r.meta} peças antes de perder as ${r.vidas} vidas.`,
      },
      { kind: 'step', number: 1, text: 'Clique no jogo e aperte Enter.' },
      {
        kind: 'step',
        number: 2,
        text: 'Segure uma seta para levar o coletor até uma esteira da borda, onde chegam as recicláveis. A esteira do meio traz as pilhas e lâmpadas.',
      },
      {
        kind: 'step',
        number: 3,
        text:
          d === '2d'
            ? 'No resultado, aperte Enter para voltar ao início.'
            : 'No resultado, clique em Voltar ao início.',
      },
    ],
  })
  for (const [n, etapa] of ESTACAO_ETAPAS.entries()) {
    if (n === 0) continue
    const trecho = aula.trechos.find((t) => t.etapa === etapa)!
    const h = ajuda[n - 1]!
    const anterior = ESTACAO_ETAPAS[n - 1]!
    const itens: Record<string, unknown>[] = [
      { kind: 'box', tone: 'azul', title: 'A ideia desta etapa', text: escapar(h.idea) },
      ...h.steps.map((s, k) => ({ kind: 'step', number: k + 1, text: escapar(s) })),
      // O resultado tem encaixes demais para uma folha: a derrota numa, a vitória (no senão) na outra.
      ...(etapa === 'resultado'
        ? [
            {
              kind: 'drawings',
              title: 'A derrota',
              before: `${d}:${anterior}`,
              after: `${d}:resultado-derrota`,
            },
            {
              kind: 'drawings',
              title: 'A vitória, no senão',
              before: `${d}:resultado-derrota`,
              after: `${d}:resultado`,
            },
          ]
        : [
            {
              kind: 'drawings',
              title: metadados.ui.drawingTitle,
              before: `${d}:${anterior}`,
              after: `${d}:${etapa}`,
            },
          ]),
      {
        kind: 'tests',
        title: metadados.ui.testsTitle,
        tests: [escapar(h.test), escapar(h.correction)],
      },
    ]
    if (etapa === 'meta-nova')
      itens.push({
        kind: 'delivery',
        title: 'Envie o seu projeto',
        text: 'Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.',
      })
    folhas.push({
      id: ids(i + 1, etapa),
      lesson: aula.slug,
      part: n + 1,
      kicker: `Aula ${i + 1} · Parte ${n + 1}`,
      title: trecho.title,
      subtitle: escapar(h.idea),
      items: itens,
    })
  }
}
folhas.push({
  id: 'missao-cumprida',
  kicker: 'Missão do Construtor',
  title: 'Missão cumprida',
  subtitle: 'A mesma partida em duas dimensões e no galpão em três.',
  items: [
    {
      kind: 'box',
      tone: 'verde',
      title: 'O que você programou',
      text: 'Os relógios que trazem as peças só durante a partida, os encontros do coletor, o placar, as vidas, os dois finais e a meta nova pedida pela equipe. As mesmas ideias da Nave Contra Asteroides e da Patrulha Espacial, num jogo novo.',
    },
    {
      kind: 'note',
      text: 'A missão conta quando as duas aulas estão concluídas. A jornada também confere os dois cursos da trilha e dois Poderes.',
    },
  ],
})

const aqui = import.meta.dir
writeFileSync(resolve(aqui, 'caderno-metadados.json'), formatarJson(metadados))
writeFileSync(resolve(aqui, 'caderno-conteudo.json'), formatarJson(folhas))
console.log(`caderno com ${folhas.length} folhas`)
