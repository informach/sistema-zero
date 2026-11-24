import { sanitizePreviewStorageData } from '../preview/types'
import { readValue, writeInOneTransaction } from './idbTransaction'
import { ProjectWriteConflict } from './projectStorageRevision'
import {
  captureProjectStorageScope,
  GAME_STORAGE_KEY_PREFIX,
  gameStorageKey,
  isGameStorageDeleted,
  isRegionalProjectScope,
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
async function retainedGameState(scope: ProjectStorageScope, key: string) {
  if (!isRegionalProjectScope(scope) || !key.startsWith(GAME_STORAGE_KEY_PREFIX)) return undefined
  const disk = await import('./retainedProjectStore')
  const manifest = await disk.readRetainedManifest(scope, key.slice(GAME_STORAGE_KEY_PREFIX.length))
  return manifest ? { disk, manifest } : undefined
}
function storeGameState(
  scope: ProjectStorageScope,
  key: string,
  value: Record<string, string> | undefined,
) {
  return value
    ? writeInOneTransaction(scope.store, { puts: [[key, value]] })
    : writeInOneTransaction(scope.store, { deletes: [key] })
}
async function persistGameState(
  scope: ProjectStorageScope,
  key: string,
  value: Record<string, string> | undefined,
) {
  if (!isRegionalProjectScope(scope)) return storeGameState(scope, key, value)
  const captured = value && { ...value }
  const active = await retainedGameState(scope, key)
  if (!active) return storeGameState(scope, key, captured)
  if (active.manifest.deleted) return
  const editor = await import('./retainedProjectEditor')
  await editor.editRetainedAuxiliary(scope, active.manifest, { game: captured })
}
const indexedDbPersistence: GameStoragePersistence = {
  get: async (key, scope) => {
    if (!isRegionalProjectScope(scope)) return readValue(scope.store, key)
    // A save between reading the manifest and reading the game replaces the manifest. Read the
    // new one once: answering `{}` made the game start empty and its first write erase the score.
    for (let attempt = 0; ; attempt++) {
      const retained = await retainedGameState(scope, key)
      if (!retained) return readValue(scope.store, key)
      try {
        const snapshot = await retained.disk.readRetainedParts(scope, retained.manifest, ['game'])
        return snapshot.game
      } catch (error) {
        if (attempt > 0 || !(error instanceof ProjectWriteConflict)) throw error
      }
    }
  },
  set: (key, value, scope) => persistGameState(scope, key, value),
  delete: (key, scope) => persistGameState(scope, key, undefined),
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
      return ordered(
        scope,
        bestEffort(() => pickWrite(projectId, data, scope)),
      )
    })
  }

  /**
   * O projeto retido (perfil regional local) lê o manifesto antes de abrir a transação: soltar a
   * fila no pedido deixava a escrita seguinte (outro placar, um autosave) passar na frente.
   */
  async function ordered(scope: ProjectStorageScope, done: Promise<void>) {
    if (isRegionalProjectScope(scope)) await done
    return { done }
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
    await runSerializedProjectWrite(scope, projectId, async () =>
      ordered(
        scope,
        bestEffort(() => persistence.delete(gameStorageKey(projectId), scope)),
      ),
    )
  }

  /** Pro awaits a confirmed write. Capture the profile scope once, before async work. */
  function session(projectId: string, storageScope?: ProjectStorageScope) {
    const scope = storageScope ?? getScope()
    return {
      async load(): Promise<Record<string, string>> {
        if (!scope || !projectId) throw new Error('Armazenamento indisponível.')
        return sanitizePreviewStorageData(await persistence.get(gameStorageKey(projectId), scope))
      },
      async write(data: Record<string, string>): Promise<void> {
        if (!scope || !projectId) throw new Error('Armazenamento indisponível.')
        await runSerializedProjectWrite(scope, projectId, async () => {
          if (isGameStorageDeleted(scope, projectId)) throw new Error('Projeto excluído.')
          return ordered(scope, pickWrite(projectId, data, scope))
        })
      },
    }
  }
  return Object.freeze({ load, write, delete: remove, session })
}

const gameStorageRepository = createGameStorageRepository()

/** Lê o snapshot persistido do `localStorage` deste projeto (sempre clampado). */
export const loadGameStorage = gameStorageRepository.load

/** Grava um snapshot sanitizado, serializado com as demais escritas do projeto. */
export const writeGameStorage = gameStorageRepository.write

/** Remove o armazenamento do projeto no mesmo mutex das demais escritas. */
export const deleteGameStorage = gameStorageRepository.delete
export const createGameStorageSession = gameStorageRepository.session
