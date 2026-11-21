import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { loadWorkspaceState } from './loadWorkspaceState'
import { ensureBlocklyInitialized } from './setup'

/**
 * Revisão do lote 3 (21/11/2026): o `load` do Blockly 12 que lança no meio deixava o desfazer
 * desligado e um grupo de eventos aberto para o próximo projeto da página. Um serializador de
 * teste que lança no `load` faz o papel da sequência longa demais (que, no Bun, só estoura muito
 * mais longe que no Chromium).
 */
const THROWING = 'sz-test-throwing-serializer'

beforeAll(() => {
  ensureBlocklyInitialized()
})

afterEach(() => {
  if (Blockly.registry.hasItem(Blockly.registry.Type.SERIALIZER, THROWING))
    Blockly.registry.unregister(Blockly.registry.Type.SERIALIZER, THROWING)
})

describe('loadWorkspaceState', () => {
  it('quando o load lança, o desfazer e o grupo de eventos voltam ao que eram', () => {
    Blockly.registry.register(Blockly.registry.Type.SERIALIZER, THROWING, {
      priority: 0,
      save: () => null,
      clear: () => {},
      load: () => {
        throw new RangeError('Maximum call stack size exceeded')
      },
    })
    const workspace = new Blockly.Workspace()
    try {
      expect(Blockly.Events.getRecordUndo()).toBe(true)
      expect(Blockly.Events.getGroup()).toBe('')
      expect(() => loadWorkspaceState({ [THROWING]: {} }, workspace)).toThrow(RangeError)
      expect(Blockly.Events.getRecordUndo()).toBe(true)
      expect(Blockly.Events.getGroup()).toBe('')
    } finally {
      workspace.dispose()
    }
  })

  it('a carga que dá certo é a do Blockly, sem mudar nada', () => {
    const workspace = new Blockly.Workspace()
    try {
      loadWorkspaceState(
        {
          blocks: {
            languageVersion: 0,
            blocks: [{ type: 'sz_frame_start', x: 0, y: 0 }],
          },
        },
        workspace,
      )
      expect(workspace.getTopBlocks(false).map((block) => block.type)).toEqual(['sz_frame_start'])
      expect(Blockly.Events.getRecordUndo()).toBe(true)
      expect(Blockly.Events.getGroup()).toBe('')
    } finally {
      workspace.dispose()
    }
  })
})

// Full review final (21/11/2026): o editor Python, a conferência prévia do rascunho Python e a
// captura chamavam o `load` cru. O estado que ele deixa para trás quando lança é GLOBAL do Blockly
// (o "Desfazer" de todo editor da página), então ninguém mais pode chamá-lo fora daqui.
it('nenhum código do Estúdio chama o load do Blockly fora do carregador seguro', async () => {
  const { readdir, readFile } = await import('node:fs/promises')
  const { join, sep } = await import('node:path')
  const root = join(import.meta.dir, '..')
  const offenders: string[] = []
  const walk = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') await walk(path)
      } else if (
        /\.tsx?$/.test(entry.name) &&
        !/\.(test|cases)\.tsx?$/.test(entry.name) &&
        entry.name !== 'loadWorkspaceState.ts' &&
        (await readFile(path, 'utf8')).includes('serialization.workspaces.load(')
      )
        offenders.push(
          path
            .slice(root.length + 1)
            .split(sep)
            .join('/'),
        )
    }
  }
  await walk(root)
  expect(offenders).toEqual([])
})
