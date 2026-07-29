import { describe, expect, it } from 'bun:test'
import type { ProjectLifecycleTarget } from '#extensions'
import type { SZIRV2 } from '#ir'
import { parseProjectFiles } from '#parsers'
import { generateProjectFiles } from '../project'

const EXTENSION_BY_TARGET: Partial<Record<ProjectLifecycleTarget, string>> = {
  'game-2d': 'game-2d',
  'game-2d-advanced': 'game-2d-advanced',
  'game-3d': 'game-3d',
  'game-3d-advanced': 'game-3d-advanced',
  'world-3d': 'world-3d',
}

const EXPECTED: Record<ProjectLifecycleTarget, readonly string[]> = {
  core: ['(function __szProjectRun() {', '})();'],
  'game-2d': ['SZGame2D.onStart(function __szProjectRun() {', '}, "__sz-project");'],
  'game-2d-advanced': ['SZGameKit.runProject(function __szProjectRun() {', 'SZGameKit.start();'],
  'game-3d': ['SZGame3D.runProject(function __szProjectRun() {'],
  'game-3d-advanced': [
    'SZGameKit3D.runProject(function __szProjectRun() {',
    'SZGameKit3D.start();',
  ],
  'world-3d': ['SZWorld3D.runProject(function __szProjectRun() {', 'SZWorld3D.start();'],
}

describe('fábrica e boot do ciclo de vida', () => {
  for (const target of Object.keys(EXPECTED) as ProjectLifecycleTarget[]) {
    it(`${target}: preserva as três áreas e liga o adaptador correto`, () => {
      const extensionId = EXTENSION_BY_TARGET[target]
      const ir: SZIRV2 = {
        version: 2,
        html: [],
        css: [],
        behavior: {
          start: [{ type: 'consoleLog', value: { type: 'str', value: 'início' } }],
          events: [{ type: 'event', target: 'botao', event: 'click', body: [] }],
          loops: [{ type: 'animationLoop', body: [] }],
        },
        extensions: extensionId ? [{ extensionId }] : [],
      }

      const files = generateProjectFiles({ ir, projectName: 'Lifecycle' })
      for (const snippet of EXPECTED[target]) expect(files['script.js']).toContain(snippet)

      const parsed = parseProjectFiles(files)
      expect(parsed.behavior.start.map((statement) => statement.type)).toEqual(['consoleLog'])
      expect(parsed.behavior.events.map((statement) => statement.type)).toEqual(['event'])
      expect(parsed.behavior.loops.map((statement) => statement.type)).toEqual(['animationLoop'])
    })
  }

  it('game-3d-advanced migra o bloco de boot legado sem ligar o motor duas vezes', () => {
    const ir: SZIRV2 = {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [{ type: 'g3k:start' }],
        events: [],
        loops: [],
      },
      extensions: [{ extensionId: 'game-3d-advanced' }],
    }

    const files = generateProjectFiles({ ir, projectName: 'Boot legado' })
    expect(files['script.js'].match(/SZGameKit3D\.start\(\);/g)).toHaveLength(1)
    expect(parseProjectFiles(files).behavior.start).toEqual([])
  })

  it('loops periódicos independentes registram seu próprio tick e preservam o round-trip', () => {
    const game2d: SZIRV2 = {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [],
        events: [],
        loops: [
          {
            type: 'g2d:everyFrames',
            n: { type: 'num', value: 30 },
            body: [{ type: 'consoleLog', value: { type: 'str', value: 'quadro' } }],
          },
        ],
      },
      extensions: [{ extensionId: 'game-2d' }],
    }
    const game2dFiles = generateProjectFiles({ ir: game2d, projectName: 'Periódico 2D' })
    expect(game2dFiles['script.js']).toContain('SZGame2D.gameLoop(function __szPeriodicLoop()')
    expect(
      parseProjectFiles(game2dFiles).behavior.loops.map((statement) => statement.type),
    ).toEqual(['g2d:everyFrames'])

    const advanced: SZIRV2 = {
      ...game2d,
      behavior: {
        start: [],
        events: [],
        loops: [
          {
            type: 'gk:everySeconds',
            seconds: { type: 'num', value: 1 },
            body: [{ type: 'consoleLog', value: { type: 'str', value: 'segundo' } }],
          },
        ],
      },
      extensions: [{ extensionId: 'game-2d-advanced' }],
    }
    const advancedFiles = generateProjectFiles({ ir: advanced, projectName: 'Periódico avançado' })
    expect(advancedFiles['script.js']).toContain('SZGameKit.onUpdate(function __szPeriodicLoop(dt)')
    expect(
      parseProjectFiles(advancedFiles).behavior.loops.map((statement) => statement.type),
    ).toEqual(['gk:everySeconds'])
  })

  const FIXED_STEP_COMMENT = 'O jogo roda 60 passos por segundo'

  it('comenta o passo fixo uma vez só quando há raiz de loop do Jogo 2D, e some no roundtrip', () => {
    const game2d: SZIRV2 = {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [],
        events: [],
        loops: [
          { type: 'g2d:updateEachFrame', body: [] },
          { type: 'g2d:everySeconds', seconds: { type: 'num', value: 2 }, body: [] },
        ],
      },
      extensions: [{ extensionId: 'game-2d' }],
    }
    const files = generateProjectFiles({ ir: game2d, projectName: 'Passo fixo' })
    // O comentário didático aparece EXATAMENTE uma vez (peça própria antes das raízes),
    // não uma por raiz de loop.
    expect(files['script.js'].match(new RegExp(FIXED_STEP_COMMENT, 'g'))).toHaveLength(1)
    // Fixpoint: o parser descarta o comentário e a regeração o recoloca — byte-estável.
    const regenerated = generateProjectFiles({
      ir: { ...game2d, behavior: parseProjectFiles(files).behavior },
      projectName: 'Passo fixo',
    })
    expect(regenerated['script.js']).toBe(files['script.js'])
  })

  it('não comenta o passo fixo em projeto sem raiz de loop do Jogo 2D', () => {
    // Núcleo (animationLoop) e demais extensões não recebem o comentário do g2d.
    const core: SZIRV2 = {
      version: 2,
      html: [],
      css: [],
      behavior: { start: [], events: [], loops: [{ type: 'animationLoop', body: [] }] },
      extensions: [],
    }
    expect(generateProjectFiles({ ir: core, projectName: 'Sem g2d' })['script.js']).not.toContain(
      FIXED_STEP_COMMENT,
    )
  })
})
