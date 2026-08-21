import { delMany, get, getMany, keys, set, setMany } from 'idb-keyval'
import {
  IDE_MODES,
  type IDEMode,
  type Project,
  type ProjectAsset,
  sanitizeProjectAssets,
} from '#core'
import { perfSpanAsync } from '../core/perf'
import { cancelPendingAutosavesFor } from '../persistence/service'
import {
  captureProjectStorageScope,
  fenceGameStorageDelete,
  gameStorageKey,
  type ProjectStorageScope,
  runSerializedProjectWrite,
  scopedProjectIdentity,
  setProjectStorageNamespace,
} from './projectStorageRuntime'

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
/**
 * Evento da PÁGINA (`CustomEvent<{ id, deleted? }>`) disparado depois de toda escrita/apagamento
 * de projeto local — inclusive as silenciosas para a nuvem (restauro), porque o silêncio é para
 * o espelho, não para a lista. A lista de projetos relê SÓ aquele item (`loadProjectSummaryById`)
 * em vez de recarregar tudo (meta + capas de todos) a cada renomear/duplicar/apagar/restauro.
 */
export const PROJECT_CHANGED_EVENT = 'sz:project-changed'
export interface ProjectChangedDetail {
  id: string
  deleted?: boolean
}

function notifyProjectChanged(id: string, deleted = false): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent<ProjectChangedDetail>(PROJECT_CHANGED_EVENT, { detail: { id, deleted } }),
    )
  } catch {
    // Ambiente sem CustomEvent: a lista recarrega no próximo gesto, como antes.
  }
}
const legacyProjectKey = (id: string) => `${LEGACY_PROJECT_KEY_PREFIX}${id}`
const projectMetaKey = (id: string) => `${PROJECT_META_KEY_PREFIX}${id}`
const projectFilesKey = (id: string) => `${PROJECT_FILES_KEY_PREFIX}${id}`
const projectStateKey = (id: string) => `${PROJECT_STATE_KEY_PREFIX}${id}`
const projectBlocksKey = (id: string) => `${PROJECT_BLOCKS_KEY_PREFIX}${id}`
const projectAssetsKey = (id: string) => `${PROJECT_ASSETS_KEY_PREFIX}${id}`
const projectThumbKey = (id: string) => `${PROJECT_THUMB_KEY_PREFIX}${id}`

/**
 * Define o namespace do armazenamento local. O HOST chama ANTES de qualquer operação
 * (ProjectList/editor): no Estúdio Completo com o id do perfil kids; vazio = store padrão (a
 * lição reseta p/ vazio — usa o store padrão + id de projeto por perfil). Invalida o store em
 * cache p/ recriar com o DB do namespace. Idempotente; um save em voo já capturou o store antigo.
 */
export function setStorageNamespace(namespace: string): void {
  setProjectStorageNamespace(namespace)
}

/**
 * "Guardado na sua conta" (18/08/2026): o HOST observa TODA escrita e apagamento
 * do armazenamento local por este gancho único — é por aqui que passam o autosave
 * (`PersistenceService`), renomear/duplicar/apagar do `ProjectCard`, o import e a
 * sincronia de desenhos do Pinta. O host relê o snapshot por `loadProjectById(id)`
 * na hora de subir (sempre o estado mais recente). Um só ponto: componentes não
 * sabem que a nuvem existe. `null` desliga (aula, playground, testes).
 */
export interface StudioCloudMirror {
  /** Alguma partição do projeto `id` foi gravada (autosave, renomear, assets). */
  onChanged(id: string): void
  /** O projeto `id` foi apagado localmente. */
  onDeleted(id: string): void
}

let cloudMirror: StudioCloudMirror | null = null

/**
 * Registro de projetos ABERTOS em algum editor desta página (qualquer store: a default
 * ou as por instância do `<StudioEditor>`), alimentado pelo próprio `createProjectStore`.
 * É a régua do restauro da nuvem: gravar por baixo de um editor aberto seria sobrescrito
 * pelo próximo autosave (que ainda tem a cópia velha em memória) e subiria por cima do
 * que acabou de descer. Antes a guarda olhava só a store DEFAULT — em produção o editor
 * usa store por instância, e a garantia era falsa.
 */
const openProjectCounts = new Map<string, number>()

export function markProjectOpen(id: string): void {
  openProjectCounts.set(id, (openProjectCounts.get(id) ?? 0) + 1)
}

export function markProjectClosed(id: string): void {
  const count = (openProjectCounts.get(id) ?? 0) - 1
  if (count <= 0) openProjectCounts.delete(id)
  else openProjectCounts.set(id, count)
}

/** O projeto está aberto em algum editor desta página? */
export function isProjectOpenAnywhere(id: string): boolean {
  return openProjectCounts.has(id)
}

export function setStudioCloudMirror(mirror: StudioCloudMirror | null): void {
  cloudMirror = mirror
}

/** Best-effort: um espelho que lança nunca derruba a gravação local. */
function notifyMirrorChanged(id: string): void {
  try {
    cloudMirror?.onChanged(id)
  } catch {
    // O espelho é do host; falha lá é problema de lá.
  }
}

function notifyMirrorDeleted(id: string): void {
  try {
    cloudMirror?.onDeleted(id)
  } catch {
    // idem
  }
}

function getStore(scope?: ProjectStorageScope) {
  return (scope ?? captureProjectStorageScope()).store
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
function runSerializedWrite(
  id: string,
  task: (scope: ProjectStorageScope) => Promise<void>,
  scope?: ProjectStorageScope,
): Promise<void> {
  const captured = scope ?? captureProjectStorageScope()
  return runSerializedProjectWrite(captured, id, () => task(captured))
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

export interface PersistProjectOptions {
  /** `silent`: NÃO acorda o espelho da nuvem (restauro do que acabou de DESCER). */
  silent?: boolean
  /**
   * `replace`: o snapshot é a verdade COMPLETA do projeto (restauro da nuvem): a
   * partição de blocos é APAGADA quando o snapshot não traz `blocksState`, e a
   * miniatura antiga também. Sem isso, um jogo cujos blocos foram todos apagados
   * noutro computador (o canvas vazio sanitiza para `null`) mantinha aqui os blocos
   * velhos, que o autosave ressuscitava e subia por cima da nuvem.
   */
  replace?: boolean
}

export async function persistProject(
  project: Project,
  options: PersistProjectOptions = {},
  storageScope?: ProjectStorageScope,
): Promise<void> {
  await runSerializedWrite(
    project.id,
    async (scope) => {
      const id = project.id
      const scopedId = scopedProjectIdentity(scope, id)
      // `replace`: o que o snapshot não trouxer não pode sobreviver ao restauro (blocos
      // velhos, capa velha). Apagado DEPOIS do `setMany`, no MESMO mutex: se a gravação
      // falhar (quota cheia), o projeto local não fica sem a partição de blocos com uma IR
      // velha (abrir reconstruiria com layout padrão e o autosave subiria isso).
      // ⚠️ `blocksState == null` aqui só acontece quando a ORIGEM não tem blocos: o restauro
      // da nuvem recusa (lança) o snapshot cujo saneamento DESCARTOU blocos, ver
      // `sanitizeCloudProjectSnapshot`.
      const stale = [
        ...(options.replace ? [projectThumbKey(id)] : []),
        ...((options.replace && project.blocksState == null) || project.bridgeCodeAhead === true
          ? [projectBlocksKey(id)]
          : []),
      ]
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
      if (project.blocksState != null && project.bridgeCodeAhead !== true) {
        pairs.push([projectBlocksKey(id), projectToBlocksRecord(project)])
      }
      // Assets: só reescreve quando a referência mudou desde o último persist deste
      // id (ou na 1ª gravação, quando ainda não há referência registrada). `has`
      // distingue "nunca persistido" de "persistido como undefined" — sem isso, um
      // projeto sem assets nunca gravaria a partição (irrelevante hoje, mas o `has`
      // mantém o invariante: a 1ª gravação SEMPRE materializa a partição).
      if (
        !lastPersistedAssetsRef.has(scopedId) ||
        lastPersistedAssetsRef.get(scopedId) !== project.assets
      ) {
        pairs.push([projectAssetsKey(id), projectToAssetsRecord(project)])
      }
      await setMany(pairs, scope.store).then(() => {
        // Só registra a referência DEPOIS do write resolver: se o setMany falhar
        // (quota cheia), a partição não foi gravada e a próxima tentativa precisa
        // reescrevê-la — manter a ref antiga (ou não registrar) garante isso.
        lastPersistedAssetsRef.set(scopedId, project.assets)
      })
      if (stale.length > 0) await delMany(stale, scope.store)
    },
    storageScope,
  )
  if (!options.silent) notifyMirrorChanged(project.id)
  notifyProjectChanged(project.id)
}

export async function loadProjectById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<Project | null> {
  const kvStore = getStore(storageScope)
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
export async function loadProjectShellById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<Project | null> {
  const kvStore = getStore(storageScope)
  const [meta, files, assets] = await getMany<unknown[]>(
    [projectMetaKey(id), projectFilesKey(id), projectAssetsKey(id)],
    kvStore,
  )
  if (meta && files) {
    return assembleProjectRecord(id, meta, files, { id, ir: null, blocksState: null }, assets)
  }

  return ((await get<Project>(legacyProjectKey(id), kvStore)) ?? null) as Project | null
}

/**
 * Lê SÓ o registro de metadados do projeto (partição leve), com fallback ao doc
 * legado. Usado pelo restore em segundo plano dos blocos para sanitizar a
 * partição contra os `installedExtensions` REALMENTE persistidos — a lista vinda
 * do chamador pode estar vazia/defasada (shell ainda hidratando), e sanitizar
 * um projeto de Jogo 2D contra a allowlist só-núcleo descartaria TODOS os blocos.
 */
export async function loadProjectMetaById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<Record<string, unknown> | null> {
  const kvStore = getStore(storageScope)
  const meta = await get<unknown>(projectMetaKey(id), kvStore)
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>
  }
  const legacy = await get<unknown>(legacyProjectKey(id), kvStore)
  if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
    return legacy as Record<string, unknown>
  }
  return null
}

export async function loadProjectBlocksById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<unknown | null> {
  const kvStore = getStore(storageScope)
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

/**
 * Lê SÓ a partição de assets de um projeto FECHADO (sem meta/files/blocos).
 *
 * É o que torna viável percorrer todos os projetos da criança quando um desenho
 * do Pinta muda: a partição de assets existe justamente por ser grande e mudar
 * pouco (ver o comentário do prefixo), então varrer só ela evita materializar o
 * IR e o `blocksState` de cada projeto. Projeto legado (assets dentro do doc
 * único) devolve `[]` — a sincronia simplesmente não o alcança, e o caminho
 * normal de load segue cuidando dele.
 */
export async function loadProjectAssetsById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<ProjectAsset[]> {
  const record = await get<unknown>(projectAssetsKey(id), getStore(storageScope))
  if (!record || typeof record !== 'object' || Array.isArray(record)) return []
  return sanitizeProjectAssets((record as { assets?: unknown }).assets)
}

/**
 * Grava SÓ a partição de assets de um projeto FECHADO. Par do
 * `loadProjectAssetsById`; usa o MESMO mutex por id do `persistProject`, então
 * não intercala com um autosave/rename em voo do mesmo projeto.
 *
 * ⚠️ NUNCA use isto no projeto ABERTO: lá a fonte da verdade é o `projectStore`
 * em memória, e o próximo autosave dele sobrescreveria esta gravação.
 */
export async function persistProjectAssets(
  id: string,
  assets: ProjectAsset[],
  storageScope?: ProjectStorageScope,
): Promise<void> {
  const captured = storageScope ?? captureProjectStorageScope()
  let written = false
  await runSerializedWrite(
    id,
    async (scope) => {
      const kvStore = scope.store
      // O meta PRIMEIRO: se o projeto foi apagado entre a leitura da varredura e esta gravação
      // (o `delMany` entrou na mesma fila antes), gravar recriaria uma partição de assets
      // ÓRFÃ (MBs que nenhuma tela alcança) e acordaria a nuvem para um projeto morto.
      const meta = await get<Record<string, unknown>>(projectMetaKey(id), kvStore)
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return
      await set(projectAssetsKey(id), { id, assets }, kvStore)
      // O `lastPersistedAssetsRef` é o dirty-check POR REFERÊNCIA do
      // `persistProject`. Gravamos por fora dele: manter a referência antiga
      // registrada faria o Map mentir sobre o que está no disco. Esquecer o id
      // é o lado seguro — no máximo custa uma reescrita da partição.
      lastPersistedAssetsRef.delete(scopedProjectIdentity(scope, id))
      // O conteúdo do projeto MUDOU (o desenho novo do Pinta): bumpa `updatedAt` no meta,
      // como o rename faz. É a régua do "quem é mais novo" da nuvem — sem isso a revisão
      // subia com o mesmo `updatedAt`, o outro computador via "iguais" e nunca baixava a
      // troca de desenho (e, se editasse lá, apagava o desenho novo por cima).
      await set(projectMetaKey(id), { ...meta, updatedAt: Date.now() }, kvStore)
      written = true
    },
    captured,
  )
  if (!written) return
  // Uma varredura iniciada no perfil A pode terminar depois de o host ativar B. Os bytes
  // continuam no scope capturado de A, mas eventos/espelho globais já pertencem a B.
  if (captureProjectStorageScope().identity !== captured.identity) return
  notifyMirrorChanged(id)
  notifyProjectChanged(id)
}

export async function deleteProject(
  id: string,
  storageScope?: ProjectStorageScope,
  options: { notifyCloudMirror?: boolean } = {},
): Promise<void> {
  const scope = storageScope ?? captureProjectStorageScope()
  // Cancela autosaves em voo em TODAS as instâncias — um timer pendente
  // re-persistiria o projeto recém-apagado.
  cancelPendingAutosavesFor(id, scope.identity)
  // Cerca o armazenamento do programa do aluno ANTES do delMany: um flush do
  // preview já em voo (writeGameStorage) que chegue depois é descartado.
  fenceGameStorageDelete(scope, id)
  // Esquece a referência de assets persistida deste id: o delMany apaga a
  // partição, e se o id voltar (improvável, mas duplicate/import mintam ulid
  // novo) o 1º persist precisa re-materializar a partição de assets. Também
  // evita o Map crescer sem limite por exclusão.
  lastPersistedAssetsRef.delete(scopedProjectIdentity(scope, id))
  // No MESMO mutex de escrita do id: o delMany não pode intercalar com um
  // persist/rename em voo do mesmo projeto.
  await runSerializedProjectWrite(scope, id, () =>
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
      scope.store,
    ),
  )
  if (options.notifyCloudMirror !== false) notifyMirrorDeleted(id)
  notifyProjectChanged(id, true)
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
  await runSerializedWrite(id, async (scope) => {
    const kvStore = scope.store
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
  notifyMirrorChanged(id)
  notifyProjectChanged(id)
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
 * Grava a miniatura do projeto (best-effort, NUNCA lança). Devolve `true` apenas
 * quando a persistência foi confirmada. No mesmo mutex de escrita do id; exige
 * o meta existir — um delete concorrente (que apaga o meta na mesma cadeia) não
 * é ressuscitado por uma captura que terminou depois.
 */
export async function writeProjectThumb(id: string, dataUrl: string): Promise<boolean> {
  if (!id || !dataUrl.startsWith('data:image/') || dataUrl.length > MAX_PROJECT_THUMB_CHARS) {
    return false
  }
  let stored = false
  try {
    await runSerializedWrite(id, async (scope) => {
      const kvStore = scope.store
      const meta = await get<unknown>(projectMetaKey(id), kvStore)
      if (!meta) return
      await set(projectThumbKey(id), { id, dataUrl }, kvStore)
      stored = true
    })
  } catch {
    // Quota cheia / IndexedDB indisponível: o card só fica sem capa.
  }
  return stored
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

export function listAllProjects(storageScope?: ProjectStorageScope): Promise<ProjectSummary[]> {
  return perfSpanAsync('studio:projects:list', () =>
    listAllProjectsInternal(storageScope, { withThumbs: true }),
  )
}

/**
 * A lista LEVE: só os metadados (sem as capas). Para quem só precisa de id/nome/datas —
 * a varredura de desenhos do Pinta e a descida da nuvem comparavam ids pagando 1,5–12 MB
 * de capas em base64 por chamada. A lista de projetos continua usando `listAllProjects`
 * (com capas); o adapter local (`StudioPersistenceAdapter.list`) também.
 */
export function listProjectSummariesLight(
  storageScope?: ProjectStorageScope,
): Promise<ProjectSummary[]> {
  return perfSpanAsync('studio:projects:list-light', () =>
    listAllProjectsInternal(storageScope, { withThumbs: false }),
  )
}

/**
 * O resumo de UM projeto (meta + capa), para a lista atualizar só o card que mudou
 * (`PROJECT_CHANGED_EVENT`/`PROJECT_THUMB_UPDATED_EVENT`). `null` = não existe mais.
 */
export async function loadProjectSummaryById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<ProjectSummary | null> {
  const kvStore = getStore(storageScope)
  const [meta, thumb] = await getMany<unknown>([projectMetaKey(id), projectThumbKey(id)], kvStore)
  let summary = toProjectSummary(id, meta)
  if (!summary) {
    const legacy = await get<unknown>(legacyProjectKey(id), kvStore)
    summary = toProjectSummary(id, legacy)
  }
  if (!summary) return null
  const thumbDataUrl = thumbDataUrlOf(thumb)
  if (thumbDataUrl) summary.thumbDataUrl = thumbDataUrl
  return summary
}

/**
 * Os resumos de VÁRIOS projetos num `getMany` só (meta + capa de cada): a lista drena os
 * ids que chegaram juntos (uma descida da nuvem traz vários) sem N idas ao IndexedDB.
 * Ausente/apagado → `null` na posição.
 */
export async function loadProjectSummariesByIds(
  ids: readonly string[],
  storageScope?: ProjectStorageScope,
): Promise<Array<ProjectSummary | null>> {
  if (ids.length === 0) return []
  const kvStore = getStore(storageScope)
  const values = await getMany<unknown>(
    ids.flatMap((id) => [projectMetaKey(id), projectThumbKey(id)]),
    kvStore,
  )
  const out: Array<ProjectSummary | null> = []
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index] as string
    let summary = toProjectSummary(id, values[index * 2])
    if (!summary) {
      const legacy = await get<unknown>(legacyProjectKey(id), kvStore)
      summary = toProjectSummary(id, legacy)
    }
    if (summary) {
      const thumbDataUrl = thumbDataUrlOf(values[index * 2 + 1])
      if (thumbDataUrl) summary.thumbDataUrl = thumbDataUrl
    }
    out.push(summary)
  }
  return out
}

async function listAllProjectsInternal(
  storageScope: ProjectStorageScope | undefined,
  options: { withThumbs: boolean },
): Promise<ProjectSummary[]> {
  const kvStore = getStore(storageScope)
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
  if (options.withThumbs && summaries.length > 0) {
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
  | 'id'
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'mode'
  | 'installedExtensions'
  | 'kind'
  | 'proMeta'
  | 'bridgeCodeAhead'
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
    bridgeCodeAhead: project.bridgeCodeAhead,
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
    ir: project.bridgeCodeAhead === true ? null : project.ir,
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
