/**
 * Persistência em MEMÓRIA: testes, playground sem IndexedDB e o fallback do
 * host quando o navegador bloqueia o banco. Mesmas regras da local (clone
 * estrutural, sanitize na leitura), mais um `emit` para simular avisos
 * externos (nuvem, outra aba) e um `snapshot` para inspeção.
 */
import type { MoldaAsset } from '../core/model'
import { sanitizeMoldaAsset } from '../core/sanitize'
import type { MoldaPersistence, MoldaPersistenceEvent } from './persistence'

export interface MemoryPersistence extends MoldaPersistence {
  emit(event: MoldaPersistenceEvent): void
  snapshot(): MoldaAsset[]
  /** Substitui o conteúdo por fora (simula a outra aba gravando). */
  seed(assets: readonly MoldaAsset[]): void
}

export function createMemoryPersistence(initial: readonly MoldaAsset[] = []): MemoryPersistence {
  const records = new Map<string, MoldaAsset>()
  const listeners = new Set<(event: MoldaPersistenceEvent) => void>()
  for (const asset of initial) records.set(asset.id, structuredClone(asset))

  return {
    async loadAll() {
      const out: MoldaAsset[] = []
      for (const raw of records.values()) {
        const asset = sanitizeMoldaAsset(structuredClone(raw))
        if (asset) out.push(asset)
      }
      return out
    },
    async load(id) {
      const raw = records.get(id)
      return raw ? sanitizeMoldaAsset(structuredClone(raw)) : null
    },
    async save(asset) {
      records.set(asset.id, structuredClone(asset))
    },
    async saveMany(assets) {
      for (const asset of assets) records.set(asset.id, structuredClone(asset))
    },
    async remove(id) {
      records.delete(id)
    },
    async removeMany(ids) {
      for (const id of ids) records.delete(id)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit(event) {
      for (const listener of listeners) listener(event)
    },
    snapshot() {
      return [...records.values()].map((asset) => structuredClone(asset))
    },
    seed(assets) {
      records.clear()
      for (const asset of assets) records.set(asset.id, structuredClone(asset))
    },
  }
}
