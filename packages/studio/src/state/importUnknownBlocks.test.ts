import { afterEach, describe, expect, it, mock } from 'bun:test'
import type { InstalledExtension } from '#core'

// idb-keyval é mockado (IndexedDB não existe no happy-dom) — mesmo no-op padrão
// de persistence.test.ts / extensionImportConsent.test.ts.
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async () => undefined),
  delMany: mock(async () => undefined),
  get: mock(async (): Promise<unknown> => undefined),
  getMany: mock(async (): Promise<unknown[]> => []),
  keys: mock(async (): Promise<unknown[]> => []),
  set: mock(async () => undefined),
  setMany: mock(async () => undefined),
  update: mock(async () => undefined),
}))

const { collectUnknownBlockTypes, useProjectStore } = await import('./projectStore')

const baseFiles = { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' }

const state = (blocks: unknown[]) => ({ blocks: { languageVersion: 0, blocks } })

describe('collectUnknownBlockTypes', () => {
  it('coleta tipos fora da allowlist, inclusive aninhados/na cadeia next, ordenados e sem repetição', () => {
    const raw = state([
      {
        type: 'sz_frame_behavior',
        inputs: {
          CHILDREN: {
            block: {
              type: 'g2d:bloco_do_futuro',
              next: { block: { type: 'zz_outro_desconhecido' } },
            },
          },
        },
      },
      { type: 'g2d:bloco_do_futuro' },
    ])
    expect(collectUnknownBlockTypes(raw, [])).toEqual([
      'g2d:bloco_do_futuro',
      'zz_outro_desconhecido',
    ])
  })

  it('extensão instalada libera os blocos dela (não são "desconhecidos")', () => {
    const raw = state([{ type: 'sz_g2d_create_sprite' }])
    expect(collectUnknownBlockTypes(raw, [])).toEqual(['sz_g2d_create_sprite'])
    const g2d = [{ id: 'game-2d', version: '1.0.0' }] as InstalledExtension[]
    expect(collectUnknownBlockTypes(raw, g2d)).toEqual([])
  })

  it('forma inválida devolve lista vazia (o describe* cobre esses casos)', () => {
    expect(collectUnknownBlockTypes(null, [])).toEqual([])
    expect(collectUnknownBlockTypes({ blocks: 'nope' }, [])).toEqual([])
  })
})

describe('import: aviso nomeia os blocos desconhecidos', () => {
  afterEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('blocksState com tipo desconhecido cai (all-or-nothing) mas o aviso DIZ o tipo', async () => {
    const { project, warnings } = await useProjectStore.getState().importProjectFromJSON({
      name: 'Do futuro',
      files: baseFiles,
      blocksState: state([{ type: 'sz_bloco_inexistente' }]),
    })
    expect(project.blocksState).toBeNull()
    expect(warnings.some((w) => w.includes('sz_bloco_inexistente'))).toBe(true)
  })
})
