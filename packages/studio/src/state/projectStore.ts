import { ulid } from 'ulid'
import { create } from 'zustand'
import {
  createEmptyProject,
  type ExtraFile,
  type ExtraFileLanguage,
  type FileName,
  IDE_MODES,
  type IDEMode,
  type InstalledExtension,
  inferExtraLanguage,
  isReservedProjectFileName,
  normalizeExtraFileName,
  type Project,
  type ProjectFiles,
} from '#core'
import {
  type CSSEntry,
  type HTMLNode,
  type JSExpr,
  type JSStatement,
  type SZIR,
  SZIRSchema,
} from '#ir'
import {
  deleteProject as deleteProjectFromDB,
  loadProjectById,
  persistProject,
} from './persistence'

interface ProjectStore {
  project: Project | null
  isDirty: boolean
  saveError: string | null
  loadProject: (id: string) => Promise<Project | null>
  /** Hidrata um projeto já sanitizado (host/<Studio>) SEM marcar como sujo. */
  hydrateProject: (p: Project) => void
  unloadProject: () => void
  createProject: (name: string) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  importProjectFromJSON: (raw: unknown) => Promise<Project>
  setProject: (p: Project) => void
  setMode: (mode: IDEMode) => void
  setFiles: (files: Partial<ProjectFiles>) => void
  setFile: (name: FileName, value: string) => void
  setIR: (ir: SZIR | null) => void
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
}

interface ProjectStatePatch {
  files?: Partial<ProjectFiles>
  ir?: SZIR | null
  blocksState?: unknown | null
  installedExtensions?: InstalledExtension[]
}

function bump<T extends Project>(p: T): T {
  return { ...p, updatedAt: Date.now() }
}

// Limites de import para evitar DoS (arquivos gigantes) e corrupção de state.
export const MAX_PROJECT_IMPORT_CHARS = 12_000_000
const MAX_PROJECT_NAME_CHARS = 200
const MAX_FILE_CHARS = 2_000_000 // ~2 MB por arquivo de texto
const MAX_TOTAL_CHARS = 8_000_000 // soma de todos os arquivos
const MAX_EXTRA_FILES = 200
const MAX_BLOCKSTATE_CHARS = 4_000_000
const MAX_BLOCKSTATE_BLOCKS = 5_000
const MAX_BLOCKSTATE_CONTAINER_NODES = 25_000
const MAX_BLOCKSTATE_FIELD_CHARS = MAX_FILE_CHARS
const MAX_MUTATOR_ITEMS = 32
const MAX_MUTATOR_PARAMS = 32
const MAX_MUTATOR_NAME_CHARS = 80
// Blockly 12 substituiu `disabled: boolean` por `disabledReasons: string[]`. Cada
// razão é uma string curta; o limite generoso aqui é só pra defesa anti-DoS.
const MAX_DISABLED_REASONS = 16
const MAX_INSTALLED_EXTENSIONS = 100
const MAX_IR_CHARS = 4_000_000
const MAX_IR_NODES = 20_000
const MAX_JSON_IMPORT_DEPTH = 80
const MAX_JSON_ARRAY_ITEMS = 25_000
const MAX_JSON_OBJECT_KEYS = 250

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
  'sz_adv_raw_css',
  'sz_adv_raw_html',
  'sz_adv_raw_js',
  'sz_canvas_anim_loop',
  'sz_canvas_arc',
  'sz_canvas_cancel_anim',
  'sz_canvas_clear',
  'sz_canvas_draw_image',
  'sz_canvas_fill_rect',
  'sz_canvas_fill_style',
  'sz_canvas_fill_text',
  'sz_canvas_gradient',
  'sz_canvas_keyboard',
  'sz_canvas_restore',
  'sz_canvas_rotate',
  'sz_canvas_save',
  'sz_canvas_scale',
  'sz_canvas_set_size',
  'sz_canvas_setup',
  'sz_canvas_translate',
  'sz_css_align',
  'sz_css_background_color',
  'sz_css_body_background',
  'sz_css_body_center',
  'sz_css_body_text_color',
  'sz_css_border',
  'sz_css_border_radius',
  'sz_css_decl',
  'sz_css_display_flex',
  'sz_css_font_size',
  'sz_css_font_weight',
  'sz_css_gap',
  'sz_css_gradient',
  'sz_css_height',
  'sz_css_justify',
  'sz_css_letter_spacing',
  'sz_css_margin',
  'sz_css_max_width',
  'sz_css_media_query',
  'sz_css_padding',
  'sz_css_rule',
  'sz_css_shadow',
  'sz_css_text_align',
  'sz_css_text_color',
  'sz_css_text_decoration',
  'sz_css_text_transform',
  'sz_css_width',
  'sz_css_width_percent',
  'sz_html_button',
  'sz_html_canvas',
  'sz_html_div',
  'sz_html_em',
  'sz_html_footer',
  'sz_html_form',
  'sz_html_h1',
  'sz_html_h2',
  'sz_html_h3',
  'sz_html_header',
  'sz_html_image',
  'sz_html_input',
  'sz_html_label',
  'sz_html_li',
  'sz_html_link',
  'sz_html_main',
  'sz_html_nav',
  'sz_html_p',
  'sz_html_section',
  'sz_html_span',
  'sz_html_strong',
  'sz_html_text',
  'sz_html_textarea',
  'sz_html_ul',
  'sz_js_alert_text',
  'sz_js_alert_var',
  'sz_js_class_op',
  'sz_js_console_log_text',
  'sz_js_console_log_var',
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
  'sz_js_query_selector',
  'sz_js_repeat',
  'sz_js_for_each',
  'sz_js_set_timeout',
  'sz_js_set_interval',
  'sz_js_create_element',
  'sz_js_append_child',
  'sz_js_set_dataset',
  'sz_js_set_property',
  'sz_js_set_property_calc',
  'sz_js_set_property_text',
  'sz_js_set_property_var',
  'sz_js_set_text',
  'sz_js_call_method',
  'sz_js_call_function',
  'sz_js_function',
  'sz_js_class',
  'sz_js_class_method',
  'sz_js_constructor',
  'sz_js_return',
  'sz_js_return_void',
  'sz_js_set_this_prop',
  'sz_js_set_prop',
  'sz_js_member_set',
  'sz_js_method_on',
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
  'sz_val_array_length',
  'sz_val_canvas_height',
  'sz_val_canvas_width',
  'sz_val_class_contains',
  'sz_val_compare',
  'sz_val_distance',
  'sz_val_ternary',
  'sz_val_concat_arrays',
  'sz_val_dataset',
  'sz_val_join',
  'sz_val_logic',
  'sz_val_shuffle',
  'sz_val_this',
  'sz_val_color',
  'sz_val_color_alpha',
  'sz_val_color_hsl',
  'sz_val_event_pos',
  'sz_val_math_pi',
  'sz_val_number',
  'sz_val_random',
  'sz_val_random_float',
  'sz_val_text',
  'sz_val_this_prop',
  'sz_val_get_prop',
  'sz_val_call_method',
  'sz_val_object',
  'sz_val_member_get',
  'sz_val_method_on',
  'sz_val_arg',
  'sz_val_bool',
  'sz_val_call_function',
  'sz_val_variable',
  'sz_val_vector2d',
  'sz_val_vector3d',
  'sz_val_window_height',
  'sz_val_window_width',
])

const EXTENSION_BLOCKLY_BLOCK_TYPES: Record<string, ReadonlySet<string>> = {
  'game-2d': new Set([
    'sz_g2d_collides',
    'sz_g2d_create_sprite',
    'sz_g2d_draw_sprite',
    'sz_g2d_game_over',
    'sz_g2d_move_by_keys',
    'sz_g2d_score',
    'sz_g2d_set_position',
    'sz_g2d_set_velocity',
    'sz_g2d_update_each_frame',
  ]),
}

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

function projectFilesLimitError(files: ProjectFiles, extraFiles: ExtraFile[]): string | null {
  const allFiles: Array<[string, string]> = [
    ['index.html', files['index.html']],
    ['style.css', files['style.css']],
    ['script.js', files['script.js']],
    ...extraFiles.map((file): [string, string] => [file.name, file.content]),
  ]

  if (extraFiles.length > MAX_EXTRA_FILES) {
    return `Limite de ${MAX_EXTRA_FILES} arquivos extras excedido.`
  }

  let total = 0
  for (const [name, content] of allFiles) {
    if (content.length > MAX_FILE_CHARS) {
      return `O arquivo ${name} excede o limite de ${MAX_FILE_CHARS.toLocaleString('pt-BR')} caracteres.`
    }
    total += content.length
  }

  if (total > MAX_TOTAL_CHARS) {
    return `O projeto excede o limite total de ${MAX_TOTAL_CHARS.toLocaleString('pt-BR')} caracteres.`
  }

  return null
}

/** Valida `installedExtensions` vindos de um JSON não confiável. */
function sanitizeImportedExtensions(raw: unknown): InstalledExtension[] {
  if (!Array.isArray(raw)) return []
  const out: InstalledExtension[] = []
  for (const item of raw) {
    if (out.length >= MAX_INSTALLED_EXTENSIONS) break
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    if (typeof e.id !== 'string' || typeof e.version !== 'string') continue
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
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }]
  const seen = new WeakSet<object>()
  let chars = 0
  let containerNodes = 0

  const addChars = (amount: number): boolean => {
    chars += amount
    return chars <= limits.maxChars
  }

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { value: item, depth } = current
    if (depth > limits.maxDepth) return false

    if (item == null) continue

    if (typeof item === 'string') {
      if (limits.maxStringChars != null && item.length > limits.maxStringChars) return false
      if (!addChars(item.length)) return false
      continue
    }

    if (typeof item === 'number') {
      if (!Number.isFinite(item)) return false
      if (!addChars(String(item).length)) return false
      continue
    }

    if (typeof item === 'boolean') {
      if (!addChars(item ? 4 : 5)) return false
      continue
    }

    if (typeof item !== 'object') return false
    if (seen.has(item)) return false
    seen.add(item)

    containerNodes += 1
    if (containerNodes > limits.maxContainerNodes) return false

    if (Array.isArray(item)) {
      if (item.length > limits.maxArrayItems) return false
      for (let index = item.length - 1; index >= 0; index -= 1) {
        stack.push({ value: item[index], depth: depth + 1 })
      }
      continue
    }

    if (!isPlainRecord(item)) return false

    const entries = Object.entries(item)
    if (entries.length > limits.maxObjectKeys) return false
    for (const [key, child] of entries) {
      if (!addChars(key.length)) return false
      stack.push({ value: child, depth: depth + 1 })
    }
  }

  return true
}

function sanitizeImportedIR(raw: unknown): SZIR | null {
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
  const parsed = SZIRSchema.safeParse(raw)
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
  if (raw == null) return null
  const isSmallEnough = isJsonShapeWithinLimits(raw, {
    maxChars: MAX_BLOCKSTATE_CHARS,
    maxContainerNodes: MAX_BLOCKSTATE_CONTAINER_NODES,
    maxDepth: MAX_JSON_IMPORT_DEPTH,
    maxArrayItems: MAX_BLOCKSTATE_BLOCKS,
    maxObjectKeys: MAX_JSON_OBJECT_KEYS,
    maxStringChars: MAX_BLOCKSTATE_FIELD_CHARS,
  })
  if (!isSmallEnough) {
    throw new Error(
      'Arquivo inválido: blocksState excede o tamanho ou a complexidade máxima permitida.',
    )
  }

  const allowedTypes = getAllowedBlocklyBlockTypes(installedExtensions)
  return isSupportedBlocklyWorkspaceState(raw, allowedTypes) ? raw : null
}

function sanitizeStoredIR(raw: unknown): SZIR | null {
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
  const extraRoot = rootKeys.find((k) => k !== 'blocks' && k !== 'variables')
  if (extraRoot) return `chave de raiz inesperada: "${extraRoot}"`

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
  if (!isSupportedBlocklyVariables((raw as { variables?: unknown }).variables)) {
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

function sanitizeStoredBlocksState(
  raw: unknown,
  installedExtensions: InstalledExtension[],
): Project['blocksState'] {
  try {
    const out = sanitizeImportedBlocksState(raw, installedExtensions)
    if (raw != null && out == null) {
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
    console.warn('[sz] blocksState rejeitado pelo sanitizer (exception):', err)
    return null
  }
}

function sanitizeStoredProject(raw: unknown, requestedId?: string): Project | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) {
    return null
  }
  const r = raw as Record<string, unknown>
  const id = requestedId ?? (typeof r.id === 'string' && r.id.trim() ? r.id : null)
  if (!id) return null

  const files = sanitizeCanonicalProjectFiles(r.files)
  if (!files) return null

  const name = sanitizeProjectName(r.name)
  const base = createEmptyProject(id, name)
  const installedExtensions = sanitizeImportedExtensions(r.installedExtensions)
  const createdAt = sanitizeTimestamp(r.createdAt, base.createdAt)
  const updatedAt = sanitizeTimestamp(r.updatedAt, createdAt)

  return {
    ...base,
    id,
    name,
    files,
    extraFiles: sanitizeImportedExtraFiles(r.extraFiles),
    mode: IDE_MODES.includes(r.mode as IDEMode) ? (r.mode as IDEMode) : base.mode,
    ir: sanitizeStoredIR(r.ir),
    blocksState: sanitizeStoredBlocksState(r.blocksState, installedExtensions),
    installedExtensions,
    createdAt,
    updatedAt,
  }
}

export async function loadSanitizedProjectById(id: string): Promise<Project | null> {
  return sanitizeStoredProject(await loadProjectById(id), id)
}

/**
 * Sanitiza um Project vindo do HOST (prop `initialProject` do <Studio>) com as
 * mesmas regras aplicadas a projetos persistidos — protege contra JSON
 * malformado/hostil passado pelo app que embarca o editor.
 */
export function sanitizeProjectForHost(raw: unknown): Project | null {
  return sanitizeStoredProject(raw)
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

function isSupportedBlocklyWorkspaceState(
  raw: unknown,
  allowedTypes: ReadonlySet<string>,
): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !isPlainRecord(raw)) return false
  const rootKeys = Object.keys(raw)
  if (rootKeys.some((key) => key !== 'blocks' && key !== 'variables')) return false

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
  if (blocksSection.blocks.length > MAX_BLOCKSTATE_BLOCKS) return false
  if (Object.keys(blocksSection).some((key) => key !== 'languageVersion' && key !== 'blocks')) {
    return false
  }
  if (!isSupportedBlocklyVariables(raw.variables)) return false

  return areSupportedBlocklyBlocks(blocksSection.blocks, allowedTypes)
}

function isSupportedBlocklyVariables(raw: unknown): boolean {
  if (raw == null) return true
  if (!Array.isArray(raw) || raw.length > MAX_BLOCKSTATE_BLOCKS) return false
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

function areSupportedBlocklyBlocks(blocks: unknown[], allowedTypes: ReadonlySet<string>): boolean {
  const stack: Array<{ block: unknown; depth: number }> = blocks.map((block) => ({
    block,
    depth: 0,
  }))
  let blockCount = 0

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { block, depth } = current
    if (depth > MAX_JSON_IMPORT_DEPTH) return false
    if (!block || typeof block !== 'object' || Array.isArray(block) || !isPlainRecord(block)) {
      return false
    }

    blockCount += 1
    if (blockCount > MAX_BLOCKSTATE_BLOCKS) return false

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
    case 'sz_js_new_var':
    case 'sz_js_call_function':
    case 'sz_js_call_method':
    case 'sz_js_method_on':
      return isSupportedItemsExtraState(raw)
    // Blocos com mutator de parâmetros (`{ params: [...] }`): construtor de
    // classe, método de classe e declaração de função (esta última estava
    // faltando — o sintoma era o sanitizer derrubar todo o blocksState quando
    // o aluno tinha `function …` no projeto, e o layout caía para os defaults).
    case 'sz_js_constructor':
    case 'sz_js_class_method':
    case 'sz_js_function':
      return isSupportedParamsExtraState(raw)
    case 'sz_js_class':
      return isSupportedExtendsExtraState(raw)
    case 'sz_canvas_anim_loop':
      return isSupportedHandleExtraState(raw)
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
  if (!objectHasOnlyKeys(raw, ['handle'])) return false
  return typeof raw.handle === 'string' && raw.handle.length <= MAX_MUTATOR_NAME_CHARS
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

function countIRNodes(ir: SZIR): number {
  return (
    1 +
    ir.html.reduce((total, node) => total + countHTMLNode(node), 0) +
    ir.css.reduce((total, entry) => total + countCSSEntry(entry), 0) +
    ir.js.reduce((total, statement) => total + countJSStatement(statement), 0) +
    ir.extensions.length +
    (ir.htmlShell ? 1 : 0)
  )
}

function countHTMLNode(node: HTMLNode): number {
  if (node.type !== 'element') return 1
  return 1 + (node.children ?? []).reduce((total, child) => total + countHTMLNode(child), 0)
}

function countCSSEntry(_entry: CSSEntry): number {
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
    case 'event':
    case 'animationLoop':
    case 'g2d:updateEachFrame':
      return 1 + statement.body.reduce((total, child) => total + countJSStatement(child), 0)
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

function countJSExpr(expr: JSExpr): number {
  if (expr.type === 'binop') return 1 + countJSExpr(expr.left) + countJSExpr(expr.right)
  if (expr.type === 'call') {
    return 1 + expr.args.reduce((total, arg) => total + countJSExpr(arg), 0)
  }
  return 1
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  isDirty: false,
  saveError: null,
  loadProject: async (id) => {
    const existing = await loadSanitizedProjectById(id)
    if (!existing) {
      set({ project: null, isDirty: false, saveError: null })
      return null
    }
    set({ project: existing, isDirty: false, saveError: null })
    return existing
  },
  hydrateProject: (p) => set({ project: p, isDirty: false, saveError: null }),
  unloadProject: () => set({ project: null, isDirty: false, saveError: null }),
  createProject: async (name) => {
    const p = createEmptyProject(ulid(), sanitizeProjectName(name))
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
    const existing = await loadSanitizedProjectById(id)
    if (!existing) return
    const next = { ...existing, name: safeName, updatedAt: Date.now() }
    await persistProject(next)
    if (get().project?.id === id) {
      set({ project: next, isDirty: false, saveError: null })
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
    const blocksState = sanitizeImportedBlocksState(r.blocksState, installedExtensions)

    const now = Date.now()
    const base = createEmptyProject(ulid(), sanitizeProjectName(r.name))
    const mode: IDEMode = IDE_MODES.includes(r.mode as IDEMode) ? (r.mode as IDEMode) : base.mode
    const imported: Project = {
      ...base,
      files,
      extraFiles: sanitizeImportedExtraFiles(r.extraFiles),
      mode,
      ir: ir ?? base.ir,
      blocksState,
      installedExtensions,
      createdAt: now,
      updatedAt: now,
    }
    await persistProject(imported)
    return imported
  },
  setProject: (p) => set({ project: p, isDirty: true, saveError: null }),
  setMode: (mode) => {
    const p = get().project
    if (!p) return
    set({ project: bump({ ...p, mode }), isDirty: true, saveError: null })
  },
  setFiles: (files) => {
    const p = get().project
    if (!p) return
    const nextFiles = { ...p.files, ...files }
    const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [])
    if (limitError) {
      set({ saveError: limitError })
      return
    }
    set({ project: bump({ ...p, files: nextFiles }), isDirty: true, saveError: null })
  },
  setFile: (name, value) => {
    const p = get().project
    if (!p) return
    if (p.files[name] === value) return
    const nextFiles = { ...p.files, [name]: value }
    const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [])
    if (limitError) {
      set({ saveError: limitError })
      return
    }
    set({ project: bump({ ...p, files: nextFiles }), isDirty: true, saveError: null })
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
    const limitError = projectFilesLimitError(nextFiles, p.extraFiles ?? [])
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
    if (!normalized) return 'Use um nome seguro com .html, .css, .js ou .mjs.'
    if (isReservedProjectFileName(normalized))
      return 'Esse nome é reservado para um arquivo canônico.'
    const extra = p.extraFiles ?? []
    if (extra.some((f) => f.name.toLowerCase() === normalized.toLowerCase()))
      return 'Já existe arquivo com esse nome.'
    if (extra.length >= MAX_EXTRA_FILES) return `Limite de ${MAX_EXTRA_FILES} arquivos extras.`
    const language = inferExtraLanguage(normalized)
    if (!language) return 'Extensão não suportada.'
    const newFile: ExtraFile = {
      name: normalized,
      language,
      content: defaultExtraContent(language),
    }
    const nextExtraFiles = [...extra, newFile]
    const limitError = projectFilesLimitError(p.files, nextExtraFiles)
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
    const limitError = projectFilesLimitError(p.files, next)
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
    if (!normalized) return 'Use um nome seguro com .html, .css, .js ou .mjs.'
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
}))

function defaultExtraContent(language: ExtraFileLanguage): string {
  if (language === 'css') return '/* Estilos extras */\n'
  if (language === 'html') return '<!-- HTML extra -->\n'
  return '// JavaScript extra\n'
}
