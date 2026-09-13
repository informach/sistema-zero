import { beforeAll, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { currentStudioDirections } from '../../../../../docs/aulas-interativas/qa/jogo-2d-edicao-atual'
import { courseProjects } from '../../../../../docs/aulas-interativas/qa/meu-jeito-projetos-qa'
import { generateProjectFiles } from '../../generators'
import { exampleHarness } from '../../official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { asteroidsExample } from '../../official-extensions/game-2d/examples/arcade'
import { parseProjectFilesWithDiagnostics } from '../../parsers/project'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})
test.each([
  6, 7, 8,
])('aula %i: a arte nova conserva disparos, asteroides e reinício no programa herdado', (lesson) => {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(courseProjects()[lesson]!.blocksState, workspace)
    expect(workspace.getBlocksByType('sz_g2d_create_ship', false)).toHaveLength(0)
    expect(workspace.getBlocksByType('sz_g2d_spawn_asteroid', false)).toHaveLength(
      lesson === 6 ? 1 : 0,
    )
    const ir = buildIRFromWorkspace(workspace)
    const files = generateProjectFiles({ ir, projectName: 'Meu jogo' })
    expect(parseProjectFilesWithDiagnostics(files).diagnostics).toEqual([])
    const game = exampleHarness(
      {
        ...asteroidsExample,
        ir,
        assets: ['nave', 'asteroide'].map((name) => ({
          id: name,
          name,
          kind: 'image',
          source: 'upload',
          dataUrl:
            'data:image/svg+xml;base64,' +
            btoa(
              '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64"><rect width="128" height="64" fill="red"/></svg>',
            ),
        })),
      },
      () => 0.1,
    )
    game.fireKey('Enter')
    game.fireKey('Enter', 'keyup')
    expect(game.api.sceneIs('jogando')).toBe(true)
    game.fireKey('Space')
    game.fireKey('Space', 'keyup')
    expect(game.groups[0]!.items).toHaveLength(1)
    for (let frame = 0; frame < 41; frame++) game.nextFrame()
    expect(game.groups[1]!.items.length).toBeGreaterThan(0)
    if (lesson >= 7) expect(game.groups[1]!.items[0]!.anim).toBeDefined()
    game.sprites.at(-1)!.hp = 0
    game.nextFrame()
    expect(game.api.sceneIs('fim')).toBe(true)
    game.fireKey('Enter')
    game.fireKey('Enter', 'keyup')
    game.nextFrame()
    expect(game.api.sceneIs('inicio')).toBe(true)
    expect(game.groups.slice(-2).every((group) => group.items.length === 0)).toBe(true)
    expect(game.errors).toEqual([])
  } finally {
    workspace.dispose()
  }
})

test('aplicar a direção atual novamente conserva seus endereços', () => {
  for (const text of [
    'Jogo 2D › Kit dino, arrastar Tocar som de pulo',
    'Jogo 2D, Muitos, em Posição e tamanho',
    'Jogo 2D, Vida, coloque Desenhar as vidas',
  ]) {
    const current = currentStudioDirections(text)
    expect(currentStudioDirections(current)).toBe(current)
  }
})
