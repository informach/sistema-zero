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
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { asteroidsExample } from '../../../packages/studio/src/official-extensions/game-2d/examples/arcade'
import { problemasPedagogicos } from './diretrizes-pedagogicas'
import { aulasNave, falasSecao, gerarManifestoNave } from './gerar-nave-contra-asteroides'
import { etapasNave, ORDEM_NAVE, projetoNave } from './nave-contra-asteroides-etapas'
import { courseProjects } from './nave-contra-asteroides-projetos-qa'

const stages = etapasNave()
const manifests = ORDEM_NAVE.map((slug) => {
  const value: unknown = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, `../aulas/nave-contra-asteroides-${slug}.manifesto.json`),
      'utf8',
    ),
  )
  if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${slug}`)
  return value
})

test('os cinco marcos e a base final são exatamente os originais', () => {
  const original = courseProjects()
  for (const [old, current] of [
    [1, 2],
    [2, 3],
    [3, 5],
    [4, 7],
    [5, 9],
  ])
    expect(stages[current!]).toEqual(original[old!])
})

for (const [index, m] of manifests.entries()) {
  test(`${m.lessonSlug}: geração estável, continuidade, paleta e critérios praticáveis`, () => {
    expect(gerarManifestoNave(aulasNave[index]!, index)).toEqual(m)
    expect(problemasPedagogicos(m, true)).toEqual([])
    const studio = m.blocks.find((b) => b.key === 'projeto')?.content
    if (studio?.kind !== 'studio') throw new Error('Projeto ausente')
    expect(studio.chain).toBe('nave-contra-asteroides')
    expect(studio.initialProject).toEqual(projetoNave(index))
    const used = [...JSON.stringify(stages[index + 1]).matchAll(/"type":"(sz_[^"]+)"/g)].map(
      (m) => m[1],
    )
    for (const type of used) expect(studio.allowBlocks).toContain(type)
    for (const section of m.sections) {
      const checks = section.completion?.projectChecks ?? []
      expect(
        evaluateStudioSectionProject(checks, stages[index + 1]!).filter((c) => !c.passed),
        section.key,
      ).toEqual([])
    }
    const finalChecks = m.sections.at(-1)!.completion!.projectChecks!
    expect(finalChecks.length).toBeGreaterThan(0)
    expect(evaluateStudioSectionProject(finalChecks, stages[index]!).some((c) => !c.passed)).toBe(
      true,
    )
    expect(studio.showcase?.enabled).toBe(index === 8)
  })
}

test('as revisões corrigem erros com explicações; só acontecem após conteúdo ensinado', () => {
  const indexes: number[] = []
  manifests.forEach((m, i) => {
    for (const b of m.blocks) {
      if (b.content?.kind !== 'quiz') continue
      indexes.push(i + 1)
      const quiz = b.content
      const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctChoiceIds]))
      expect(gradeLearningQuiz(quiz, answers).passed).toBe(true)
      for (const q of quiz.questions) {
        expect(q.explanation?.length).toBeGreaterThan(30)
        const wrong = q.choices.find((c) => !q.correctChoiceIds.includes(c.id))!
        expect(gradeLearningQuiz(quiz, { ...answers, [q.id]: [wrong.id] }).passed).toBe(false)
      }
    }
  })
  expect(indexes).toEqual([2, 5, 7, 9])
})

test('a etapa da abertura espera Enter e preserva movimento, tiros e asteroides depois de começar', () => {
  const project = projetoNave(8)
  const g = exampleHarness({ ...asteroidsExample, ir: project.ir! }, () => 0.1)
  for (let i = 0; i < 100; i++) g.nextFrame()
  g.fireKey('Space')
  g.fireKey('Space', 'keyup')
  expect(g.api.sceneIs('inicio')).toBe(true)
  expect(g.groups.every((group) => group.items.length === 0)).toBe(true)
  g.fireKey('Enter')
  g.fireKey('Enter', 'keyup')
  expect(g.api.sceneIs('jogando')).toBe(true)
  g.fireKey('Space')
  g.fireKey('Space', 'keyup')
  expect(g.groups[0]!.items).toHaveLength(1)
  for (let i = 0; i < 45; i++) g.nextFrame()
  expect(g.groups[1]!.items.length).toBeGreaterThan(0)
  const ship = g.sprites.at(-1)!
  const before = ship.x
  g.fireKey('ArrowRight')
  g.nextFrame()
  g.fireKey('ArrowRight', 'keyup')
  expect(ship.x).toBeGreaterThan(before)
  g.fireKey('Enter')
  g.fireKey('Enter', 'keyup')
  expect(g.api.sceneIs('jogando')).toBe(true)
})

const FIM_DA_EXPERIENCIA =
  'Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção.'
// Uma ordem dirigida a quem assiste, no começo de uma frase. Antes da vez dela, o vídeo só mostra.
const ORDEM =
  /(?:^|[.:!?;]\s+)(Clique|Coloque|Observe|Mude|Deixe|Leve|Escolha|Ligue|Troque|Aumente|Atire|Compare|Avance|Use|Volte|Espere|Acompanhe|Arraste|Toque|Aperte|Olhe|Repita|Teste|Sorteie|Experimente|Jogue)\b/

test('experiências e jogo pronto: o narrador demonstra e só no fim passa a vez (06/10/2026)', () => {
  let experiencias = 0
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      const experiencia = s.activity?.activity.type === 'experimentation'
      if (!experiencia && !s.play) continue
      const id = `${aula.slug}/${s.key}`
      const fala = s.speech ?? []
      const demonstracao = fala.slice(0, -1).join(' ')
      if (experiencia) {
        experiencias++
        expect(fala[0], id).toMatch(/^Esta é (uma|a mesma) experiência\b.* para a gente entender /)
        expect(fala.at(-1), id).toBe(FIM_DA_EXPERIENCIA)
      } else {
        expect(fala[0], id).toMatch(/^Esta é a versão pronta\b/)
        expect(fala.at(-1), id).toMatch(
          /^Agora é a sua vez: jogue .*Quando terminar, clique em Próxima seção\.$/,
        )
      }
      expect(demonstracao.match(/Olha aqui: /g), id).toHaveLength(1)
      expect(demonstracao, id).not.toMatch(ORDEM)
      expect(demonstracao, id).not.toContain('Agora é a sua vez')
      expect(demonstracao, id).not.toContain('Vou te mostrar')
      // A nota de tela acompanha: o vídeo faz os gestos e mostra o resultado real.
      expect(s.screen, id).not.toMatch(/sem antecipar|sem realizar|Não executar|pela pessoa/)
      if (/meme/i.test(s.screen ?? ''))
        for (const regra of [
          'desenho nosso',
          'sem foto de pessoa real nem meme da internet',
          '2 a 3 segundos',
          'sem cobrir a experiência',
        ])
          expect(s.screen, id).toContain(regra)
    }
  expect(experiencias).toBe(19)
})

test('falas para a criança: sem o nome interno da seção e com a publicação comemorada', () => {
  const falas = aulasNave.flatMap((a) => a.sections.flatMap((s) => [s.bridge, ...falasSecao(s)]))
  expect(falas.filter((f) => /mexa e veja/i.test(f))).toEqual([])
  const publicacao = aulasNave.flatMap((a) => a.sections).filter((s) => s.publish)
  expect(publicacao).toHaveLength(1)
  const fala = falasSecao(publicacao[0]!).join(' ')
  expect(fala).toContain('O resumo do projeto já vem preenchido. Deixe como está.')
  expect(fala).toContain('Seu jogo está no Mural! Que conquista!')
  expect(fala).toContain('Clique em Copiar link de jogar')
  expect(fala).toMatch(/clique em Fechar\. Por último, clique em Concluir aula\.$/)
  expect(fala).not.toContain('Confira o título')
})

const seconds = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 }))
// Caminhos reproduzem os controles pedidos nas falas, sem usar as rotas genéricas de QA.
const spokenRoutes: Record<string, SceneAction[]> = {
  'primeira-nave/experiencia-areas': [
    { type: 'place-in-area', card: 'move', area: 'start' },
    ...seconds(6),
    { type: 'place-in-area', card: 'move', area: 'loop' },
    ...seconds(6),
  ],
  'dia-2/experiencia-tres-areas': [
    { type: 'place-in-area', card: 'event', area: 'event' },
    ...seconds(3),
    { type: 'trigger' },
    { type: 'place-in-area', card: 'event', area: 'loop' },
    ...seconds(3),
  ],
  'dia-4/experiencia-uma-vez': [
    { type: 'place-in-area', card: 'lives', area: 'start' },
    ...seconds(3),
    { type: 'place-in-area', card: 'lives', area: 'loop' },
    ...seconds(3),
  ],
  'dia-1/experiencia-seta-e-velocidade': [
    { type: 'advance', seconds: 1 / 30 },
    { type: 'hold-arrow', held: true },
    { type: 'walk-speed', speed: 3 },
    // "avance alguns quadros": a cena pede dois quadros seguidos com o x subindo.
    { type: 'advance', seconds: 1 / 30 },
    { type: 'advance', seconds: 1 / 30 },
    { type: 'restart-walk' },
    { type: 'walk-speed', speed: 1 },
    { type: 'advance', seconds: 1 / 30 },
  ],
  'dia-1/experiencia-limite-da-tela': [
    { type: 'hold-arrow', held: true },
    ...seconds(4),
    { type: 'restart-walk' },
    { type: 'keep-on-screen', enabled: true },
    ...seconds(4),
  ],
  world: [{ type: 'create' }, { type: 'connect', port: 'draw', enabled: true }],
  'draw-loop': [
    { type: 'advance', seconds: 0.5 },
    { type: 'loop', on: true },
    { type: 'advance', seconds: 1 },
    { type: 'erase', on: true },
    { type: 'advance', seconds: 0.5 },
  ],
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  velocity: [
    { type: 'velocity', vx: 0, vy: -9 },
    { type: 'advance', seconds: 0.6 },
    { type: 'velocity', vx: 0, vy: 9 },
    { type: 'advance', seconds: 0.6 },
  ],
  spawn: [
    ...seconds(1),
    { type: 'connect', port: 'timer', enabled: true },
    ...seconds(4),
    { type: 'interval', seconds: 20 / 30 },
    ...seconds(3),
  ],
  random: [
    { type: 'sample', kind: 'position', unit: 0.1, guided: false },
    { type: 'sample', kind: 'position', unit: 0.8, guided: false },
    ...seconds(2),
  ],
  coordinates: [
    { type: 'place', x: 500, y: 40 },
    { type: 'place', x: 500, y: 120 },
    { type: 'place', x: 0, y: 0 },
  ],
  'fixed-vs-read': [
    { type: 'shoot' },
    { type: 'place', x: 640, y: 0 },
    { type: 'shoot' },
    { type: 'value-source', source: 'read' },
    { type: 'shoot' },
    { type: 'place', x: 200, y: 0 },
    { type: 'shoot' },
    { type: 'box-marks', on: true },
    { type: 'shoot' },
  ],
  cleanup: [...seconds(6), { type: 'connect', port: 'cleanup', enabled: true }, ...seconds(2)],
  'collision-pair': [
    { type: 'command-target', subject: 'shot', target: 'group' },
    { type: 'command-target', subject: 'rock', target: 'group' },
    { type: 'advance', seconds: 1 },
    { type: 'reset' },
    { type: 'command-target', subject: 'shot', target: 'alias' },
    { type: 'command-target', subject: 'rock', target: 'alias' },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
  ],
  variable: [
    { type: 'store', value: 1 },
    { type: 'store', value: 0 },
    { type: 'change', by: 1 },
    { type: 'change', by: 1 },
    { type: 'show', on: true },
    { type: 'change', by: 1 },
  ],
  invincibility: [0, 45, 15].flatMap(
    (frames) =>
      [
        { type: 'reset' },
        { type: 'shield', frames },
        { type: 'advance-to' },
        { type: 'advance-to' },
        { type: 'advance-to' },
      ] as SceneAction[],
  ),
  // Caso pedra-40-quadros: na abertura, a peça dentro do Se espera "uns quatro segundos".
  'game-state': [
    ...seconds(3),
    { type: 'connect', port: 'condition', enabled: true },
    ...seconds(4),
    { type: 'start', input: 'tap' },
    ...seconds(3),
  ],
  restart: [
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'connect', port: 'restart', enabled: true },
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
  ],
}
for (const m of manifests)
  for (const b of m.blocks) {
    const c = b.content
    if (c?.kind !== 'interactive' || c.activity.type !== 'experimentation') continue
    test(`${m.lessonSlug}/${b.key}: a instrução narrada conclui ${c.activity.scene}`, () => {
      if (c.activity.type !== 'experimentation') throw new Error('Cena ausente')
      const start = sceneStart(c.activity)
      let session = initialExperiment(start)
      const actions = spokenRoutes[`${m.lessonSlug}/${b.key}`] ?? spokenRoutes[c.activity.scene]
      if (!actions) throw new Error(`Percurso não revisado: ${c.activity.scene}`)
      for (const action of actions) session = stepExperiment(start, session, action).session
      const result = evaluateLearning(c, {
        sceneCheckpoint: packExperiment(c.activity.scene, session),
      })
      expect(result.passed, JSON.stringify(result)).toBe(true)
    })
  }
