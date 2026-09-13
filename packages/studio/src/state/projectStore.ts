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
  modesForKind,
  normalizeAssetName,
  normalizeExtraFileName,
  PROJECT_ASSET_LIMITS,
  type Project,
  type ProjectAsset,
  type ProjectFiles,
  type ProjectTree,
  type StudioProBuildLimits,
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
import {
  CURRENT_PROJECT_FORMAT_VERSION,
  prepareProjectDocument,
  projectFormatVersion,
  retainProjectTools,
} from '../core/projectDocument'
import type { StudioPersistenceAdapter } from '../persistence/types'
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
  sanitizeCloudProjectSnapshot,
  sanitizeImportedExtensions,
  sanitizeImportedProjectSnapshot,
  sanitizeProjectName,
  sanitizeStoredBlocksState,
  sanitizeStoredProject,
} from './projectValidation'
import { addProDir, addProFile, removeProNode, renameProNode, setProFileContent } from './proTree'
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
  /** Cria e persiste um projeto PROFISSIONAL a partir de um template. */
  createProProject: (name: string, templateId: string) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  importProjectFromJSON: (
    raw: unknown,
    options?: { storageScope?: ProjectStorageScope; silent?: boolean },
  ) => Promise<{ project: Project; warnings: string[] }>
  /**
   * Restaura um snapshot vindo da NUVEM ("guardado na sua conta") preservando id e datas,
   * gravando SEM acordar o espelho e SUBSTITUINDO o que havia (blocos/capa antigos não
   * sobrevivem). Recusa (lança) se o id não for o esperado ou se o projeto estiver ABERTO
   * no editor. Ver `setStudioCloudMirror` em `state/persistence.ts`.
   */
  restoreProjectSnapshot: (
    raw: unknown,
    options?: { expectedId?: string; storageScope?: ProjectStorageScope },
  ) => Promise<{ project: Project; warnings: string[] }>
  setProject: (p: Project) => void
  setMode: (mode: IDEMode) => void
  /** Gradua um projeto básico para profissional (Vite). One-way. */
  convertToPro: () => Promise<void>
  setFiles: (files: Partial<ProjectFiles>) => void
  setFile: (name: FileName, value: string) => void
  setIR: (ir: SZIRInput | null) => void
  setBlocksState: (state: unknown | null) => void
  applyProjectState: (patch: ProjectStatePatch) => void
  installExtension: (id: string, version: string) => void
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
  // --- Modo profissional (project.kind === 'pro') ---
  /** Cria arquivo na árvore pro. Devolve mensagem de erro ou null se ok. */
  addProFile: (path: string) => string | null
  /** Cria pasta na árvore pro. Devolve mensagem de erro ou null se ok. */
  addProDir: (path: string) => string | null
  setProFileContent: (path: string, content: string) => void
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
  /** `'image'` (padrão), `'audio'` (som/música), `'model3d'` (.glb) ou
   *  `'environment3d'` (céu .hdr). */
  kind?: 'image' | 'audio' | 'model3d' | 'environment3d'
  /** Nome do arquivo original — OBRIGATÓRIO nos 3D (a validação cruza a
   *  extensão com o MIME e a assinatura binária). */
  originalFileName?: string
  width?: number
  height?: number
  source?: 'upload' | 'library'
  libId?: string
  libRevision?: number
  /** Origem da criação quando `libId` é `personal:<id>` (ver `ProjectAsset.libOrigin`). */
  libOrigin?: 'pinta' | 'molda'
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
): Promise<Project | null> {
  const raw = await loadProjectById(id, storageScope)
  return raw ? sanitizeStoredProject(await prepareProjectDocument(raw), id) : null
}

export async function loadSanitizedProjectShellById(
  id: string,
  storageScope?: ProjectStorageScope,
): Promise<Project | null> {
  const shell = await loadProjectShellById(id, storageScope)
  if (!shell) return null
  // A migração precisa do documento inteiro antes de separar suas partições.
  if (projectFormatVersion(shell) !== CURRENT_PROJECT_FORMAT_VERSION)
    return loadSanitizedProjectById(id, storageScope)
  return sanitizeStoredProject(shell, id)
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

export interface CreateProjectStoreOptions {
  /** Limites de política do host — anti-DoS profundos continuam internos. */
  limits?: StudioLimits
  /** Cotas do compilador remoto Pro desta instância, quando houver. */
  proBuildLimits?: StudioProBuildLimits
  /** Tradutor estático da instância; a store não depende de React context. */
  translator?: Translator
}

export function createProjectStore(
  options: CreateProjectStoreOptions = {},
): StoreApi<ProjectStore> {
  const limits: ResolvedLimits = { ...PROJECT_FILE_LIMITS, ...options.limits }
  const proBuildLimits = options.proBuildLimits
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
      return `Esta atividade aceita no máximo ${proBuildLimits.maxFiles} arquivos.`
    }
    if (error === 'FILE_TOO_LARGE') return 'Um arquivo excede o tamanho permitido nesta atividade.'
    if (error === 'TOTAL_TOO_LARGE') return 'O projeto excede o tamanho permitido nesta atividade.'
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
  const store = createStore<ProjectStore>((set, get) => ({
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
        if (project?.bridgeCodeAhead !== true || bridgeBlocksSyncedEpoch < s.bridgeCodeEditEpoch) {
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
      const existing = await loadSanitizedProjectById(id)
      // Um load mais novo começou enquanto este aguardava o disco: a corrida foi
      // perdida — não toca o store (o load mais novo é a verdade), mas devolve o
      // que ESTE load leu para o chamador que o aguardava (sem efeito colateral).
      if (seq !== loadSeq) return existing
      if (!existing) {
        set({ project: null, isDirty: false, saveError: null, blocksHydration: 'idle' })
        return null
      }
      set({
        project: existing,
        isDirty: false,
        saveError: null,
        blocksHydration: 'idle',
        bridgeCodeEditEpoch: 0,
        bridgeBlocksSyncedEpoch: 0,
      })
      return existing
    },
    hydrateProject: (p) =>
      set({
        project: p,
        isDirty: false,
        saveError: null,
        blocksHydration: 'idle',
        bridgeCodeEditEpoch: 0,
        bridgeBlocksSyncedEpoch: 0,
      }),
    hydrateProjectState: (patch) => {
      const p = get().project
      if (!p) return
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
    unloadProject: () =>
      set({
        project: null,
        isDirty: false,
        saveError: null,
        blocksHydration: 'idle',
        bridgeCodeEditEpoch: 0,
        bridgeBlocksSyncedEpoch: 0,
      }),
    createProject: async (name, initialExtensionIds) => {
      const base = createEmptyProject(ulid(), sanitizeProjectName(name))
      const installedExtensions = [...new Set(initialExtensionIds ?? [])].flatMap((id) => {
        const definition = findExtension(id)
        return definition
          ? [{ id, version: definition.manifest.version, installedAt: Date.now() }]
          : []
      })
      const p: Project = { ...base, installedExtensions }
      await persistProject(p)
      return p
    },
    createProProject: async (name, templateId) => {
      const p = createProProjectFromTemplate(ulid(), sanitizeProjectName(name), templateId)
      await persistProject(p)
      return p
    },
    duplicateProject: async (id) => {
      const source = await loadSanitizedProjectById(id)
      if (!source) return null
      const now = Date.now()
      const copy: Project = {
        ...source,
        id: ulid(),
        name: `${source.name} (cópia)`,
        createdAt: now,
        updatedAt: now,
      }
      await persistProject(copy)
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
      const { project, warnings } = sanitizeImportedProjectSnapshot(
        await prepareProjectDocument(raw),
      )
      await persistProject(project, { silent: options.silent }, options.storageScope)
      return { project, warnings }
    },
    restoreProjectSnapshot: async (raw, options = {}) => {
      // "Guardado na sua conta": o snapshot volta com o MESMO id (é o vínculo com a
      // nuvem e com o `pensa-<id>`) e com as datas de origem — a régua de "quem é
      // mais novo" na sincronia. Grava em SILÊNCIO: um restauro não pode acordar o
      // espelho e re-subir o que acabou de descer. Id conferido e saneamento ESTRITO
      // (nada é gravado com id inventado nem com blocos/programa descartados) ANTES de
      // tocar no disco — `sanitizeCloudProjectSnapshot`.
      const { project, warnings } = await sanitizeCloudProjectSnapshot(raw, {
        expectedId: options.expectedId,
      })
      // Projeto ABERTO em algum editor desta página (qualquer store, não só esta): a
      // memória viva venceria no próximo autosave e subiria por cima do que acabou de
      // descer. O host só restaura antes da lista; se por alguma corrida chegar aqui,
      // recusa em vez de gravar por baixo do editor.
      if (get().project?.id === project.id || isProjectOpenAnywhere(project.id)) {
        throw new Error('Snapshot recusado: o projeto está aberto no editor.')
      }
      // Antes de persistir, converge desenhos por revisão. Se só um lado é mais novo,
      // ele vence; legado divergente preserva ambos e religa o projeto à cópia remota.
      const drawings = await reconcileDrawingsFromRestoredProject(project, {
        namespace: options.storageScope?.namespace,
      })
      // `replace`: o snapshot é a verdade completa — blocos/capa antigos não sobrevivem
      // (a partição de blocos só cai quando a ORIGEM não tem blocos: o estrito garante).
      await persistProject(
        project,
        { silent: !drawings.projectChanged, replace: true },
        options.storageScope,
      )
      return { project, warnings }
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
      set({ project: bump({ ...p, mode: next }), isDirty: true, saveError: null })
    },
    convertToPro: async () => {
      const initial = get().project
      if (!initial || initial.kind === 'pro') return
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
      if (!source || source.kind === 'pro') return
      const tree = await convertClassicToProTree(source)
      // Re-confirma após o await da conversão: o projeto pode ter sido
      // trocado/apagado/graduado nesse meio-tempo. Só commita se ainda for o
      // MESMO projeto classic que originou esta `tree`.
      const fresh = get().project
      if (!fresh || fresh.id !== source.id || fresh.kind === 'pro') return
      // Constrói a partir de `source` (NÃO de `fresh`): a `tree` foi gerada desse
      // snapshot e os campos do básico que zeramos pertencem a ele. Espalhar
      // `fresh` aqui voltaria a divergir tree×conteúdo (a tree teria o conteúdo de
      // `source` enquanto o resto viria de `fresh`). `name`/`updatedAt` de `source`
      // são preservados; o `bump` atualiza `updatedAt` no commit.
      const converted: Project = {
        ...source,
        kind: 'pro',
        mode: 'code',
        tree,
        proMeta: { devScript: 'dev', templateId: 'vanilla-vite' },
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
      if (!p) return
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
      if (!p) return
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
    setIR: (ir) => {
      const p = get().project
      if (!p) return
      set({ project: bump({ ...p, ir }), isDirty: true, saveError: null })
    },
    setBlocksState: (state) => {
      const p = get().project
      if (!p) return
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
      if (!p) return
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
    installExtension: (id, version) => {
      const p = get().project
      if (!p) return
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
      if (!p) return
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
      const kind: ProjectAsset['kind'] =
        input.kind === 'audio' || input.kind === 'model3d' || input.kind === 'environment3d'
          ? input.kind
          : 'image'
      const isImage = kind === 'image'
      const is3D = kind === 'model3d' || kind === 'environment3d'
      const noun =
        kind === 'audio'
          ? 'som'
          : kind === 'model3d'
            ? 'modelo 3D'
            : kind === 'environment3d'
              ? 'céu (.hdr)'
              : 'imagem'
      const name = normalizeAssetName(input.name)
      if (!name) return 'Use um nome simples (letras, números e hífen).'
      // A UI já validou; aqui revalidamos o teto e o esquema do data: URL. Nos 3D
      // o nome do arquivo faz parte do contrato (extensão × MIME × assinatura
      // binária) — sem ele, ou com bytes que não batem, recusa na porta.
      const fileName3D =
        is3D && typeof input.originalFileName === 'string' ? input.originalFileName : undefined
      if (!isValidAssetDataUrl(input.dataUrl, kind, fileName3D)) {
        return `${noun} inválido ou grande demais.`
      }
      const assets = p.assets ?? []
      if (assets.length >= PROJECT_ASSET_LIMITS.maxAssetsCount) {
        return `Limite de ${PROJECT_ASSET_LIMITS.maxAssetsCount} arquivos por projeto.`
      }
      if (assets.some((a) => a.name === name)) return `Já existe um asset com o nome "${name}".`
      const totalChars = assets.reduce((sum, a) => sum + a.dataUrl.length, 0) + input.dataUrl.length
      if (totalChars > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) {
        return 'Os assets do projeto excedem o tamanho total permitido.'
      }
      // Metadados do Pinta (e dimensões) só valem p/ IMAGEM; som e 3D nunca os têm.
      const sprite = isImage ? sanitizeSpriteMeta(input.sprite) : undefined
      const tileset = isImage ? sanitizeTilesetMeta(input.tileset) : undefined
      const tilemap = isImage ? sanitizeTilemapMeta(input.tilemap) : undefined
      const asset: ProjectAsset = {
        id: ulid(),
        name,
        kind,
        dataUrl: input.dataUrl,
        source: input.source === 'library' ? 'library' : 'upload',
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
      }
      set({ project: bump({ ...p, assets: [...assets, asset] }), isDirty: true, saveError: null })
      return null
    },
    removeAsset: (id) => {
      const p = get().project
      if (!p?.assets) return
      const next = p.assets.filter((a) => a.id !== id)
      if (next.length === p.assets.length) return
      set({ project: bump({ ...p, assets: next }), isDirty: true, saveError: null })
    },
    updateAssetMeta: (id, meta) => {
      const p = get().project
      if (!p?.assets) return 'Sem imagens no projeto.'
      const target = p.assets.find((a) => a.id === id)
      if (!target) return 'Imagem não encontrada.'
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
      const target = p.assets.find((a) => a.id === id)
      if (!target) return 'Imagem não encontrada.'
      if (target.kind === 'audio') return 'Esse arquivo não é uma imagem.'
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
        (libRevision === undefined || target.libRevision === libRevision)
      ) {
        return null
      }
      if (is3D) {
        if (!isValidAssetDataUrl(image.dataUrl, target.kind, originalFileName)) {
          return 'Esse arquivo 3D não é válido ou é grande demais.'
        }
      } else if (!isValidAssetDataUrl(image.dataUrl, 'image')) {
        return 'Imagem inválida ou grande demais.'
      }
      // Orçamento do projeto contando o asset NOVO no lugar do velho (o
      // `addAsset` só checa o teto na entrada; um desenho reeditado pode ter
      // ficado bem maior).
      const othersChars = p.assets.reduce(
        (sum, a) => (a.id === id ? sum : sum + a.dataUrl.length),
        0,
      )
      if (othersChars + image.dataUrl.length > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) {
        return `${is3D ? 'A criação' : 'O desenho'} "${target.name}" cresceu e não cabe mais neste jogo.`
      }

      const width = typeof image.width === 'number' && image.width > 0 ? image.width : undefined
      const height = typeof image.height === 'number' && image.height > 0 ? image.height : undefined
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
      const sprite = sanitizeSpriteMeta(image.sprite) ?? (sameGeometry ? target.sprite : undefined)
      const tileset =
        sanitizeTilesetMeta(image.tileset) ?? (sameGeometry ? target.tileset : undefined)
      const tilemap =
        sanitizeTilemapMeta(image.tilemap) ?? (sameGeometry ? target.tilemap : undefined)

      // ⚠️ `name`, `id`, `libId` e `source` ficam INTOCADOS: os blocos referenciam
      // o asset PELO NOME (FieldAssetPicker serializa a string), então renomear
      // aqui quebraria o jogo em silêncio — e o nome no projeto pode divergir do
      // nome na biblioteca de propósito (o "Adicionar ao projeto" sufixa `-2`).
      const next: ProjectAsset = {
        ...target,
        dataUrl: image.dataUrl,
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
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
      const next = p.assets.map((a) => (a.id === id ? { ...a, name } : a))
      set({ project: bump({ ...p, assets: next }), isDirty: true, saveError: null })
      return null
    },
    addProFile: (path) => {
      const p = get().project
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
      if (!p?.tree) return 'Nenhum projeto profissional carregado.'
      const result = addProDir(p.tree, path)
      if (!result.tree) return result.error ?? 'Falha ao criar pasta.'
      set({ project: bump({ ...p, tree: result.tree }), isDirty: true, saveError: null })
      return null
    },
    setProFileContent: (path, content) => {
      const p = get().project
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
    renameProNode: (from, to) => {
      const p = get().project
      if (!p?.tree) return 'Nenhum projeto profissional carregado.'
      const result = renameProNode(p.tree, from, to)
      if (!result.tree) return result.error ?? 'Falha ao renomear.'
      set({ project: bump({ ...p, tree: result.tree }), isDirty: true, saveError: null })
      return null
    },
    removeProNode: (path) => {
      const p = get().project
      if (!p?.tree) return
      const next = removeProNode(p.tree, path)
      if (next === p.tree) return
      set({ project: bump({ ...p, tree: next }), isDirty: true, saveError: null })
    },
  }))
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
    // ABERTURA RÁPIDA: lê só meta+arquivos+assets (ir/blocksState voltam null). Ler
    // o `blocksState` (que pode ser ENORME) de forma síncrona aqui trava a tela
    // "Carregando projeto…" no structured clone do IndexedDB. O `blocksState` é
    // restaurado em SEGUNDO PLANO pelo `PersistenceService.hydrateAfterLoad` (ligado
    // no StudioCore), depois que o editor já abriu — sem travar.
    load: (id) => loadSanitizedProjectShellById(id, scope),
    // Restore em segundo plano da partição pesada de blocos (chamado por
    // hydrateAfterLoad). Os dados históricos já foram convertidos na abertura.
    loadBlocksState: (project) =>
      loadSanitizedProjectBlocksStateById(project.id, project.installedExtensions, scope),
    save: (project) => persistProject(project, {}, scope),
    // Cada `save` pede a sua transação na hora, e o IndexedDB as executa na ordem em que
    // nascem: o serviço não precisa encadear os saves (ver `appliesSavesInCallOrder`).
    appliesSavesInCallOrder: true,
    list: () => listAllProjects(scope),
    delete: (id) => deleteProjectFromDB(id, scope),
  }
}
