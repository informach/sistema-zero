import { actionReceiptSchema, canonicalJson, idSchema } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { actionDefinition } from './action-definition'
import type { WorkbenchPort } from './port'

type ActionPort = Pick<WorkbenchPort, 'identity' | 'userId' | 'request'>
export const actionJournalEvent = 'marketing-action-journal'
export type PendingAction = {
  key: string
  operationId: string
  path: string
  input: Record<string, unknown>
}
function changed() {
  window.dispatchEvent(new Event(actionJournalEvent))
}
function openJournal() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('sistema-zero-marketing-actions', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('pending')
    }
    request.onerror = () =>
      reject(request.error ?? new Error('Não foi possível preservar o pedido. Nada foi enviado.'))
    let abandoned = false
    request.onblocked = () => {
      abandoned = true
      reject(new Error('Feche outras abas para atualizar o armazenamento de pedidos.'))
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      if (abandoned) request.result.close()
      else resolve(request.result)
    }
  })
}
/** Commit an operation identity before requesting approval/distribution. A lost response or
 * renderer restart reuses it; nothing is submitted automatically without the user's action. */
async function identity(key: string, acknowledge?: string): Promise<string> {
  const db = await openJournal()
  try {
    return await new Promise<string>((resolve, reject) => {
      const tx = db.transaction('pending', 'readwrite', { durability: 'strict' }),
        store = tx.objectStore('pending'),
        request = store.get(key)
      let id = '',
        issue: unknown
      request.onsuccess = () => {
        try {
          id = request.result === undefined ? crypto.randomUUID() : idSchema.parse(request.result)
          if (acknowledge) {
            if (request.result === acknowledge) store.delete(key)
          } else if (request.result === undefined) store.add(id, key)
        } catch (error) {
          issue = error
          tx.abort()
        }
      }
      tx.oncomplete = () => {
        changed()
        resolve(id)
      }
      tx.onabort = () =>
        reject(
          issue ?? tx.error ?? new Error('Não foi possível preservar o pedido. Nada foi enviado.'),
        )
    })
  } finally {
    db.close()
  }
}
export async function workspaceAction<T>(
  port: ActionPort,
  path: string,
  input: Record<string, unknown>,
  resultSchema: z.ZodType<T>,
): Promise<T> {
  const key = canonicalJson([port.identity, port.userId, path, input]),
    operationId = await identity(key)
  const result = resultSchema.parse(await port.request(path, 'POST', { ...input, operationId }))
  await identity(key, operationId)
  return result
}

export async function pendingWorkspaceActions(port: ActionPort, projectId: string) {
  idSchema.parse(projectId)
  const prefix = `${canonicalJson([port.identity, port.userId]).slice(0, -1)},"/projects/${projectId}/`,
    db = await openJournal()
  try {
    return await new Promise<{ items: PendingAction[]; more: boolean }>((resolve, reject) => {
      const tx = db.transaction('pending', 'readonly'),
        request = tx
          .objectStore('pending')
          .openCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`)),
        items: PendingAction[] = []
      let issue: unknown,
        more = false
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        if (items.length === 50) {
          more = true
          return
        }
        try {
          const key = z.string().max(32000).parse(cursor.key),
            [identity, userId, path, input] = z
              .tuple([z.string(), z.string(), z.string(), z.record(z.string(), z.unknown())])
              .parse(JSON.parse(key))
          if (identity !== port.identity || userId !== port.userId)
            throw new Error('Pedido de outra conta')
          items.push({ key, operationId: idSchema.parse(cursor.value), path, input })
          cursor.continue()
        } catch (error) {
          issue = error
          tx.abort()
        }
      }
      tx.oncomplete = () => resolve({ items, more })
      tx.onabort = () =>
        reject(issue ?? tx.error ?? new Error('Não foi possível ler os pedidos preservados'))
    })
  } finally {
    db.close()
  }
}
function validatePending(port: ActionPort, entry: PendingAction) {
  if (entry.key !== canonicalJson([port.identity, port.userId, entry.path, entry.input]))
    throw new Error('Pedido de outra conta')
  return actionDefinition(entry.path, entry.input, entry.operationId)
}
/** A read cannot publish, approve or schedule. Absent receipt keeps the original operation id. */
export async function confirmWorkspaceAction(port: ActionPort, entry: PendingAction) {
  const definition = validatePending(port, entry)
  const receipt = actionReceiptSchema.parse(
    await port.request(`/projects/${definition.projectId}/receipts/${entry.operationId}`),
  )
  if (!receipt.found) return false
  definition.result.parse(receipt.result)
  await identity(entry.key, entry.operationId)
  return true
}
/** Explicit user retry always sends the OLD id, even if another tab acknowledged it meanwhile. */
export async function retryWorkspaceAction(port: ActionPort, entry: PendingAction) {
  const definition = validatePending(port, entry)
  const result = definition.result.parse(await port.request(entry.path, 'POST', definition.body))
  await identity(entry.key, entry.operationId)
  return result
}
