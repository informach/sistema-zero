import { beforeAll, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import {
  isExecutionRule,
  isLearningManifest,
  type LearningManifest,
  readManifestStudioProjectExamples,
  type SectionProjectCheck,
} from '@sistemazero/core/learning'
import {
  type ExampleHarness,
  exampleHarness,
} from '../../official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { asteroidsExample } from '../../official-extensions/game-2d/examples/arcade'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { evaluateStudioSectionProject } from '../projectCheckAuthoring'
import { ensureBlocklyInitialized } from '../setup'

/**
 * Nave Contra Asteroides na autoria de 24/11/2026 (9 aulas, base Construtor 2D). As soluções de
 * cada parte vêm do PRÓPRIO manifesto (`projectExamples`), não da fixture histórica
 * `nave-contra-asteroides-projetos-qa.ts` (que ficou para Meu Jeito e Desafio e descreve o curso
 * antigo de 5 dias, com nave desenhada, `spawn_bullet`, `spawn_asteroid` e `every_frames`).
 * Aqui: a solução sobrevive ao Blockly, cumpre os objetivos de estrutura da parte e joga como a
 * aula promete no runtime 2D. Os objetivos de EXECUÇÃO (`behavior`) são do `studio-runtime` e da
 * QA do curso (`docs/aulas-interativas-tecnico/qa`), não deste teste.
 */
const LESSONS = [
  'primeira-nave',
  'dia-1',
  'dia-2',
  'chuva-de-asteroides',
  'dia-3',
  'pontos',
  'dia-4',
  'comecar-partida',
  'dia-5',
] as const
type Lesson = (typeof LESSONS)[number]
const reached = (lesson: Lesson, milestone: Lesson) =>
  LESSONS.indexOf(lesson) >= LESSONS.indexOf(milestone)

interface Block {
  type: string
  fields?: Record<string, unknown>
  inputs?: Record<string, { block?: Block; shadow?: Block }>
  next?: { block: Block }
}
type Project = {
  blocksState: unknown
  assets?: { name: string; dataUrl: string }[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

function manifest(lesson: Lesson): LearningManifest {
  const value: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        `../../../../../docs/aulas-interativas/construtor/nave-contra-asteroides/nave-contra-asteroides-${lesson}.manifesto.json`,
      ),
      'utf8',
    ),
  )
  if (!isLearningManifest(value)) throw new Error(`Invalid authored manifest: ${lesson}`)
  return value
}
function examples(lesson: Lesson) {
  const studio = manifest(lesson).blocks.find((block) => block.key === 'projeto')?.content
  if (studio?.kind !== 'studio') throw new Error(`Studio block missing: ${lesson}`)
  const parsed = readManifestStudioProjectExamples(studio.projectExamples)
  if (parsed.kind !== 'valid') throw new Error(`Invalid project examples: ${lesson}`)
  return parsed.value
}
/** A solução autorada da parte (entrada e saída de cada passo da aula). */
function solution(lesson: Lesson, key = 'entrega') {
  const all = examples(lesson)
  const binding = all.sections[key]
  if (!binding?.solutionExampleId) throw new Error(`No solution for ${lesson}/${key}`)
  return structuredClone(all.examples[binding.solutionExampleId]) as unknown as Project
}
function entry(lesson: Lesson, key: string) {
  const all = examples(lesson)
  const id = all.sections[key]?.entryExampleId
  return id ? (structuredClone(all.examples[id]) as unknown as Project) : undefined
}
const structureChecks = (checks: readonly SectionProjectCheck[]) =>
  checks.filter((check) => {
    if (check.programmingLanguage === 'python')
      throw new Error('This editorial fixture requires JavaScript objectives')
    return !isExecutionRule(check.rule)
  })
function roundTrip(project: Project) {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(project.blocksState as never, workspace)
    return {
      saved: { ...project, blocksState: Blockly.serialization.workspaces.save(workspace) },
      ir: buildIRFromWorkspace(workspace),
    }
  } finally {
    workspace.dispose()
  }
}
function failedStructure(lesson: Lesson, key: string, project: Project) {
  const section = manifest(lesson).sections.find((s) => s.key === key)
  const checks = section?.completion?.projectChecks
  if (!checks) throw new Error(`No checks for ${lesson}/${key}`)
  return evaluateStudioSectionProject(structureChecks(checks), project, entry(lesson, key))
    .filter((check) => !check.passed)
    .map((check) => check.checkId)
}

test.each(
  LESSONS,
)('%s: every authored part survives Blockly and meets its structure objectives', (lesson) => {
  const parts = manifest(lesson).sections.filter((s) => s.completion?.projectChecks?.length)
  expect(parts.length).toBeGreaterThan(0)
  for (const part of parts) {
    const { saved } = roundTrip(solution(lesson, part.key))
    expect(failedStructure(lesson, part.key, saved as Project), `${lesson}/${part.key}`).toEqual([])
  }
})

// ── O jogo da entrega de cada aula, no runtime 2D ──
function gameFor(lesson: Lesson) {
  const project = solution(lesson)
  const { ir } = roundTrip(project)
  return exampleHarness({ ...asteroidsExample, assets: project.assets ?? [], ir }, () => 0.1)
}
const advance = (g: ExampleHarness, n: number) => {
  for (let i = 0; i < n; i++) g.nextFrame()
}
const press = (g: ExampleHarness, key: string) => {
  g.fireKey(key, 'keyup')
  g.fireKey(key)
  g.fireKey(key, 'keyup')
}
// Grupos criados em Ao iniciar, nesta ordem: tiros (aula dia-1) e asteroides (chuva). O reinício
// cria o par de novo, e o capturado guarda os antigos: valem os dois mais novos.
const tiros = (g: ExampleHarness) => (g.groups.length >= 2 ? g.groups.at(-2)! : g.groups[0]!)
const asteroides = (g: ExampleHarness) => g.groups.at(-1)!
// A nave é o sprite 56×64 (o painel das telas tem 704×176); o reinício cria outra, a mais nova.
const nave = (g: ExampleHarness) => g.sprites.findLast((s) => s.w === 56 && s.h === 64)!
const clear = (g: ExampleHarness) => {
  for (const group of g.groups) g.api.clearGroup(group)
}
function hitShip(g: ExampleHarness) {
  const ship = nave(g)
  const stone = g.api.spawn(asteroides(g), { x: ship.x, y: ship.y, w: 48, h: 48, vx: 0, vy: 0 })!
  g.nextFrame()
  expect(asteroides(g).items.includes(stone)).toBe(false)
}
function scorePoint(g: ExampleHarness) {
  clear(g)
  const bullet = g.api.spawn(tiros(g), { x: 100, y: 110, w: 10, h: 28, vx: 0, vy: 0 })!
  const stone = g.api.spawn(asteroides(g), { x: 90, y: 100, w: 48, h: 48, vx: 0, vy: 0 })!
  g.nextFrame()
  expect(tiros(g).items.includes(bullet)).toBe(false)
  expect(asteroides(g).items.includes(stone)).toBe(false)
}

test.each(LESSONS)('%s: the delivered game plays what the lesson builds', (lesson) => {
  const g = gameFor(lesson)
  const ship = nave(g)
  expect(ship.w).toBe(56)
  // A abertura vem pronta: antes de Enter, nada se move e Espaço não dispara.
  let before = ship.x
  g.fireKey('ArrowRight')
  advance(g, 2)
  g.fireKey('ArrowRight', 'keyup')
  expect(ship.x).toBe(before)
  if (reached(lesson, 'dia-1')) {
    press(g, 'Space')
    expect(tiros(g).items).toHaveLength(0)
  }
  if (reached(lesson, 'chuva-de-asteroides')) {
    advance(g, 120)
    expect(asteroides(g).items).toHaveLength(0)
  }
  press(g, 'Enter')
  expect(g.api.sceneIs('jogando')).toBe(true)

  // primeira-nave: setas com passinho 5 e a borda da tela.
  before = ship.x
  g.fireKey('ArrowRight')
  advance(g, 2)
  g.fireKey('ArrowRight', 'keyup')
  expect(ship.x).toBe(before + 10)
  g.fireKey('ArrowLeft')
  advance(g, 150)
  g.fireKey('ArrowLeft', 'keyup')
  expect(ship.x).toBe(0)

  if (reached(lesson, 'dia-1')) {
    // dia-1: um laser por toque, nascendo no centro da nave; na aula dia-1 ele ainda fica parado.
    clear(g)
    press(g, 'Space')
    expect(tiros(g).items).toHaveLength(1)
    const laser = tiros(g).items[0]!
    expect(laser.x + laser.w / 2).toBe(ship.x + ship.w / 2)
    const y = laser.y
    g.nextFrame()
    if (!reached(lesson, 'dia-2')) expect(laser.y).toBe(y)
    else {
      // dia-2: o laser sobe e sai do grupo ao deixar a tela.
      expect(laser.y).toBeLessThan(y)
      advance(g, 120)
      expect(tiros(g).items.includes(laser)).toBe(false)
    }
  }
  if (reached(lesson, 'chuva-de-asteroides')) {
    // chuva: uma pedra a cada 1,5 segundo, na posição sorteada, caindo e saindo ao escapar.
    clear(g)
    advance(g, 95)
    expect(asteroides(g).items.length).toBeGreaterThan(0)
    const stone = asteroides(g).items[0]!
    const y = stone.y
    g.nextFrame()
    expect(stone.y).toBeGreaterThan(y)
    stone.y = 700
    g.nextFrame()
    expect(asteroides(g).items.includes(stone)).toBe(false)
  }
  if (reached(lesson, 'dia-3')) {
    scorePoint(g)
    // pontos: o placar começa em zero e soma um por acerto.
    if (reached(lesson, 'pontos')) expect(g.scores['Acertos:']).toBe(1)
  }
  if (reached(lesson, 'dia-4')) {
    // dia-4: três vidas, dano de uma por batida e um respiro antes do próximo dano.
    clear(g)
    expect(g.api.getHealth(ship)).toBe(3)
    hitShip(g)
    expect(g.api.getHealth(ship)).toBe(2)
    hitShip(g)
    expect(g.api.getHealth(ship)).toBe(2)
    advance(g, 61)
    clear(g)
    hitShip(g)
    expect(g.api.getHealth(ship)).toBe(1)
  }
  expect(g.errors).toEqual([])
  expect(g.warnings).toEqual([])
})

test('dia-5: defeat, restart to the opening, a clean second match and victory at the goal of 20', () => {
  const g = gameFor('dia-5')
  press(g, 'Enter')
  for (let i = 0; i < 3; i++) {
    clear(g)
    hitShip(g)
    if (i < 2) advance(g, 61)
  }
  g.nextFrame()
  expect(g.api.sceneIs('derrota')).toBe(true)
  press(g, 'Space')
  expect(tiros(g).items).toHaveLength(0)
  press(g, 'Enter')
  g.nextFrame()
  expect(g.api.sceneIs('inicio')).toBe(true)
  expect(g.api.getHealth(nave(g))).toBe(3)
  expect([tiros(g), asteroides(g)].every((group) => group.items.length === 0)).toBe(true)
  press(g, 'Enter')
  g.nextFrame()
  expect(g.scores['Acertos:']).toBe(0)
  for (let i = 1; i <= 20; i++) {
    scorePoint(g)
    expect(g.scores['Acertos:']).toBe(i)
  }
  g.nextFrame()
  expect(g.api.sceneIs('vitoria')).toBe(true)
  press(g, 'Enter')
  g.nextFrame()
  expect(g.api.sceneIs('inicio')).toBe(true)
  expect(g.errors).toEqual([])
})

test('dia-5: defeat is checked first when the last life and the goal coincide', () => {
  const g = gameFor('dia-5')
  press(g, 'Enter')
  for (let i = 0; i < 19; i++) scorePoint(g)
  nave(g).hp = 0
  scorePoint(g)
  g.nextFrame()
  expect(g.scores['Acertos:']).toBe(20)
  expect(g.api.sceneIs('derrota')).toBe(true)
})

// ── Escolhas criativas aceitas e erros recusados pelos objetivos de estrutura ──
function all(value: unknown): Block[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(all)
  const object = value as Record<string, unknown>
  return [
    ...(typeof object.type === 'string' ? [object as unknown as Block] : []),
    ...Object.values(object).flatMap(all),
  ]
}
function find(nodes: Block[], predicate: (block: Block) => boolean, what: string) {
  const found = nodes.find(predicate)
  if (!found) throw new Error(`Authored block not found: ${what}`)
  return found
}
const fx = (name: string) => (b: Block) => b.type === 'sz_g2d_play_fx' && b.fields?.FX === name

// Na autoria nova a escolha criativa é a APARÊNCIA (nave, cenário, asteroide e laser entre as três
// opções de cada, aulas primeira-nave e comecar-partida): "a personalização é opcional e muda
// somente imagens". Os objetivos preservam o funcionamento e aceitam qualquer combinação.
const imageOf = (type: string, extra?: (b: Block) => boolean) => (b: Block) =>
  b.type === type && (extra?.(b) ?? true)
test.each([
  {
    name: 'another ship',
    edit: (nodes: Block[]) => {
      find(nodes, imageOf('sz_g2d_create_image_sprite'), 'ship').fields!.IMAGE = 'nave-arraia-lilas'
    },
  },
  {
    name: 'another backdrop',
    edit: (nodes: Block[]) => {
      find(nodes, imageOf('sz_g2d_set_backdrop'), 'backdrop').fields!.IMAGE = 'cenario-nebulosa'
    },
  },
  {
    name: 'another laser and asteroid',
    edit: (nodes: Block[]) => {
      const spawn = (group: string) =>
        imageOf('sz_g2d_spawn_image_in_group', (b) => b.fields?.GROUP === group)
      find(nodes, spawn('tiros'), 'laser').fields!.IMAGE = 'laser-dourado'
      find(nodes, spawn('asteroides'), 'asteroid').fields!.IMAGE = 'asteroide-cristal-violeta'
    },
  },
])('accepts creative choice: $name', ({ edit }) => {
  const project = solution('dia-5')
  edit(all(project))
  expect(failedStructure('dia-5', 'entrega', roundTrip(project).saved as Project)).toEqual([])
})

const guard = (key: string) => (b: Block) => b.type === 'sz_g2d_on_key' && b.fields?.KEY === key
function unwrapGuard(owner: Block) {
  const wrapped = owner.inputs!.BODY!.block!
  if (wrapped.type !== 'sz_js_if_else') throw new Error('Expected the authored scene guard')
  owner.inputs!.BODY = wrapped.inputs!.THEN!
}
test.each([
  {
    lesson: 'dia-1' as Lesson,
    name: 'unguarded shot event',
    checkId: 'evento-protegido',
    edit: (nodes: Block[]) => unwrapGuard(find(nodes, guard('Space'), 'Space event')),
  },
  {
    lesson: 'chuva-de-asteroides' as Lesson,
    name: 'unguarded asteroid clock',
    checkId: 'intervalo-asteroides',
    edit: (nodes: Block[]) =>
      unwrapGuard(find(nodes, (b) => b.type === 'sz_g2d_every_seconds', 'asteroid clock')),
  },
  // O som deixou de ser escolha livre: a autoria nova o fixa nos objetivos ("toque o efeito de
  // tiro", "mantenha explosão e som"), então trocá-lo é recusado (antes era aceito).
  {
    lesson: 'dia-1' as Lesson,
    name: 'shot event plays jump instead of shoot',
    checkId: 'evento-protegido',
    edit: (nodes: Block[]) => {
      find(nodes, fx('shoot'), 'shoot fx').fields!.FX = 'jump'
    },
  },
  {
    lesson: 'dia-3' as Lesson,
    name: 'collision plays shoot instead of explosion',
    checkId: 'retirar-o-par',
    edit: (nodes: Block[]) => {
      find(nodes, fx('explosion'), 'explosion fx').fields!.FX = 'shoot'
    },
  },
  {
    lesson: 'dia-3' as Lesson,
    name: 'collision removes only the asteroid',
    checkId: 'retirar-o-par',
    edit: (nodes: Block[]) => {
      const pair = find(nodes, (b) => b.type === 'sz_g2d_on_group_overlap', 'pair')
      const first = pair.inputs!.BODY!.block!
      if (first.type !== 'sz_g2d_remove_from_group') throw new Error('Expected the removal')
      pair.inputs!.BODY = { block: first.next!.block }
    },
  },
  {
    lesson: 'dia-4' as Lesson,
    name: 'wrong victim of damage',
    checkId: 'dano-e-protecao',
    edit: (nodes: Block[]) => {
      find(nodes, (b) => b.type === 'sz_g2d_damage_sprite', 'damage').fields!.SPRITE =
        'painelMensagem'
    },
  },
])('rejects learner error: $name', ({ lesson, checkId, edit }) => {
  const project = solution(lesson)
  edit(all(project))
  expect(failedStructure(lesson, 'entrega', project)).toContain(checkId)
})
