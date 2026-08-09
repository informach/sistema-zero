import { del, get, set } from 'idb-keyval'
import { sanitizePreviewStorageData } from '#preview'
import {
  captureProjectStorageScope,
  GAME_STORAGE_KEY_PREFIX,
  gameStorageKey,
  isGameStorageDeleted,
  type ProjectStorageScope,
  runSerializedProjectWrite,
} from './projectStorageRuntime'

export { GAME_STORAGE_KEY_PREFIX, gameStorageKey }

export interface GameStoragePersistence {
  get(key: string, scope: ProjectStorageScope): Promise<unknown>
  set(key: string, value: Record<string, string>, scope: ProjectStorageScope): Promise<void>
  delete(key: string, scope: ProjectStorageScope): Promise<void>
}

const indexedDbPersistence: GameStoragePersistence = {
  get: (key, scope) => get<unknown>(key, scope.store),
  set: (key, value, scope) => set(key, value, scope.store),
  delete: (key, scope) => del(key, scope.store),
}

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

function getScope(): ProjectStorageScope | null {
  // Sem IndexedDB (happy-dom dos testes, contextos restritos) não há o que abrir:
  // bail cedo para a hidratação resolver imediatamente em `{}` em vez de pendurar.
  if (typeof indexedDB === 'undefined') return null
  try {
    return captureProjectStorageScope()
  } catch {
    return null
  }
}

/**
 * Repositório injetável para que o contrato de armazenamento não fique preso à
 * implementação global do IndexedDB. A instância padrão abaixo continua usando
 * `idb-keyval`; hosts e testes internos podem fornecer outro backend equivalente.
 */
export function createGameStorageRepository(
  persistence: GameStoragePersistence = indexedDbPersistence,
) {
  async function load(projectId: string): Promise<Record<string, string>> {
    if (!projectId) return {}
    try {
      const scope = getScope()
      if (!scope) return {}
      const raw = await persistence.get(gameStorageKey(projectId), scope)
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
  async function write(projectId: string, data: Record<string, string>): Promise<void> {
    if (!projectId) return
    const scope = getScope()
    if (!scope) return
    await runSerializedProjectWrite(scope, projectId, async () => {
      // Apagado enquanto este write esperava na fila (ou já enfileirado após o
      // delMany): descarta — não recria o registro do projeto que não existe mais.
      if (isGameStorageDeleted(scope, projectId)) return
      try {
        const clean = sanitizePreviewStorageData(data)
        if (Object.keys(clean).length === 0) {
          await persistence.delete(gameStorageKey(projectId), scope)
          return
        }
        await persistence.set(gameStorageKey(projectId), clean, scope)
      } catch {
        // best-effort: quota cheia / sem IndexedDB não pode quebrar o preview.
      }
    })
  }

  /** Remove o armazenamento do projeto (chamado quando o projeto é apagado). No
   * MESMO mutex de escrita por id, para não correr com um `writeGameStorage`. */
  async function remove(projectId: string): Promise<void> {
    if (!projectId) return
    const scope = getScope()
    if (!scope) return
    await runSerializedProjectWrite(scope, projectId, async () => {
      try {
        await persistence.delete(gameStorageKey(projectId), scope)
      } catch {
        // best-effort.
      }
    })
  }

  return Object.freeze({ load, write, delete: remove })
}

const gameStorageRepository = createGameStorageRepository()

/** Lê o snapshot persistido do `localStorage` deste projeto (sempre clampado). */
export const loadGameStorage = gameStorageRepository.load

/** Grava um snapshot sanitizado, serializado com as demais escritas do projeto. */
export const writeGameStorage = gameStorageRepository.write

/** Remove o armazenamento do projeto no mesmo mutex das demais escritas. */
export const deleteGameStorage = gameStorageRepository.delete
