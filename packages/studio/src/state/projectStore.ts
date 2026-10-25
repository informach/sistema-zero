import { canonicalJson } from '@sistemazero/core/creations'
import { isStudioPythonAssetPath } from '@sistemazero/core/studio/portable-path'
import { isStudioPublicationId } from '@sistemazero/core/studio/project-format'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { STUDIO_PYTHON_MATERIAL_DATA_LIMITS } from '@sistemazero/core/studio/python-material-policy'
import { useContext } from 'react'
import { ulid } from 'ulid'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  createEmptyProject,
  type ExtraFile,
  type ExtraFileLanguage,
  type FileName,
  type IDEMode,
  type InstalledExtension,
  inferExtraLanguage,
  isReservedProjectFileName,
  isValidAssetDataUrl,
  type Project as JavaScriptProject,
  modesForKind,
  normalizeAssetName,
  normalizeExtraFileName,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  type ProjectFiles,
  type ProjectTree,
  type StudioProBuildLimits,
  sanitizeProjectAssetLicense,
  sanitizeProjectAssets,
  sanitizeSpriteMeta,
  sanitizeTilemapMeta,
  sanitizeTilesetMeta,
  studioProBuildFileLimitError,
  type Translator,
} from '#core'
import type { SZIRInput } from '#ir'
import { findExtension } from '#official-extensions'
import { reconcileDrawingsFromRestoredProject } from '../asset-library/personalSync'
import { createProProject as createProProjectFromTemplate } from '../components/code/pro-templates'
import { pythonAssetFileExtension } from '../core/assetBinary'
import {
  isPythonProject,
  type EditableStudioProject as Project,
  type PythonProjectDocument,
  type PythonProProjectDocument,
} from '../core/editableProject'
import {
  type PgzeroAudioRole,
  pgzeroMediaPath,
  pgzeroNameForPath,
  pgzeroRelocatedAssets,
  pgzeroRenamedAsset,
  pgzeroSvgAssetSize,
  projectUsesPgzero,
  pythonProjectOccupiedPaths,
} from '../core/pgzeroMediaPaths'
import { readPintaImageAssetMetadata } from '../core/pintaImageAsset'
import { parseProAssistance } from '../core/proAssistance'
import {
  assertProjectContentPreserved,
  CURRENT_PROJECT_FORMAT_VERSION,
  prepareProjectDocument,
  projectFormatVersion,
  retainProjectTools,
  SUPPORTED_PROJECT_FORMAT_VERSION,
} from '../core/projectDocument'
import type { StudioProjectFactoryContext } from '../core/projectFactory'
import { withoutProjectPublication } from '../core/projectPublication'
import type { ProAssistanceMeta } from '../core/proProject'
import {
  projectUsesRaylib,
  projectUsesRaylib3D,
  raylibPlacedAsset,
  raylibRelocatedAssets,
  raylibRenamedAsset,
} from '../core/raylibMediaPaths'
import type { StudioPersistenceAdapter } from '../persistence/types'
import {
  emptyPythonWorkspaceState,
  preservePythonWorkspaceDraft,
} from '../python/blocks/workspaceDraft'
import { prepareEditableCloudProject } from './editableCloudProject'
import { prepareEditableStudioProject } from './editableProjectValidation'
import {
  deleteProject as deleteProjectFromDB,
  isProjectOpenAnywhere,
  listAllProjects,
  loadProjectBlocksById,
  loadProjectById,
  loadProjectMetaById,
  loadProjectShellById,
  markProjectClosed,
  markProjectOpen,
  persistProject,
  renameProjectMeta,
} from './persistence'
import { beginProjectOpening } from './projectOpening'
import { bindProjectToDurableHead } from './projectStorageCoordinator'
import {
  advanceLocalRevision,
  copyLocalRevision,
  forkLocalRevision,
  readLocalRevision,
} from './projectStorageRevision'
import {
  captureProjectStorageScope,
  getProjectStorageScope,
  type ProjectStorageScope,
} from './projectStorageRuntime'
import {
  getAllowedBlocklyBlockTypes,
  isPlainRecord,
  PROJECT_FILE_LIMITS,
  projectFilesLimitError,
  type ResolvedLimits,
  type StudioLimits,
  sanitizeImportedExtensions,
  sanitizeImportedProjectSnapshot,
  sanitizeProjectName,
  sanitizeStoredBlocksState,
  sanitizeStoredProject,
} from './projectValidation'
import {
  addProDir,
  addProFile,
  removeProNode,
  renameProNode,
  sanitizeProTree,
  setProFileContent,
} from './proTree'
import {
  addPythonProjectNode,
  removePythonProjectNode,
  renamePythonProjectNode,
} from './pythonProjectEdits'
import { pythonProjectLayoutError } from './pythonProjectLayout'
import { StudioStoresContext } from './storesContext'

/**
 * Ciclo de vida da restauração em SEGUNDO PLANO do `blocksState` (partição
 * pesada, omitida pela abertura rápida). Mantido pelo PersistenceService:
 * - 'idle': nada a restaurar (sem adapter/partição, projeto veio completo, pro).
 * - 'pending': partição sendo lida — autosaves NÃO gravam a partição de blocos.
 * - 'restored': partição aplicada ao projeto vivo.
 * - 'empty': não havia nada salvo (definitivo) — modos podem derivar do código.
 * - 'failed': leitura falhou/estourou o tempo — partição protegida na sessão.
 * - 'discarded': havia estado salvo, mas o aluno já tinha blocos vivos editados.
 */
export type BlocksHydrationStatus =
  | 'idle'
  | 'pending'
  | 'restored'
  | 'empty'
  | 'failed'
  | 'discarded'

interface ProjectStore {
  editingAccess: 'author' | 'observer'
  setEditingAccess: (access: 'author' | 'observer') => void
  project: Project | null
  isDirty: boolean
  saveError: string | null
  /** Estado da restauração em 2º plano dos blocos (ver BlocksHydrationStatus). */
  blocksHydration: BlocksHydrationStatus
  setBlocksHydration: (status: BlocksHydrationStatus) => void
  /**
   * Épocas da sincronização código⇄blocos da Ponte (sessão, não persistem).
   * `bridgeCodeEditEpoch` incrementa a cada edição de CÓDIGO na Ponte
   * (setFiles/setFile com mode 'bridge'); `bridgeBlocksSyncedEpoch` marca até
   * QUAL época os blocos/IR refletem os arquivos (o reverse-parse captura a
   * época no POST e marca ao aplicar; edição real de blocos marca a época
   * corrente — blocos viram a autoridade). `code > synced` ⇒ os blocos estão
   * DEFASADOS: nenhuma carga pode regenerar arquivos a partir deles (o
   * BlocklyPanel pula o force do FINISHED_LOADING) e o BlocksMode deriva os
   * blocos do código ao entrar. Sem isso, digitar na Ponte e trocar de modo
   * dentro da janela do reverse-parse (~0,9s de debounce + worker, que MORRE
   * com a Ponte) regenerava os arquivos dos blocos velhos e PERDIA o código.
   */
  bridgeCodeEditEpoch: number
  bridgeBlocksSyncedEpoch: number
  /** Marca que os blocos refletem os arquivos ATÉ a época dada (monotônico). */
  markBridgeBlocksSynced: (epoch: number) => void
  loadProject: (id: string) => Promise<Project | null>
  /** Hidrata um projeto já sanitizado (host/<Studio>) SEM marcar como sujo. */
  hydrateProject: (p: Project) => void
  /** Mescla estado derivado do load/rehydrate SEM marcar como edição do aluno. */
  hydrateProjectState: (patch: ProjectStatePatch) => void
  unloadProject: () => void
  createProject: (name: string, initialExtensionIds?: readonly string[]) => Promise<Project>
  createPythonProject: (
    name: string,
    kind: 'classic' | 'pro',
    context: StudioProjectFactoryContext,
    options: { isCurrent: () => boolean },
  ) => Promise<Project>
  /** Cria e persiste um projeto PROFISSIONAL a partir de um template. */
  createProProject: (
    name: string,
    templateId: string,
    options?: { isCurrent(): boolean },
  ) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  importProjectFromJSON: (
    raw: unknown,
    options?: {
      storageScope?: ProjectStorageScope
      silent?: boolean
      isCurrent?: () => boolean
      /** A miniatura gravada junto com o projeto novo (na mesma transação dos `put`). */
      thumb?: string | null
    },
  ) => Promise<{ project: Project; warnings: string[] }>
  /**
   * Restaura um snapshot vindo da NUVEM ("guardado na sua conta") preservando id e datas,
   * gravando SEM acordar o espelho e SUBSTITUINDO o que havia (blocos/capa antigos não
   * sobrevivem). Recusa (lança) se o id não for o esperado ou se o projeto estiver ABERTO
   * no editor. Ver `setStudioCloudMirror` em `state/persistence.ts`.
   */
  restoreProjectSnapshot: (
    raw: unknown,
    options?: {
      expectedId?: string
      storageScope?: ProjectStorageScope
      /** A miniatura que veio da nuvem com o item (gravada na mesma transação). */
      thumb?: string | null
    },
  ) => Promise<{ project: Project; warnings: string[] }>
  setProject: (p: Project) => void
  setProPublication: (playId: string) => string | null
  setPublication: (playId: string) => string | null
  setProAssistance: (assistance: ProAssistanceMeta) => string | null
  setMode: (mode: IDEMode) => void
  /** Gradua um projeto básico para profissional (Vite). One-way. */
  convertToPro: (preserveOriginal: (project: Project) => Promise<void>) => Promise<void>
  reconcileProAssets: (projectId: string, expected: ProjectAsset[], next: ProjectAsset[]) => void
  setFiles: (files: Partial<ProjectFiles>) => void
  setFile: (name: FileName, value: string) => void
  /** Python source stays authoritative in Classic and Pro, including syntax errors. */
  setPythonFile: (path: string, content: string) => string | null
  /** A completed visual transaction can commit only against its captured document. */
  applyPythonSourceFiles: (
    expected: PythonProjectDocument,
    files: Record<string, string>,
    blocksState: unknown,
  ) => string | null
  setIR: (ir: SZIRInput | null) => void
  setBlocksState: (state: unknown | null) => void
  applyProjectState: (patch: ProjectStatePatch) => void
  installExtension: (id: string, version: string) => void
  applyPythonExtensions: (
    expected: PythonProjectDocument,
    extensions: InstalledExtension[],
    beforeCommit?: () => void,
  ) => Promise<string | null>
  removeExtension: (id: string) => void
  rename: (name: string) => void
  markSaved: () => void
  markSaveFailed: (message: string) => void
  /** Cria arquivo extra. Devolve mensagem de erro ou null se ok. */
  addExtraFile: (name: string) => string | null
  setExtraFile: (name: string, content: string) => void
  renameExtraFile: (oldName: string, newName: string) => string | null
  removeExtraFile: (name: string) => void
  // --- Assets embutidos (imagens/sprites) ---
  /** Adiciona um asset (já reduzido/comprimido pela UI). Devolve erro ou null. */
  addAsset: (input: NewAssetInput) => string | null
  removeAsset: (id: string) => void
  /** Renomeia um asset. Devolve erro ou null. */
  renameAsset: (id: string, newName: string) => string | null
  /**
   * Grava/atualiza metadados de PEÇAS (tileset) ou de MAPA (tilemap) num asset
   * de imagem — o caminho do UPLOAD virar tileset/mapa sem passar pelo Pinta.
   * Saneia na entrada (metadado inválido = erro amigável, asset intocado).
   */
  updateAssetMeta: (id: string, meta: { tileset?: unknown; tilemap?: unknown }) => string | null
  /**
   * Troca a IMAGEM de um asset preservando a identidade dele — o caminho de
   * "editei o desenho no Pinta, o jogo se atualiza sozinho". Devolve erro ou null.
   */
  updateAssetImage: (id: string, image: UpdateAssetImageInput) => string | null
  /** Persiste a origem descoberta de um asset pessoal legado. */
  setAssetLibraryOrigin: (id: string, origin: 'pinta' | 'molda') => string | null
  /**
   * Escolhe uma IMAGEM do projeto como capa fixa do card (`null` = voltar à foto automática).
   * Só grava o nome no projeto (bumpa `updatedAt`, então sobe pela nuvem como qualquer edição);
   * quem regrava a miniatura na hora é quem chama (`captureAndStoreProjectThumb`). Devolve erro
   * legível ou `null`.
   */
  setCoverAsset: (assetId: string | null) => string | null
  // --- Modo profissional (project.kind === 'pro') ---
  /** Cria arquivo na árvore pro. Devolve mensagem de erro ou null se ok. */
  addProFile: (path: string) => string | null
  /** Cria pasta na árvore pro. Devolve mensagem de erro ou null se ok. */
  addProDir: (path: string) => string | null
  setProFileContent: (path: string, content: string) => void
  /** Atomic external reconciliation; a stale project/tree cannot overwrite a live edit. */
  reconcileProFiles: (
    projectId: string,
    expected: ProjectTree,
    tree: ProjectTree,
    beforePublish?: (project: Project) => void,
    materials?: { assets: ProjectAsset[]; coverAssetName: string | null },
    pythonConfiguration?: Pick<
      PythonProProjectDocument,
      'runtime' | 'python' | 'installedExtensions'
    >,
  ) => string | null
  /** Renomeia/move nó da árvore pro. Devolve mensagem de erro ou null se ok. */
  renameProNode: (from: string, to: string) => string | null
  removeProNode: (path: string) => void
}

interface ProjectStatePatch {
  files?: Partial<ProjectFiles>
  ir?: SZIRInput | null
  blocksState?: unknown | null
  installedExtensions?: InstalledExtension[]
}

/**
 * Entrada de `addAsset`: a UI já fez downscale/compressão no canvas e produziu o
 * `data:` URL. O store gera o `id`, normaliza o nome e valida o orçamento.
 */
export interface NewAssetInput {
  name: string
  dataUrl: string
  /** `'image'` (padrão), `'audio'` (som/música), `'model3d'` (.glb),
   *  `'environment3d'` (céu .hdr) ou `'font'` (TTF/OTF, só no Raylib). */
  kind?: ProjectAsset['kind']
  /** Nome do arquivo original — OBRIGATÓRIO nos 3D e nas fontes (a validação cruza
   *  a extensão com o MIME e a assinatura binária). */
  originalFileName?: string
  width?: number
  height?: number
  source?: 'upload' | 'library'
  libId?: string
  libRevision?: number
  /** Origem da criação quando `libId` é `personal:<id>` (ver `ProjectAsset.libOrigin`). */
  libOrigin?: 'pinta' | 'molda'
  /** Strict captured-image metadata, validated before committing the asset. */
  pintaImage?: unknown
  /** Attribution travels with the bytes through native/web export and publication. */
  license?: ProjectAsset['license']
  /** Pygame Zero and Raylib: the child chose a short sound (`sounds/`) or a song (`music/`). */
  pgzeroAudio?: PgzeroAudioRole
  /** Metadados do Pinta (animações/tiles/mapa) — saneados no store antes de guardar. */
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
}

/**
 * Entrada de `updateAssetImage`: os BYTES novos (e o que a criação traz junto).
 * Vale para imagens (o desenho do Pinta) e para os binários 3D do Molda (`.glb`/
 * `.hdr`). Sem `name`/`id`/`libId` de propósito — trocar os bytes nunca muda a
 * identidade do asset (ver o comentário da ação).
 */
export interface UpdateAssetImageInput {
  dataUrl: string
  /**
   * Só nos 3D: o nome do arquivo novo (`nave.glb`). A validação cruza extensão × MIME ×
   * assinatura; ausente, vale o que o asset já tinha.
   */
  originalFileName?: string
  width?: number
  height?: number
  /** Metadados do desenho de origem; ausentes seguem a regra da geometria. */
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
  /** Revisão dos bytes na biblioteca pessoal. */
  libRevision?: number
  pintaImage?: unknown
}

function bump<T extends Project>(p: T): T {
  return { ...p, updatedAt: Date.now() }
}

// Limites de import para evitar DoS (arquivos gigantes) e corrupção de state.
// Cotas subidas ~2x (2026-06) para permitir projetos maiores. IMPORTANTE: estes
// tetos são COMPARTILHADOS entre importar / abrir (load) / salvar / preview — subir
// aqui sobe em todos os caminhos de forma consistente (sem re-recorte ao reabrir).
// `MAX_PROJECT_IMPORT_CHARS` precisa ser ≥ a soma dos sub-limites (arquivos +
// blocksState + IR + assets) para um projeto cheio conseguir reimportar.
export { MAX_PROJECT_IMPORT_CHARS } from './projectLimits'

export async function loadSanitizedProjectById(
  id: string,
  storageScope?: ProjectStorageScope,
  recoverDraft = false,
): Promise<Project | null> {
  const raw = await loadProjectById(id, storageScope, { recoverDraft })
  if (!raw) return null
  const sanitized = await prepareEditableStudioProject(raw)
  if (sanitized && sanitized.id !== id) throw new Error('O projeto salvo tem outra identidade.')
  return sanitized
}

export async function loadSanitizedProjectShellById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<Project | null> {
  const shell = await loadProjectShellById(id, storageScope)
  if (!shell) return null
  // A migração precisa do documento inteiro antes de separar suas partições.
  if (projectFormatVersion(shell) === SUPPORTED_PROJECT_FORMAT_VERSION) {
    // Python source is authoritative; its derived visual partition stays opaque.
    const prepared = await prepareEditableStudioProject(shell)
    if (prepared && prepared.id !== id) throw new Error('O projeto salvo tem outra identidade.')
    return prepared
  }
  if (projectFormatVersion(shell) !== CURRENT_PROJECT_FORMAT_VERSION)
    return loadSanitizedProjectById(id, storageScope)
  const sanitized = sanitizeStoredProject(shell, id)
  return sanitized ? copyLocalRevision(shell, sanitized) : null
}

export async function loadSanitizedProjectBlocksStateById(
  id: string,
  installedExtensions: InstalledExtension[] = [],
  storageScope?: ProjectStorageScope,
): Promise<Project['blocksState']> {
  const raw = await loadProjectBlocksById(id, storageScope)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return null
  const record = raw as Record<string, unknown>
  if (record.id != null && record.id !== id) return null
  // Sanitiza contra a UNIÃO das extensões do chamador com as do META persistido:
  // a lista do chamador pode vir vazia/defasada (shell ainda hidratando noutra
  // aba, host antigo), e o sanitize é tudo-ou-nada — um projeto de Jogo 2D
  // avaliado contra a allowlist só-núcleo perderia TODOS os blocos. O meta é a
  // fonte durável do que está instalado; unir nunca REMOVE uma permissão do
  // chamador, só re-adiciona as persistidas.
  const meta = await loadProjectMetaById(id, storageScope)
  const metaExtensions = meta ? sanitizeImportedExtensions(meta.installedExtensions) : []
  const merged = new Map<string, InstalledExtension>()
  for (const extension of installedExtensions) merged.set(extension.id, extension)
  for (const extension of metaExtensions) {
    if (!merged.has(extension.id)) merged.set(extension.id, extension)
  }
  return sanitizeStoredBlocksState(record.blocksState, [...merged.values()])
}

/**
 * Um tipo de bloco é aceito NESTE projeto? (core + extensões instaladas.) Usado
 * pelo colar de blocos entre projetos (`blockClipboard`) para recusar tipos que o
 * destino não tem — SEM o all-or-nothing do `sanitizeImportedBlocksState`.
 */
export function isBlockTypeKnown(type: string, installedExtensions: InstalledExtension[]): boolean {
  return getAllowedBlocklyBlockTypes(installedExtensions).has(type)
}

/**
 * O nome que a criança lê (Jogo 2D), nunca o id interno (game-2d); id desconhecido volta como
 * veio. Mora aqui porque o `ImportButton` já carrega esta store sob demanda: um `import()` próprio
 * do catálogo partiria o pacote da lista em mais um arquivo (`initialBundleBudget.test.ts`).
 */
export function extensionDisplayName(id: string): string {
  return findExtension(id)?.manifest.name ?? id
}

export interface CreateProjectStoreOptions {
  /** Limites de política do host — anti-DoS profundos continuam internos. */
  limits?: StudioLimits
  /** Cotas do compilador remoto Pro desta instância, quando houver. */
  proBuildLimits?: StudioProBuildLimits
  /** Tradutor estático da instância; a store não depende de React context. */
  translator?: Translator
}

/** O objeto capturado muda a cada troca de perfil, inclusive A → B → A. */
function assertProjectCreationScope(scope: ProjectStorageScope): void {
  if (scope !== captureProjectStorageScope()) {
    throw new Error('O perfil mudou durante a criação. Inicie novamente no perfil atual.')
  }
}

export function createProjectStore(
  options: CreateProjectStoreOptions = {},
): StoreApi<ProjectStore> {
  const limits: ResolvedLimits = { ...PROJECT_FILE_LIMITS, ...options.limits }
  const proBuildLimits = options.proBuildLimits
  const pythonEditLimits = {
    maxFileChars: Math.min(limits.maxFileChars, proBuildLimits?.maxFileChars ?? Infinity),
    maxTotalChars: Math.min(limits.maxTotalChars, proBuildLimits?.maxTotalChars ?? Infinity),
    maxExtraFiles: limits.maxExtraFiles,
    maxFiles: proBuildLimits?.maxFiles,
    maxRequestBytes: proBuildLimits?.maxRequestBytes,
  }
  const proTreeLimitError = (tree: ProjectTree): string | null => {
    if (!proBuildLimits) return null
    const files = Object.fromEntries(
      Object.entries(tree)
        .filter(
          (entry): entry is [string, { kind: 'file'; content: string }] =>
            entry[1]?.kind === 'file' && typeof entry[1].content === 'string',
        )
        .map(([path, node]) => [path, node.content]),
    )
    const error = studioProBuildFileLimitError(files, proBuildLimits)
    if (error === 'TOO_MANY_FILES') {
      return `Este projeto aceita no máximo ${proBuildLimits.maxFiles} arquivos.`
    }
    if (error === 'FILE_TOO_LARGE') return 'Um arquivo excede o tamanho permitido neste projeto.'
    if (error === 'TOTAL_TOO_LARGE') return 'O projeto excede o tamanho permitido.'
    if (error === 'REQUEST_TOO_LARGE') {
      return 'O projeto excede o tamanho permitido para enviar ao compilador.'
    }
    return null
  }
  // Sequência monotônica de carga (single-flight, igual ao loadInFlight do
  // settingsStore): dois loads que se sobrepõem (aluno clica projeto A e logo B)
  // podem resolver FORA DE ORDEM — sem o guard, o mais LENTO (mais antigo)
  // sobrescreveria o mais novo e ainda zeraria isDirty. Capturamos o número antes
  // do await e, ao voltar, abortamos (não dá `set`) se um load mais novo começou.
  // Por instância (no closure do factory), não module-global: stores separadas
  // não disputam o mesmo contador.
  let loadSeq = 0
  let releasePendingOpening = () => {}
  const store = createStore<ProjectStore>((rawSet, get) => {
    const set: typeof rawSet = (update) => {
      const patch = typeof update === 'function' ? update(get()) : update
      if (get().editingAccess === 'observer' && ('project' in patch || patch.isDirty === true))
        return
      if (patch.project && patch.project !== get().project) {
        const incoming = readLocalRevision(patch.project)
        const previous = get().project && readLocalRevision(get().project!)
        patch.project =
          patch.isDirty === false ||
          (incoming?.lineage.recovery && incoming.lineage !== previous?.lineage)
            ? forkLocalRevision(patch.project)
            : advanceLocalRevision(get().project, patch.project)
      }
      rawSet(patch)
    }
    const commitPython = (project: PythonProjectDocument): string | null => {
      if (get().editingAccess !== 'author') return 'Este projeto está em observação.'
      const error = pythonProjectLayoutError(project, pythonEditLimits)
      if (error) return error
      set({ project: bump(project), isDirty: true, saveError: null })
      return null
    }
    return {
      editingAccess: 'author',
      setEditingAccess: (editingAccess) => rawSet({ editingAccess }),
      project: null,
      isDirty: false,
      saveError: null,
      blocksHydration: 'idle',
      // Escrito pelo PersistenceService (dono do ciclo de restauração). Nunca toca
      // isDirty: status não é edição.
      setBlocksHydration: (status) => set({ blocksHydration: status }),
      bridgeCodeEditEpoch: 0,
      bridgeBlocksSyncedEpoch: 0,
      markBridgeBlocksSynced: (epoch) =>
        set((s) => {
          const bridgeBlocksSyncedEpoch = Math.max(s.bridgeBlocksSyncedEpoch, epoch)
          const project = s.project
          if (
            project?.bridgeCodeAhead !== true ||
            bridgeBlocksSyncedEpoch < s.bridgeCodeEditEpoch
          ) {
            return { bridgeBlocksSyncedEpoch }
          }
          const { bridgeCodeAhead: _bridgeCodeAhead, ...syncedProject } = project
          return {
            bridgeBlocksSyncedEpoch,
            project: bump(syncedProject),
            isDirty: true,
            saveError: null,
          }
        }),
      loadProject: async (id) => {
        loadSeq += 1
        const seq = loadSeq
        releasePendingOpening()
        const scope = captureProjectStorageScope()
        const release = beginProjectOpening(scope, id)
        releasePendingOpening = release
        try {
          const existing = await loadSanitizedProjectById(id, scope, true)
          // Um load mais novo começou enquanto este aguardava o disco: a corrida foi
          // perdida — não toca o store (o load mais novo é a verdade), mas devolve o
          // que ESTE load leu para o chamador que o aguardava (sem efeito colateral).
          if (seq !== loadSeq || scope.signal?.aborted) return existing
          if (!existing) {
            set({ project: null, isDirty: false, saveError: null, blocksHydration: 'idle' })
            return null
          }
          set({
            project: existing,
            isDirty: readLocalRevision(existing)?.lineage.recovery === true,
            saveError: readLocalRevision(existing)?.lineage.recovery
              ? 'Uma edição preservada foi reaberta. A gravação local ainda está pendente.'
              : null,
            blocksHydration: 'idle',
            bridgeCodeEditEpoch: 0,
            bridgeBlocksSyncedEpoch: 0,
          })
          return existing
        } finally {
          release()
          if (releasePendingOpening === release) releasePendingOpening = () => {}
        }
      },
      hydrateProject: (p) => {
        loadSeq++
        releasePendingOpening()
        rawSet({
          project: forkLocalRevision(p),
          isDirty: readLocalRevision(p)?.lineage.recovery === true,
          saveError: readLocalRevision(p)?.lineage.recovery
            ? 'Uma edição preservada foi reaberta. A gravação local ainda está pendente.'
            : null,
          blocksHydration: 'idle',
          bridgeCodeEditEpoch: 0,
          bridgeBlocksSyncedEpoch: 0,
        })
      },
      hydrateProjectState: (patch) => {
        const p = get().project
        if (!p) return
        if (isPythonProject(p)) {
          if (
            p.kind === 'classic' &&
            !patch.files &&
            !('ir' in patch) &&
            !patch.installedExtensions &&
            'blocksState' in patch
          )
            set({
              project: {
                ...p,
                blocksState: copyStudioProjectJson(patch.blocksState ?? null) ?? null,
              },
              saveError: null,
            })
          return
        }
        const nextFiles = patch.files ? { ...p.files, ...patch.files } : p.files
        const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [], limits)
        if (limitError) {
          set({ saveError: limitError })
          return
        }
        set({
          project: {
            ...p,
            files: nextFiles,
            ir: 'ir' in patch ? (patch.ir ?? null) : p.ir,
            blocksState: 'blocksState' in patch ? (patch.blocksState ?? null) : p.blocksState,
            projectTools: retainProjectTools(p.projectTools, patch.blocksState),
            installedExtensions: patch.installedExtensions ?? p.installedExtensions,
          },
          saveError: null,
        })
      },
      unloadProject: () => {
        loadSeq++
        releasePendingOpening()
        rawSet({
          project: null,
          isDirty: false,
          saveError: null,
          blocksHydration: 'idle',
          bridgeCodeEditEpoch: 0,
          bridgeBlocksSyncedEpoch: 0,
        })
      },
      createProject: async (name, initialExtensionIds) => {
        const scope = captureProjectStorageScope()
        const base = createEmptyProject(ulid(), sanitizeProjectName(name))
        const installedExtensions = [...new Set(initialExtensionIds ?? [])].flatMap((id) => {
          const definition = findExtension(id)
          return definition
            ? [{ id, version: definition.manifest.version, installedAt: Date.now() }]
            : []
        })
        const p: Project = { ...base, installedExtensions }
        await persistProject(p, {}, scope)
        assertProjectCreationScope(scope)
        return p
      },
      createPythonProject: async (name, kind, context, options) => {
        const scope = captureProjectStorageScope()
        const assertCurrent = () => {
          assertProjectCreationScope(scope)
          if (!options.isCurrent())
            throw new Error('A criação foi cancelada ou este ambiente não está mais disponível.')
        }
        assertCurrent()
        const { createEditableStudioProject } = await import('../core/projectFactory')
        assertCurrent()
        const project = await createEditableStudioProject(
          { id: ulid(), name: sanitizeProjectName(name), programmingLanguage: 'python', kind },
          context,
        )
        assertCurrent()
        await persistProject(project, {}, scope)
        assertCurrent()
        return project
      },
      createProProject: async (name, templateId, options) => {
        const scope = captureProjectStorageScope()
        const assertCurrent = () => {
          if (options && !options.isCurrent())
            throw new Error('A criação foi cancelada ou este modelo não está mais disponível.')
        }
        assertCurrent()
        const p = await createProProjectFromTemplate(ulid(), sanitizeProjectName(name), templateId)
        assertProjectCreationScope(scope)
        assertCurrent()
        await persistProject(p, {}, scope)
        assertProjectCreationScope(scope)
        assertCurrent()
        return p
      },
      duplicateProject: async (id) => {
        const scope = captureProjectStorageScope()
        const source = await loadSanitizedProjectById(id, scope)
        if (!source) return null
        const now = Date.now()
        const copy: Project = {
          ...withoutProjectPublication(source),
          id: ulid(),
          name: `${source.name.slice(0, 192)} (cópia)`,
          createdAt: now,
          updatedAt: now,
        }
        await persistProject(copy, {}, scope)
        assertProjectCreationScope(scope)
        return copy
      },
      deleteProject: async (id) => {
        await deleteProjectFromDB(id)
        if (get().project?.id === id) {
          set({ project: null, isDirty: false, saveError: null })
        }
      },
      renameProject: async (id, name) => {
        const safeName = sanitizeProjectName(name)
        if (get().project?.id === id) {
          get().rename(safeName)
          await renameProjectMeta(id, safeName, get().project!)
          return
        }
        // Escrita SÓ-METADADO: NÃO reler+reescrever files/state (snapshot estale
        // ressuscitaria bytes antigos e correria com o autosave do editor aberto).
        await renameProjectMeta(id, safeName)
        // Atualiza a store viva só se for o projeto carregado — e SÓ o nome/updatedAt,
        // preservando edições não salvas em arquivos/IR/blocksState do editor aberto.
        const current = get().project
        if (current?.id === id) {
          set({ project: { ...current, name: safeName, updatedAt: Date.now() }, saveError: null })
        }
      },
      importProjectFromJSON: async (raw, options = {}) => {
        const scope = options.storageScope ?? captureProjectStorageScope()
        const assertCurrent = () => {
          if (options.isCurrent && !options.isCurrent())
            throw new Error('A importação foi cancelada.')
        }
        assertCurrent()
        const result =
          projectFormatVersion(raw) === SUPPORTED_PROJECT_FORMAT_VERSION
            ? { project: await prepareEditableStudioProject(raw), warnings: [] as string[] }
            : sanitizeImportedProjectSnapshot(await prepareProjectDocument(raw))
        if (!result.project) throw new Error('Documento de projeto inválido.')
        assertCurrent()
        const { warnings } = result
        const now = Date.now()
        const project = {
          ...withoutProjectPublication(result.project),
          id: ulid(),
          createdAt: now,
          updatedAt: now,
        }
        await persistProject(project, { silent: options.silent, thumb: options.thumb }, scope)
        assertCurrent()
        return { project, warnings }
      },
      restoreProjectSnapshot: async (raw, options = {}) => {
        // "Guardado na sua conta": o snapshot volta com o MESMO id (é o vínculo com a
        // nuvem e com o `pensa-<id>`) e com as datas de origem — a régua de "quem é
        // mais novo" na sincronia. Grava em SILÊNCIO: um restauro não pode acordar o
        // espelho e re-subir o que acabou de descer. Id conferido e saneamento ESTRITO
        // (nada é gravado com id inventado nem com blocos/programa descartados) ANTES de
        // tocar no disco — `sanitizeCloudProjectSnapshot`.
        const scope = options.storageScope ?? captureProjectStorageScope()
        const { project, warnings } = await prepareEditableCloudProject(raw, {
          expectedId: options.expectedId,
        })
        // Projeto ABERTO em algum editor desta página (qualquer store, não só esta): a
        // memória viva venceria no próximo autosave e subiria por cima do que acabou de
        // descer. O host só restaura antes da lista; se por alguma corrida chegar aqui,
        // recusa em vez de gravar por baixo do editor.
        if (get().project?.id === project.id || isProjectOpenAnywhere(project.id)) {
          throw new Error('Snapshot recusado: o projeto está aberto no editor.')
        }
        await bindProjectToDurableHead(project, scope)
        // Antes de persistir, converge desenhos por revisão. Se só um lado é mais novo,
        // ele vence; legado divergente preserva ambos e religa o projeto à cópia remota.
        const drawings = await reconcileDrawingsFromRestoredProject(project, {
          namespace: scope.namespace,
        })
        // `replace`: o snapshot é a verdade completa — blocos/capa antigos não sobrevivem
        // (a partição de blocos só cai quando a ORIGEM não tem blocos: o estrito garante).
        await persistProject(
          project,
          { silent: !drawings.projectChanged, replace: true, thumb: options.thumb },
          scope,
        )
        return { project, warnings }
      },
      setProAssistance: (assistance) => {
        const project = get().project
        if (get().editingAccess !== 'author')
          return 'Este projeto está aberto somente para leitura.'
        if (project?.kind !== 'pro' || !project.proMeta) return 'Abra um projeto profissional.'
        try {
          const parsed = parseProAssistance(assistance)
          set({
            project: isPythonProject(project)
              ? bump({ ...project, proMeta: { ...project.proMeta, assistance: parsed } })
              : bump({ ...project, proMeta: { ...project.proMeta, assistance: parsed } }),
            isDirty: true,
            saveError: null,
          })
          return null
        } catch (error) {
          return error instanceof Error ? error.message : 'Decisões inválidas.'
        }
      },
      setProPublication: (playId) => get().setPublication(playId),
      setPublication: (playId) => {
        const project = get().project
        if (get().editingAccess !== 'author')
          return 'Este projeto está aberto somente para leitura.'
        if (!isStudioPublicationId(playId)) return 'Publicação inválida.'
        if (project && isPythonProject(project) && project.kind === 'classic') {
          set({
            project: bump({ ...project, publication: { playId } }),
            isDirty: true,
            saveError: null,
          })
          return null
        }
        if (project?.kind !== 'pro' || !project.proMeta)
          return 'Abra um projeto com histórico de publicação.'
        set({
          project: isPythonProject(project)
            ? bump({ ...project, proMeta: { ...project.proMeta, publication: { playId } } })
            : bump({ ...project, proMeta: { ...project.proMeta, publication: { playId } } }),
          isDirty: true,
          saveError: null,
        })
        return null
      },
      setProject: (p) =>
        set({
          project: p,
          isDirty: true,
          saveError: null,
          blocksHydration: 'idle',
          bridgeCodeEditEpoch: 0,
          bridgeBlocksSyncedEpoch: 0,
        }),
      setMode: (mode) => {
        const p = get().project
        if (!p) return
        // Só permite modos válidos para o TIPO do projeto (D2): básico = Blocos/
        // Ponte, pro = Código. Um modo fora disso cai no primeiro permitido.
        const allowed = modesForKind(p.kind)
        const next: IDEMode = allowed.includes(mode) ? mode : (allowed[0] ?? 'blocks')
        if (p.mode === next) return
        if (isPythonProject(p)) {
          if (p.kind === 'classic' && (next === 'blocks' || next === 'bridge'))
            set({ project: bump({ ...p, mode: next }), isDirty: true, saveError: null })
          return
        }
        set({ project: bump({ ...p, mode: next }), isDirty: true, saveError: null })
      },
      reconcileProAssets: (projectId, expected, next) => {
        const project = get().project
        if (
          project?.id !== projectId ||
          project.kind !== 'pro' ||
          (project.assets !== expected && !(project.assets === undefined && expected.length === 0))
        )
          throw new Error('Os materiais mudaram durante a sincronização. Tente salvar novamente.')
        const sanitized = sanitizeProjectAssets(
          next,
          isPythonProject(project)
            ? {
                materialPath: isStudioPythonAssetPath,
                dataLimits: STUDIO_PYTHON_MATERIAL_DATA_LIMITS,
              }
            : undefined,
        )
        assertProjectContentPreserved({ assets: next }, { ...project, assets: sanitized })
        if (isPythonProject(project)) {
          const error = commitPython({ ...project, assets: sanitized })
          if (error) throw new Error(error)
          return
        }
        set({ project: bump({ ...project, assets: next }), isDirty: true, saveError: null })
      },
      convertToPro: async (preserveOriginal) => {
        const initial = get().project
        if (!initial || initial.kind === 'pro') return
        if (get().editingAccess !== 'author') throw new Error('Este projeto está em observação.')
        if (isPythonProject(initial)) {
          const { preparePythonPromotion } = await import('./pythonPromotion')
          const source = get().project
          if (source !== initial || !isPythonProject(source))
            throw new Error('O projeto mudou durante a conversão. Tente novamente.')
          const { original, converted } = await preparePythonPromotion(source, {
            originalId: ulid(),
            now: Date.now(),
          })
          if (get().project !== source || get().editingAccess !== 'author')
            throw new Error('O projeto mudou durante a conversão. Tente novamente.')
          await preserveOriginal(original)
          if (get().project !== source || get().editingAccess !== 'author')
            throw new Error('O projeto mudou enquanto a cópia original era salva. Tente novamente.')
          set({ project: bump(converted), isDirty: true, saveError: null })
          return
        }
        // Import dinâmico PRIMEIRO: o build de conversão (com sucrase via
        // export/fileMap) só entra no bundle quando o aluno gradua o projeto, não no
        // boot do editor. Fazê-lo antes de ler o snapshot evita converter um estado
        // estale só por causa da latência do import.
        const { convertClassicToProTree } = await import('./convertToPro')
        // Lê o snapshot MAIS FRESCO e converte a partir DELE: a árvore reflete o
        // mesmo conteúdo que os campos do básico (files/ir/blocksState) que vamos
        // zerar. Construir a tree do snapshot pré-import (como antes) descartava
        // edições feitas durante o await — a tree ficava com o conteúdo antigo e o
        // novo se perdia ao zerar os arquivos.
        const source = get().project
        if (!source || source.kind === 'pro' || isPythonProject(source)) return
        const tree = await convertClassicToProTree(source)
        // Re-confirma após o await da conversão: o projeto pode ter sido
        // trocado/apagado/graduado nesse meio-tempo. Só commita se ainda for o
        // MESMO projeto classic que originou esta `tree`.
        const fresh = get().project
        if (fresh !== source)
          throw new Error(
            'O projeto mudou durante a conversão. O original foi mantido; tente novamente.',
          )
        const original: JavaScriptProject = {
          ...source,
          id: ulid(),
          name: `${source.name.slice(0, 191)} (Blocos)`,
        }
        await preserveOriginal(original)
        if (get().project !== source)
          throw new Error('O projeto mudou enquanto a cópia original era salva. Tente novamente.')
        // Constrói a partir de `source` (NÃO de `fresh`): a `tree` foi gerada desse
        // snapshot e os campos do básico que zeramos pertencem a ele. Espalhar
        // `fresh` aqui voltaria a divergir tree×conteúdo (a tree teria o conteúdo de
        // `source` enquanto o resto viria de `fresh`). `name`/`updatedAt` de `source`
        // são preservados; o `bump` atualiza `updatedAt` no commit.
        const converted: JavaScriptProject = {
          ...source,
          kind: 'pro',
          mode: 'code',
          tree,
          proMeta: {
            devScript: 'dev',
            templateId: 'vanilla-vite',
            origin: { projectId: original.id, revision: source.updatedAt },
          },
          assets: (source.assets ?? []).map((asset) => ({
            ...asset,
            ...(asset.kind === 'image' || asset.kind === 'audio'
              ? { proPath: `public/${asset.name}` }
              : {}),
          })),
          // O pro usa a `tree` como fonte da verdade; zera os campos do básico.
          files: { 'index.html': '', 'style.css': '', 'script.js': '' },
          extraFiles: [],
          ir: null,
          blocksState: null,
        }
        set({ project: bump(converted), isDirty: true, saveError: null })
      },
      setFiles: (files) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        const nextFiles = { ...p.files, ...files }
        const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [], limits)
        if (limitError) {
          set({ saveError: limitError })
          return
        }
        set((s) => ({
          project: bump({
            ...p,
            files: nextFiles,
            ...(p.mode === 'bridge' ? { bridgeCodeAhead: true as const } : {}),
          }),
          isDirty: true,
          saveError: null,
          // Edição de CÓDIGO na Ponte: os blocos ficam para trás até o
          // reverse-parse (que captura esta época no post) alcançá-la.
          ...(p.mode === 'bridge' ? { bridgeCodeEditEpoch: s.bridgeCodeEditEpoch + 1 } : {}),
        }))
      },
      setFile: (name, value) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        if (p.files[name] === value) return
        const nextFiles = { ...p.files, [name]: value }
        const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [], limits)
        if (limitError) {
          set({ saveError: limitError })
          return
        }
        set((s) => ({
          project: bump({
            ...p,
            files: nextFiles,
            ...(p.mode === 'bridge' ? { bridgeCodeAhead: true as const } : {}),
          }),
          isDirty: true,
          saveError: null,
          ...(p.mode === 'bridge' ? { bridgeCodeEditEpoch: s.bridgeCodeEditEpoch + 1 } : {}),
        }))
      },
      setPythonFile: (path, content) => {
        const project = get().project
        if (!project || !isPythonProject(project)) return 'Abra um projeto Python.'
        if (project.kind === 'pro') {
          const tree = setProFileContent(project.tree, path, content)
          return tree === project.tree ? null : commitPython({ ...project, tree })
        }
        if (!Object.hasOwn(project.files, path)) return 'Arquivo Python não encontrado.'
        if (project.files[path] === content) return null
        const files = { ...project.files, [path]: content }
        return commitPython({
          ...project,
          files,
          ir: null,
          blocksState: preservePythonWorkspaceDraft(project, files),
          bridgeCodeAhead: true,
        })
      },
      applyPythonSourceFiles: (expected, files, blocksState) => {
        const project = get().project
        if (project !== expected || !isPythonProject(project) || project.kind !== 'classic')
          return 'O projeto mudou durante a edição dos blocos. Tente novamente.'
        const { bridgeCodeAhead: _ahead, ...current } = project
        return commitPython({
          ...current,
          files: { ...files },
          ir: null,
          blocksState: copyStudioProjectJson(blocksState ?? emptyPythonWorkspaceState()) ?? null,
        })
      },
      setIR: (ir) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        set({ project: bump({ ...p, ir }), isDirty: true, saveError: null })
      },
      setBlocksState: (state) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        set({
          project: bump({
            ...p,
            blocksState: state,
            projectTools: retainProjectTools(p.projectTools, state),
          }),
          isDirty: true,
          saveError: null,
        })
      },
      applyProjectState: (patch) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        const nextFiles = patch.files ? { ...p.files, ...patch.files } : p.files
        const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [], limits)
        if (limitError) {
          set({ saveError: limitError })
          return
        }
        set({
          project: bump({
            ...p,
            files: nextFiles,
            ir: 'ir' in patch ? (patch.ir ?? null) : p.ir,
            blocksState: 'blocksState' in patch ? (patch.blocksState ?? null) : p.blocksState,
            projectTools: retainProjectTools(p.projectTools, patch.blocksState),
            installedExtensions: patch.installedExtensions ?? p.installedExtensions,
          }),
          isDirty: true,
          saveError: null,
        })
      },
      applyPythonExtensions: async (expected, extensions, beforeCommit) => {
        if (get().project !== expected) return 'O projeto mudou. Tente novamente.'
        if (get().editingAccess !== 'author') return 'Este projeto está em observação.'
        const { refinePythonProjectDocument } = await import('./pythonProjectValidation')
        // Pygame Zero searches images/, sounds/ and music/: materials added before it move there.
        // Raylib opens files from images/, sounds/, music/, fonts/ (and models/ in 3D).
        const raylibNext = projectUsesRaylib({ installedExtensions: extensions })
        const raylibChanged =
          raylibNext &&
          (!projectUsesRaylib(expected) ||
            projectUsesRaylib3D(expected) !==
              projectUsesRaylib3D({ installedExtensions: extensions }))
        const relocated = raylibChanged
          ? raylibRelocatedAssets({ ...expected, installedExtensions: extensions })
          : !projectUsesPgzero(expected) && projectUsesPgzero({ installedExtensions: extensions })
            ? pgzeroRelocatedAssets(expected)
            : undefined
        if (relocated && 'error' in relocated) return relocated.error
        const project = await refinePythonProjectDocument({
          ...expected,
          ...relocated,
          installedExtensions: extensions,
          ...(expected.kind === 'classic'
            ? {
                ir: null,
                blocksState: preservePythonWorkspaceDraft(expected, expected.files),
                bridgeCodeAhead: true,
              }
            : {}),
        })
        if (get().project !== expected) return 'O projeto mudou. Tente novamente.'
        beforeCommit?.()
        return commitPython(project)
      },
      installExtension: (id, version) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        if (p.installedExtensions.some((e) => e.id === id)) return
        const entry: InstalledExtension = { id, version, installedAt: Date.now() }
        const ir = p.ir
          ? {
              ...p.ir,
              extensions: p.ir.extensions.some((extension) => extension.extensionId === id)
                ? p.ir.extensions
                : [...p.ir.extensions, { extensionId: id }],
            }
          : p.ir
        set({
          project: bump({ ...p, ir, installedExtensions: [...p.installedExtensions, entry] }),
          isDirty: true,
          saveError: null,
        })
      },
      removeExtension: (id) => {
        const p = get().project
        if (!p || isPythonProject(p)) return
        set({
          project: bump({
            ...p,
            ir: p.ir
              ? {
                  ...p.ir,
                  extensions: p.ir.extensions.filter((extension) => extension.extensionId !== id),
                }
              : p.ir,
            installedExtensions: p.installedExtensions.filter((e) => e.id !== id),
          }),
          isDirty: true,
          saveError: null,
        })
      },
      rename: (name) => {
        const p = get().project
        if (!p) return
        const safeName = sanitizeProjectName(name)
        if (p.name === safeName) return
        set({ project: bump({ ...p, name: safeName }), isDirty: true, saveError: null })
      },
      markSaved: () => set({ isDirty: false, saveError: null }),
      markSaveFailed: (message) => set({ isDirty: true, saveError: message }),
      addExtraFile: (name) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = addPythonProjectNode(p, name, 'file')
          return result.project ? commitPython(result.project) : result.error
        }
        if (!p) return 'Nenhum projeto carregado.'
        const normalized = normalizeExtraFileName(name)
        if (!normalized) return 'Use um nome seguro com .html, .css, .js, .mjs, .ts ou .tsx.'
        if (isReservedProjectFileName(normalized))
          return 'Esse nome é reservado para um arquivo canônico.'
        const extra = p.extraFiles ?? []
        if (extra.some((f) => f.name.toLowerCase() === normalized.toLowerCase()))
          return 'Já existe arquivo com esse nome.'
        if (extra.length >= limits.maxExtraFiles)
          return `Limite de ${limits.maxExtraFiles} arquivos extras.`
        const language = inferExtraLanguage(normalized)
        if (!language) return 'Extensão não suportada.'
        const newFile: ExtraFile = {
          name: normalized,
          language,
          content: defaultExtraContent(language),
        }
        const nextExtraFiles = [...extra, newFile]
        const limitError = projectFilesLimitError(p.files, nextExtraFiles, limits)
        if (limitError) return limitError
        set({
          project: bump({ ...p, extraFiles: nextExtraFiles }),
          isDirty: true,
          saveError: null,
        })
        return null
      },
      setExtraFile: (name, content) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const error = get().setPythonFile(name, content)
          if (error) set({ saveError: error })
          return
        }
        if (!p?.extraFiles) return
        const current = p.extraFiles.find((f) => f.name === name)
        if (!current || current.content === content) return
        const next = p.extraFiles.map((f) => (f.name === name ? { ...f, content } : f))
        const limitError = projectFilesLimitError(p.files, next, limits)
        if (limitError) {
          set({ saveError: limitError })
          return
        }
        set({ project: bump({ ...p, extraFiles: next }), isDirty: true, saveError: null })
      },
      renameExtraFile: (oldName, newName) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = renamePythonProjectNode(p, oldName, newName)
          return result.project ? commitPython(result.project) : result.error
        }
        if (!p?.extraFiles) return 'Sem arquivos extras.'
        const normalized = normalizeExtraFileName(newName)
        if (!normalized) return 'Use um nome seguro com .html, .css, .js, .mjs, .ts ou .tsx.'
        if (isReservedProjectFileName(normalized)) return 'Nome reservado.'
        if (
          p.extraFiles.some(
            (f) => f.name !== oldName && f.name.toLowerCase() === normalized.toLowerCase(),
          )
        )
          return 'Já existe arquivo com esse nome.'
        const language = inferExtraLanguage(normalized)
        if (!language) return 'Extensão não suportada.'
        const next = p.extraFiles.map((f) =>
          f.name === oldName ? { ...f, name: normalized, language } : f,
        )
        set({ project: bump({ ...p, extraFiles: next }), isDirty: true, saveError: null })
        return null
      },
      removeExtraFile: (name) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = removePythonProjectNode(p, name)
          return result.project ? commitPython(result.project) : result.error
        }
        if (!p?.extraFiles) return
        set({
          project: bump({ ...p, extraFiles: p.extraFiles.filter((f) => f.name !== name) }),
          isDirty: true,
          saveError: null,
        })
      },
      addAsset: (input) => {
        const p = get().project
        if (!p) return 'Nenhum projeto carregado.'
        const license = sanitizeProjectAssetLicense(input.license)
        if (input.license !== undefined && !license) return 'A licença deste material é inválida.'
        const dataLimits = isPythonProject(p)
          ? STUDIO_PYTHON_MATERIAL_DATA_LIMITS
          : PROJECT_ASSET_LIMITS
        const kind: ProjectAsset['kind'] =
          input.kind === 'audio' ||
          input.kind === 'model3d' ||
          input.kind === 'environment3d' ||
          input.kind === 'font'
            ? input.kind
            : 'image'
        const isImage = kind === 'image'
        const is3D = kind === 'model3d' || kind === 'environment3d'
        // Raylib decides its 3D files itself (models in Raylib 3D, the reason otherwise);
        // every other Python environment takes images and sounds.
        if (isPythonProject(p) && is3D && !projectUsesRaylib(p))
          return 'Este ambiente Python aceita imagens e sons. Os recursos 3D ainda não estão disponíveis.'
        if (kind === 'font' && !(isPythonProject(p) && projectUsesRaylib(p)))
          return 'Fontes TTF e OTF entram nos projetos com a extensão Raylib.'
        const noun =
          kind === 'audio'
            ? 'som'
            : kind === 'model3d'
              ? 'modelo 3D'
              : kind === 'environment3d'
                ? 'céu (.hdr)'
                : kind === 'font'
                  ? 'fonte'
                  : 'imagem'
        const name = normalizeAssetName(input.name)
        if (!name) return 'Use um nome simples (letras, números e hífen).'
        // A UI já validou; aqui revalidamos o teto e o esquema do data: URL. Nos 3D
        // o nome do arquivo faz parte do contrato (extensão × MIME × assinatura
        // binária) — sem ele, ou com bytes que não batem, recusa na porta.
        const fileName3D =
          (is3D || kind === 'font') && typeof input.originalFileName === 'string'
            ? input.originalFileName
            : undefined
        if (!isValidAssetDataUrl(input.dataUrl, kind, fileName3D, dataLimits)) {
          return `${noun} inválido ou grande demais.`
        }
        const assets = p.assets ?? []
        if (assets.length >= PROJECT_ASSET_LIMITS.maxAssetsCount) {
          return `Limite de ${PROJECT_ASSET_LIMITS.maxAssetsCount} arquivos por projeto.`
        }
        if (assets.some((a) => a.name === name)) return `Já existe um asset com o nome "${name}".`
        const totalChars =
          assets.reduce((sum, a) => sum + a.dataUrl.length, 0) + input.dataUrl.length
        if (totalChars > dataLimits.maxAssetsTotalChars) {
          return 'Os assets do projeto excedem o tamanho total permitido.'
        }
        // Metadados do Pinta (e dimensões) só valem p/ IMAGEM; som e 3D nunca os têm.
        const sprite = isImage ? sanitizeSpriteMeta(input.sprite) : undefined
        const tileset = isImage ? sanitizeTilesetMeta(input.tileset) : undefined
        const tilemap = isImage ? sanitizeTilemapMeta(input.tilemap) : undefined
        let pintaImage: ProjectAsset['pintaImage']
        try {
          pintaImage = readPintaImageAssetMetadata({ ...input, kind })
        } catch (error) {
          return error instanceof Error ? error.message : 'A receita do Pinta é inválida.'
        }
        const asset: ProjectAsset = {
          id: ulid(),
          name,
          kind,
          dataUrl: input.dataUrl,
          source: input.source === 'library' ? 'library' : 'upload',
          ...(license ? { license } : {}),
          ...(isImage && typeof input.width === 'number' && input.width > 0
            ? { width: input.width }
            : {}),
          ...(isImage && typeof input.height === 'number' && input.height > 0
            ? { height: input.height }
            : {}),
          ...(input.source === 'library' && input.libId ? { libId: input.libId } : {}),
          ...(input.source === 'library' &&
          input.libId &&
          (input.libOrigin === 'pinta' || input.libOrigin === 'molda')
            ? { libOrigin: input.libOrigin }
            : {}),
          ...(input.source === 'library' &&
          typeof input.libRevision === 'number' &&
          Number.isFinite(input.libRevision) &&
          input.libRevision > 0
            ? { libRevision: Math.round(input.libRevision) }
            : {}),
          // O sanitizer do load exige o fileName nos 3D — gravar é parte do contrato.
          ...(fileName3D ? { originalFileName: fileName3D.slice(0, 128) } : {}),
          ...(sprite ? { sprite } : {}),
          ...(tileset ? { tileset } : {}),
          ...(tilemap ? { tilemap } : {}),
          ...(pintaImage ? { pintaImage } : {}),
        }
        if (isPythonProject(p)) {
          const mime = input.dataUrl.slice(5).split(/[;,]/, 1)[0]!.toLowerCase()
          const extension = pythonAssetFileExtension(mime, kind)
          if (projectUsesRaylib(p)) {
            // raylib opens a file by its path: `images/nave.png` next to the main file.
            const placed = raylibPlacedAsset(p, asset, extension, input.pgzeroAudio)
            if ('error' in placed) return placed.error
            asset.proPath = placed.asset.proPath
            asset.name = placed.asset.name
          } else if (projectUsesPgzero(p)) {
            // Pygame Zero finds media by name in the folders next to the main file.
            const placed = pgzeroMediaPath({
              entrypoint: p.python.entrypoint,
              name,
              kind,
              extension,
              role: kind === 'audio' ? input.pgzeroAudio : undefined,
              occupied: pythonProjectOccupiedPaths(p),
            })
            if ('error' in placed) return placed.error
            asset.proPath = placed.path
            // The panel name reads like the code name (`acerto_2` beside an `acerto`).
            asset.name = pgzeroNameForPath(placed.path, name, assets, asset.id)
            if (extension === 'svg') {
              const size = pgzeroSvgAssetSize(input.dataUrl)
              if ('error' in size) return size.error
              asset.width = size.width
              asset.height = size.height
            }
          } else {
            // Turtle reads PNG/GIF only: a vector recipe never belongs to it.
            if (pintaImage?.output.mime === 'image/svg+xml')
              return 'O Turtle abre só imagens PNG ou GIF. Traga este desenho do Pinta como PNG.'
            asset.proPath = `assets/${name}.${extension}`
          }
          if (!isStudioPythonAssetPath(asset.proPath))
            return 'Este formato de imagem ou som ainda não é compatível com o projeto Python.'
          return commitPython({ ...p, assets: [...assets, asset] })
        }
        set({ project: bump({ ...p, assets: [...assets, asset] }), isDirty: true, saveError: null })
        return null
      },
      removeAsset: (id) => {
        const p = get().project
        if (!p?.assets) return
        const target = p.assets.find((a) => a.id === id)
        const next = p.assets.filter((a) => a.id !== id)
        if (next.length === p.assets.length) return
        // A capa escolhida era esta imagem: some junto (volta à foto automática).
        const { coverAssetName, ...rest } = p
        const wasCover = target !== undefined && coverAssetName === target.name
        set({
          project: bump(wasCover ? { ...rest, assets: next } : { ...p, assets: next }),
          isDirty: true,
          saveError: null,
        })
      },
      updateAssetMeta: (id, meta) => {
        const p = get().project
        if (!p?.assets) return 'Sem imagens no projeto.'
        const target = p.assets.find((a) => a.id === id)
        if (!target) return 'Imagem não encontrada.'
        if (target.pintaImage)
          return 'Esta imagem é um PNG capturado do Pinta. Altere sua seleção no Pinta.'
        const next: ProjectAsset = { ...target }
        if ('tileset' in meta) {
          const tileset = sanitizeTilesetMeta(meta.tileset)
          if (!tileset) return 'Não consegui usar esse tamanho de peça.'
          next.tileset = tileset
        }
        if ('tilemap' in meta) {
          const tilemap = sanitizeTilemapMeta(meta.tilemap)
          if (!tilemap) return 'Não consegui montar o mapa desta imagem.'
          next.tilemap = tilemap
        }
        set({
          project: bump({ ...p, assets: p.assets.map((a) => (a.id === id ? next : a)) }),
          isDirty: true,
          saveError: null,
        })
        return null
      },
      updateAssetImage: (id, image) => {
        const p = get().project
        if (!p?.assets) return 'Sem imagens no projeto.'
        const dataLimits = isPythonProject(p)
          ? STUDIO_PYTHON_MATERIAL_DATA_LIMITS
          : PROJECT_ASSET_LIMITS
        const target = p.assets.find((a) => a.id === id)
        if (!target) return 'Imagem não encontrada.'
        if (target.kind === 'audio') return 'Esse arquivo não é uma imagem.'
        if (target.pintaImage && image.pintaImage === undefined)
          return 'Prepare a imagem usando a receita do Pinta antes de atualizar este material.'
        let pintaImage: ProjectAsset['pintaImage']
        try {
          pintaImage = readPintaImageAssetMetadata({
            ...target,
            dataUrl: image.dataUrl,
            width: image.width ?? target.width,
            height: image.height ?? target.height,
            pintaImage: image.pintaImage,
            sprite: image.sprite,
            tileset: image.tileset,
            tilemap: image.tilemap,
          })
        } catch (error) {
          return error instanceof Error ? error.message : 'A receita do Pinta é inválida.'
        }
        const is3D = target.kind === 'model3d' || target.kind === 'environment3d'
        // 3D: a validação cruza extensão × MIME × assinatura, então o nome do arquivo faz
        // parte do contrato (o da criação nova, senão o que o asset já tinha).
        const originalFileName = is3D
          ? typeof image.originalFileName === 'string' && image.originalFileName.trim()
            ? image.originalFileName.trim().slice(0, 128)
            : target.originalFileName
          : undefined
        // Mesmos bytes = nada a fazer. Sem esta guarda, um chamador distraído
        // marcaria o projeto como sujo e dispararia autosave à toa.
        const libRevision =
          typeof image.libRevision === 'number' &&
          Number.isFinite(image.libRevision) &&
          image.libRevision > 0
            ? Math.round(image.libRevision)
            : undefined
        if (
          target.dataUrl === image.dataUrl &&
          (libRevision === undefined || target.libRevision === libRevision) &&
          (pintaImage === undefined ||
            canonicalJson(target.pintaImage ?? null) === canonicalJson(pintaImage))
        ) {
          return null
        }
        if (is3D) {
          if (!isValidAssetDataUrl(image.dataUrl, target.kind, originalFileName)) {
            return 'Esse arquivo 3D não é válido ou é grande demais.'
          }
        } else if (!isValidAssetDataUrl(image.dataUrl, 'image', undefined, dataLimits)) {
          return 'Imagem inválida ou grande demais.'
        }
        // A redrawn SVG in a Pygame Zero folder must still be one Pygame Zero can size.
        const svgSize =
          isPythonProject(p) && projectUsesPgzero(p) && /\.svg$/i.test(target.proPath ?? '')
            ? pgzeroSvgAssetSize(image.dataUrl)
            : undefined
        if (svgSize && 'error' in svgSize) return svgSize.error
        // Orçamento do projeto contando o asset NOVO no lugar do velho (o
        // `addAsset` só checa o teto na entrada; um desenho reeditado pode ter
        // ficado bem maior).
        const othersChars = p.assets.reduce(
          (sum, a) => (a.id === id ? sum : sum + a.dataUrl.length),
          0,
        )
        if (othersChars + image.dataUrl.length > dataLimits.maxAssetsTotalChars) {
          return `${is3D ? 'A criação' : 'O desenho'} "${target.name}" cresceu e não cabe mais neste jogo.`
        }

        const width = typeof image.width === 'number' && image.width > 0 ? image.width : undefined
        const height =
          typeof image.height === 'number' && image.height > 0 ? image.height : undefined
        // "Mesma geometria" trata dimensão AUSENTE como inalterada: sem medida
        // nova não dá para provar que mudou, e o lado conservador é preservar o
        // que a criança configurou.
        const sameGeometry =
          (width ?? target.width) === target.width && (height ?? target.height) === target.height
        // Metadados: o desenho novo traz os dele → valem os dele. Não traz e a
        // geometria não mudou → preserva o do projeto (peças/mapa configurados
        // aqui pelo TileConfigDialog não existem no Pinta). Não traz e a geometria
        // MUDOU → descarta: frameW/frameH e os índices de `solid` apontariam para
        // quadros que não existem mais.
        const sprite = pintaImage
          ? undefined
          : (sanitizeSpriteMeta(image.sprite) ?? (sameGeometry ? target.sprite : undefined))
        const tileset = pintaImage
          ? undefined
          : (sanitizeTilesetMeta(image.tileset) ?? (sameGeometry ? target.tileset : undefined))
        const tilemap = pintaImage
          ? undefined
          : (sanitizeTilemapMeta(image.tilemap) ?? (sameGeometry ? target.tilemap : undefined))

        // ⚠️ `name`, `id`, `libId` e `source` ficam INTOCADOS: os blocos referenciam
        // o asset PELO NOME (FieldAssetPicker serializa a string), então renomear
        // aqui quebraria o jogo em silêncio — e o nome no projeto pode divergir do
        // nome na biblioteca de propósito (o "Adicionar ao projeto" sufixa `-2`).
        const next: ProjectAsset = {
          ...target,
          dataUrl: image.dataUrl,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(pintaImage ? { pintaImage } : {}),
        }
        if (libRevision !== undefined) next.libRevision = libRevision
        if (originalFileName) next.originalFileName = originalFileName
        if (sprite) next.sprite = sprite
        else delete next.sprite
        if (tileset) next.tileset = tileset
        else delete next.tileset
        if (tilemap) next.tilemap = tilemap
        else delete next.tilemap

        set({
          project: bump({ ...p, assets: p.assets.map((a) => (a.id === id ? next : a)) }),
          isDirty: true,
          saveError: null,
        })
        return null
      },
      setAssetLibraryOrigin: (id, origin) => {
        const p = get().project
        if (!p?.assets) return 'Sem imagens no projeto.'
        const target = p.assets.find((asset) => asset.id === id)
        if (!target) return 'Imagem não encontrada.'
        if (target.source !== 'library' || !target.libId?.startsWith('personal:')) {
          return 'Este asset não veio de uma biblioteca de criação.'
        }
        if (target.libOrigin === origin) return null
        const assets = p.assets.map((asset) =>
          asset.id === id ? { ...asset, libOrigin: origin } : asset,
        )
        set({ project: bump({ ...p, assets }), isDirty: true, saveError: null })
        return null
      },
      renameAsset: (id, newName) => {
        const p = get().project
        if (!p?.assets) return 'Sem imagens no projeto.'
        const name = normalizeAssetName(newName)
        if (!name) return 'Use um nome simples (letras, números e hífen).'
        const target = p.assets.find((a) => a.id === id)
        if (!target) return 'Imagem não encontrada.'
        if (p.assets.some((a) => a.id !== id && a.name === name)) {
          return 'Já existe uma imagem com esse nome.'
        }
        if (target.name === name) return null
        if (isPythonProject(p) && (projectUsesPgzero(p) || projectUsesRaylib(p))) {
          // Pygame Zero finds the file by name and raylib by path: the file follows the name.
          const renamed = projectUsesRaylib(p)
            ? raylibRenamedAsset(p, target, name)
            : pgzeroRenamedAsset(p, target, name)
          if ('error' in renamed) return renamed.error
          const cover =
            p.coverAssetName === target.name ? { coverAssetName: renamed.asset.name } : {}
          return commitPython({
            ...p,
            ...cover,
            assets: p.assets.map((a) => (a.id === id ? renamed.asset : a)),
          })
        }
        const next = p.assets.map((a) => (a.id === id ? { ...a, name } : a))
        // A capa escolhida segue o nome novo.
        const cover = p.coverAssetName === target.name ? { coverAssetName: name } : {}
        set({ project: bump({ ...p, ...cover, assets: next }), isDirty: true, saveError: null })
        return null
      },
      setCoverAsset: (assetId) => {
        const p = get().project
        if (!p) return 'Nenhum projeto carregado.'
        if (assetId === null) {
          if (p.coverAssetName === undefined) return null
          const { coverAssetName: _cover, ...rest } = p
          set({ project: bump(rest), isDirty: true, saveError: null })
          return null
        }
        const target = p.assets?.find((a) => a.id === assetId)
        if (!target) return 'Imagem não encontrada.'
        if (target.kind !== 'image') return 'Só uma imagem pode ser a capa do jogo.'
        if (p.coverAssetName === target.name) return null
        set({
          project: bump({ ...p, coverAssetName: target.name }),
          isDirty: true,
          saveError: null,
        })
        return null
      },
      addProFile: (path) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = addPythonProjectNode(p, path, 'file')
          const error = result.project ? commitPython(result.project) : result.error
          if (error) set({ saveError: error })
          return error ?? null
        }
        if (!p?.tree) return 'Nenhum projeto profissional carregado.'
        const result = addProFile(p.tree, path)
        if (!result.tree) return result.error ?? 'Falha ao criar arquivo.'
        const limitError = proTreeLimitError(result.tree)
        if (limitError) return limitError
        set({ project: bump({ ...p, tree: result.tree }), isDirty: true, saveError: null })
        return null
      },
      addProDir: (path) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = addPythonProjectNode(p, path, 'dir')
          const error = result.project ? commitPython(result.project) : result.error
          if (error) set({ saveError: error })
          return error ?? null
        }
        if (!p?.tree) return 'Nenhum projeto profissional carregado.'
        const result = addProDir(p.tree, path)
        if (!result.tree) return result.error ?? 'Falha ao criar pasta.'
        set({ project: bump({ ...p, tree: result.tree }), isDirty: true, saveError: null })
        return null
      },
      setProFileContent: (path, content) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const error = get().setPythonFile(path, content)
          if (error) set({ saveError: error })
          return
        }
        if (!p?.tree) return
        const next = setProFileContent(p.tree, path, content)
        if (next === p.tree) return
        const limitError = proTreeLimitError(next)
        if (limitError) {
          set({ saveError: limitError })
          return
        }
        set({ project: bump({ ...p, tree: next }), isDirty: true, saveError: null })
      },
      reconcileProFiles: (
        projectId,
        expected,
        tree,
        beforePublish,
        materials,
        pythonConfiguration,
      ) => {
        const p = get().project
        if (get().editingAccess === 'observer') return 'Este projeto está em observação.'
        if (p?.id !== projectId || p.kind !== 'pro' || p.tree !== expected)
          return 'O projeto mudou durante a sincronização.'
        if (isPythonProject(p)) {
          const assets = materials
            ? sanitizeProjectAssets(materials.assets, {
                materialPath: isStudioPythonAssetPath,
                dataLimits: STUDIO_PYTHON_MATERIAL_DATA_LIMITS,
              })
            : p.assets
          if (materials)
            assertProjectContentPreserved({ assets: materials.assets }, { ...p, assets })
          const document = { ...p, ...pythonConfiguration, tree, assets }
          if (materials) {
            if (materials.coverAssetName) {
              if (
                !assets?.some(
                  (asset) => asset.kind === 'image' && asset.name === materials.coverAssetName,
                )
              )
                return 'A imagem de capa não está nos materiais.'
              document.coverAssetName = materials.coverAssetName
            } else delete document.coverAssetName
          }
          const error = pythonProjectLayoutError(document, pythonEditLimits)
          if (error) return error
          const next = advanceLocalRevision(p, bump(document))
          beforePublish?.(next)
          rawSet({ project: next, isDirty: true, saveError: null })
          return null
        }
        if (pythonConfiguration) return 'A configuração Python não pertence a este projeto.'
        const sanitized = sanitizeProTree(tree)
        if (!sanitized)
          return 'A árvore do terminal não é válida ou ultrapassou os limites do projeto.'
        const limitError = proTreeLimitError(sanitized)
        if (limitError) return limitError
        if (materials) {
          const assets = sanitizeProjectAssets(materials.assets)
          assertProjectContentPreserved({ assets: materials.assets }, { ...p, assets })
          if (
            materials.coverAssetName &&
            !assets.some((a) => a.kind === 'image' && a.name === materials.coverAssetName)
          )
            return 'A imagem de capa não está nos materiais.'
        }
        const paths = Object.keys(sanitized)
        if (
          !beforePublish &&
          !materials &&
          paths.length === Object.keys(expected).length &&
          paths.every((path) => {
            const before = expected[path]
            const after = sanitized[path]
            return (
              before?.kind === after?.kind &&
              (before?.kind !== 'file' ||
                (after?.kind === 'file' && before.content === after.content))
            )
          })
        )
          return null
        const document = {
          ...p,
          tree: sanitized,
          ...(materials ? { assets: materials.assets } : {}),
        }
        if (materials) {
          if (materials.coverAssetName) document.coverAssetName = materials.coverAssetName
          else delete document.coverAssetName
        }
        const next = advanceLocalRevision(p, bump(document))
        // Attach the inverse to this exact revision before any subscriber can save or switch it.
        beforePublish?.(next)
        rawSet({ project: next, isDirty: true, saveError: null })
        return null
      },
      renameProNode: (from, to) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = renamePythonProjectNode(p, from, to)
          const error = result.project ? commitPython(result.project) : result.error
          if (error) set({ saveError: error })
          return error ?? null
        }
        if (!p?.tree) return 'Nenhum projeto profissional carregado.'
        const result = renameProNode(p.tree, from, to)
        if (!result.tree) return result.error ?? 'Falha ao renomear.'
        set({ project: bump({ ...p, tree: result.tree }), isDirty: true, saveError: null })
        return null
      },
      removeProNode: (path) => {
        const p = get().project
        if (p && isPythonProject(p)) {
          const result = removePythonProjectNode(p, path)
          const error = result.project ? commitPython(result.project) : result.error
          if (error) set({ saveError: error })
          return error ?? null
        }
        if (!p?.tree) return
        const next = removeProNode(p.tree, path)
        if (next === p.tree) return
        set({ project: bump({ ...p, tree: next }), isDirty: true, saveError: null })
      },
    }
  })
  // Registro de projetos ABERTOS (qualquer store desta página): a régua do restauro da
  // nuvem (`isProjectOpenAnywhere`). Só a troca de id conta; edições não.
  store.subscribe((state, prev) => {
    const nextId = state.project?.id ?? null
    const prevId = prev.project?.id ?? null
    if (nextId === prevId) return
    if (prevId) markProjectClosed(prevId)
    if (nextId) markProjectOpen(nextId)
  })
  return store
}

const defaultProjectStore = createProjectStore()

export type ProjectStoreApi = StoreApi<ProjectStore>

type BoundUseProjectStore = (<T>(selector: (s: ProjectStore) => T) => T) & StoreApi<ProjectStore>

/**
 * Hook por instância: lê a store do <Studio> mais próximo; fora de um Studio
 * (lista de projetos, testes de componente) cai na default de módulo. As
 * estáticas (getState/setState/subscribe) operam SEMPRE na default — contrato
 * usado pelos testes.
 */
export const useProjectStore: BoundUseProjectStore = Object.assign(function useProjectStoreHook<T>(
  selector: (s: ProjectStore) => T,
): T {
  const stores = useContext(StudioStoresContext)
  return useStore(stores?.project ?? defaultProjectStore, selector)
}, defaultProjectStore)

/** StoreApi da instância atual — p/ acesso imperativo (getState) em handlers. */
export function useProjectStoreApi(): ProjectStoreApi {
  const stores = useContext(StudioStoresContext)
  return stores?.project ?? defaultProjectStore
}

function defaultExtraContent(language: ExtraFileLanguage): string {
  if (language === 'css') return '/* Estilos extras */\n'
  if (language === 'html') return '<!-- HTML extra -->\n'
  if (language === 'typescript') return '// TypeScript extra\n'
  return '// JavaScript extra\n'
}

export {
  buildExtensionBlocklyBlockTypes,
  CORE_BLOCKLY_BLOCK_TYPES,
  collectUnknownBlockTypes,
  EXTENSION_BLOCKLY_BLOCK_TYPES,
  MAX_BLOCKSTATE_BLOCKS,
  PROJECT_FILE_LIMITS,
  prepareProjectForHost,
  type StudioLimits,
  sanitizeCloudProjectSnapshot,
  sanitizeImportedBlocksState,
  sanitizeProjectForHost,
} from './projectValidation'

/**
 * Adapter de persistência LOCAL (IndexedDB via idb-keyval) — o comportamento
 * histórico do studio standalone, agora plugável. É o default do <Studio>
 * (`persistence="local"`) e a fonte do <ProjectList> no playground.
 */
export function createLocalPersistenceAdapter(
  options: { namespace?: string } = {},
): StudioPersistenceAdapter {
  const scope =
    options.namespace === undefined
      ? captureProjectStorageScope()
      : getProjectStorageScope(options.namespace)
  return {
    scopeIdentity: scope.identity,
    beginOpening: (id, options) => beginProjectOpening(scope, id, options?.signal),
    // ABERTURA RÁPIDA: lê só meta+arquivos+assets (ir/blocksState voltam null). Ler
    // o `blocksState` (que pode ser ENORME) de forma síncrona aqui trava a tela
    // "Carregando projeto…" no structured clone do IndexedDB. O `blocksState` é
    // restaurado em SEGUNDO PLANO pelo `PersistenceService.hydrateAfterLoad` (ligado
    // no StudioCore), depois que o editor já abriu — sem travar.
    load: (id) => loadSanitizedProjectShellById(id, scope),
    // Restore em segundo plano da partição pesada de blocos (chamado por
    // hydrateAfterLoad). Os dados históricos já foram convertidos na abertura.
    loadBlocksState: async (project) => {
      if (isPythonProject(project)) {
        const raw = await loadProjectBlocksById(project.id, scope)
        if (
          !raw ||
          typeof raw !== 'object' ||
          !('blocksState' in raw) ||
          ('id' in raw && raw.id !== project.id)
        )
          return null
        return copyStudioProjectJson(raw.blocksState ?? null)
      }
      return loadSanitizedProjectBlocksStateById(project.id, project.installedExtensions, scope)
    },
    save: (project) => persistProject(project, {}, scope),
    flushOnExit: (project, options) =>
      persistProject(project, { exit: true, incompleteBlocks: options?.incompleteBlocks }, scope),
    localScope: scope,
    // Cada `save` pede a sua transação na hora, e o IndexedDB as executa na ordem em que
    // nascem: o serviço não precisa encadear os saves (ver `appliesSavesInCallOrder`).
    appliesSavesInCallOrder: true,
    list: () => listAllProjects(scope),
    delete: (id) => deleteProjectFromDB(id, scope),
  }
}
