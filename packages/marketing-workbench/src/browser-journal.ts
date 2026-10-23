import {
  batchOperationSchema,
  operationSchema,
  projectCreateSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'

const common = {
  id: z.string().uuid(),
  scope: z.string(),
  createdAt: z.string(),
  state: z.enum(['local', 'confirmed', 'conflict', 'blocked']),
  error: z.string().nullable(),
  result: z.unknown().optional(),
  resolvedAt: z.string().optional(),
  replacementId: z.string().uuid().nullable().optional(),
}
export const journalEntrySchema = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('operation'), input: operationSchema }),
  z.object({ ...common, kind: z.literal('batch'), input: batchOperationSchema }),
  z.object({ ...common, kind: z.literal('project'), input: projectCreateSchema }),
])
export type JournalEntry = z.infer<typeof journalEntrySchema>
export interface MutationJournal {
  entries(): Promise<JournalEntry[]>
  add(entry: JournalEntry): Promise<void>
  resolve(ids: string[], replacement: JournalEntry | null): Promise<void>
  settle(
    id: string,
    state: JournalEntry['state'],
    result: unknown,
    error: string | null,
  ): Promise<void>
}
/** IndexedDB commit precedes network I/O. An unavailable/quota-full journal prevents the mutation. */
export class BrowserJournal implements MutationJournal {
  private connection: Promise<IDBDatabase> | undefined
  constructor(private readonly scope: string) {}
  private db() {
    this.connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      let abandoned = false
      const request = indexedDB.open('sistema-zero-marketing-drafts', 1)
      request.onupgradeneeded = () => {
        request.result
          .createObjectStore('mutations', { keyPath: 'id' })
          .createIndex('scope', 'scope')
      }
      request.onerror = () => {
        abandoned = true
        this.connection = undefined
        reject(request.error ?? new Error('O navegador não conseguiu preservar o rascunho'))
      }
      request.onblocked = () => {
        abandoned = true
        this.connection = undefined
        reject(new Error('Feche as outras abas do marketing para atualizar o armazenamento local'))
      }
      request.onsuccess = () => {
        if (abandoned) {
          request.result.close()
          return
        }
        request.result.onversionchange = () => {
          request.result.close()
          this.connection = undefined
        }
        resolve(request.result)
      }
    })
    return this.connection
  }
  async entries() {
    const db = await this.db()
    return new Promise<JournalEntry[]>((resolve, reject) => {
      const tx = db.transaction('mutations', 'readonly'),
        request = tx.objectStore('mutations').index('scope').getAll(this.scope)
      tx.oncomplete = () => {
        try {
          resolve(z.array(journalEntrySchema).parse(request.result))
        } catch (error) {
          reject(error)
        }
      }
      tx.onabort = () => reject(tx.error ?? new Error('Não foi possível ler seus rascunhos'))
    })
  }
  async add(entry: JournalEntry) {
    const value = journalEntrySchema.parse(entry)
    if (value.scope !== this.scope) throw new Error('O rascunho pertence a outra conta')
    const db = await this.db()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('mutations', 'readwrite'),
        store = tx.objectStore('mutations'),
        request = store.get(value.id)
      let issue: unknown
      request.onsuccess = () => {
        try {
          if (request.result) {
            const previous = journalEntrySchema.parse(request.result)
            if (
              JSON.stringify(previous.input) !== JSON.stringify(value.input) ||
              previous.scope !== value.scope
            ) {
              issue = new Error('Este pedido já foi usado com outro conteúdo')
              tx.abort()
            }
          } else store.add(value)
        } catch (error) {
          issue = error
          tx.abort()
        }
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () =>
        reject(
          issue ?? tx.error ?? new Error('Não foi possível preservar o rascunho; nada foi enviado'),
        )
    })
  }
  async settle(id: string, state: JournalEntry['state'], result: unknown, error: string | null) {
    const db = await this.db()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('mutations', 'readwrite'),
        store = tx.objectStore('mutations'),
        request = store.get(id)
      let issue: unknown
      request.onsuccess = () => {
        try {
          const entry = journalEntrySchema.parse(request.result)
          if (entry.scope !== this.scope) throw new Error('O pedido pertence a outra conta')
          // A late failure from another tab cannot downgrade a confirmed receipt.
          if (entry.state !== 'confirmed' && entry.state !== 'conflict')
            store.put({ ...entry, state, result, error })
        } catch (error) {
          issue = error
          tx.abort()
        }
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () =>
        reject(issue ?? tx.error ?? new Error('Não foi possível guardar a confirmação'))
    })
  }
  async resolve(ids: string[], replacement: JournalEntry | null) {
    if (replacement && replacement.scope !== this.scope) throw new Error('Outra conta')
    const db = await this.db()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('mutations', 'readwrite'),
        store = tx.objectStore('mutations')
      let issue: unknown,
        completed = 0
      const finish = () => {
        if (++completed === ids.length && replacement)
          store.add(journalEntrySchema.parse(replacement))
      }
      for (const id of ids) {
        const request = store.get(id)
        request.onsuccess = () => {
          try {
            const entry = journalEntrySchema.parse(request.result)
            if (
              entry.scope !== this.scope ||
              !['conflict', 'blocked'].includes(entry.state) ||
              entry.resolvedAt
            )
              throw new Error('O rascunho já mudou; confira a resolução atual')
            store.put({
              ...entry,
              resolvedAt: new Date().toISOString(),
              replacementId: replacement?.id ?? null,
            })
            finish()
          } catch (error) {
            issue = error
            tx.abort()
          }
        }
      }
      tx.oncomplete = () => resolve()
      tx.onabort = () =>
        reject(issue ?? tx.error ?? new Error('Não foi possível preservar a resolução'))
    })
  }
}
