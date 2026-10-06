import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateLearning,
  gradeLearningQuiz,
  isLearningManifest,
} from '../../../packages/core/src/learning'
import {
  initialExperiment,
  packExperiment,
  type SceneAction,
  sceneStart,
  stepExperiment,
} from '../../../packages/core/src/learning/scene'
import { conteudoBloco, problemasPedagogicos, temEntregaExterna } from './diretrizes-pedagogicas'
import { aulasMeuJeito, falasSecao, gerarManifestoMeuJeito, telaSecao } from './gerar-meu-jeito'
import { etapasMeuJeito, projetoMeuJeito } from './meu-jeito-etapas'
import { courseProjects } from './meu-jeito-projetos-qa'

const manifests = aulasMeuJeito.map((lesson) => {
  const m = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, `../aulas/meu-jeito-${lesson.slug}.manifesto.json`),
      'utf8',
    ),
  )
  if (!isLearningManifest(m)) throw new Error(`Manifesto inválido: ${lesson.slug}`)
  return m
})
for (const [index, manifest] of manifests.entries())
  test(`${manifest.lessonSlug}: geração, pedagogia e entrega externa`, () => {
    expect(gerarManifestoMeuJeito(aulasMeuJeito[index]!)).toEqual(manifest)
    expect(problemasPedagogicos(manifest, true)).toEqual([])
    const delivery = conteudoBloco(manifest.blocks.find((b) => b.key === 'entrega-galeria-v6'))
    if (delivery?.kind !== 'pinta' && delivery?.kind !== 'studio')
      throw new Error('Galeria ausente')
    expect(delivery.kind).toBe(index >= 1 && index <= 4 ? 'pinta' : 'studio')
    expect(delivery.gallery).toEqual({
      minItems: index === 4 ? 2 : 1,
      maxItems: index === 4 ? 2 : 1,
    })
    expect(manifest.sections.at(-1)?.completion?.blockIds).toContain('entrega-galeria-v6')
    expect(manifest.sections.every((s) => !s.workspaceKey)).toBe(true)
    const script = readFileSync(
      resolve(import.meta.dir, `../aulas/meu-jeito-${manifest.lessonSlug}.roteiro.md`),
      'utf8',
    )
    for (const [i, section] of manifest.sections.entries()) {
      expect(script).toContain(aulasMeuJeito[index]!.sections[i]!.bridge)
      if (section.externalTool) {
        expect(temEntregaExterna(manifest, i)).toBe(true)
        expect(section.completion?.platformAction).toBeUndefined()
        expect(section.completion?.projectChecks).toBeUndefined()
        expect(falasSecao(aulasMeuJeito[index]!.sections[i]!).join(' ')).toMatch(/confira|compare/i)
      }
    }
    // As aplicações externas não usam a verificação da fase (antes Verificar esta etapa).
    expect(script).not.toMatch(
      /Dia 5|Desafio do Primeiro Jogo|Verificar esta (?:etapa|parte)|Meu jogo novo/,
    )
    if (index === 7) {
      expect(script).toContain('Publicado!') // A ferramenta externa usa sua própria confirmação.
      expect(script).toContain('Abrir o jogo')
      expect(script).not.toContain('Seu jogo está no Mural!') // Celebração do Estúdio embutido.
    }
  })

test('a entrega precisa ser obrigatória, posterior e da mesma ferramenta', () => {
  const original = manifests[1]!
  const external = original.sections.findIndex((s) => s.externalTool)
  for (const change of ['omit', 'optional', 'wrong-tool', 'earlier'] as const) {
    const m = structuredClone(original)
    const last = m.sections.at(-1)!
    if (change === 'omit') m.blocks = m.blocks.filter((b) => b.key !== 'entrega-galeria-v6')
    if (change === 'optional')
      last.completion!.blockIds = last.completion!.blockIds.filter(
        (key) => key !== 'entrega-galeria-v6',
      )
    if (change === 'wrong-tool') {
      const block = m.blocks.find((b) => b.key === 'entrega-galeria-v6')!
      if (!('content' in block)) throw new Error('Entrega ausente')
      block.content = structuredClone(
        conteudoBloco(manifests[0]!.blocks.find((b) => b.key === block.key))!,
      )
    }
    if (change === 'earlier') m.sections.unshift(m.sections.pop()!)
    expect(temEntregaExterna(m, external + (change === 'earlier' ? 1 : 0)), change).toBe(false)
    expect(
      problemasPedagogicos(m).some((p) => p.includes('galeria da mesma ferramenta')),
      change,
    ).toBe(true)
  }
})

test('os marcos de código preservam a referência e o jogo de abertura tem as folhas corretas', () => {
  const stages = etapasMeuJeito(),
    original = courseProjects()
  for (let n = 1; n <= 8; n++) expect(stages[n]).toEqual(original[n < 6 ? 1 : n])
  const first = manifests[0]!
  const play = conteudoBloco(first.blocks.find((b) => b.key === 'jogo-pronto'))
  if (play?.kind !== 'interactive' || play.activity.type !== 'project-play')
    throw new Error('Abertura ausente')
  expect(play.activity.project).toEqual(projetoMeuJeito(8))
  expect(play.activity.completion).toBe('participation')
  expect(projetoMeuJeito(8).assets.map((a) => a.sprite)).toEqual([
    {
      frameW: 32,
      frameH: 32,
      animations: [{ name: 'voando', from: 0, to: 1, fps: 8, loop: true }],
    },
    {
      frameW: 64,
      frameH: 64,
      animations: [{ name: 'girando', from: 0, to: 1, fps: 8, loop: true }],
    },
  ])
  expect(first.sections[1]!.blockKeys).toContain('materiais-caderno')
  expect(first.sections[1]!.completion?.blockIds).not.toContain('materiais-caderno')
  expect(
    manifests.flatMap((m) => m.blocks).filter((b) => conteudoBloco(b)?.kind === 'materials'),
  ).toHaveLength(1)
})

test('quatro quizzes isolados corrigem cada alternativa errada com explicação', () => {
  const lessons: number[] = []
  for (const [i, m] of manifests.entries())
    for (const b of m.blocks) {
      const q = conteudoBloco(b)
      if (q?.kind !== 'quiz') continue
      lessons.push(i + 1)
      expect(m.sections.find((s) => s.blockKeys.includes(b.key))?.blockKeys).toHaveLength(2)
      const answers = Object.fromEntries(
        q.questions.map((question) => [question.id, question.correctChoiceIds]),
      )
      expect(gradeLearningQuiz(q, answers).passed).toBe(true)
      for (const question of q.questions) {
        expect(question.explanation?.length).toBeGreaterThan(40)
        for (const choice of question.choices.filter(
          (c) => !question.correctChoiceIds.includes(c.id),
        ))
          expect(gradeLearningQuiz(q, { ...answers, [question.id]: [choice.id] }).passed).toBe(
            false,
          )
      }
    }
  expect(lessons).toEqual([3, 5, 7, 8])
})

const seconds = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 }))
// Percursos independentes da fonte editorial: gestos que o texto pede nos controles reais.
const routes: Record<string, SceneAction[]> = {
  'same-rules-new-skin': [
    { type: 'play-move', direction: 1 },
    { type: 'play-shoot' },
    { type: 'skin', theme: 'road' },
    { type: 'skin', theme: 'sea' },
    { type: 'rule-toggle', enabled: false },
    { type: 'play-shoot' },
    ...seconds(1),
    { type: 'rule-toggle', enabled: true },
  ],
  'copy-vs-original': [
    { type: 'export-file' },
    { type: 'import-file' },
    { type: 'recolor', side: 'studio', color: 'rosa' },
  ],
  'pixel-vector': [
    { type: 'inspect', kind: 'pixel', zoom: 6 },
    { type: 'inspect', kind: 'pixel', zoom: 1 },
  ],
  symmetry: [
    { type: 'mirror-mode', mode: 'off' },
    { type: 'trace', piece: 'asa' },
    { type: 'mirror-mode', mode: 'x' },
    { type: 'trace', piece: 'asa' },
    { type: 'mirror-mode', mode: 'y' },
    { type: 'trace', piece: 'ponta' },
    { type: 'mirror-mode', mode: 'x' },
    { type: 'fill' },
  ],
  shading: [
    { type: 'shade', on: true },
    { type: 'shade', on: false },
    { type: 'shade', on: true },
    { type: 'light', side: 'right' },
  ],
  frames: [
    { type: 'frame', index: 1 },
    { type: 'frame', index: 2 },
    { type: 'rate', perSecond: 2 },
    { type: 'play', on: true },
    ...seconds(1),
    { type: 'rate', perSecond: 8 },
    ...seconds(1),
    { type: 'play', on: false },
    { type: 'play', on: true },
    { type: 'same-frames', on: true },
    ...seconds(1),
  ],
  'onion-skin': [
    { type: 'frame', index: 2 },
    { type: 'shift', offset: 40 },
    { type: 'onion', on: true },
    { type: 'shift', offset: 20 },
  ],
  'fill-stroke': [
    { type: 'ink', part: 'stroke', on: false },
    { type: 'ink', part: 'stroke', on: true },
    { type: 'ink', part: 'fill', on: false },
    { type: 'ink', part: 'fill', on: true },
  ],
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  // A Prévia já abre tocando: o texto só pede para olhar (e tocar se ela estiver parada).
  'motion-amount': [
    { type: 'nudge', piece: 'crater', amount: 0 },
    { type: 'nudge', piece: 'body', amount: 0 },
    ...seconds(1),
    { type: 'nudge', piece: 'crater', amount: 4 },
    ...seconds(1),
    { type: 'nudge', piece: 'body', amount: 10 },
    ...seconds(1),
  ],
  // O relógio começa parado: o texto pede o Tempo para a nave voar na prévia.
  'unique-names': [
    ...seconds(1),
    { type: 'toggle-block', present: false },
    { type: 'toggle-block', present: true },
    { type: 'name-field', name: 'nave' },
    { type: 'name-field', name: 'folha-nave' },
  ],
  'sheet-vs-sprite': [
    { type: 'crop', width: 64 },
    { type: 'crop', width: 16 },
    { type: 'crop', width: 32 },
    { type: 'cut', cell: 1 },
    { type: 'cut', cell: 2 },
    { type: 'sprite', size: 80 },
  ],
  'two-clocks': [
    { type: 'rate', perSecond: 8 },
    { type: 'birth-every', frames: 20 },
    { type: 'reset' },
    ...seconds(2),
    { type: 'birth-every', frames: 40 },
    { type: 'rate', perSecond: 16 },
    { type: 'reset' },
    ...seconds(3),
  ],
  'published-copy': [
    { type: 'publish' },
    { type: 'recolor', side: 'project', color: 'rosa' },
    { type: 'publish' },
  ],
}
for (const m of manifests)
  for (const b of m.blocks) {
    const c = conteudoBloco(b)
    if (c?.kind !== 'interactive' || c.activity.type !== 'experimentation') continue
    test(`${m.lessonSlug}/${b.key}: a instrução conclui a experiência sem perguntas`, () => {
      if (c.activity.type !== 'experimentation') throw new Error('Cena ausente')
      expect(c.prediction).toBeUndefined()
      expect(c.checkpoint).toBeUndefined()
      expect(c.semPerguntaFinal).toBe(true)
      expect(c.hints).toEqual([])
      expect(evaluateLearning(c, {}).passed).toBe(false)
      const start = sceneStart(c.activity)
      let session = initialExperiment(start)
      const actions = routes[c.activity.scene]
      if (!actions) throw new Error(`Percurso ausente: ${c.activity.scene}`)
      for (const action of actions) session = stepExperiment(start, session, action).session
      const result = evaluateLearning(c, {
        sceneCheckpoint: packExperiment(c.activity.scene, session),
      })
      expect(result.passed, JSON.stringify(result)).toBe(true)
    })
  }
// Decisão do responsável, 06/10/2026: o vídeo da experiência é uma demonstração na primeira pessoa.
const PASSA_A_VEZ =
  'Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima parte.'
/** Começo de frase que dá ordem a quem assiste. "Olha aqui:" é a abertura pedida e fica de fora. */
const ORDEM =
  /^(Clique|Mude|Observe|Escolha|Ligue|Desligue|Coloque|Deixe|Aumente|Compare|Troque|Faça|Olhe|Veja|Repare|Use|Toque|Pinte|Volte|Experimente|Confira|Aproxime|Marque|Ajuste|Traga|Tente|Mexa)\b/
const frases = (paragrafos: string[]) => paragrafos.join(' ').split(/(?<=[.!?:])\s+/)
test('as experiências são demonstrações: conceito, Olha aqui, testes do narrador e a vez no fim', () => {
  const experiencias = aulasMeuJeito.flatMap((a) => a.sections.filter((s) => s.activity))
  expect(experiencias).toHaveLength(14)
  for (const s of experiencias) {
    const fala = falasSecao(s)
    expect(fala[0], s.key).toMatch(
      /^Esta é (uma experiência|a mesma experiência, agora) para a gente entender /,
    )
    expect(fala[1]?.startsWith('Olha aqui: '), s.key).toBe(true)
    expect(fala.at(-1), s.key).toBe(PASSA_A_VEZ)
    expect(
      frases(fala.slice(0, -1)).filter((f) => ORDEM.test(f)),
      s.key,
    ).toEqual([])
    expect(fala.join(' '), s.key).not.toMatch(/Vou te mostrar|mexa e veja|—/i)
    // Toda comparação do dia a dia tem o meme ilustrado descrito na nota de tela, e só ela.
    expect(Boolean(s.meme), s.key).toBe(/Sabe |É como /.test(fala.join(' ')))
    const tela = telaSecao(s)
    expect(tela, s.key).toContain('primeira pessoa')
    expect(tela, s.key).not.toMatch(/Deixar a execução|sem antecipar|não demonstrar/)
    if (s.meme) expect(tela, s.key).toContain('Meme na comparação')
    // A ponte liga o vídeo à experiência sem repetir os passos dela (Diretrizes, seção 1).
    expect(s.bridge, s.key).not.toBe(s.activity!.instructions)
    expect(s.bridge.length, s.key).toBeLessThan(120)
  }
})
test('o jogo pronto apresenta o jogo, mostra um exemplo e só passa a vez no fim', () => {
  const jogo = aulasMeuJeito[0]!.sections.find((s) => s.play)!
  const fala = falasSecao(jogo)
  // Diz o que será construído antes de apresentar a versão pronta; o exemplo mostra o objetivo.
  expect(fala[0]?.startsWith('Nesta aventura, você vai ')).toBe(true)
  expect(fala[0]).toContain('Esta é a versão pronta')
  expect(fala[1]?.startsWith('Olha aqui: ')).toBe(true)
  expect(fala[1]).toContain('O objetivo é')
  expect(fala.at(-1)?.startsWith('Agora é a sua vez: jogue')).toBe(true)
  expect(fala.at(-1)).toMatch(/Quando terminar, clique em Próxima parte\.$/)
  expect(frases(fala.slice(0, -1)).filter((f) => ORDEM.test(f))).toEqual([])
})
// Vocabulário da aventura (Diretrizes, seção 6, 06/10/2026). O validador de roteiros e o teste
// `vocabulario-crianca` barram as palavras da escola na narração e nos manifestos; aqui a fonte
// também não pode falar de tarefa escolar nem dizer o que é opcional como negação.
const ESCOLA_E_TAREFA =
  /\b(?:aulas?|cursos?|professor(?:a|as|es)?|alun[oa]s?|seç(?:ão|ões)|cadernos?|etapas?|nota m[ií]nima|sala|atividades?|entregas?|entregue|entregou|trabalhos?)\b/i
const textos = (valor: unknown): string[] =>
  typeof valor === 'string'
    ? [valor]
    : Array.isArray(valor)
      ? valor.flatMap(textos)
      : valor && typeof valor === 'object'
        ? Object.values(valor).flatMap(textos)
        : []
test('o que a criança vê e ouve fala de aventura, fase, parte, mapa e guia', () => {
  for (const lesson of aulasMeuJeito) {
    const visiveis = [
      lesson.title,
      ...lesson.sections.flatMap((s) => [
        s.title,
        s.bridge,
        ...falasSecao(s),
        ...textos(s.activity),
        ...textos(s.questions),
      ]),
    ]
    for (const texto of visiveis) {
      expect(texto, lesson.slug).not.toMatch(ESCOLA_E_TAREFA)
      expect(texto, lesson.slug).not.toMatch(/não precisa|Próxima seção|Concluir aula/i)
    }
  }
  // Envio pela galeria: os rótulos novos, na ordem em que aparecem na tela.
  for (const [index, lesson] of aulasMeuJeito.entries()) {
    const envio = falasSecao(lesson.sections.at(-1)!).join(' ')
    const tool = index >= 1 && index <= 4 ? 'Pinta' : 'Estúdio'
    let desde = 0
    for (const rotulo of [
      `Escolher no ${tool}`,
      `Minhas criações do ${tool}`,
      'Recado para o guia',
      `Enviar para o guia (${index === 4 ? 2 : 1})`,
      'Recebido pelo seu guia.',
      'Concluir fase.',
    ]) {
      const onde = envio.indexOf(rotulo, desde)
      expect(onde, `${lesson.slug}: ${rotulo}`).toBeGreaterThan(-1)
      desde = onde
    }
  }
})
test('o Mapa da Aventura é apresentado à criança, com ler e baixar como convite', () => {
  const secao = aulasMeuJeito[0]!.sections.find((s) => s.materials)!
  expect(secao.title).toBe('Seu Mapa da Aventura')
  const fala = falasSecao(secao)
  expect(fala[0]?.startsWith('Olha aqui: este é o seu Mapa da Aventura!')).toBe(true)
  expect(fala).toContain(
    'Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser.',
  )
  expect(secao.bridge).toBe(
    'Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
  )
  const material = conteudoBloco(manifests[0]!.blocks.find((b) => b.key === 'materiais-caderno'))
  expect(material?.kind === 'materials' ? material.title : undefined).toBe(
    'Mapa da Aventura: O Jogo do Meu Jeito',
  )
})
test('todos os percursos de experiência estão cobertos', () => {
  const scenes = manifests
    .flatMap((m) => m.blocks)
    .flatMap((b) => {
      const content = conteudoBloco(b)
      return content?.kind === 'interactive' && content.activity.type === 'experimentation'
        ? [content.activity.scene]
        : []
    })
  expect(scenes).toHaveLength(14)
  expect(Object.keys(routes).sort()).toEqual([...scenes].sort())
})
