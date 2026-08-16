import { useContext } from 'react'
import { ulid } from 'ulid'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  createEmptyProject,
  t as defaultT,
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
  normalizeClassicMode,
  normalizeExtraFileName,
  PROJECT_ASSET_LIMITS,
  type Project,
  type ProjectAsset,
  type ProjectFiles,
  type ProjectTree,
  type ProProjectMeta,
  type StudioProBuildLimits,
  sanitizeProjectAssets,
  sanitizeSpriteMeta,
  sanitizeTilemapMeta,
  sanitizeTilesetMeta,
  studioProBuildFileLimitError,
  type Translator,
} from '#core'
import {
  type CSSEntry,
  type HTMLNode,
  type JSExpr,
  type JSStatement,
  normalizeSZIR,
  type SZIRInput,
  SZIRInputSchema,
} from '#ir'
import { findExtension, OFFICIAL_CATALOG } from '#official-extensions'
import {
  BEHAVIOR_AREAS_MIN_MIGRATABLE_STATE_VERSION,
  BEHAVIOR_AREAS_STATE_KEY,
  BEHAVIOR_AREAS_STATE_VERSION,
  hasValidBehaviorAreasStateVersion,
} from '../blockly/blocksStateVersion'
import { WEB_BLOCK_TYPES_BY_CATEGORY } from '../codecs/web/registry'
import { createProProject as createProProjectFromTemplate } from '../components/code/pro-templates'
import {
  type ExtensionCompatibilityEntry,
  findExtensionConflict,
} from '../extensions/compatibility'
import { isCampaignStageExtraState } from '../official-extensions/game-2d-advanced/campaignSchema'
import { STUDENT_BASELINE_PERMISSIONS } from '../preview/permissionGuard'
import { migrateLegacyBlockProjectSnapshot } from '../projects/compatibility'
import { CANVAS3D_BLOCK_TYPES } from '../three/canvas3dContract'
import {
  deleteProject as deleteProjectFromDB,
  loadProjectBlocksById,
  loadProjectById,
  loadProjectMetaById,
  loadProjectShellById,
  persistProject,
  renameProjectMeta,
} from './persistence'
import {
  addProDir,
  addProFile,
  removeProNode,
  renameProNode,
  sanitizeProMeta,
  sanitizeProTree,
  setProFileContent,
} from './proTree'
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
  importProjectFromJSON: (raw: unknown) => Promise<{ project: Project; warnings: string[] }>
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
  /** Metadados do Pinta (animações/tiles/mapa) — saneados no store antes de guardar. */
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
}

/**
 * Entrada de `updateAssetImage`: os PIXELS novos (e o que o desenho traz junto).
 * Sem `name`/`id`/`libId` de propósito — trocar a imagem nunca muda a identidade
 * do asset (ver o comentário da ação).
 */
export interface UpdateAssetImageInput {
  dataUrl: string
  width?: number
  height?: number
  /** Metadados do desenho de origem; ausentes seguem a regra da geometria. */
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
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

const MAX_PROJECT_NAME_CHARS = 200
const MAX_FILE_CHARS = 4_000_000 // ~4 MB por arquivo de texto
const MAX_TOTAL_CHARS = 16_000_000 // soma de todos os arquivos
const MAX_EXTRA_FILES = 200
const MAX_BLOCKSTATE_CHARS = 8_000_000
export const MAX_BLOCKSTATE_BLOCKS = 10_000
const MAX_BLOCKSTATE_CONTAINER_NODES = 50_000
const MAX_BLOCKSTATE_FIELD_CHARS = MAX_FILE_CHARS
const MAX_MUTATOR_ITEMS = 32
const MAX_MUTATOR_PARAMS = 32
const MAX_MUTATOR_NAME_CHARS = 80
// Blockly 12 substituiu `disabled: boolean` por `disabledReasons: string[]`. Cada
// razão é uma string curta; o limite generoso aqui é só pra defesa anti-DoS.
const MAX_DISABLED_REASONS = 16
const MAX_INSTALLED_EXTENSIONS = 100
const MAX_IR_CHARS = 8_000_000
const MAX_IR_NODES = 40_000
const MAX_JSON_IMPORT_DEPTH = 80
const MAX_JSON_ARRAY_ITEMS = 50_000
const MAX_JSON_OBJECT_KEYS = 250

interface BlocksStateSanitizeLimits {
  maxChars: number
  maxContainerNodes: number
  maxDepth: number
  maxBlocks: number
  checkJsonShape: boolean
}

const IMPORT_BLOCKSTATE_LIMITS: BlocksStateSanitizeLimits = {
  maxChars: MAX_BLOCKSTATE_CHARS,
  maxContainerNodes: MAX_BLOCKSTATE_CONTAINER_NODES,
  maxDepth: MAX_BLOCKSTATE_BLOCKS * 4 + 16,
  maxBlocks: MAX_BLOCKSTATE_BLOCKS,
  checkJsonShape: true,
}

// Projetos já persistidos/localmente rehidratados podem ter sido produzidos pelo
// próprio Studio antes dos tetos atuais. Mantemos limite anti-DoS, mas mais alto
// que o caminho de import de JSON externo para não inutilizar projetos grandes.
const STORED_BLOCKSTATE_LIMITS: BlocksStateSanitizeLimits = {
  maxChars: MAX_BLOCKSTATE_CHARS,
  maxContainerNodes: MAX_BLOCKSTATE_CONTAINER_NODES,
  maxDepth: MAX_BLOCKSTATE_BLOCKS * 4 + 16,
  maxBlocks: MAX_BLOCKSTATE_BLOCKS,
  checkJsonShape: true,
}

export const PROJECT_FILE_LIMITS = {
  maxFileChars: MAX_FILE_CHARS,
  maxTotalChars: MAX_TOTAL_CHARS,
  maxExtraFiles: MAX_EXTRA_FILES,
} as const

// Allowlist dos tipos de bloco core aceitos ao carregar/importar um blocksState.
// DEVE conter todos os tipos de CORE_BLOCKS (#blockly) — incluindo
// blocos ocultos da paleta. Um tipo ausente faz o blocksState salvo inteiro ser
// descartado no load. O teste blockAllowlist.test garante que fica em sincronia.
export const CORE_BLOCKLY_BLOCK_TYPES = new Set([
  // 🔊 Som do núcleo (tocar os arquivos que a criança enviou).
  'sz_som_load',
  'sz_som_play',
  'sz_som_stop',
  'sz_som_play_music',
  'sz_som_stop_music',
  'sz_som_tone',
  'sz_som_noise',
  'sz_som_volume',
  ...CANVAS3D_BLOCK_TYPES,
  'sz_adv_raw_css',
  'sz_adv_raw_html',
  'sz_adv_raw_js',
  ...WEB_BLOCK_TYPES_BY_CATEGORY.html,
  ...WEB_BLOCK_TYPES_BY_CATEGORY.css,
  ...WEB_BLOCK_TYPES_BY_CATEGORY.svg,
  ...WEB_BLOCK_TYPES_BY_CATEGORY.canvas,
  // Seis áreas: Estrutura, Aparência, Meus moldes, Ao iniciar, Quando acontecer
  // e Enquanto estiver rodando.
  'sz_frame_appearance',
  'sz_frame_behavior',
  'sz_frame_events',
  'sz_frame_loops',
  'sz_frame_molds',
  'sz_frame_start',
  'sz_frame_structure',
  'sz_legacy_nested_event',
  'sz_legacy_nested_loop',
  'sz_legacy_nested_start',
  'sz_js_alert_text',
  'sz_js_alert_var',
  'sz_js_class_op',
  'sz_js_console_log_text',
  'sz_js_console_log_var',
  'sz_js_console_log_value',
  'sz_js_const_create',
  'sz_js_get_element_by_id',
  'sz_js_get_property',
  'sz_js_array_push',
  'sz_js_array_remove',
  'sz_js_array_splice',
  'sz_js_if_else',
  'sz_js_on_click',
  'sz_js_on_click_anywhere',
  'sz_js_on_input',
  'sz_js_on_mouseover',
  'sz_js_on_submit',
  'sz_js_on_event_named',
  'sz_js_on_key',
  'sz_js_on_mousemove',
  'sz_js_on_pointer_down',
  'sz_js_on_pointer_up',
  'sz_js_on_load',
  'sz_js_on_resize',
  'sz_js_on_fullscreen_change',
  'sz_js_on_context_menu',
  'sz_js_on_blur',
  'sz_js_request_fullscreen',
  'sz_js_exit_fullscreen',
  'sz_js_toggle_fullscreen',
  'sz_js_query_selector',
  'sz_js_query_selector_all',
  'sz_js_storage_set',
  'sz_js_storage_remove',
  'sz_js_event_method',
  'sz_js_fetch_json',
  'sz_js_repeat',
  'sz_js_while',
  'sz_js_do_while',
  'sz_js_break',
  'sz_js_continue',
  'sz_js_for_of',
  'sz_js_for_range',
  'sz_js_try_catch',
  'sz_js_for_each',
  'sz_js_set_timeout',
  'sz_js_set_interval',
  'sz_js_set_timeout_seconds',
  'sz_js_set_interval_seconds',
  'sz_js_create_element',
  'sz_js_create_element_ns',
  'sz_js_get_attribute',
  'sz_js_append_child',
  'sz_js_set_style_text',
  'sz_js_throw',
  'sz_js_object_assign',
  'sz_js_switch',
  'sz_js_case',
  'sz_js_set_dataset',
  'sz_js_set_style',
  'sz_js_set_attribute',
  'sz_js_set_property',
  'sz_js_set_property_calc',
  'sz_js_set_property_text',
  'sz_js_set_property_var',
  'sz_js_set_text',
  'sz_js_call_method',
  'sz_js_call_function',
  'sz_js_function',
  'sz_js_function_async',
  'sz_js_class',
  'sz_js_class_method',
  'sz_js_class_method_async',
  'sz_js_constructor',
  'sz_js_return',
  'sz_js_return_void',
  'sz_js_super_ctor',
  'sz_js_super_method',
  'sz_js_expr_statement',
  'sz_js_set_this_prop',
  'sz_js_set_prop',
  'sz_js_member_set',
  'sz_js_index_set',
  'sz_js_method_on',
  'sz_js_new_image',
  'sz_js_image_onload',
  'sz_js_image_onerror',
  'sz_js_element_onclick',
  'sz_js_await',
  'sz_js_set_timeout_call',
  'sz_val_new_promise',
  'sz_val_promise_all',
  'sz_js_new_var',
  'sz_js_var_assign',
  'sz_js_var_create',
  'sz_js_var_declare',
  'sz_js_var_increment',
  'sz_math_arithmetic',
  'sz_math_function',
  'sz_math_minmax',
  'sz_math_trig',
  'sz_math_atan2',
  'sz_math_hypot',
  'sz_math_angle_convert',
  'sz_val_array',
  'sz_val_array_index',
  'sz_val_array_last',
  'sz_val_array_find',
  'sz_val_array_length',
  'sz_val_array_map',
  'sz_val_canvas_height',
  'sz_val_canvas_width',
  'sz_val_class_contains',
  'sz_val_compare',
  'sz_val_distance',
  'sz_val_ternary',
  'sz_val_concat_arrays',
  'sz_val_dataset',
  'sz_val_json_data',
  'sz_val_json_parse',
  'sz_val_json_stringify',
  'sz_val_gamepad_connected',
  'sz_val_gamepad_axis',
  'sz_val_gamepad_button',
  'sz_val_join',
  'sz_val_logic',
  'sz_val_not',
  'sz_val_shuffle',
  'sz_val_this',
  'sz_val_color',
  'sz_val_color_alpha',
  'sz_val_color_hsl',
  'sz_val_event_pos',
  'sz_val_event_key',
  'sz_val_is_fullscreen',
  'sz_val_get_element',
  'sz_val_query_select',
  'sz_val_math_pi',
  'sz_val_number',
  'sz_val_random',
  'sz_val_random_float',
  'sz_val_storage_get',
  'sz_val_text',
  'sz_val_this_prop',
  'sz_val_get_prop',
  'sz_val_call_method',
  'sz_val_new',
  'sz_val_array_filter',
  'sz_val_object',
  'sz_val_object_op',
  'sz_val_index_get',
  'sz_val_image',
  'sz_val_member_get',
  'sz_val_member_get_optional',
  'sz_val_method_on',
  'sz_val_arg',
  'sz_val_bool',
  'sz_val_null',
  'sz_val_call_function',
  'sz_val_variable',
  'sz_val_vector2d',
  'sz_val_vector3d',
  'sz_val_window_height',
  'sz_val_window_width',
  'sz_val_device_pixel_ratio',
  'sz_val_system_dark',
  'sz_val_system_reduced_motion',
  'sz_val_event_pointer_id',
  'sz_val_storage_get_dynamic',
  'sz_js_storage_set_dynamic',
  'sz_js_storage_remove_dynamic',
  'sz_val_perf_now',
  'sz_val_date_part',
])

interface ExtensionBlocklyCatalogEntry {
  readonly manifest: { readonly id: string }
  readonly blockly: { readonly blocks: readonly { readonly type: string }[] }
}

/**
 * Deriva a allowlist usada pelo sanitizador do catálogo que registra os blocos.
 * Assim, adicionar ou remover um bloco oficial atualiza o carregamento de projetos
 * sem exigir uma segunda lista manual.
 */
export function buildExtensionBlocklyBlockTypes(
  catalog: readonly ExtensionBlocklyCatalogEntry[],
): Record<string, ReadonlySet<string>> {
  return Object.fromEntries(
    catalog.map((extension) => [
      extension.manifest.id,
      new Set(extension.blockly.blocks.map((block) => block.type)),
    ]),
  )
}

export const EXTENSION_BLOCKLY_BLOCK_TYPES = buildExtensionBlocklyBlockTypes(OFFICIAL_CATALOG)

function isProjectFiles(value: unknown): value is ProjectFiles {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v['index.html'] === 'string' &&
    typeof v['style.css'] === 'string' &&
    typeof v['script.js'] === 'string'
  )
}

function sanitizeProjectName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Sem título'
  const trimmed = raw.trim()
  return (trimmed || 'Sem título').slice(0, MAX_PROJECT_NAME_CHARS)
}

function sanitizeCanonicalProjectFiles(raw: unknown): ProjectFiles | null {
  if (!isProjectFiles(raw)) return null
  const files: ProjectFiles = {
    'index.html': raw['index.html'],
    'style.css': raw['style.css'],
    'script.js': raw['script.js'],
  }
  const canonicalTotal =
    files['index.html'].length + files['style.css'].length + files['script.js'].length
  if (
    files['index.html'].length > MAX_FILE_CHARS ||
    files['style.css'].length > MAX_FILE_CHARS ||
    files['script.js'].length > MAX_FILE_CHARS ||
    canonicalTotal > MAX_TOTAL_CHARS
  ) {
    return null
  }
  return files
}

function sanitizeTimestamp(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback
}

/** Valida e normaliza `extraFiles` vindos de um JSON não confiável. */
function sanitizeImportedExtraFiles(raw: unknown): ExtraFile[] {
  if (!Array.isArray(raw)) return []
  const out: ExtraFile[] = []
  let totalChars = 0
  for (const item of raw) {
    if (out.length >= MAX_EXTRA_FILES) break
    if (!item || typeof item !== 'object') continue
    const f = item as Record<string, unknown>
    if (typeof f.name !== 'string' || typeof f.content !== 'string') continue
    if (f.content.length > MAX_FILE_CHARS) continue
    if (totalChars + f.content.length > MAX_TOTAL_CHARS) continue
    const normalized = normalizeExtraFileName(f.name)
    if (!normalized || isReservedProjectFileName(normalized)) continue
    const language = inferExtraLanguage(normalized)
    if (!language) continue
    if (out.some((existing) => existing.name.toLowerCase() === normalized.toLowerCase())) continue
    out.push({ name: normalized, language, content: f.content })
    totalChars += f.content.length
  }
  return out
}

/** Limites de POLÍTICA configuráveis pelo host (prop `limits` do <Studio>). */
export interface StudioLimits {
  maxFileChars?: number
  maxTotalChars?: number
  maxExtraFiles?: number
  /** Orçamento de tempo síncrono de um loop no preview antes de cortar (ms). */
  previewLoopBudgetMs?: number
  /** Timeout do watchdog de heartbeat do preview (ms). */
  previewHeartbeatTimeoutMs?: number
  /** Origens https/http que o código do aluno pode acessar via fetch/XHR. */
  fetchAllowedOrigins?: readonly string[]
  /**
   * Timeout (ms) de processos NÃO-INTERATIVOS do terminal/dev-server (ex.:
   * `npm install`). O shell interativo (`jsh`) NUNCA é morto por timeout.
   */
  terminalProcessTimeoutMs?: number
}

// Só os limites de ARQUIVO são resolvidos com defaults aqui; os de política de
// segurança do preview são resolvidos em studio/config.ts (precisam chegar aos
// componentes via contexto).
type ResolvedLimits = Required<
  Pick<StudioLimits, 'maxFileChars' | 'maxTotalChars' | 'maxExtraFiles'>
>

function projectFilesLimitError(
  files: ProjectFiles,
  extraFiles: ExtraFile[],
  limits: ResolvedLimits = PROJECT_FILE_LIMITS,
): string | null {
  const allFiles: Array<[string, string]> = [
    ['index.html', files['index.html']],
    ['style.css', files['style.css']],
    ['script.js', files['script.js']],
    ...extraFiles.map((file): [string, string] => [file.name, file.content]),
  ]

  if (extraFiles.length > limits.maxExtraFiles) {
    return `Limite de ${limits.maxExtraFiles} arquivos extras excedido.`
  }

  let total = 0
  for (const [name, content] of allFiles) {
    if (content.length > limits.maxFileChars) {
      return `O arquivo ${name} excede o limite de ${limits.maxFileChars.toLocaleString('pt-BR')} caracteres.`
    }
    total += content.length
  }

  if (total > limits.maxTotalChars) {
    return `O projeto excede o limite total de ${limits.maxTotalChars.toLocaleString('pt-BR')} caracteres.`
  }

  return null
}

/**
 * Garante o teto COMBINADO (canônicos + extras) ao carregar um projeto. Os dois
 * grupos são limitados independente, então a soma podia chegar ao dobro do
 * limite de edição ao vivo. Derruba extras (do fim para o começo) até o conjunto
 * passar em `projectFilesLimitError`, mantendo os arquivos canônicos do aluno.
 */
function limitCombinedExtraFiles(files: ProjectFiles, extraFiles: ExtraFile[]): ExtraFile[] {
  const trimmed = [...extraFiles]
  while (trimmed.length > 0 && projectFilesLimitError(files, trimmed) !== null) {
    trimmed.pop()
  }
  return trimmed
}

// Baseline de permissões que o aluno SEMPRE tem (canvas/teclado/mouse/áudio/
// storage — não são vetor de exfil). Espelha o guard de runtime do preview.
const BASELINE_PERMISSIONS = new Set<string>(STUDENT_BASELINE_PERMISSIONS)

/**
 * Uma extensão (resolvida pelo id no catálogo oficial) declara SÓ permissões da
 * baseline? Extensões desconhecidas e extensões cujo manifesto declare `network`
 * (ou qualquer permissão fora da baseline) NÃO passam: ao importar um projeto de
 * um estranho, o aluno não pode habilitar silenciosamente código sem catálogo ou
 * uma capacidade sensível sem consentimento (hoje as oficiais só usam a baseline).
 */
function declaresOnlyBaselinePermissions(id: string): boolean {
  const ext = findExtension(id)
  if (!ext) return false
  return ext.manifest.permissions.every((p) => BASELINE_PERMISSIONS.has(p))
}

/** Valida `installedExtensions` vindos de um JSON não confiável. */
function sanitizeImportedExtensions(raw: unknown): InstalledExtension[] {
  if (!Array.isArray(raw)) return []
  const out: InstalledExtension[] = []
  const accepted: ExtensionCompatibilityEntry[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (out.length >= MAX_INSTALLED_EXTENSIONS) break
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    if (typeof e.id !== 'string' || typeof e.version !== 'string') continue
    if (seen.has(e.id)) continue
    const extension = findExtension(e.id)
    if (!extension) continue
    // Fail-closed do consentimento: descarta extensões que declarem permissão
    // fora da baseline (ex.: uma futura extensão `network`). Abrir o .json de um
    // estranho não pode conceder capacidades sensíveis sem o aluno consentir.
    if (!declaresOnlyBaselinePermissions(e.id)) continue
    const compatibility = { id: e.id, conflictsWith: extension.conflictsWith }
    if (findExtensionConflict(compatibility, accepted)) continue
    seen.add(e.id)
    accepted.push(compatibility)
    out.push({
      id: e.id,
      version: e.version,
      installedAt:
        typeof e.installedAt === 'number' && Number.isFinite(e.installedAt)
          ? e.installedAt
          : Date.now(),
    })
  }
  return out
}

function importedIRMatchesInstalledExtensions(
  ir: SZIRInput | null,
  installedExtensions: readonly InstalledExtension[],
): boolean {
  if (!ir) return true
  const installed = new Set(installedExtensions.map((extension) => extension.id))
  const seen = new Set<string>()
  for (const extension of normalizeSZIR(ir).extensions) {
    if (seen.has(extension.extensionId) || !installed.has(extension.extensionId)) return false
    seen.add(extension.extensionId)
  }
  return true
}

interface JsonShapeLimits {
  maxChars: number
  maxContainerNodes: number
  maxDepth: number
  maxArrayItems: number
  maxObjectKeys: number
  maxStringChars?: number
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function isJsonShapeWithinLimits(value: unknown, limits: JsonShapeLimits): boolean {
  return describeJsonShapeLimitFailure(value, limits) == null
}

function describeJsonShapeLimitFailure(value: unknown, limits: JsonShapeLimits): string | null {
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }]
  const seen = new WeakSet<object>()
  let chars = 0
  let containerNodes = 0

  const addChars = (amount: number): string | null => {
    chars += amount
    return chars <= limits.maxChars
      ? null
      : `tamanho estimado ${chars.toLocaleString('pt-BR')} > ${limits.maxChars.toLocaleString('pt-BR')} chars`
  }

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { value: item, depth } = current
    if (depth > limits.maxDepth) return `profundidade ${depth} > ${limits.maxDepth}`

    if (item == null) continue

    if (typeof item === 'string') {
      if (limits.maxStringChars != null && item.length > limits.maxStringChars) {
        return `string com ${item.length.toLocaleString('pt-BR')} chars > ${limits.maxStringChars.toLocaleString('pt-BR')}`
      }
      const charsFailure = addChars(item.length)
      if (charsFailure) return charsFailure
      continue
    }

    if (typeof item === 'number') {
      if (!Number.isFinite(item)) return 'número não-finito'
      const charsFailure = addChars(String(item).length)
      if (charsFailure) return charsFailure
      continue
    }

    if (typeof item === 'boolean') {
      const charsFailure = addChars(item ? 4 : 5)
      if (charsFailure) return charsFailure
      continue
    }

    if (typeof item !== 'object') return `tipo não-JSON: ${typeof item}`
    if (seen.has(item)) return 'referência circular'
    seen.add(item)

    containerNodes += 1
    if (containerNodes > limits.maxContainerNodes) {
      return `containers ${containerNodes.toLocaleString('pt-BR')} > ${limits.maxContainerNodes.toLocaleString('pt-BR')}`
    }

    if (Array.isArray(item)) {
      if (item.length > limits.maxArrayItems) {
        return `array com ${item.length.toLocaleString('pt-BR')} itens > ${limits.maxArrayItems.toLocaleString('pt-BR')}`
      }
      for (let index = item.length - 1; index >= 0; index -= 1) {
        stack.push({ value: item[index], depth: depth + 1 })
      }
      continue
    }

    if (!isPlainRecord(item)) return 'objeto não-plano'

    const entries = Object.entries(item)
    if (entries.length > limits.maxObjectKeys) {
      return `objeto com ${entries.length.toLocaleString('pt-BR')} chaves > ${limits.maxObjectKeys.toLocaleString('pt-BR')}`
    }
    for (const [key, child] of entries) {
      const charsFailure = addChars(key.length)
      if (charsFailure) return charsFailure
      stack.push({ value: child, depth: depth + 1 })
    }
  }

  return null
}

function sanitizeImportedIR(raw: unknown): SZIRInput | null {
  if (raw == null) return null
  const isSmallEnough = isJsonShapeWithinLimits(raw, {
    maxChars: MAX_IR_CHARS,
    maxContainerNodes: MAX_IR_NODES,
    maxDepth: MAX_JSON_IMPORT_DEPTH,
    maxArrayItems: MAX_JSON_ARRAY_ITEMS,
    maxObjectKeys: MAX_JSON_OBJECT_KEYS,
    maxStringChars: MAX_FILE_CHARS,
  })
  if (!isSmallEnough) {
    throw new Error('Arquivo inválido: IR excede o tamanho ou a complexidade máxima permitida.')
  }
  const parsed = SZIRInputSchema.safeParse(raw)
  if (!parsed.success) return null
  if (countIRNodes(parsed.data) > MAX_IR_NODES) {
    throw new Error('Arquivo inválido: IR excede a complexidade máxima permitida.')
  }
  return parsed.data
}

export function sanitizeImportedBlocksState(
  raw: unknown,
  installedExtensions: InstalledExtension[],
): Project['blocksState'] {
  return sanitizeBlocksState(raw, installedExtensions, IMPORT_BLOCKSTATE_LIMITS)
}

function sanitizeBlocksState(
  raw: unknown,
  installedExtensions: InstalledExtension[],
  limits: BlocksStateSanitizeLimits,
): Project['blocksState'] {
  if (raw == null) return null
  if (limits.checkJsonShape) {
    const limitFailure = describeJsonShapeLimitFailure(raw, {
      maxChars: limits.maxChars,
      maxContainerNodes: limits.maxContainerNodes,
      maxDepth: limits.maxDepth,
      maxArrayItems: limits.maxBlocks,
      maxObjectKeys: MAX_JSON_OBJECT_KEYS,
      maxStringChars: MAX_BLOCKSTATE_FIELD_CHARS,
    })
    if (limitFailure) {
      throw new Error(
        `Arquivo inválido: blocksState excede o tamanho ou a complexidade máxima permitida (${limitFailure}).`,
      )
    }
  }

  const allowedTypes = getAllowedBlocklyBlockTypes(installedExtensions)
  return isSupportedBlocklyWorkspaceState(raw, allowedTypes, limits) ? raw : null
}

function sanitizeStoredIR(raw: unknown): SZIRInput | null {
  try {
    return sanitizeImportedIR(raw)
  } catch {
    return null
  }
}

/**
 * Espelha as checagens de `isSupportedBlocklyWorkspaceState`/`areSupportedBlocklyBlocks`
 * mas devolve uma string explicando a PRIMEIRA falha encontrada — ou `null` se
 * o estado passaria. Usada só para diagnóstico (não muda nenhum comportamento)
 * — sem ela, o sanitizer derrubava o `blocksState` sem dizer onde foi o tropeço.
 */
function describeBlocklyValidationFailure(
  raw: unknown,
  installedExtensions: InstalledExtension[],
): string | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) {
    return 'raiz não é objeto plano'
  }
  const rootKeys = Object.keys(raw)
  const extraRoot = rootKeys.find(
    (k) => k !== 'blocks' && k !== 'variables' && k !== BEHAVIOR_AREAS_STATE_KEY,
  )
  if (extraRoot) return `chave de raiz inesperada: "${extraRoot}"`
  if (!hasValidBehaviorAreasStateVersion(raw)) {
    return `versão das áreas de comportamento inesperada: ${JSON.stringify(raw[BEHAVIOR_AREAS_STATE_KEY])} (suportadas ${BEHAVIOR_AREAS_MIN_MIGRATABLE_STATE_VERSION}–${BEHAVIOR_AREAS_STATE_VERSION})`
  }

  const blocksSection = (raw as { blocks?: unknown }).blocks
  if (
    !blocksSection ||
    typeof blocksSection !== 'object' ||
    Array.isArray(blocksSection) ||
    !isPlainRecord(blocksSection)
  ) {
    return 'seção "blocks" ausente ou não-objeto'
  }
  if (blocksSection.languageVersion !== 0) {
    return `languageVersion inesperado: ${JSON.stringify(blocksSection.languageVersion)}`
  }
  if (!Array.isArray(blocksSection.blocks)) return 'blocks.blocks não é array'
  const extraSection = Object.keys(blocksSection).find(
    (k) => k !== 'languageVersion' && k !== 'blocks',
  )
  if (extraSection) return `chave inesperada em "blocks": "${extraSection}"`
  if (
    !isSupportedBlocklyVariables(
      (raw as { variables?: unknown }).variables,
      STORED_BLOCKSTATE_LIMITS,
    )
  ) {
    return 'seção "variables" inválida'
  }

  const allowedTypes = getAllowedBlocklyBlockTypes(installedExtensions)
  return describeBlockListFailure(blocksSection.blocks, allowedTypes, [])
}

function describeBlockListFailure(
  blocks: unknown[],
  allowedTypes: ReadonlySet<string>,
  pathSoFar: string[],
): string | null {
  for (let i = 0; i < blocks.length; i++) {
    const reason = describeBlockFailure(blocks[i], allowedTypes, [...pathSoFar, `[${i}]`])
    if (reason) return reason
  }
  return null
}

function describeBlockFailure(
  block: unknown,
  allowedTypes: ReadonlySet<string>,
  path: string[],
): string | null {
  const pathStr = path.join('') || '(raiz)'
  if (!block || typeof block !== 'object' || Array.isArray(block) || !isPlainRecord(block)) {
    return `${pathStr}: não é objeto plano`
  }
  const allowedKeys = new Set([
    'collapsed',
    'data',
    'deletable',
    'disabled',
    'disabledReasons',
    'editable',
    'enabled',
    'extraState',
    'fields',
    'icons',
    'id',
    'inline',
    'inputs',
    'movable',
    'next',
    'type',
    'x',
    'y',
  ])
  for (const key of Object.keys(block)) {
    if (!allowedKeys.has(key)) return `${pathStr}: chave inesperada "${key}"`
  }
  const type = (block as { type?: unknown }).type
  if (typeof type !== 'string') return `${pathStr}: type ausente ou não-string`
  if (!allowedTypes.has(type)) return `${pathStr}: tipo "${type}" fora da allowlist`
  if (!isSupportedBlocklyBlockExtraState(type, (block as { extraState?: unknown }).extraState)) {
    return `${pathStr}(${type}): extraState inválido`
  }
  if (!isSupportedDisabledReasons((block as { disabledReasons?: unknown }).disabledReasons)) {
    return `${pathStr}(${type}): disabledReasons inválido`
  }
  if (!isSupportedBlocklyIcons((block as { icons?: unknown }).icons)) {
    return `${pathStr}(${type}): icons inválido`
  }
  if (!isSupportedBlocklyFields((block as { fields?: unknown }).fields)) {
    return `${pathStr}(${type}): fields inválido`
  }
  if (!isSupportedBlocklyInputs((block as { inputs?: unknown }).inputs)) {
    return `${pathStr}(${type}): inputs inválido`
  }
  // Recursão estrutural (mesmas regras de areSupportedBlocklyBlocks).
  const inputs = (block as { inputs?: unknown }).inputs
  if (inputs && isPlainUnknownRecord(inputs)) {
    for (const [name, wrapper] of Object.entries(inputs)) {
      const children = getSerializedBlockWrapperChildren(wrapper)
      if (!children) return `${pathStr}(${type}).inputs.${name}: wrapper inválido`
      const childReason = describeBlockListFailure(children, allowedTypes, [
        ...path,
        `(${type}).inputs.${name}`,
      ])
      if (childReason) return childReason
    }
  }
  const next = (block as { next?: unknown }).next
  if (next != null) {
    const children = getSerializedBlockWrapperChildren(next)
    if (!children) return `${pathStr}(${type}).next: wrapper inválido`
    const childReason = describeBlockListFailure(children, allowedTypes, [
      ...path,
      `(${type}).next`,
    ])
    if (childReason) return childReason
  }
  return null
}

/**
 * Coleta os TIPOS de bloco fora da allowlist num blocksState (tolerante à
 * forma). Complemento do all-or-nothing do sanitize: o estado inteiro é
 * descartado, mas o aviso ao menos DIZ quais blocos causaram a queda — sem
 * isso a criança/professor só via "os blocos sumiram", sem pista do culpado.
 */
export function collectUnknownBlockTypes(
  raw: unknown,
  installedExtensions: InstalledExtension[],
): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return []
  const blocksSection = (raw as { blocks?: unknown }).blocks
  if (!blocksSection || !isPlainUnknownRecord(blocksSection)) return []
  const roots = (blocksSection as { blocks?: unknown }).blocks
  if (!Array.isArray(roots)) return []

  const allowed = getAllowedBlocklyBlockTypes(installedExtensions)
  const unknown = new Set<string>()
  const seen = new WeakSet<object>()
  const stack: unknown[] = [...roots]
  while (stack.length > 0) {
    const block = stack.pop()
    if (!block || typeof block !== 'object' || Array.isArray(block) || !isPlainRecord(block)) {
      continue
    }
    if (seen.has(block)) continue
    seen.add(block)
    const type = (block as { type?: unknown }).type
    if (typeof type === 'string' && !allowed.has(type)) unknown.add(type)
    const inputs = (block as { inputs?: unknown }).inputs
    if (inputs && isPlainUnknownRecord(inputs)) {
      for (const wrapper of Object.values(inputs)) {
        const children = getSerializedBlockWrapperChildren(wrapper)
        if (children) for (const child of children) stack.push(child)
      }
    }
    const next = (block as { next?: unknown }).next
    if (next != null) {
      const children = getSerializedBlockWrapperChildren(next)
      if (children) for (const child of children) stack.push(child)
    }
  }
  return [...unknown].sort()
}

function formatCaughtError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/**
 * O canvas estava VAZIO quando este estado foi salvo?
 *
 * ⚠️ `Blockly.serialization.workspaces.save()` num workspace sem blocos devolve `{}`
 * (MEDIDO — ele OMITE a seção em vez de mandar uma lista vazia), e o
 * `markLifecycleBlocksState` carimba a versão por cima: o que chega ao disco é
 * `{szBehaviorAreasVersion: N}`, sem `blocks`. O sanitizer o recusa — e recusar está
 * certo, porque não há layout nenhum a preservar e o modo reconstrói do IR, que
 * também é vazio. **O que estava errado era AVISAR**: o aviso existe para dizer qual
 * checagem da allowlist tropeçou, e aqui nenhuma tropeçou. Ele disparava ao abrir
 * qualquer projeto salvo com o canvas limpo (todo projeto novo, portanto), assustando
 * quem estava certo — a mesma classe de defeito que o Jogo 2D já pagou cinco vezes.
 */
function isEmptyWorkspaceState(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return false
  // Sem a seção `blocks` não há bloco nenhum; só as chaves que o Blockly/nós
  // carimbamos por fora podem sobrar. Chave estranha volta a ser motivo de aviso.
  if (!Object.keys(raw).every((key) => key === 'variables' || key === BEHAVIOR_AREAS_STATE_KEY)) {
    return false
  }
  if (!hasValidBehaviorAreasStateVersion(raw)) return false
  if (!isSupportedBlocklyVariables(raw.variables, STORED_BLOCKSTATE_LIMITS)) return false
  return raw.variables == null || (Array.isArray(raw.variables) && raw.variables.length === 0)
}

function sanitizeStoredBlocksState(
  raw: unknown,
  installedExtensions: InstalledExtension[],
): Project['blocksState'] {
  try {
    const out = sanitizeBlocksState(raw, installedExtensions, STORED_BLOCKSTATE_LIMITS)
    if (raw != null && out == null && !isEmptyWorkspaceState(raw)) {
      // Antes era um drop silencioso: o blocksState está no disco mas alguma chave
      // ou limite não passou na allowlist, então o load cai para `null` e o modo
      // reconstrói a partir do IR — o que aplica os defaults `x = 32, 452, 872`
      // e apaga o arranjo do aluno. Avisar aqui (com a razão precisa) revela
      // imediatamente qual checagem da allowlist tropeçou.
      const reason = describeBlocklyValidationFailure(raw, installedExtensions)
      console.warn(
        `[sz] blocksState rejeitado pelo sanitizer — layout cairá para os defaults. Motivo: ${reason ?? '(não identificado)'}`,
      )
    }
    return out
  } catch (err) {
    console.warn(
      `[sz] blocksState rejeitado pelo sanitizer (exception): ${formatCaughtError(err)}`,
      err,
    )
    return null
  }
}

// Teto do id de projeto vindo do corpo do JSON. Os ids que mintamos são ulids
// (26 chars Crockford base32); o teto generoso tolera ids legados/de host sem
// abrir espaço para um id patológico (megabytes ou bytes esquisitos) virar chave
// de IndexedDB / parte de chave de game-storage.
const MAX_PROJECT_ID_CHARS = 128
// Charset seguro p/ id: alfanumérico + hífen/sublinhado (cobre ulid e uuid). Um
// id fora disso é REJEITADO e substituído por um ulid fresco — igual ao caminho
// de import, que sempre minta um ulid novo.
const SAFE_PROJECT_ID_RE = /^[A-Za-z0-9_-]+$/

/**
 * Limita o id vindo do corpo do JSON (host `initialProject`): string não-vazia,
 * dentro do teto de tamanho e no charset seguro. Caso contrário minta um ulid
 * fresco (espelha o caminho de import). NÃO aplicado ao `requestedId` interno —
 * esse já é uma chave de IndexedDB que nós produzimos.
 */
function boundProjectIdFromBody(raw: unknown): string {
  if (
    typeof raw === 'string' &&
    raw.length > 0 &&
    raw.length <= MAX_PROJECT_ID_CHARS &&
    SAFE_PROJECT_ID_RE.test(raw)
  ) {
    return raw
  }
  return ulid()
}

function sanitizeStoredProject(
  raw: unknown,
  requestedId?: string,
  proBuildLimits?: StudioProBuildLimits,
): Project | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) {
    return null
  }
  const r = raw as Record<string, unknown>
  // `requestedId` (load por chave interna do IndexedDB) é confiável — usado como
  // está. Sem ele (caminho do host `initialProject`/`sanitizeProjectForHost`), o
  // id vem do corpo NÃO confiável e precisa ser limitado/saneado.
  const id = requestedId ?? boundProjectIdFromBody(r.id)
  if (!id) return null

  const files = sanitizeCanonicalProjectFiles(r.files)
  if (!files) return null

  const name = sanitizeProjectName(r.name)
  const base = createEmptyProject(id, name)
  const installedExtensions = sanitizeImportedExtensions(r.installedExtensions)
  const storedIR = sanitizeStoredIR(r.ir)
  const ir = importedIRMatchesInstalledExtensions(storedIR, installedExtensions) ? storedIR : null
  const createdAt = sanitizeTimestamp(r.createdAt, base.createdAt)
  const updatedAt = sanitizeTimestamp(r.updatedAt, createdAt)

  // Os canônicos (≤ MAX_TOTAL_CHARS) e os extras (≤ MAX_TOTAL_CHARS) são
  // limitados INDEPENDENTE acima, então a soma podia chegar a ~16 MB — o dobro
  // do limite de edição ao vivo (projectFilesLimitError em setFiles etc.). Aplica
  // o mesmo teto combinado no load: derruba extras (do fim) até caber, casando
  // com o guard de edição em vez de aceitar um projeto que a IDE recusaria salvar.
  const extraFiles = limitCombinedExtraFiles(files, sanitizeImportedExtraFiles(r.extraFiles))

  // Modo profissional: aceita `kind:'pro'` só com `tree` válida + `proMeta`.
  // Qualquer falha REBAIXA para classic (o `files` canônico vazio-válido evita
  // crash). `node_modules` nunca passa (barrado em normalizeProPath).
  let tree: ProjectTree | undefined
  let proMeta: ProProjectMeta | undefined
  if (r.kind === 'pro') {
    const sanitizedTree = sanitizeProTree(r.tree, proBuildLimits)
    const sanitizedMeta = sanitizeProMeta(r.proMeta)
    if (sanitizedTree && sanitizedMeta) {
      tree = sanitizedTree
      proMeta = sanitizedMeta
    }
  }
  const isPro = tree != null && proMeta != null

  return migrateLegacyBlockProjectSnapshot({
    ...base,
    id,
    name,
    files,
    extraFiles,
    // Pro vive sempre no modo 'code'; básico vive em Blocos/Ponte ('code' legado
    // cai em 'bridge') — separação D2.
    mode: isPro ? 'code' : normalizeClassicMode(r.mode),
    ir,
    blocksState: sanitizeStoredBlocksState(r.blocksState, installedExtensions),
    installedExtensions,
    assets: sanitizeProjectAssets(r.assets),
    createdAt,
    updatedAt,
    ...(isPro ? { kind: 'pro' as const, tree, proMeta } : {}),
  })
}

export async function loadSanitizedProjectById(id: string): Promise<Project | null> {
  return sanitizeStoredProject(await loadProjectById(id), id)
}

export async function loadSanitizedProjectShellById(id: string): Promise<Project | null> {
  return sanitizeStoredProject(await loadProjectShellById(id), id)
}

export async function loadSanitizedProjectBlocksStateById(
  id: string,
  installedExtensions: InstalledExtension[] = [],
): Promise<Project['blocksState']> {
  const raw = await loadProjectBlocksById(id)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return null
  const record = raw as Record<string, unknown>
  if (record.id != null && record.id !== id) return null
  // Sanitiza contra a UNIÃO das extensões do chamador com as do META persistido:
  // a lista do chamador pode vir vazia/defasada (shell ainda hidratando noutra
  // aba, host antigo), e o sanitize é tudo-ou-nada — um projeto de Jogo 2D
  // avaliado contra a allowlist só-núcleo perderia TODOS os blocos. O meta é a
  // fonte durável do que está instalado; unir nunca REMOVE uma permissão do
  // chamador, só re-adiciona as persistidas.
  const meta = await loadProjectMetaById(id)
  const metaExtensions = meta ? sanitizeImportedExtensions(meta.installedExtensions) : []
  const merged = new Map<string, InstalledExtension>()
  for (const extension of installedExtensions) merged.set(extension.id, extension)
  for (const extension of metaExtensions) {
    if (!merged.has(extension.id)) merged.set(extension.id, extension)
  }
  return sanitizeStoredBlocksState(record.blocksState, [...merged.values()])
}

/**
 * Sanitiza um Project vindo do HOST (prop `initialProject` do <Studio>) com as
 * mesmas regras aplicadas a projetos persistidos — protege contra JSON
 * malformado/hostil passado pelo app que embarca o editor.
 */
export function sanitizeProjectForHost(
  raw: unknown,
  options: { proBuildLimits?: StudioProBuildLimits } = {},
): Project | null {
  return sanitizeStoredProject(raw, undefined, options.proBuildLimits)
}

function getAllowedBlocklyBlockTypes(
  installedExtensions: InstalledExtension[],
): ReadonlySet<string> {
  const allowed = new Set(CORE_BLOCKLY_BLOCK_TYPES)
  for (const extension of installedExtensions) {
    const blockTypes = EXTENSION_BLOCKLY_BLOCK_TYPES[extension.id]
    if (!blockTypes) continue
    for (const blockType of blockTypes) allowed.add(blockType)
  }
  return allowed
}

/**
 * Um tipo de bloco é aceito NESTE projeto? (core + extensões instaladas.) Usado
 * pelo colar de blocos entre projetos (`blockClipboard`) para recusar tipos que o
 * destino não tem — SEM o all-or-nothing do `sanitizeImportedBlocksState`.
 */
export function isBlockTypeKnown(type: string, installedExtensions: InstalledExtension[]): boolean {
  return getAllowedBlocklyBlockTypes(installedExtensions).has(type)
}

function isSupportedBlocklyWorkspaceState(
  raw: unknown,
  allowedTypes: ReadonlySet<string>,
  limits: BlocksStateSanitizeLimits,
): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return false
  const rootKeys = Object.keys(raw)
  if (
    rootKeys.some(
      (key) => key !== 'blocks' && key !== 'variables' && key !== BEHAVIOR_AREAS_STATE_KEY,
    )
  ) {
    return false
  }
  if (!hasValidBehaviorAreasStateVersion(raw)) return false

  const blocksSection = raw.blocks
  if (
    !blocksSection ||
    typeof blocksSection !== 'object' ||
    Array.isArray(blocksSection) ||
    !isPlainRecord(blocksSection)
  ) {
    return false
  }

  if (blocksSection.languageVersion !== 0) return false
  if (!Array.isArray(blocksSection.blocks)) return false
  if (blocksSection.blocks.length > limits.maxBlocks) return false
  if (Object.keys(blocksSection).some((key) => key !== 'languageVersion' && key !== 'blocks')) {
    return false
  }
  if (!isSupportedBlocklyVariables(raw.variables, limits)) return false

  return areSupportedBlocklyBlocks(blocksSection.blocks, allowedTypes, limits)
}

function isSupportedBlocklyVariables(raw: unknown, limits: BlocksStateSanitizeLimits): boolean {
  if (raw == null) return true
  if (!Array.isArray(raw) || raw.length > limits.maxBlocks) return false
  for (const variable of raw) {
    if (!variable || typeof variable !== 'object' || Array.isArray(variable)) return false
    if (!isPlainRecord(variable)) return false
    const keys = Object.keys(variable)
    if (keys.some((key) => key !== 'id' && key !== 'name' && key !== 'type')) return false
    for (const value of Object.values(variable)) {
      if (typeof value !== 'string' || value.length > MAX_BLOCKSTATE_FIELD_CHARS) return false
    }
  }
  return true
}

function areSupportedBlocklyBlocks(
  blocks: unknown[],
  allowedTypes: ReadonlySet<string>,
  limits: BlocksStateSanitizeLimits,
): boolean {
  const stack: Array<{ block: unknown; depth: number }> = blocks.map((block) => ({
    block,
    depth: 0,
  }))
  const seen = new WeakSet<object>()
  let blockCount = 0

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { block, depth } = current
    // Profundidade de ANINHAMENTO (não a contagem total): comparar com `maxDepth`,
    // não com `maxBlocks`. Como `depth <= blockCount` e `blockCount` já é limitado
    // por `maxBlocks`, comparar com `maxBlocks` deixava este guard MORTO — uma
    // pilha de blocos fundo passava na sanitização e só estourava (GeneratorDepthError)
    // na geração. `maxDepth` (MAX_BLOCKSTATE_BLOCKS*4+16) é o bound de profundidade.
    if (depth > limits.maxDepth) return false
    if (!block || typeof block !== 'object' || Array.isArray(block) || !isPlainRecord(block)) {
      return false
    }
    if (seen.has(block)) return false
    seen.add(block)

    blockCount += 1
    if (blockCount > limits.maxBlocks) return false

    if (!isSupportedBlocklyBlockShape(block, allowedTypes)) return false

    const inputs = block.inputs
    if (inputs && typeof inputs === 'object' && !Array.isArray(inputs) && isPlainRecord(inputs)) {
      for (const wrapper of Object.values(inputs)) {
        const children = getSerializedBlockWrapperChildren(wrapper)
        if (!children) return false
        for (const child of children) stack.push({ block: child, depth: depth + 1 })
      }
    }

    const nextChildren = block.next != null ? getSerializedBlockWrapperChildren(block.next) : null
    if (block.next != null && !nextChildren) return false
    if (nextChildren) {
      for (const child of nextChildren) stack.push({ block: child, depth: depth + 1 })
    }
  }

  return true
}

function isSupportedBlocklyBlockShape(
  block: Record<string, unknown>,
  allowedTypes: ReadonlySet<string>,
): boolean {
  // `disabled` é da era Blockly 11 (mantido por compatibilidade com saves
  // anteriores ao upgrade). Blockly 12 emite `enabled` / `disabledReasons` para
  // o mesmo estado e `icons` quando algum ícone do bloco implementa
  // `ISerializable` (ex.: comentário do aluno). Não estar na lista fazia o load
  // inteiro ser descartado e o layout cair para os defaults — ver
  // sanitizeStoredBlocksState para o aviso correlato.
  const allowedKeys = new Set([
    'collapsed',
    'data',
    'deletable',
    'disabled',
    'disabledReasons',
    'editable',
    'enabled',
    'extraState',
    'fields',
    'icons',
    'id',
    'inline',
    'inputs',
    'movable',
    'next',
    'type',
    'x',
    'y',
  ])
  if (Object.keys(block).some((key) => !allowedKeys.has(key))) return false
  if (typeof block.type !== 'string' || !allowedTypes.has(block.type)) return false
  if (!isSupportedBlocklyBlockExtraState(block.type, block.extraState)) return false
  if (block.id != null && (typeof block.id !== 'string' || block.id.length > 256)) return false
  if (!isOptionalCoordinate(block.x) || !isOptionalCoordinate(block.y)) return false
  if (
    !isOptionalBoolean(block.collapsed) ||
    !isOptionalBoolean(block.deletable) ||
    !isOptionalBoolean(block.disabled) ||
    !isOptionalBoolean(block.editable) ||
    !isOptionalBoolean(block.enabled) ||
    !isOptionalBoolean(block.inline) ||
    !isOptionalBoolean(block.movable)
  ) {
    return false
  }
  if (!isSupportedDisabledReasons(block.disabledReasons)) return false
  if (!isSupportedBlocklyIcons(block.icons)) return false
  if (
    block.data != null &&
    (typeof block.data !== 'string' || block.data.length > MAX_BLOCKSTATE_FIELD_CHARS)
  ) {
    return false
  }
  return isSupportedBlocklyFields(block.fields) && isSupportedBlocklyInputs(block.inputs)
}

function isSupportedBlocklyFields(raw: unknown): boolean {
  if (raw == null) return true
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return false
  const entries = Object.entries(raw)
  if (entries.length > MAX_JSON_OBJECT_KEYS) return false
  for (const [key, value] of entries) {
    if (!/^[A-Z0-9_]+$/.test(key)) return false
    if (typeof value === 'string') {
      if (value.length > MAX_BLOCKSTATE_FIELD_CHARS) return false
      continue
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return false
      continue
    }
    if (typeof value !== 'boolean') return false
  }
  return true
}

function isSupportedBlocklyInputs(raw: unknown): boolean {
  if (raw == null) return true
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return false
  const entries = Object.entries(raw)
  if (entries.length > MAX_JSON_OBJECT_KEYS) return false
  for (const [key, value] of entries) {
    if (!/^[A-Z0-9_]+$/.test(key)) return false
    if (!getSerializedBlockWrapperChildren(value)) return false
  }
  return true
}

/**
 * Filhos de um wrapper de input/next na serialização do Blockly. Aceita
 * `{ block }`, `{ shadow }` ou ambos (slot com sombra padrão + bloco real).
 * Devolve a lista de blocos-filho a validar/percorrer, ou `null` se inválido.
 */
function getSerializedBlockWrapperChildren(raw: unknown): unknown[] | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) {
    return null
  }
  const keys = Object.keys(raw)
  if (keys.length === 0 || keys.some((key) => key !== 'block' && key !== 'shadow')) return null
  const children: unknown[] = []
  if ('block' in raw) children.push(raw.block)
  if ('shadow' in raw) children.push(raw.shadow)
  return children
}

function isSupportedBlocklyBlockExtraState(blockType: string, raw: unknown): boolean {
  if (raw == null) return true

  switch (blockType) {
    // Blocos com mutator de itens variádicos (`{ items: N }`): toda chamada
    // variádica, literal de array/objeto, join, concat — todos os tipos que
    // `workspaceState.ts` grava `extraState = { items: … }`.
    case 'sz_val_array':
    case 'sz_val_join':
    case 'sz_val_concat_arrays':
    case 'sz_val_object':
    case 'sz_val_call_function':
    case 'sz_val_call_method':
    case 'sz_val_method_on':
    case 'sz_val_new':
    case 'sz_js_new_var':
    case 'sz_js_call_function':
    case 'sz_js_call_method':
    case 'sz_js_method_on':
    case 'sz_js_super_ctor':
    case 'sz_js_super_method':
    // Canvas 3D — `new THREE.X(args)` nas duas formas (statement e valor). Usam
    // o mesmo `sz_args_mutator` (`{ items: N }`); sem estes casos o sanitizer
    // tudo-ou-nada derrubava a partição inteira quando o projeto tinha um `new
    // THREE.…` (o layout dos blocos caía para os defaults). Pego no QA em browser.
    case 'sz_t3d_new_var':
    case 'sz_t3d_new':
      return isSupportedItemsExtraState(raw)
    // Blocos com mutator de parâmetros (`{ params: [...] }`): construtor de
    // classe, método de classe e declaração de função (esta última estava
    // faltando — o sintoma era o sanitizer derrubar todo o blocksState quando
    // o aluno tinha `function …` no projeto, e o layout caía para os defaults).
    case 'sz_js_constructor':
    case 'sz_js_class_method':
    case 'sz_js_function':
    case 'sz_js_function_async':
    case 'sz_js_class_method_async':
      return isSupportedParamsExtraState(raw)
    case 'sz_js_class':
      return isSupportedExtendsExtraState(raw)
    case 'sz_js_if_else':
      return isSupportedIfElseExtraState(raw)
    case 'sz_canvas_anim_loop':
      return isSupportedHandleExtraState(raw)
    case 'sz_gk_define_campaign_stage':
      return isCampaignStageExtraState(raw)
    default:
      return false
  }
}

function objectHasOnlyKeys(raw: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys)
  return Object.keys(raw).every((key) => allowed.has(key))
}

function isPlainUnknownRecord(raw: unknown): raw is Record<string, unknown> {
  return raw != null && typeof raw === 'object' && !Array.isArray(raw) && isPlainRecord(raw)
}

function isSupportedItemsExtraState(raw: unknown): boolean {
  if (!isPlainUnknownRecord(raw)) return false
  if (!objectHasOnlyKeys(raw, ['items'])) return false
  return (
    typeof raw.items === 'number' &&
    Number.isInteger(raw.items) &&
    raw.items >= 0 &&
    raw.items <= MAX_MUTATOR_ITEMS
  )
}

/**
 * `sz_js_if_else` (mutator do "Se/senão"): `{ elseIf?: N, hasElse?: true }` —
 * a forma exata que `workspaceState.ts` emite p/ cadeias senão-se/senão. ⚠️ Sem
 * este caso, TODO projeto com "senão" caía no default `false` do switch e o
 * tudo-ou-nada descartava a partição INTEIRA ao reabrir — o modo Blocos abria
 * vazio até a Ponte reconstruir do código (era A causa de dados do "jogo reabre
 * sem blocos": jogo quase sempre tem se/senão).
 */
function isSupportedIfElseExtraState(raw: unknown): boolean {
  if (!isPlainUnknownRecord(raw)) return false
  if (!objectHasOnlyKeys(raw, ['elseIf', 'hasElse'])) return false
  if (raw.elseIf != null) {
    if (
      typeof raw.elseIf !== 'number' ||
      !Number.isInteger(raw.elseIf) ||
      raw.elseIf < 0 ||
      raw.elseIf > MAX_MUTATOR_ITEMS
    ) {
      return false
    }
  }
  return raw.hasElse == null || typeof raw.hasElse === 'boolean'
}

function isSupportedParamsExtraState(raw: unknown): boolean {
  if (!isPlainUnknownRecord(raw)) return false
  if (!objectHasOnlyKeys(raw, ['params'])) return false
  if (!Array.isArray(raw.params) || raw.params.length > MAX_MUTATOR_PARAMS) return false
  return raw.params.every((param) => {
    if (!isPlainUnknownRecord(param)) return false
    if (!objectHasOnlyKeys(param, ['name', 'id'])) return false
    return (
      typeof param.name === 'string' &&
      param.name.length <= MAX_MUTATOR_NAME_CHARS &&
      typeof param.id === 'string' &&
      param.id.length <= MAX_MUTATOR_NAME_CHARS
    )
  })
}

function isSupportedExtendsExtraState(raw: unknown): boolean {
  if (!isPlainUnknownRecord(raw)) return false
  if (!objectHasOnlyKeys(raw, ['extends'])) return false
  return typeof raw.extends === 'string' && raw.extends.length <= MAX_MUTATOR_NAME_CHARS
}

/**
 * `sz_canvas_anim_loop` opcionalmente guarda o id retornado por
 * `requestAnimationFrame` numa variável — `workspaceState.ts:765` grava
 * `extraState = { handle: 'nomeVar' }`. Forma fixa, validada aqui.
 */
function isSupportedHandleExtraState(raw: unknown): boolean {
  if (!isPlainUnknownRecord(raw)) return false
  if (!objectHasOnlyKeys(raw, ['handle', 'timeVar', 'deltaVar'])) return false
  const values = [raw.handle, raw.timeVar, raw.deltaVar]
  if (values.every((value) => value == null)) return false
  return values.every(
    (value) =>
      value == null ||
      (typeof value === 'string' && value.length > 0 && value.length <= MAX_MUTATOR_NAME_CHARS),
  )
}

function isOptionalCoordinate(raw: unknown): boolean {
  return (
    raw == null || (typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) <= 1_000_000)
  )
}

function isOptionalBoolean(raw: unknown): boolean {
  return raw == null || typeof raw === 'boolean'
}

/**
 * Valida o campo `disabledReasons` da serialização do Blockly 12. É um array de
 * strings curtas — cada uma identifica um motivo (ex.: `'MANUALLY_DISABLED'`)
 * para um bloco estar desativado. Limites conservadores; só pra defesa.
 */
function isSupportedDisabledReasons(raw: unknown): boolean {
  if (raw == null) return true
  if (!Array.isArray(raw) || raw.length > MAX_DISABLED_REASONS) return false
  return raw.every(
    (reason) => typeof reason === 'string' && reason.length <= MAX_MUTATOR_NAME_CHARS,
  )
}

/**
 * Valida o campo `icons` da serialização do Blockly 12. É um objeto plano cujas
 * chaves identificam o tipo do ícone (ex.: `'comment'`) e cujos valores são
 * estados serializáveis do ícone (forma específica por tipo). Validamos apenas
 * a forma estrutural genérica (objeto plano com limites de tamanho/profundidade)
 * — o Blockly aplica a forma específica no load.
 */
function isSupportedBlocklyIcons(raw: unknown): boolean {
  if (raw == null) return true
  if (!isPlainUnknownRecord(raw)) return false
  return isJsonShapeWithinLimits(raw, {
    maxChars: MAX_BLOCKSTATE_FIELD_CHARS,
    maxContainerNodes: 64,
    maxDepth: 6,
    maxArrayItems: MAX_BLOCKSTATE_BLOCKS,
    maxObjectKeys: MAX_JSON_OBJECT_KEYS,
    maxStringChars: MAX_BLOCKSTATE_FIELD_CHARS,
  })
}

function countIRNodes(input: SZIRInput): number {
  const ir = normalizeSZIR(input)
  return (
    1 +
    ir.html.reduce((total, node) => total + countHTMLNode(node), 0) +
    ir.css.reduce((total, entry) => total + countCSSEntry(entry), 0) +
    [
      ...(ir.behavior.molds ?? []),
      ...ir.behavior.start,
      ...ir.behavior.events,
      ...ir.behavior.loops,
    ].reduce((total, statement) => total + countJSStatement(statement), 0) +
    ir.extensions.length +
    (ir.htmlShell ? 1 : 0)
  )
}

function countHTMLNode(node: HTMLNode): number {
  if (node.type !== 'element') return 1
  return 1 + (node.children ?? []).reduce((total, child) => total + countHTMLNode(child), 0)
}

function countCSSEntry(entry: CSSEntry): number {
  // Recursão para não SUBcontar o teto MAX_IR_NODES: uma media query carrega N
  // regras aninhadas e um @keyframes carrega N passos — contá-los como 1 deixava
  // um IR hostil empilhar milhares de nós dentro de uns poucos containers sem
  // estourar o limite. Mantido em sincronia com MediaQueryCSS/KeyframesCSS (#ir).
  // `CSSRule` não tem campo `type` (só selector/declarations), então o guard
  // `'type' in entry` distingue a regra plana das entradas discriminadas.
  if (!('type' in entry)) return 1
  if (entry.type === 'mediaQuery') {
    return 1 + entry.rules.reduce((total, child) => total + countCSSEntry(child), 0)
  }
  if (entry.type === 'keyframes') {
    return 1 + entry.steps.length
  }
  return 1
}

function countJSStatement(statement: JSStatement): number {
  switch (statement.type) {
    case 'if':
      return (
        1 +
        countJSExpr(statement.cond) +
        statement.then.reduce((total, child) => total + countJSStatement(child), 0) +
        (statement.else ?? []).reduce((total, child) => total + countJSStatement(child), 0)
      )
    case 'repeat':
      return (
        1 +
        countJSExpr(statement.times) +
        statement.body.reduce((total, child) => total + countJSStatement(child), 0)
      )
    case 'while':
    case 'doWhile':
      return (
        1 +
        countJSExpr(statement.cond) +
        statement.body.reduce((total, child) => total + countJSStatement(child), 0)
      )
    case 'forOf':
      return 1 + statement.body.reduce((total, child) => total + countJSStatement(child), 0)
    case 'tryCatch':
      return (
        1 +
        statement.body.reduce((total, child) => total + countJSStatement(child), 0) +
        statement.handler.reduce((total, child) => total + countJSStatement(child), 0) +
        (statement.finalizer ?? []).reduce((total, child) => total + countJSStatement(child), 0)
      )
    case 'fetchJson':
      return (
        1 +
        countJSExpr(statement.url) +
        statement.body.reduce((total, child) => total + countJSStatement(child), 0) +
        (statement.catchBody ?? []).reduce((total, child) => total + countJSStatement(child), 0)
      )
    case 'forRange':
      return (
        1 +
        countJSExpr(statement.from) +
        countJSExpr(statement.to) +
        countJSExpr(statement.step) +
        statement.body.reduce((total, child) => total + countJSStatement(child), 0)
      )
    case 'event':
    case 'animationLoop':
    case 'g2d:onStart':
    case 'g2d:updateEachFrame':
    case 'g2d:onPointer':
    case 'g2d:onKey':
    case 'g2d:onActionPressed':
    case 'g2d:onOverlap':
    case 'g2d:forEachInGroup':
    case 'g2d:pruneOffscreen':
    case 'g2d:onGroupOverlap':
    case 'g2d:onSpriteGroupOverlap':
    case 'g2d:onEnemyDefeated':
    case 'g2d:onEnemyShotHit':
    case 'g2d:defineShape':
    case 'g2d:everyFrames':
    case 'g2d:everySeconds':
    case 'g2d:afterSeconds':
    case 'g3d:animate':
      return 1 + statement.body.reduce((total, child) => total + countJSStatement(child), 0)
    case 'g2d:spawnInGroup':
    case 'g2d:spawnImageInGroup':
    case 'g2d:spawnAsteroid':
      return (
        1 +
        countJSExpr(statement.x) +
        countJSExpr(statement.y) +
        countJSExpr(statement.vx) +
        countJSExpr(statement.vy)
      )
    case 'g2d:drawScore':
    case 'g2d:drawHearts':
      return 1 + countJSExpr(statement.type === 'g2d:drawScore' ? statement.value : statement.count)
    case 'g2d:damageSprite':
      return 1 + countJSValue(statement.amount) + countJSValue(statement.invincibilityFrames)
    case 'g2d:drawSpriteHealth':
      return (
        1 + countJSValue(statement.x) + countJSValue(statement.y) + countJSValue(statement.size)
      )
    case 'g2d:drawBar':
      return 1 + countJSExpr(statement.value) + countJSExpr(statement.max)
    case 'var':
    case 'assign':
      return 1 + countJSExpr(statement.value)
    case 'consoleLog':
      return 1 + countJSExpr(statement.value)
    case 'alert':
      return 1 + countJSExpr(statement.value)
    case 'setText':
      return 1 + countJSExpr(statement.value)
    case 'setProperty':
      return 1 + countJSExpr(statement.value)
    case 'storageSet':
      return 1 + countJSExpr(statement.key) + countJSExpr(statement.value)
    case 'canvasFillStyle':
      return 1 + countJSExpr(statement.color)
    case 'canvasFillRect':
      return (
        1 +
        countJSExpr(statement.x) +
        countJSExpr(statement.y) +
        countJSExpr(statement.w) +
        countJSExpr(statement.h)
      )
    case 'canvasArc':
      return 1 + countJSExpr(statement.x) + countJSExpr(statement.y) + countJSExpr(statement.r)
    case 'canvasFillText':
      return 1 + countJSExpr(statement.text) + countJSExpr(statement.x) + countJSExpr(statement.y)
    case 'canvasDrawImage':
      return (
        1 +
        countJSExpr(statement.x) +
        countJSExpr(statement.y) +
        countJSExpr(statement.w) +
        countJSExpr(statement.h)
      )
    case 'canvasTranslate':
    case 'g2d:setPosition':
      return 1 + countJSExpr(statement.x) + countJSExpr(statement.y)
    case 'g2d:setVelocity':
      return 1 + countJSExpr(statement.vx) + countJSExpr(statement.vy)
    case 'canvasRotate':
      return 1 + countJSExpr(statement.angle)
    case 'canvasScale':
      return 1 + countJSExpr(statement.sx) + countJSExpr(statement.sy)
    case 'canvasGradient':
      return (
        1 +
        countJSExpr(statement.x0) +
        countJSExpr(statement.y0) +
        countJSExpr(statement.x1) +
        countJSExpr(statement.y1) +
        statement.stops.length
      )
    default:
      return 1
  }
}

function countJSValue(value: number | JSExpr): number {
  return typeof value === 'number' ? 1 : countJSExpr(value)
}

function countJSExpr(expr: JSExpr): number {
  if (expr.type === 'binop') return 1 + countJSExpr(expr.left) + countJSExpr(expr.right)
  if (expr.type === 'call') {
    return 1 + expr.args.reduce((total, arg) => total + countJSExpr(arg), 0)
  }
  return 1
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
  const t = options.translator ?? defaultT
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
  return createStore<ProjectStore>((set, get) => ({
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
      set((s) => ({ bridgeBlocksSyncedEpoch: Math.max(s.bridgeBlocksSyncedEpoch, epoch) })),
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
    importProjectFromJSON: async (raw) => {
      if (!raw || typeof raw !== 'object') {
        throw new Error('Arquivo inválido: não é um objeto JSON.')
      }
      const r = raw as Record<string, unknown>
      if (typeof r.name !== 'string' || !isProjectFiles(r.files)) {
        throw new Error('Arquivo inválido: faltam campos obrigatórios (name, files).')
      }
      // Limites de tamanho — evita travar a IDE com arquivos enormes.
      const files = sanitizeCanonicalProjectFiles(r.files)
      if (!files) {
        throw new Error('Arquivo inválido: conteúdo excede o tamanho máximo permitido.')
      }

      // IR: só aceita se passar pelo schema e pelos limites de tamanho/complexidade.
      const ir = sanitizeImportedIR(r.ir)

      const installedExtensions = sanitizeImportedExtensions(r.installedExtensions)
      if (!importedIRMatchesInstalledExtensions(ir, installedExtensions)) {
        throw new Error(
          'Arquivo inválido: a IR usa extensões ausentes, duplicadas ou incompatíveis.',
        )
      }
      const blocksState = sanitizeImportedBlocksState(r.blocksState, installedExtensions)

      // Modo profissional: reconstrói kind/tree/proMeta com os MESMOS sanitizers
      // do load (sanitizeProTree/sanitizeProMeta). Sem isso, exportar→importar um
      // projeto pro dropava esses campos e o projeto voltava como classic vazio.
      // Qualquer falha de sanitização rebaixa para classic (igual a
      // sanitizeStoredProject). `node_modules` nunca passa (barrado em proTree).
      let tree: ProjectTree | undefined
      let proMeta: ProProjectMeta | undefined
      if (r.kind === 'pro') {
        const sanitizedTree = sanitizeProTree(r.tree)
        const sanitizedMeta = sanitizeProMeta(r.proMeta)
        if (sanitizedTree && sanitizedMeta) {
          tree = sanitizedTree
          proMeta = sanitizedMeta
        }
      }
      const isPro = tree != null && proMeta != null

      const now = Date.now()
      const base = createEmptyProject(ulid(), sanitizeProjectName(r.name))
      const mode: IDEMode = isPro ? 'code' : normalizeClassicMode(r.mode)
      const extraFiles = limitCombinedExtraFiles(files, sanitizeImportedExtraFiles(r.extraFiles))
      const assets = sanitizeProjectAssets(r.assets)
      const imported = migrateLegacyBlockProjectSnapshot({
        ...base,
        files,
        // Espelha o teto COMBINADO do load (canônicos + extras ≤ MAX_TOTAL_CHARS):
        // sem isso a soma podia passar de 8 MB e o primeiro reopen derrubaria
        // extras em silêncio, divergindo o registro no disco do que foi aberto.
        extraFiles,
        assets,
        mode,
        ir: ir ?? base.ir,
        blocksState,
        installedExtensions,
        createdAt: now,
        updatedAt: now,
        // Pro vive sempre no modo 'code' (mode já é 'code' acima).
        ...(isPro ? { kind: 'pro' as const, tree, proMeta } : {}),
      })
      await persistProject(imported)

      // Avisos não-fatais: o projeto FOI importado, mas alguns sanitizers cortaram
      // partes em silêncio (cota/permissão/bloco desconhecido). Comparamos a entrada
      // crua com o resultado e devolvemos a lista p/ a UI mostrar (em vez de sumir
      // calado). Os estouros que LANÇAM acima (arquivos/IR/shape de blocos) já viram
      // erro fatal e nem chegam aqui.
      const warnings: string[] = []
      const inLen = (v: unknown) => (Array.isArray(v) ? v.length : 0)
      const droppedAssets = inLen(r.assets) - assets.length
      if (droppedAssets > 0)
        warnings.push(t('projects.importWarn.assets', { count: droppedAssets }))
      const droppedExtras = inLen(r.extraFiles) - extraFiles.length
      if (droppedExtras > 0)
        warnings.push(t('projects.importWarn.extraFiles', { count: droppedExtras }))
      const droppedExt = inLen(r.installedExtensions) - installedExtensions.length
      if (droppedExt > 0) warnings.push(t('projects.importWarn.extensions', { count: droppedExt }))
      if (r.blocksState != null && blocksState == null) {
        // Quando a queda foi por TIPO desconhecido, nomeie os culpados — é o
        // caso comum (arquivo de uma versão mais nova / extensão diferente) e
        // "blocos sumiram" sem pista era o pior aviso possível.
        const unknownTypes = collectUnknownBlockTypes(r.blocksState, installedExtensions)
        if (unknownTypes.length > 0) {
          warnings.push(t('projects.importWarn.unknownBlocks', { types: unknownTypes.join(', ') }))
        } else {
          const reason = describeBlocklyValidationFailure(r.blocksState, installedExtensions)
          warnings.push(t('projects.importWarn.blocks', { reason: reason ?? '—' }))
        }
      } else if (r.ir != null && ir == null && blocksState == null) {
        warnings.push(t('projects.importWarn.program'))
      }
      if (r.kind === 'pro' && !isPro) warnings.push(t('projects.importWarn.proDowngrade'))

      return { project: imported, warnings }
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
        project: bump({ ...p, files: nextFiles }),
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
        project: bump({ ...p, files: nextFiles }),
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
      set({ project: bump({ ...p, blocksState: state }), isDirty: true, saveError: null })
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
      if (target.kind !== 'image') return 'Esse arquivo não é uma imagem.'
      // Mesmos bytes = nada a fazer. Sem esta guarda, um chamador distraído
      // marcaria o projeto como sujo e dispararia autosave à toa.
      if (target.dataUrl === image.dataUrl) return null
      if (!isValidAssetDataUrl(image.dataUrl)) return 'Imagem inválida ou grande demais.'
      // Orçamento do projeto contando o asset NOVO no lugar do velho (o
      // `addAsset` só checa o teto na entrada; um desenho reeditado pode ter
      // ficado bem maior).
      const othersChars = p.assets.reduce(
        (sum, a) => (a.id === id ? sum : sum + a.dataUrl.length),
        0,
      )
      if (othersChars + image.dataUrl.length > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) {
        return `O desenho "${target.name}" cresceu e não cabe mais neste jogo.`
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
