/**
 * A galeria e um armazenamento que muda POR FORA (o host que sincroniza com a nuvem avisa
 * `sync-start`/`changed`/`sync-end` pelo `subscribe` opcional do `PintaPersistence`): a
 * lista abre com o local, relê quando algo chega (coalescido) e `syncing` só cai depois da
 * última releitura.
 */
import { describe, expect, it } from 'bun:test'
import { createPixelSpriteAsset } from '../core/project'
import { createMemoryPersistence } from './memoryPersistence'
import type { PintaPersistence, PintaPersistenceEvent } from './persistence'

const { createGalleryStore } = await import('./galleryStore')

/** Um armazenamento que emite os eventos (como o wrapper da nuvem do host). */
function syncingPersistence(seed = [createPixelSpriteAsset({ name: 'local', frameSize: 8 })]) {
  const inner = createMemoryPersistence(seed)
  const listeners = new Set<(event: PintaPersistenceEvent) => void>()
  const persistence: PintaPersistence = {
    ...inner,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  const emit = (event: PintaPersistenceEvent) => {
    for (const listener of listeners) listener(event)
  }
  return { persistence, inner, emit }
}

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

describe('galeria × armazenamento que sincroniza por fora', () => {
  it('abre com o local; `changed` relê (coalescido) e o que chegou aparece sem novo load do host; `syncing` só cai no fim', async () => {
    const { persistence, inner, emit } = syncingPersistence()
    const store = createGalleryStore(persistence)
    store.getState().attachPersistence()
    await store.getState().load()
    expect(store.getState().assets.map((a) => a.name)).toEqual(['local'])
    expect(store.getState().syncing).toBe(false)

    emit({ type: 'sync-start' })
    expect(store.getState().syncing).toBe(true)
    // Desceu um desenho de outro aparelho (gravado DIRETO no armazenamento, fora da store).
    await inner.persistAssets([createPixelSpriteAsset({ name: 'da-nuvem', frameSize: 8 })])
    emit({ type: 'changed' })
    emit({ type: 'changed' })
    emit({ type: 'changed' })
    // Ainda não (coalescido); logo depois, sim.
    expect(store.getState().assets.map((a) => a.name)).toEqual(['local'])
    await tick(300)
    expect(
      store
        .getState()
        .assets.map((a) => a.name)
        .sort(),
    ).toEqual(['da-nuvem', 'local'])
    expect(store.getState().syncing).toBe(true)
    // O fim relê mais uma vez (o que chegou nos últimos ms) e só então libera `syncing`.
    await inner.persistAssets([createPixelSpriteAsset({ name: 'ultimo', frameSize: 8 })])
    emit({ type: 'sync-end' })
    await tick(20)
    expect(
      store
        .getState()
        .assets.map((a) => a.name)
        .sort(),
    ).toEqual(['da-nuvem', 'local', 'ultimo'])
    expect(store.getState().syncing).toBe(false)
    // Sem "Carregando…" no meio: `loaded` nunca caiu.
    expect(store.getState().loaded).toBe(true)
  })

  it('sem `subscribe` (IndexedDB do perfil, aula) nada muda: `syncing` fica false', async () => {
    const store = createGalleryStore(createMemoryPersistence())
    expect(typeof store.getState().attachPersistence()).toBe('function')
    await store.getState().load()
    expect(store.getState().syncing).toBe(false)
  })
})
