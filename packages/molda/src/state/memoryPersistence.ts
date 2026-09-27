/**
 * Persistência em MEMÓRIA: testes, playground sem IndexedDB e o fallback do
 * host quando o navegador bloqueia o banco. Mesmas regras da local (clone
 * estrutural, versões protegidas, lotes atômicos e recuperação), mais um `emit` para simular avisos
 * externos (nuvem, outra aba) e um `snapshot` para inspeção.
 */
import { type MoldaAssetSummary, summarizeAsset } from '../core/assetSummary'
import {
  type MoldaDocumentRead,
  type MoldaReadIssue,
  moldaReadIssue,
  readMoldaDocument,
  readMoldaDocumentForId,
} from '../core/documentReader'
import {
  assertMoldaDocumentWritable,
  checkMoldaDocumentVersion,
  MOLDA_DOCUMENT_WRITE_VERSION,
  MoldaUnsupportedVersionError,
} from '../core/documentVersion'
import type { MoldaAsset } from '../core/model'
import type { MoldaPersistence, MoldaPersistenceEvent } from './persistence'

export interface MemoryPersistence extends MoldaPersistence {
  emit(event: MoldaPersistenceEvent): void
  /** Cloned assets for inspection; known native envelope tags are omitted. */
  snapshot(): MoldaAsset[]
  /** Substitui o conteúdo por fora (simula a outra aba gravando). */
  seed(assets: readonly MoldaAsset[]): void
}

export function createMemoryPersistence(initial: readonly MoldaAsset[] = []): MemoryPersistence {
  const records = new Map<string, MoldaAsset & { formatVersion?: number }>()
  const recoveries = new Map<string, unknown>()
  const listeners = new Set<(event: MoldaPersistenceEvent) => void>()
  let readIssues: MoldaReadIssue[] = []
  for (const asset of initial) records.set(asset.id, structuredClone(asset))

  function matchesRevision(id: string, expected: number | null): boolean {
    if (!records.has(id)) return expected === null
    const read = readMoldaDocument(records.get(id))
    if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
    return read.status === 'valid' && read.asset.id === id && read.asset.updatedAt === expected
  }

  function readOne(id: string): MoldaDocumentRead | null {
    return records.has(id) ? readMoldaDocumentForId(structuredClone(records.get(id)), id) : null
  }

  function readAll(): MoldaAsset[] {
    const assets: MoldaAsset[] = []
    readIssues = []
    for (const id of records.keys()) {
      const read = readOne(id)
      if (read?.status === 'valid') assets.push(read.asset)
      else if (read) readIssues.push(moldaReadIssue(id, read))
    }
    return assets
  }

  function assertNotFuture(raw: unknown): void {
    const version = checkMoldaDocumentVersion(raw)
    if (version.status === 'unsupported') throw new MoldaUnsupportedVersionError(version.version)
  }

  /** No await/yield between checking and committing: the entire batch is one operation. */
  function writeMany(assets: readonly MoldaAsset[]): void {
    for (const asset of assets) assertMoldaDocumentWritable(asset)
    // Prepare every clone before touching either map. A failed final clone rolls back all.
    const incoming = new Map(
      assets.map((asset) => [
        asset.id,
        structuredClone({ ...asset, formatVersion: MOLDA_DOCUMENT_WRITE_VERSION }),
      ]),
    )
    const backups = new Map<string, unknown>()
    for (const id of incoming.keys()) {
      if (!records.has(id)) continue
      const raw = records.get(id)
      assertNotFuture(raw)
      const read = readMoldaDocumentForId(raw, id)
      if (!recoveries.has(id) && (read.status !== 'valid' || read.legacy)) backups.set(id, raw)
    }
    for (const [id, raw] of backups) recoveries.set(id, raw)
    for (const [id, asset] of incoming) records.set(id, asset)
  }

  function removeMany(ids: readonly string[]): void {
    for (const id of ids) {
      assertNotFuture(records.get(id))
      assertNotFuture(recoveries.get(id))
    }
    for (const id of ids) {
      records.delete(id)
      recoveries.delete(id)
    }
  }

  return {
    async listSummaries() {
      const summaries: MoldaAssetSummary[] = []
      readIssues = []
      for (const id of records.keys()) {
        const read = readOne(id)
        if (read?.status === 'valid') summaries.push(summarizeAsset(read.asset))
        else if (read) readIssues.push(moldaReadIssue(id, read))
      }
      return summaries
    },
    async loadAll() {
      return readAll()
    },
    async load(id) {
      const read = readOne(id)
      if (read?.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
      return read?.status === 'valid' ? read.asset : null
    },
    async read(id) {
      return readOne(id)
    },
    async loadRecovery(id) {
      return structuredClone(recoveries.get(id))
    },
    getReadIssues: () => readIssues,
    async save(asset) {
      writeMany([asset])
    },
    async saveIfUnchanged(asset, expectedUpdatedAt) {
      assertMoldaDocumentWritable(asset)
      if (!matchesRevision(asset.id, expectedUpdatedAt)) return false
      writeMany([asset])
      return true
    },
    async saveMany(assets) {
      writeMany(assets)
    },
    async remove(id) {
      removeMany([id])
    },
    async removeIfUnchanged(id, expectedUpdatedAt) {
      if (!matchesRevision(id, expectedUpdatedAt)) return false
      removeMany([id])
      return true
    },
    async removeMany(ids) {
      removeMany(ids)
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
      return [...records.values()].map((raw) => {
        const clone = structuredClone(raw)
        if (clone.formatVersion === MOLDA_DOCUMENT_WRITE_VERSION) delete clone.formatVersion
        return clone
      })
    },
    seed(assets) {
      const incoming = assets.map((asset) => structuredClone(asset))
      records.clear()
      recoveries.clear()
      readIssues = []
      for (const asset of incoming) records.set(asset.id, asset)
    },
  }
}
