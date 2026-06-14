import { createStore, delMany, get, getMany, keys, set, setMany } from 'idb-keyval'
import { IDE_MODES, type IDEMode, type Project } from '#core'
import { cancelPendingAutosavesFor } from '../persistence/service'

const LEGACY_PROJECT_KEY_PREFIX = 'sz:project:'
const PROJECT_META_KEY_PREFIX = 'sz:project-meta:'
const PROJECT_FILES_KEY_PREFIX = 'sz:project-files:'
const PROJECT_STATE_KEY_PREFIX = 'sz:project-state:'
const MAX_PROJECT_SUMMARY_NAME_CHARS = 200
const legacyProjectKey = (id: string) => `${LEGACY_PROJECT_KEY_PREFIX}${id}`
const projectMetaKey = (id: string) => `${PROJECT_META_KEY_PREFIX}${id}`
const projectFilesKey = (id: string) => `${PROJECT_FILES_KEY_PREFIX}${id}`
const projectStateKey = (id: string) => `${PROJECT_STATE_KEY_PREFIX}${id}`

let store: ReturnType<typeof createStore> | null = null

function getStore() {
  if (!store) store = createStore('sistema-zero-studio', 'kv')
  return store
}

// O AGENDAMENTO (autosave debounced/flush/salvar explícito) vive em
// src/persistence/service.ts (PersistenceService, por instância do <Studio>).
// Este módulo mantém só as operações PURAS de IndexedDB — que são exatamente o
// adapter 'local' (ver src/persistence/local.ts).

// Cadeia de ESCRITA por id de projeto: encadeia persistProject/renameProjectMeta/
// deleteProject do MESMO id para não correrem entre si. O `renameProjectMeta` faz
// um get-then-set NÃO-ATÔMICO do registro de meta — sem esta serialização, um
// `persistProject` (autosave do editor aberto) do mesmo id intercalado entre o
// `get` e o `set` do rename perderia o nome novo (o set do rename gravaria por
// cima com base num meta lido ANTES do persist, ou o persist gravaria por cima do
// rename). A entrada é removida quando a própria cauda termina, para o Map não
// crescer. Vive aqui (módulo, não por instância) porque as escritas de IDB também
// vêm de create/import/duplicate, fora do mutex por instância do service.
const writeChains = new Map<string, Promise<void>>()

function runSerializedWrite(id: string, task: () => Promise<void>): Promise<void> {
  const prev = writeChains.get(id)
  // `prev` é blindado contra rejeição (handler nos dois ramos) para uma falha de
  // uma escrita anterior não derrubar a cadeia das seguintes.
  const next = prev ? prev.then(task, task) : task()
  // A cadeia GUARDADA no Map nunca rejeita (o ramo de erro vira a limpeza), para
  // não vazar uma unhandled rejection quando uma escrita falha (ex.: quota cheia)
  // — mas o RESULTADO devolvido ao chamador propaga a falha (o autosave precisa
  // marcar o badge de erro). São dois consumidores distintos do mesmo `task`.
  const settled = next.then(
    () => {
      if (writeChains.get(id) === settled) writeChains.delete(id)
    },
    () => {
      if (writeChains.get(id) === settled) writeChains.delete(id)
    },
  )
  writeChains.set(id, settled)
  return next
}

export async function persistProject(project: Project): Promise<void> {
  await runSerializedWrite(project.id, () =>
    setMany(
      [
        [projectMetaKey(project.id), projectToMetaRecord(project)],
        [projectFilesKey(project.id), projectToFilesRecord(project)],
        [projectStateKey(project.id), projectToStateRecord(project)],
      ],
      getStore(),
    ),
  )
}

export async function loadProjectById(id: string): Promise<Project | null> {
  const kvStore = getStore()
  const [meta, files, state] = await getMany<unknown[]>(
    [projectMetaKey(id), projectFilesKey(id), projectStateKey(id)],
    kvStore,
  )
  if (meta && files && state) {
    return assembleProjectRecord(id, meta, files, state)
  }

  return ((await get<Project>(legacyProjectKey(id), kvStore)) ?? null) as Project | null
}

export async function deleteProject(id: string): Promise<void> {
  // Cancela autosaves em voo em TODAS as instâncias — um timer pendente
  // re-persistiria o projeto recém-apagado.
  cancelPendingAutosavesFor(id)
  // No MESMO mutex de escrita do id: o delMany não pode intercalar com um
  // persist/rename em voo do mesmo projeto.
  await runSerializedWrite(id, () =>
    delMany(
      [projectMetaKey(id), projectFilesKey(id), projectStateKey(id), legacyProjectKey(id)],
      getStore(),
    ),
  )
}

/**
 * Renomeia um projeto reescrevendo SÓ o registro de metadados (sz:project-meta:).
 * Lê o meta atual, troca o nome e bumpa `updatedAt`; arquivos e state ficam
 * INTOCADOS — renomear via persistProject(projeto-lido-do-disco) reescreveria
 * files+state a partir de um snapshot estale, ressuscitando bytes antigos e
 * correndo contra o autosave de um editor aberto. No-op se não houver registro de
 * meta (projeto inexistente ou só no formato legado).
 */
export async function renameProjectMeta(id: string, name: string): Promise<void> {
  // get-then-set SERIALIZADO contra persistProject/deleteProject do mesmo id: a
  // leitura e a gravação do meta correm como uma unidade, sem um autosave do
  // editor aberto intercalar entre elas e perder o nome novo (ou ser sobrescrito).
  await runSerializedWrite(id, async () => {
    const kvStore = getStore()
    const meta = await get<Record<string, unknown>>(projectMetaKey(id), kvStore)
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return
    await set(projectMetaKey(id), { ...meta, name, updatedAt: Date.now() }, kvStore)
  })
}

export interface ProjectSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Modo salvo do projeto — permite abrir o editor já no modo correto. */
  mode: IDEMode
}

function toProjectSummary(id: string, value: unknown): ProjectSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (!id) return null
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim().slice(0, MAX_PROJECT_SUMMARY_NAME_CHARS)
      : 'Sem título'
  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt
  const mode = IDE_MODES.includes(raw.mode as IDEMode) ? (raw.mode as IDEMode) : 'blocks'
  return { id, name, createdAt, updatedAt, mode }
}

export async function listAllProjects(): Promise<ProjectSummary[]> {
  const kvStore = getStore()
  const allKeys = await keys(kvStore)
  const metaKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(PROJECT_META_KEY_PREFIX),
  )
  const metaValues = metaKeys.length > 0 ? await getMany<unknown[]>(metaKeys, kvStore) : []
  const summaries = metaKeys
    .map((key, index) =>
      toProjectSummary(key.slice(PROJECT_META_KEY_PREFIX.length), metaValues[index]),
    )
    .filter((summary): summary is ProjectSummary => Boolean(summary))

  const indexedIds = new Set(summaries.map((summary) => summary.id))
  const legacyKeys = allKeys.filter(
    (key): key is string =>
      typeof key === 'string' &&
      key.startsWith(LEGACY_PROJECT_KEY_PREFIX) &&
      !indexedIds.has(key.slice(LEGACY_PROJECT_KEY_PREFIX.length)),
  )
  if (legacyKeys.length > 0) {
    const legacyValues = await getMany<unknown[]>(legacyKeys, kvStore)
    for (let index = 0; index < legacyKeys.length; index += 1) {
      const key = legacyKeys[index]
      if (!key) continue
      const summary = toProjectSummary(
        key.slice(LEGACY_PROJECT_KEY_PREFIX.length),
        legacyValues[index],
      )
      if (summary) summaries.push(summary)
    }
  }

  summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  return summaries
}

function projectToMetaRecord(
  project: Project,
): Pick<
  Project,
  'id' | 'name' | 'createdAt' | 'updatedAt' | 'mode' | 'installedExtensions' | 'kind' | 'proMeta'
> {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    mode: project.mode,
    installedExtensions: project.installedExtensions,
    // Modo profissional: discriminante + metadados do dev-server. Ausentes em
    // projetos classic (undefined é preservado pelo structured clone do IDB).
    kind: project.kind,
    proMeta: project.proMeta,
  }
}

function projectToFilesRecord(
  project: Project,
): Pick<Project, 'id' | 'files' | 'extraFiles' | 'tree'> {
  return {
    id: project.id,
    files: project.files,
    extraFiles: project.extraFiles,
    // Árvore real do modo profissional (path-keyed); ausente em classic.
    tree: project.tree,
  }
}

function projectToStateRecord(project: Project): Pick<Project, 'id' | 'ir' | 'blocksState'> {
  return {
    id: project.id,
    ir: project.ir,
    blocksState: project.blocksState,
  }
}

function assembleProjectRecord(
  id: string,
  meta: unknown,
  files: unknown,
  state: unknown,
): Project | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  return {
    ...(meta as Record<string, unknown>),
    ...(files as Record<string, unknown>),
    ...(state as Record<string, unknown>),
    id,
  } as Project
}
