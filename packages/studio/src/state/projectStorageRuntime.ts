import { createStore } from 'idb-keyval'

export const GAME_STORAGE_KEY_PREFIX = 'sz:game-storage:'
export const gameStorageKey = (projectId: string): string =>
  `${GAME_STORAGE_KEY_PREFIX}${projectId}`

export interface ProjectStorageScope {
  readonly namespace: string
  readonly identity: string
  readonly store: ReturnType<typeof createStore>
}

let storageNamespace = ''
let currentScope: ProjectStorageScope | null = null

function databaseName(namespace: string): string {
  return namespace ? `sistema-zero-studio-${namespace}` : 'sistema-zero-studio'
}

/** Troca o perfil ativo; operações já iniciadas conservam o scope capturado. */
export function setProjectStorageNamespace(namespace: string): void {
  const next = namespace.trim()
  if (next === storageNamespace) return
  storageNamespace = next
  currentScope = null
}

/** Captura atômica do namespace + handle usados durante uma operação inteira. */
export function captureProjectStorageScope(): ProjectStorageScope {
  if (!currentScope) {
    const namespace = storageNamespace
    const identity = databaseName(namespace)
    currentScope = Object.freeze({
      namespace,
      identity,
      store: createStore(identity, 'kv'),
    })
  }
  return currentScope
}

export function scopedProjectIdentity(scope: ProjectStorageScope, projectId: string): string {
  return `${scope.identity}\u0000${projectId}`
}

// Todas as origens de escrita (editor, lista, capa e storage do jogo) passam
// pela mesma fila POR BANCO + projeto. Perfis com ids iguais nunca se bloqueiam.
const writeChains = new Map<string, Promise<void>>()

export function runSerializedProjectWrite(
  scope: ProjectStorageScope,
  projectId: string,
  task: () => Promise<void>,
): Promise<void> {
  const identity = scopedProjectIdentity(scope, projectId)
  const previous = writeChains.get(identity)
  const next = previous ? previous.then(task, task) : task()
  const settled = next.then(
    () => {
      if (writeChains.get(identity) === settled) writeChains.delete(identity)
    },
    () => {
      if (writeChains.get(identity) === settled) writeChains.delete(identity)
    },
  )
  writeChains.set(identity, settled)
  return next
}

const GAME_STORAGE_FENCE_GRACE_MS = 60_000
const deletedGameStorage = new Map<string, number>()

function pruneGameStorageFence(now: number): void {
  for (const [identity, deletedAt] of deletedGameStorage) {
    if (now - deletedAt >= GAME_STORAGE_FENCE_GRACE_MS) deletedGameStorage.delete(identity)
  }
}

export function fenceGameStorageDelete(scope: ProjectStorageScope, projectId: string): void {
  const now = Date.now()
  pruneGameStorageFence(now)
  deletedGameStorage.set(scopedProjectIdentity(scope, projectId), now)
}

export function isGameStorageDeleted(scope: ProjectStorageScope, projectId: string): boolean {
  const identity = scopedProjectIdentity(scope, projectId)
  const deletedAt = deletedGameStorage.get(identity)
  if (deletedAt === undefined) return false
  if (Date.now() - deletedAt >= GAME_STORAGE_FENCE_GRACE_MS) {
    deletedGameStorage.delete(identity)
    return false
  }
  return true
}
