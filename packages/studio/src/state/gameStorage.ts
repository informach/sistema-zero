import { createStore, del, get, set } from 'idb-keyval'
import { sanitizePreviewStorageData } from '#preview'
import { isGameStorageDeleted, runSerializedWrite } from './persistence'

/**
 * Persistência do `localStorage` do PROGRAMA DO ALUNO no preview ("guardar/ler").
 *
 * É o "armazenamento do app que o aluno criou" — separado da FONTE do projeto
 * (html/css/js/state, que vivem em src/state/persistence.ts). Fica num registro
 * próprio por projeto para que o bichinho lembre a fome entre execuções e entre
 * recarregamentos da IDE, sem poluir os arquivos do projeto.
 *
 * Tudo é BEST-EFFORT e à prova de ambiente sem IndexedDB (happy-dom dos testes):
 * qualquer falha vira no-op / `{}`, nunca derruba o preview.
 */

export const GAME_STORAGE_KEY_PREFIX = 'sz:game-storage:'
export const gameStorageKey = (projectId: string): string =>
  `${GAME_STORAGE_KEY_PREFIX}${projectId}`

// Mesmo banco/store do persistence.ts ('sistema-zero-studio' / 'kv'); um segundo
// handle para a MESMA store é seguro no idb-keyval (apenas reusa a conexão).
// Criado de forma preguiçosa e blindada: em ambiente sem `indexedDB` (testes), a
// criação pode lançar — então degradamos para "sem store".
let store: ReturnType<typeof createStore> | null = null
let storeInitFailed = false
function getStore(): ReturnType<typeof createStore> | null {
  if (store || storeInitFailed) return store
  // Sem IndexedDB (happy-dom dos testes, contextos restritos) não há o que abrir:
  // bail cedo para a hidratação resolver imediatamente em `{}` em vez de pendurar.
  if (typeof indexedDB === 'undefined') {
    storeInitFailed = true
    return null
  }
  try {
    store = createStore('sistema-zero-studio', 'kv')
  } catch {
    storeInitFailed = true
    store = null
  }
  return store
}

/** Lê o snapshot persistido do `localStorage` deste projeto (sempre clampado). */
export async function loadGameStorage(projectId: string): Promise<Record<string, string>> {
  if (!projectId) return {}
  try {
    const kv = getStore()
    if (!kv) return {}
    const raw = await get<unknown>(gameStorageKey(projectId), kv)
    return sanitizePreviewStorageData(raw)
  } catch {
    return {}
  }
}

/**
 * Grava o snapshot do `localStorage` deste projeto. Apaga o registro quando o
 * mapa fica vazio (clear/removeItem que esvazia) — evita lixo no IndexedDB.
 *
 * Roda na MESMA cadeia de escrita por id do `deleteProject` (`runSerializedWrite`)
 * e checa a cerca de exclusão: um flush do preview em voo durante um delete não
 * pode pousar o `set` DEPOIS do `delMany` e ressuscitar um `sz:game-storage:<id>`
 * órfão. A serialização ordena os dois; a cerca derruba um write que chegue tarde.
 */
export async function writeGameStorage(
  projectId: string,
  data: Record<string, string>,
): Promise<void> {
  if (!projectId) return
  await runSerializedWrite(projectId, async () => {
    // Apagado enquanto este write esperava na fila (ou já enfileirado após o
    // delMany): descarta — não recria o registro do projeto que não existe mais.
    if (isGameStorageDeleted(projectId)) return
    try {
      const kv = getStore()
      if (!kv) return
      const clean = sanitizePreviewStorageData(data)
      if (Object.keys(clean).length === 0) {
        await del(gameStorageKey(projectId), kv)
        return
      }
      await set(gameStorageKey(projectId), clean, kv)
    } catch {
      // best-effort: quota cheia / sem IndexedDB não pode quebrar o preview.
    }
  })
}

/** Remove o armazenamento do projeto (chamado quando o projeto é apagado). No
 * MESMO mutex de escrita por id, para não correr com um `writeGameStorage`. */
export async function deleteGameStorage(projectId: string): Promise<void> {
  if (!projectId) return
  await runSerializedWrite(projectId, async () => {
    try {
      const kv = getStore()
      if (!kv) return
      await del(gameStorageKey(projectId), kv)
    } catch {
      // best-effort.
    }
  })
}
