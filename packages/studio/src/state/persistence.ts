import { createStore, delMany, get, getMany, keys, set, setMany } from 'idb-keyval'
import { IDE_MODES, type IDEMode, type Project } from '#core'
import { cancelPendingAutosavesFor } from '../persistence/service'
import { gameStorageKey } from './gameStorage'

const LEGACY_PROJECT_KEY_PREFIX = 'sz:project:'
const PROJECT_META_KEY_PREFIX = 'sz:project-meta:'
const PROJECT_FILES_KEY_PREFIX = 'sz:project-files:'
const PROJECT_STATE_KEY_PREFIX = 'sz:project-state:'
const PROJECT_BLOCKS_KEY_PREFIX = 'sz:project-blocks:'
// 4ª partição: assets embutidos (imagens/sprites como data: URL). São GRANDES e
// mudam POUCO — partição própria para não inchar o autosave debounced de `files`,
// que reescreve a cada tecla. Ausente em projetos legados (load é tolerante).
const PROJECT_ASSETS_KEY_PREFIX = 'sz:project-assets:'
// 5ª partição: MINIATURA do card (capturada ao sair do editor). Partição própria
// de propósito: o persistProject reescreve o meta a partir do Project em memória
// (que não conhece a thumb) — no meta, o próximo autosave a apagaria.
const PROJECT_THUMB_KEY_PREFIX = 'sz:project-thumb:'
const PROJECT_STORAGE_VERSION = 2
const MAX_PROJECT_SUMMARY_NAME_CHARS = 200
/** Teto da miniatura (data URL JPEG ~320×192 fica bem abaixo disso). */
export const MAX_PROJECT_THUMB_CHARS = 300_000
/** Evento de janela disparado quando uma miniatura termina de gravar. */
export const PROJECT_THUMB_UPDATED_EVENT = 'sz:project-thumb-updated'
const legacyProjectKey = (id: string) => `${LEGACY_PROJECT_KEY_PREFIX}${id}`
const projectMetaKey = (id: string) => `${PROJECT_META_KEY_PREFIX}${id}`
const projectFilesKey = (id: string) => `${PROJECT_FILES_KEY_PREFIX}${id}`
const projectStateKey = (id: string) => `${PROJECT_STATE_KEY_PREFIX}${id}`
const projectBlocksKey = (id: string) => `${PROJECT_BLOCKS_KEY_PREFIX}${id}`
const projectAssetsKey = (id: string) => `${PROJECT_ASSETS_KEY_PREFIX}${id}`
const projectThumbKey = (id: string) => `${PROJECT_THUMB_KEY_PREFIX}${id}`

// Namespace do armazenamento LOCAL (IndexedDB) — isola por PERFIL. Vazio = store HISTÓRICO
// compartilhado `sistema-zero-studio` (lições, que já se isolam pelo id do projeto; e o adulto,
// que tem 1 usuário só). O Estúdio Completo (lista de vários projetos) seta o id do perfil → um
// store por criança, p/ irmãos no MESMO navegador não compartilharem a lista.
let storageNamespace = ''
let store: ReturnType<typeof createStore> | null = null

/**
 * Define o namespace do armazenamento local. O HOST chama ANTES de qualquer operação
 * (ProjectList/editor): no Estúdio Completo com o id do perfil kids; vazio = store padrão (a
 * lição reseta p/ vazio — usa o store padrão + id de projeto por perfil). Invalida o store em
 * cache p/ recriar com o DB do namespace. Idempotente; um save em voo já capturou o store antigo.
 */
export function setStorageNamespace(namespace: string): void {
  const next = namespace.trim()
  if (next === storageNamespace) return
  storageNamespace = next
  store = null
}

function getStore() {
  if (!store) {
    store = createStore(
      storageNamespace ? `sistema-zero-studio-${storageNamespace}` : 'sistema-zero-studio',
      'kv',
    )
  }
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

export function runSerializedWrite(id: string, task: () => Promise<void>): Promise<void> {
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

// Última referência de `assets` PERSISTIDA por id. Os assets embutidos (até
// ~5,6 MB de base64) ganharam partição própria (ver comentário do prefixo) JUSTO
// porque mudam pouco — mas o `persistProject` reescrevia os 4 pares a cada
// autosave debounced (~1s), inchando o write com a partição grande mesmo quando
// nenhuma imagem foi tocada. O `projectStore` SEMPRE substitui `assets` por
// referência nova ao editar (addAsset/removeAsset/renameAsset e o spread do
// import/load), então igualdade de referência é um dirty-check seguro: se a ref
// não mudou desde o último persist deste id, a partição de assets não é
// reescrita. Map por id, limpo no delete (a partição vai junto no delMany).
const lastPersistedAssetsRef = new Map<string, Project['assets']>()

export async function persistProject(project: Project): Promise<void> {
  await runSerializedWrite(project.id, () => {
    const id = project.id
    // meta/files/state são pequenos e mudam a cada tecla — sempre reescritos.
    // `blocksState` fica em partição própria: pode ser enorme e não deve inchar
    // a leitura inicial do projeto nem o registro leve de IR.
    const pairs: Array<[string, unknown]> = [
      [projectMetaKey(id), projectToMetaRecord(project)],
      [projectFilesKey(id), projectToFilesRecord(project)],
      [projectStateKey(id), projectToStateRecord(project)],
    ]
    // `blocksState` é restaurado em SEGUNDO PLANO depois da abertura rápida, então
    // fica `null` na memória até chegar. NUNCA gravamos null por cima da partição
    // salva — apagaria os blocos do aluno na janela entre abrir e restaurar (e se o
    // aluno editar antes do restore, o autosave gravaria vazio). Só persistimos a
    // partição de blocos quando há blocksState de fato; um workspace VAZIO serializa
    // como objeto (não null), então limpar de propósito continua sendo salvo.
    if (project.blocksState != null) {
      pairs.push([projectBlocksKey(id), projectToBlocksRecord(project)])
    }
    // Assets: só reescreve quando a referência mudou desde o último persist deste
    // id (ou na 1ª gravação, quando ainda não há referência registrada). `has`
    // distingue "nunca persistido" de "persistido como undefined" — sem isso, um
    // projeto sem assets nunca gravaria a partição (irrelevante hoje, mas o `has`
    // mantém o invariante: a 1ª gravação SEMPRE materializa a partição).
    if (!lastPersistedAssetsRef.has(id) || lastPersistedAssetsRef.get(id) !== project.assets) {
      pairs.push([projectAssetsKey(id), projectToAssetsRecord(project)])
    }
    return setMany(pairs, getStore()).then(() => {
      // Só registra a referência DEPOIS do write resolver: se o setMany falhar
      // (quota cheia), a partição não foi gravada e a próxima tentativa precisa
      // reescrevê-la — manter a ref antiga (ou não registrar) garante isso.
      lastPersistedAssetsRef.set(id, project.assets)
    })
  })
}

export async function loadProjectById(id: string): Promise<Project | null> {
  const kvStore = getStore()
  const [meta, files, state, blocks, assets] = await getMany<unknown[]>(
    [
      projectMetaKey(id),
      projectFilesKey(id),
      projectStateKey(id),
      projectBlocksKey(id),
      projectAssetsKey(id),
    ],
    kvStore,
  )
  if (meta && files && state) {
    // `assets` é a 4ª partição (opcional): ausente em projetos legados/pré-feature.
    return assembleProjectRecord(id, meta, files, state, assets, blocks)
  }

  return ((await get<Project>(legacyProjectKey(id), kvStore)) ?? null) as Project | null
}

/**
 * Leitura rápida para abrir o editor local: NÃO lê `project-state` nem
 * `project-blocks`, pois projetos antigos guardavam `blocksState` gigante junto
 * do IR e o structured clone do IndexedDB travava a tela de "Carregando".
 *
 * O editor abre com arquivos/metadados e preserva o modo salvo. A partição de
 * blocos pode ser restaurada em segundo plano pelo adapter local.
 */
export async function loadProjectShellById(id: string): Promise<Project | null> {
  const kvStore = getStore()
  const [meta, files, assets] = await getMany<unknown[]>(
    [projectMetaKey(id), projectFilesKey(id), projectAssetsKey(id)],
    kvStore,
  )
  if (meta && files) {
    return assembleProjectRecord(id, meta, files, { id, ir: null, blocksState: null }, assets)
  }

  return ((await get<Project>(legacyProjectKey(id), kvStore)) ?? null) as Project | null
}

export async function loadProjectBlocksById(id: string): Promise<unknown | null> {
  const kvStore = getStore()
  const fromPartition = await get<unknown>(projectBlocksKey(id), kvStore)
  if (fromPartition != null) return fromPartition
  // Fallback p/ projetos LEGADOS (salvos ANTES do split de partições): o
  // `blocksState` ficava DENTRO de `sz:project-state` (junto do IR) ou no doc único
  // `sz:project`. Sem este fallback, o restore em segundo plano devolveria null e o
  // 1º autosave gravaria vazio por cima — perdendo os blocos de projetos antigos.
  // Devolve o registro INTEIRO; o chamador lê `record.blocksState` e valida `id`.
  const state = await get<Record<string, unknown>>(projectStateKey(id), kvStore)
  if (state && typeof state === 'object' && !Array.isArray(state) && state.blocksState != null) {
    return state
  }
  const legacy = await get<Record<string, unknown>>(legacyProjectKey(id), kvStore)
  if (
    legacy &&
    typeof legacy === 'object' &&
    !Array.isArray(legacy) &&
    legacy.blocksState != null
  ) {
    return legacy
  }
  return null
}

// CERCA de exclusão do armazenamento do programa do aluno (blocos guardar/ler).
// O preview faz `writeGameStorage` à parte do mutex por id (flush do localStorage
// do bichinho); um `set` desse flush pode CHEGAR depois do `delMany` do delete e
// RESSUSCITAR um registro `sz:game-storage:<id>` órfão (o projeto já não existe).
// Serializar a escrita no MESMO `runSerializedWrite` do delete ordena os dois, mas
// uma escrita ENFILEIRADA depois que o delMany já saiu da cadeia ainda passaria —
// por isso esta cerca: marcada no delete e checada DENTRO da cadeia da escrita,
// derruba qualquer write tardio do id apagado. Map id→timestamp com poda lazy por
// janela de graça (igual à cerca do service), para não vazar um ULID por exclusão.
const GAME_STORAGE_FENCE_GRACE_MS = 60_000
const deletedGameStorage = new Map<string, number>()

function pruneGameStorageFence(now: number): void {
  if (deletedGameStorage.size === 0) return
  for (const [id, deletedAt] of deletedGameStorage) {
    if (now - deletedAt >= GAME_STORAGE_FENCE_GRACE_MS) deletedGameStorage.delete(id)
  }
}

/** Marca o id como apagado: um `writeGameStorage` tardio (flush do preview em voo)
 * é descartado em vez de recriar o registro órfão. Chamado pelo `deleteProject`. */
export function fenceGameStorageDelete(id: string): void {
  const now = Date.now()
  pruneGameStorageFence(now)
  deletedGameStorage.set(id, now)
}

/** A cerca ainda vale para este id? Poda lazy de passagem para limitar o Map. */
export function isGameStorageDeleted(id: string): boolean {
  const deletedAt = deletedGameStorage.get(id)
  if (deletedAt === undefined) return false
  if (Date.now() - deletedAt >= GAME_STORAGE_FENCE_GRACE_MS) {
    deletedGameStorage.delete(id)
    return false
  }
  return true
}

export async function deleteProject(id: string): Promise<void> {
  // Cancela autosaves em voo em TODAS as instâncias — um timer pendente
  // re-persistiria o projeto recém-apagado.
  cancelPendingAutosavesFor(id)
  // Cerca o armazenamento do programa do aluno ANTES do delMany: um flush do
  // preview já em voo (writeGameStorage) que chegue depois é descartado.
  fenceGameStorageDelete(id)
  // Esquece a referência de assets persistida deste id: o delMany apaga a
  // partição, e se o id voltar (improvável, mas duplicate/import mintam ulid
  // novo) o 1º persist precisa re-materializar a partição de assets. Também
  // evita o Map crescer sem limite por exclusão.
  lastPersistedAssetsRef.delete(id)
  // No MESMO mutex de escrita do id: o delMany não pode intercalar com um
  // persist/rename em voo do mesmo projeto.
  await runSerializedWrite(id, () =>
    delMany(
      [
        projectMetaKey(id),
        projectFilesKey(id),
        projectStateKey(id),
        projectBlocksKey(id),
        projectAssetsKey(id),
        projectThumbKey(id),
        legacyProjectKey(id),
        // Armazenamento do programa do aluno (blocos "guardar/ler") deste projeto.
        gameStorageKey(id),
      ],
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
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      await set(projectMetaKey(id), { ...meta, name, updatedAt: Date.now() }, kvStore)
      return
    }
    // Sem partição de meta: projeto no formato LEGADO (`sz:project:<id>`, doc único
    // anterior à migração 3-partições) que nunca foi aberto/editado — só ganha
    // partições no 1º persistProject. O legado é suportado p/ leitura/listagem
    // (loadProjectById/listAllProjects), então o rename PRECISA persistir; senão a
    // ProjectList reverte o nome ao reler o disco. Regrava o nome no PRÓPRIO doc
    // legado (mesma chave), dentro do mesmo runSerializedWrite.
    const legacy = await get<Record<string, unknown>>(legacyProjectKey(id), kvStore)
    if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
      await set(legacyProjectKey(id), { ...legacy, name, updatedAt: Date.now() }, kvStore)
    }
  })
}

export interface ProjectSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** Modo salvo do projeto — permite abrir o editor já no modo correto. */
  mode: IDEMode
  /** Miniatura do card (data URL), quando já capturada ao sair do editor. */
  thumbDataUrl?: string
}

/**
 * Grava a miniatura do projeto (best-effort, NUNCA lança). No mesmo mutex de
 * escrita do id; exige o meta existir — um delete concorrente (que apaga o meta
 * na mesma cadeia) não é ressuscitado por uma captura que terminou depois.
 */
export async function writeProjectThumb(id: string, dataUrl: string): Promise<void> {
  if (!id || !dataUrl.startsWith('data:image/') || dataUrl.length > MAX_PROJECT_THUMB_CHARS) return
  try {
    await runSerializedWrite(id, async () => {
      const kvStore = getStore()
      const meta = await get<unknown>(projectMetaKey(id), kvStore)
      if (!meta) return
      await set(projectThumbKey(id), { id, dataUrl }, kvStore)
    })
  } catch {
    // Quota cheia / IndexedDB indisponível: o card só fica sem capa.
  }
}

function thumbDataUrlOf(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const dataUrl = (value as { dataUrl?: unknown }).dataUrl
  if (typeof dataUrl !== 'string') return undefined
  if (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_PROJECT_THUMB_CHARS)
    return undefined
  return dataUrl
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

  // Anexa as miniaturas (partição própria) aos summaries que têm uma.
  if (summaries.length > 0) {
    const thumbValues = await getMany<unknown[]>(
      summaries.map((summary) => projectThumbKey(summary.id)),
      kvStore,
    )
    for (let index = 0; index < summaries.length; index += 1) {
      const summary = summaries[index]
      const thumb = thumbDataUrlOf(thumbValues[index])
      if (summary && thumb) summary.thumbDataUrl = thumb
    }
  }

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
> & { storageVersion: number } {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    mode: project.mode,
    installedExtensions: project.installedExtensions,
    storageVersion: PROJECT_STORAGE_VERSION,
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

function projectToStateRecord(project: Project): Pick<Project, 'id' | 'ir'> {
  return {
    id: project.id,
    ir: project.ir,
  }
}

function projectToBlocksRecord(project: Project): Pick<Project, 'id' | 'blocksState'> {
  return {
    id: project.id,
    blocksState: project.blocksState,
  }
}

function projectToAssetsRecord(project: Project): Pick<Project, 'id' | 'assets'> {
  return {
    id: project.id,
    // Assets embutidos (imagens). Ausente/undefined em projetos sem assets — o
    // structured clone do IDB preserva undefined, e o load é tolerante.
    assets: project.assets,
  }
}

function assembleProjectRecord(
  id: string,
  meta: unknown,
  files: unknown,
  state: unknown,
  assets?: unknown,
  blocks?: unknown,
): Project | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  return {
    ...(meta as Record<string, unknown>),
    ...(files as Record<string, unknown>),
    ...(state as Record<string, unknown>),
    ...(blocks && typeof blocks === 'object' && !Array.isArray(blocks)
      ? (blocks as Record<string, unknown>)
      : {}),
    // Partição de assets (opcional): mescla só se for um registro válido. O
    // sanitizer do projectStore valida o conteúdo de `assets` depois.
    ...(assets && typeof assets === 'object' && !Array.isArray(assets)
      ? (assets as Record<string, unknown>)
      : {}),
    id,
  } as Project
}
