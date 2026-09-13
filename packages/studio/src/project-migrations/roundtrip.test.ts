import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { createEmptyProject } from '../core/project'
import { isDocumentRecord } from '../core/projectDocument'
import { generateProjectFiles } from '../generators'
import { SZIRV2Schema } from '../ir/schema'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { gameKitBlocks } from '../official-extensions/game-2d-advanced/blocks'
import { parseProjectFilesWithDiagnostics } from '../parsers/project'
import { migrateProjectDocument } from './index'

describe('conversão executável e editável', () => {
  it('o mapa centralizado ganha função editável que sobrevive à Ponte', async () => {
    const { document } = await migrateProjectDocument({
      ...createEmptyProject('tiles', 'Mapa'),
      formatVersion: 1,
      ir: null,
      blocksState: {
        szBehaviorAreasVersion: 7,
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_js_var_create',
                    fields: { NAME: 'mapa' },
                    inputs: { VALUE: { shadow: { type: 'sz_val_number', fields: { NUM: 0 } } } },
                    next: {
                      block: {
                        id: 'desenho',
                        type: 'sz_g2d_draw_tilemap',
                        fields: { MAP: 'mapa', X: 12, Y: 34, SIZE: 64 },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    })
    const workspace = new Blockly.Workspace()
    try {
      if (!isDocumentRecord(document.blocksState)) throw new Error('Sem blocos')
      Blockly.serialization.workspaces.load(document.blocksState, workspace)
      expect(workspace.getBlockById('desenho')?.type).toBe('sz_js_call_function')
      const ir = buildIRFromWorkspace(workspace)
      expect(ir.behavior.molds).toContainEqual(
        expect.objectContaining({
          type: 'funcDecl',
          name: 'desenharMapaCentralizado',
          params: ['pincel', 'mapa', 'deslocamentoX', 'deslocamentoY', 'tamanho'],
        }),
      )
      const files = generateProjectFiles({ ir, projectName: 'Mapa' })
      expect(files['script.js']).toContain('desenharMapaCentralizado(ctx, mapa, 12, 34, 64);')
      expect(files['script.js']).toContain(
        'SZGame2D.centerTileMap(pincel, mapa, deslocamentoX, deslocamentoY, tamanho);',
      )
      expect(parseProjectFilesWithDiagnostics(files).diagnostics).toEqual([])
    } finally {
      workspace.dispose()
    }
  })
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
    registerExtensionBlocks(gameKitBlocks)
  })

  it('câmera e corações continuam editáveis e conservam a dependência do motor', async () => {
    const { document } = await migrateProjectDocument({
      ...createEmptyProject('camera', 'Câmera'),
      formatVersion: 1,
      ir: null,
      blocksState: {
        szBehaviorAreasVersion: 7,
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_frame_start',
              id: 'start',
              inputs: {
                CHILDREN: {
                  block: {
                    type: 'sz_g2d_set_camera',
                    id: 'camera',
                    fields: { X: 42, Y: 73 },
                    next: {
                      block: {
                        type: 'sz_g2d_draw_hearts',
                        id: 'vidas',
                        fields: { COUNT: 3, X: 20, Y: 30, SIZE: 22, COLOR: '#ff0000' },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    })
    const workspace = new Blockly.Workspace()
    try {
      if (!isDocumentRecord(document.blocksState)) throw new Error('Sem blocos convertidos')
      Blockly.serialization.workspaces.load(document.blocksState, workspace)
      expect(workspace.getBlockById('camera')?.type).toBe('sz_js_method_on')
      expect(workspace.getBlockById('vidas')?.type).toBe('sz_js_method_on')
      const ir = buildIRFromWorkspace(workspace)
      expect(ir.extensions).toContainEqual({ extensionId: 'game-2d' })
      expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
      const files = generateProjectFiles({ ir, projectName: 'Câmera' })
      expect(files['script.js']).toContain('SZGame2D.setCamera(42, 73);')
      expect(files['script.js']).toContain('SZGame2D.drawHearts(ctx, 3, 20, 30, 22, "#ff0000");')
      expect(parseProjectFilesWithDiagnostics(files).diagnostics).toEqual([])
    } finally {
      workspace.dispose()
    }
  })

  it('um mapa RPG antigo vira criação explícita e evento, sem virar rascunho', async () => {
    const { document } = await migrateProjectDocument({
      ...createEmptyProject('rpg', 'Aventura'),
      formatVersion: 1,
      ir: null,
      blocksState: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_gk_rpg_on_map',
              id: 'map-event',
              fields: { MAP: 'vila' },
            },
          ],
        },
      },
    })
    const workspace = new Blockly.Workspace()
    try {
      if (!isDocumentRecord(document.blocksState)) throw new Error('Sem blocos convertidos')
      Blockly.serialization.workspaces.load(document.blocksState, workspace)
      const ir = buildIRFromWorkspace(workspace)
      expect(ir.behavior.start).toContainEqual(
        expect.objectContaining({ type: 'gk:rpgCreateMap', map: 'vila', bounds: 'unbounded' }),
      )
      expect(ir.behavior.events).toContainEqual(
        expect.objectContaining({ type: 'gk:rpgOnEnterMap', map: 'vila', __id: 'map-event' }),
      )
      const files = generateProjectFiles({ ir, projectName: 'Aventura' })
      expect(files['script.js']).toContain('"unbounded"')
      const parsed = parseProjectFilesWithDiagnostics(files)
      expect(parsed.diagnostics).toEqual([])
      expect(parsed.ir.behavior.start).toContainEqual(
        expect.objectContaining({ type: 'gk:rpgCreateMap', bounds: 'unbounded' }),
      )
    } finally {
      workspace.dispose()
    }
  })

  it('conserva o número inicial depois de carregar os blocos no editor atual', async () => {
    const raw = {
      ...createEmptyProject('old-score', 'Placar'),
      formatVersion: 1,
      ir: null,
      blocksState: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_g2d_score',
              id: 'points',
              fields: { NAME: 'pontos', INITIAL: 37 },
            },
          ],
        },
      },
    }
    const { document } = await migrateProjectDocument(raw)
    const workspace = new Blockly.Workspace()
    try {
      if (!isDocumentRecord(document.blocksState)) throw new Error('Conversão sem blocos')
      Blockly.serialization.workspaces.load(document.blocksState, workspace)
      const ir = buildIRFromWorkspace(workspace)
      const js = generateProjectFiles({ ir, projectName: 'Placar' })['script.js']
      expect(workspace.getBlockById('points')?.type).toBe('sz_js_var_create')
      expect(js).toContain('let pontos = 37;')
    } finally {
      workspace.dispose()
    }
  })
})
