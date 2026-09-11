import { sanitizePreviewStorageData } from '#preview'
import { readValue, writeInOneTransaction } from './idbTransaction'
import {
  captureProjectStorageScope,
  GAME_STORAGE_KEY_PREFIX,
  gameStorageKey,
  isGameStorageDeleted,
  type ProjectStorageScope,
  runSerializedProjectWrite,
} from './projectStorageRuntime'

export { GAME_STORAGE_KEY_PREFIX, gameStorageKey }

/**
 * O backend do armazenamento. ⚠️ `set` e `delete` precisam chegar ao disco na ORDEM em que
 * foram chamados, mesmo com um ainda em voo: a fila por projeto libera a próxima escrita assim
 * que esta foi PEDIDA (`runSerializedProjectWrite`), sem esperar a confirmação. O IndexedDB
 * garante isso (transações readwrite do mesmo store rodam na ordem em que nascem).
 */
export interface GameStoragePersistence {
  get(key: string, scope: ProjectStorageScope): Promise<unknown>
  set(key: string, value: Record<string, string>, scope: ProjectStorageScope): Promise<void>
  delete(key: string, scope: ProjectStorageScope): Promise<void>
}

// O banco dos projetos, pelas transações com commit explícito (`idbTransaction.ts`): o jogo da
// criança pode estar gravando o placar no instante em que ela recarrega a página.
const indexedDbPersistence: GameStoragePersistence = {
  get: (key, scope) => readValue(scope.store, key),
  set: (key, value, scope) => writeInOneTransaction(scope.store, { puts: [[key, value]] }),
  delete: (key, scope) => writeInOneTransaction(scope.store, { deletes: [key] }),
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

/** Best-effort: quota cheia / sem IndexedDB não pode quebrar o preview, nem lançando na hora. */
function bestEffort(write: () => Promise<void>): Promise<void> {
  try {
    return write().catch(() => undefined)
  } catch {
    return Promise.resolve()
  }
}

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
      // delete): descarta — não recria o registro do projeto que não existe mais.
      if (isGameStorageDeleted(scope, projectId)) return undefined
      return { done: bestEffort(() => pickWrite(projectId, data, scope)) }
    })
  }

  /** O registro vazio some (clear/removeItem que esvazia); o resto é gravado sanitizado. */
  function pickWrite(
    projectId: string,
    data: Record<string, string>,
    scope: ProjectStorageScope,
  ): Promise<void> {
    const clean = sanitizePreviewStorageData(data)
    if (Object.keys(clean).length === 0) {
      return persistence.delete(gameStorageKey(projectId), scope)
    }
    return persistence.set(gameStorageKey(projectId), clean, scope)
  }

  /** Remove o armazenamento do projeto (chamado quando o projeto é apagado). No
   * MESMO mutex de escrita por id, para não correr com um `writeGameStorage`. */
  async function remove(projectId: string): Promise<void> {
    if (!projectId) return
    const scope = getScope()
    if (!scope) return
    await runSerializedProjectWrite(scope, projectId, async () => ({
      done: bestEffort(() => persistence.delete(gameStorageKey(projectId), scope)),
    }))
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
