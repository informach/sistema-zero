import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '#blockly'
import { createEmptyProject } from '#core'
import type { SZIR } from '#ir'
import { countExtensionBlocksInProject, removeExtensionArtifacts } from './extensionsAdapter'

describe('extensionsAdapter', () => {
  it('remove blocos e nós IR da extensão game-2d', () => {
    const ir: SZIR = {
      html: [{ type: 'canvas', id: 'tela', width: 400, height: 300 }],
      css: [],
      js: [
        {
          type: 'g2d:createSprite',
          varName: 'jogador',
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          color: '#22d3ee',
        },
        { type: 'consoleLog', value: { type: 'str', value: 'mantém' } },
      ],
      extensions: [{ extensionId: 'game-2d' }],
    }
    const project = {
      ...createEmptyProject('p1', 'Projeto'),
      ir,
      blocksState: buildWorkspaceStateFromIR(ir),
      installedExtensions: [{ id: 'game-2d', version: '0.1.0', installedAt: 1 }],
    }

    expect(countExtensionBlocksInProject(project, 'game-2d')).toBe(1)

    const cleaned = removeExtensionArtifacts(project, 'game-2d')
    expect(cleaned.ir?.extensions).toEqual([])
    expect(cleaned.ir?.js).toEqual([
      { type: 'consoleLog', value: { type: 'str', value: 'mantém' } },
    ])
    expect(
      countExtensionBlocksInProject({ ...project, blocksState: cleaned.blocksState }, 'game-2d'),
    ).toBe(0)
  })
})
