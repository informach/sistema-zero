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

/**
 * Scope por namespace, MEMOIZADO: os caminhos da nuvem (subida/descida por item, biblioteca
 * pessoal) chamam com `{namespace}` a cada item, e cada `createStore` novo abre uma conexão
 * própria com o IndexedDB no 1º uso — centenas numa descida grande. Um scope por perfil basta
 * (o handle é imutável). O caminho GLOBAL (`captureProjectStorageScope`) segue com o seu
 * próprio cache, reiniciado a cada troca de perfil.
 */
const scopesByNamespace = new Map<string, ProjectStorageScope>()
export function getProjectStorageScope(namespace: string): ProjectStorageScope {
  const normalized = namespace.trim()
  let scope = scopesByNamespace.get(normalized)
  if (!scope) {
    scope = createProjectStorageScope(normalized)
    scopesByNamespace.set(normalized, scope)
  }
  return scope
}

/** Cria um scope imutável sem depender do perfil global ativo. */
export function createProjectStorageScope(namespace: string): ProjectStorageScope {
  const normalized = namespace.trim()
  const identity = databaseName(normalized)
  return Object.freeze({
    namespace: normalized,
    identity,
    store: createStore(identity, 'kv'),
  })
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
    currentScope = createProjectStorageScope(storageNamespace)
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
