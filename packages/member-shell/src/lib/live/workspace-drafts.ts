import type { Project } from '@sistemazero/studio'

export interface LiveDraft {
  id: string
  scope: string
  token: string
  revision: number
  writerEpoch: number
  project: Project
  savedAt: number
}

/** Workspace ids are globally unique and bound to their owner by Members. Never read before authorization. */
export function liveDraftScope(workspaceId: string, learnerId: string, actorId: string): string {
  return JSON.stringify([workspaceId, learnerId, actorId])
}

export class LiveDraftJournal {
  private constructor(
    private readonly db: IDBDatabase,
    readonly scope: string,
    readonly id: string,
  ) {}

  static open(scope: string, deviceId: string): Promise<LiveDraftJournal> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sz-live-drafts', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('drafts', { keyPath: 'id' }).createIndex('scope', 'scope')
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Feche a outra aba para preparar o rascunho.'))
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(new LiveDraftJournal(db, scope, JSON.stringify([scope, deviceId])))
      }
    })
  }

  private write(action: (store: IDBObjectStore) => void): Promise<void> {
    // The transaction is opened synchronously, including during pagehide/unmount.
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('drafts', 'readwrite', { durability: 'strict' })
      tx.oncomplete = () => resolve()
      tx.onabort = () =>
        reject(tx.error ?? new Error('Não foi possível guardar o rascunho neste aparelho.'))
      tx.onerror = () => {} // onabort owns the final result
      try {
        action(tx.objectStore('drafts'))
      } catch (error) {
        tx.abort()
        reject(error)
      }
    })
  }

  stage(
    project: Project,
    revision: number,
    writerEpoch: number,
  ): { draft: LiveDraft; saved: Promise<void> } {
    const draft: LiveDraft = {
      id: this.id,
      scope: this.scope,
      token: crypto.randomUUID(),
      project: structuredClone(project),
      revision,
      writerEpoch,
      savedAt: Date.now(),
    }
    return {
      draft,
      saved: this.write((store) => {
        store.put(draft)
      }),
    }
  }

  async list(): Promise<LiveDraft[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('drafts', 'readonly')
      const request = tx.objectStore('drafts').index('scope').getAll(this.scope)
      request.onerror = () => reject(request.error)
      tx.onabort = () => reject(tx.error)
      tx.oncomplete = () =>
        resolve((request.result as LiveDraft[]).sort((a, b) => b.savedAt - a.savedAt))
    })
  }

  /** Acknowledging an old save must never delete or replace a newer local edit. */
  confirm(draft: LiveDraft, revision: number): Promise<void> {
    if (draft.scope !== this.scope) return Promise.reject(new Error('Rascunho de outro perfil.'))
    return this.write((store) => {
      const read = store.get(draft.id)
      read.onsuccess = () => {
        const current = read.result as LiveDraft | undefined
        if (!current || current.scope !== this.scope) return
        if (current.token === draft.token) store.delete(draft.id)
        else if (current.writerEpoch === draft.writerEpoch && revision > current.revision)
          store.put({ ...current, revision })
      }
    })
  }

  close(): void {
    this.db.close()
  }
}
