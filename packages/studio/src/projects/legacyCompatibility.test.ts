import { beforeAll, describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Blockly from 'blockly/core'
import type { Project } from '#core'
import { generateProjectFiles } from '#generators'
import { normalizeSZIR } from '#ir'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { normalizeBlocksStateToFrames } from '../blockly/normalizeFrames'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { renderProjectToPreviewDoc } from '../preview/renderProject'
import { sanitizeProjectForHost } from '../state/projectStore'
import { migrateLegacyBlockProjectSnapshot } from './compatibility'

const fixturePath = join(import.meta.dir, '__fixtures__', 'game-2d-v019-course.szproject.json')

function legacyProject(): Project {
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as Project
}

function decodedScripts(doc: string): string {
  return [...doc.matchAll(/src="data:text\/javascript;base64,([^"]+)"/gi)]
    .map((match) => Buffer.from(match[1] ?? '', 'base64').toString('utf8'))
    .join('\n')
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

describe('compatibilidade do projeto real do curso — game-2d 0.19.0', () => {
  it('abre no Estúdio, separa as três áreas e ergue o temporizador periódico', () => {
    const sanitized = sanitizeProjectForHost(legacyProject())
    expect(sanitized).not.toBeNull()
    if (!sanitized) return

    expect(sanitized.ir && 'behavior' in sanitized.ir).toBe(true)
    expect(sanitized.files['script.js']).toContain('SZGame2D.onStart(')

    const migrated = normalizeBlocksStateToFrames(sanitized.blocksState) as {
      szBehaviorAreasVersion: number
      blocks: { blocks: Array<{ type: string }> }
    }
    expect(migrated.szBehaviorAreasVersion).toBe(3)
    expect(migrated.blocks.blocks.map((block) => block.type)).toEqual([
      'sz_frame_start',
      'sz_frame_events',
      'sz_frame_loops',
    ])

    const workspace = new Blockly.Workspace()
    try {
      expect(() => Blockly.serialization.workspaces.load(migrated, workspace)).not.toThrow()
      const ir = buildIRFromWorkspace(workspace)
      expect(ir.behavior.start.some((statement) => statement.type === 'g2d:setupStage')).toBe(true)
      expect(ir.behavior.events.filter((statement) => statement.type === 'g2d:onKey')).toHaveLength(
        2,
      )
      expect(ir.behavior.loops.map((statement) => statement.type)).toEqual([
        'g2d:updateEachFrame',
        'g2d:everyFrames',
      ])

      const files = generateProjectFiles({ ir, projectName: sanitized.name })
      expect(files['script.js']).toContain('SZGame2D.onStart(')
      expect(files['script.js']).toContain('SZGame2D.onKey("Space"')
      expect(files['script.js']).toContain('SZGame2D.gameLoop(')
      expect(files['script.js']).toContain('pontos >= alvo')
    } finally {
      workspace.dispose()
    }
  })

  it('o mural atualiza o snapshot em memória e mantém vitória, derrota e reinício', () => {
    const project = legacyProject()
    const migrated = migrateLegacyBlockProjectSnapshot(project)
    expect(migrated).not.toBe(project)
    expect(migrated.ir).toEqual(normalizeSZIR(project.ir!))
    expect(migrateLegacyBlockProjectSnapshot(migrated)).toBe(migrated)

    const scripts = decodedScripts(renderProjectToPreviewDoc(project))
    expect(scripts).toContain('SZGame2D.onStart(')
    expect(scripts).toContain('SZGame2D.restart()')
    expect(scripts).toContain('pontos >= alvo')
    expect(scripts).toContain('vidas <= 0')
  })

  it('não reescreve projeto da Ponte: o código da criança continua sagrado', () => {
    const project = legacyProject()
    project.mode = 'bridge'
    project.files['script.js'] = '// edição manual insubstituível'
    expect(migrateLegacyBlockProjectSnapshot(project)).toBe(project)
    expect(decodedScripts(renderProjectToPreviewDoc(project))).toContain(
      '// edição manual insubstituível',
    )
  })
})
