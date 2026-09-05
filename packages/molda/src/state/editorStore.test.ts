import { describe, expect, test } from 'bun:test'
import { COPY } from '../core/copy'
import type { MoldaAsset, MoldaSkyAsset } from '../core/model'
import { skyPreset } from '../sky/params'
import { makeSky } from '../testing/fixtures'
import { createEditorStore } from './editorStore'
import { createMemoryPersistence } from './memoryPersistence'
import { MoldaStorageBudgetError } from './persistence'

function withPreset(asset: MoldaSkyAsset, preset: 'dia' | 'noite' | 'nublado'): MoldaSkyAsset {
  return { ...asset, params: skyPreset(preset) }
}

function presetOf(asset: MoldaAsset | undefined): string | null {
  return asset?.kind === 'sky' ? asset.params.preset : null
}

describe('editorStore', () => {
  test('commit registra undo, carimba updatedAt e salva depois do debounce', async () => {
    const initial = makeSky({ updatedAt: 100 })
    const p = createMemoryPersistence([initial])
    const saved: string[] = []
    let clock = 100
    const store = createEditorStore({
      asset: initial,
      persistence: p,
      autosaveMs: 10,
      now: () => clock,
      onSaved: (a) => saved.push(a.kind === 'sky' ? a.params.preset : ''),
    })
    clock = 200
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'noite'))
    expect(store.getState().saveState).toBe('dirty')
    expect(store.getState().canUndo).toBe(true)
    expect(store.getState().asset.updatedAt).toBe(200)
    await Bun.sleep(30)
    expect(store.getState().saveState).toBe('saved')
    expect(saved).toEqual(['noite'])
    expect(presetOf(p.snapshot()[0])).toBe('noite')
  })

  test('relógio repetido ainda avança a versão; miniatura também é uma alteração persistida', async () => {
    const initial = makeSky({ updatedAt: 100 })
    const p = createMemoryPersistence([initial])
    const store = createEditorStore({ asset: initial, persistence: p, now: () => 100 })

    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'noite'))
    expect(store.getState().asset.updatedAt).toBe(101)
    store.getState().setThumb('data:image/jpeg;base64,BBBB')
    expect(store.getState().asset.updatedAt).toBe(102)
    await store.getState().flush()
    expect(p.snapshot()[0]).toMatchObject({
      updatedAt: 102,
      thumb: 'data:image/jpeg;base64,BBBB',
    })
  })

  test('undo/redo voltam o conteúdo e também salvam', async () => {
    const p = createMemoryPersistence([makeSky()])
    const store = createEditorStore({ asset: makeSky(), persistence: p, autosaveMs: 5 })
    const sky = store.getState().asset as MoldaSkyAsset
    store.getState().commit(withPreset(sky, 'noite'))
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'nublado'))
    store.getState().undo()
    expect((store.getState().asset as MoldaSkyAsset).params.preset).toBe('noite')
    expect(store.getState().canRedo).toBe(true)
    store.getState().redo()
    expect((store.getState().asset as MoldaSkyAsset).params.preset).toBe('nublado')
    store.getState().undo()
    store.getState().undo()
    expect((store.getState().asset as MoldaSkyAsset).params.preset).toBe('entardecer')
    expect(store.getState().canUndo).toBe(false)
    await store.getState().flush()
    expect(presetOf(p.snapshot()[0])).toBe('entardecer')
  })

  test('replace não entra no histórico; commitGesture fecha o gesto', () => {
    const store = createEditorStore({
      asset: makeSky(),
      persistence: createMemoryPersistence(),
      autosaveMs: 1000,
    })
    const before = store.getState().asset as MoldaSkyAsset
    store.getState().replace(withPreset(before, 'noite'))
    expect(store.getState().canUndo).toBe(false)
    store.getState().commitGesture(before, withPreset(before, 'nublado'))
    expect(store.getState().canUndo).toBe(true)
    store.getState().undo()
    expect((store.getState().asset as MoldaSkyAsset).params.preset).toBe('entardecer')
    store.getState().dispose()
  })

  test('flush drena mudanças feitas DURANTE a gravação', async () => {
    const gate: { release: (() => void) | null } = { release: null }
    const p = createMemoryPersistence()
    const originalSave = p.save
    let calls = 0
    p.save = async (asset) => {
      calls += 1
      if (calls === 1) {
        await new Promise<void>((resolve) => {
          gate.release = resolve
        })
      }
      await originalSave(asset)
    }
    const store = createEditorStore({ asset: makeSky(), persistence: p, autosaveMs: 1 })
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'noite'))
    const flushing = store.getState().flush()
    await Bun.sleep(5)
    expect(store.getState().saveState).toBe('saving')
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'nublado'))
    gate.release?.()
    await flushing
    expect(calls).toBe(2)
    expect(store.getState().saveState).toBe('saved')
    expect(presetOf(p.snapshot()[0])).toBe('nublado')
  })

  test('erro de orçamento vira saveState error com a mensagem da galeria', async () => {
    const p = createMemoryPersistence()
    p.save = async () => {
      throw new MoldaStorageBudgetError()
    }
    const store = createEditorStore({ asset: makeSky(), persistence: p, autosaveMs: 1 })
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'noite'))
    await store.getState().flush()
    expect(store.getState().saveState).toBe('error')
    expect(store.getState().saveError).toBe(COPY.gallery.storageBudget)
  })

  test('um flush SEM nada pendente não trava o salvamento seguinte (regressão do StrictMode)', async () => {
    const p = createMemoryPersistence([makeSky()])
    const store = createEditorStore({ asset: makeSky(), persistence: p, autosaveMs: 5 })
    await store.getState().flush()
    await store.getState().flush()
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'noite'))
    await Bun.sleep(30)
    expect(store.getState().saveState).toBe('saved')
    expect(presetOf(p.snapshot()[0])).toBe('noite')
    // E o flush explícito depois de um commit também grava.
    store.getState().commit(withPreset(store.getState().asset as MoldaSkyAsset, 'nublado'))
    await store.getState().flush()
    expect(presetOf(p.snapshot()[0])).toBe('nublado')
  })

  test('commit do mesmo objeto é ignorado', () => {
    const store = createEditorStore({ asset: makeSky(), persistence: createMemoryPersistence() })
    store.getState().commit(store.getState().asset)
    expect(store.getState().canUndo).toBe(false)
    expect(store.getState().saveState).toBe('saved')
    store.getState().dispose()
  })
})
