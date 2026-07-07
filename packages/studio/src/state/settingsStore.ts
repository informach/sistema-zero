import { createStore, get, update } from 'idb-keyval'
import { create } from 'zustand'

export const DEFAULT_AI_MODEL = '~anthropic/claude-sonnet-latest'

export const AI_MODEL_OPTIONS = [
  {
    id: '~anthropic/claude-sonnet-latest',
    label: 'Claude Sonnet latest (Anthropic) — recomendado',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5 (Anthropic) — fixo',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    label: 'Claude Haiku 4.5 (Anthropic) — rápido e barato',
  },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (OpenAI) — barato' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (OpenAI)' },
  { id: 'google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Google)' },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B (Meta, open-source)',
  },
] as const

const AI_MODEL_IDS = new Set<string>(AI_MODEL_OPTIONS.map((option) => option.id))
const LEGACY_AI_MODEL_MIGRATIONS: Record<string, string> = {
  'anthropic/claude-3.5-sonnet': DEFAULT_AI_MODEL,
}

export function normalizeAIModel(model: string | undefined): string {
  const trimmed = model?.trim()
  if (!trimmed) return DEFAULT_AI_MODEL
  return (
    LEGACY_AI_MODEL_MIGRATIONS[trimmed] ?? (AI_MODEL_IDS.has(trimmed) ? trimmed : DEFAULT_AI_MODEL)
  )
}

export type ThemeName = 'dark' | 'light'
export type AIApiKeyStorage = 'persistent' | 'session'
export type ProjectSortOrder = 'recent' | 'name'

export interface PersistedSettings {
  aiApiKey?: string
  aiApiKeyStorage?: AIApiKeyStorage
  aiModel?: string
  theme?: ThemeName
  codeFontSize?: number
  /** Aluno revelou blocos avançados na paleta (divulgação progressiva). */
  revealAdvanced?: boolean
  /** Ordenação da lista de projetos (Recentes | Nome A–Z). */
  projectSort?: ProjectSortOrder
}

const MAX_AI_API_KEY_CHARS = 4096
export const CODE_FONT_SIZE_MIN = 10
export const CODE_FONT_SIZE_MAX = 32
export const CODE_FONT_SIZE_DEFAULT = 13

function sanitizeAIApiKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, MAX_AI_API_KEY_CHARS)
}

function normalizeAIApiKeyStorage(value: unknown, hasPersistedApiKey = false): AIApiKeyStorage {
  if (value === 'persistent' || value === 'session') return value
  return hasPersistedApiKey ? 'persistent' : 'session'
}

function normalizeTheme(value: unknown): ThemeName | undefined {
  return value === 'dark' || value === 'light' ? value : undefined
}

function normalizeProjectSort(value: unknown): ProjectSortOrder | undefined {
  return value === 'recent' || value === 'name' ? value : undefined
}

function clampCodeFontSize(n: number): number {
  if (!Number.isFinite(n)) return CODE_FONT_SIZE_DEFAULT
  return Math.max(CODE_FONT_SIZE_MIN, Math.min(CODE_FONT_SIZE_MAX, Math.round(n)))
}

function sanitizePersistedSettings(value: unknown): PersistedSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  const settings: PersistedSettings = {}
  const aiApiKey = sanitizeAIApiKey(raw.aiApiKey)
  if (aiApiKey !== undefined) settings.aiApiKey = aiApiKey
  settings.aiApiKeyStorage = normalizeAIApiKeyStorage(raw.aiApiKeyStorage, aiApiKey !== undefined)
  if (typeof raw.aiModel === 'string') settings.aiModel = normalizeAIModel(raw.aiModel)
  const theme = normalizeTheme(raw.theme)
  if (theme) settings.theme = theme
  if (typeof raw.codeFontSize === 'number') {
    settings.codeFontSize = clampCodeFontSize(raw.codeFontSize)
  }
  if (typeof raw.revealAdvanced === 'boolean') settings.revealAdvanced = raw.revealAdvanced
  const projectSort = normalizeProjectSort(raw.projectSort)
  if (projectSort) settings.projectSort = projectSort
  return settings
}

const SETTINGS_KEY = 'sz:settings'
let store: ReturnType<typeof createStore> | null = null
let storeInitFailed = false
function getStore(): ReturnType<typeof createStore> | null {
  if (store || storeInitFailed) return store
  // Sem IndexedDB (Firefox em modo privado, contextos restritos, happy-dom) não
  // há o que abrir — e `createStore` pode até LANÇAR. Blindamos igual ao
  // gameStorage.ts: degrada para "sem store" em vez de derrubar o load().
  if (typeof indexedDB === 'undefined') {
    storeInitFailed = true
    return null
  }
  try {
    store = createStore('sistema-zero-studio', 'kv')
  } catch {
    storeInitFailed = true
    store = null
  }
  return store
}

interface SettingsState {
  aiApiKey: string
  aiApiKeyStorage: AIApiKeyStorage
  aiModel: string
  theme: ThemeName
  codeFontSize: number
  revealAdvanced: boolean
  projectSort: ProjectSortOrder
  loaded: boolean
  load: () => Promise<void>
  setAIApiKey: (k: string, options?: { storage?: AIApiKeyStorage }) => Promise<void>
  setAIApiKeyStorage: (storage: AIApiKeyStorage) => Promise<void>
  clearAIApiKey: () => Promise<void>
  setAIModel: (m: string) => Promise<void>
  setTheme: (t: ThemeName) => Promise<void>
  setCodeFontSize: (n: number) => Promise<void>
  increaseCodeFontSize: () => Promise<void>
  decreaseCodeFontSize: () => Promise<void>
  resetCodeFontSize: () => Promise<void>
  setRevealAdvanced: (v: boolean) => Promise<void>
  setProjectSort: (v: ProjectSortOrder) => Promise<void>
}

async function readPersisted(): Promise<PersistedSettings> {
  const kv = getStore()
  if (!kv) return {}
  return sanitizePersistedSettings(await get<unknown>(SETTINGS_KEY, kv))
}

// load() é singleton: a 1ª carga hidrata a store a partir do IndexedDB, mas a
// chave de sessão (modo 'session') vive SÓ em memória — re-rodar o setState
// destrutivo numa 2ª montagem de <Studio>/<ProjectList> apagaria a chave e
// rebaixaria o provider para mock. Por isso load() retorna cedo se já carregou
// e coalesce primeiras cargas concorrentes numa única promise em voo (duas
// montagens simultâneas não disparam dois setState).
let loadInFlight: Promise<void> | null = null

// O read-modify-write roda DENTRO de uma única transação do IndexedDB via
// idb-keyval update(): setters concorrentes são enfileirados e não se perdem
// (o get+set separado deixava cada um ler o mesmo estado antigo e o último
// gravava por cima, descartando o patch do outro — visível após reload).
async function writeMerge(patch: Partial<PersistedSettings>): Promise<void> {
  const kv = getStore()
  // Sem IndexedDB: a store viva continua mutando (preferência em memória), mas
  // não há onde persistir — no-op silencioso em vez de lançar.
  if (!kv) return
  await update<unknown>(
    SETTINGS_KEY,
    (current) => {
      const next: PersistedSettings = { ...sanitizePersistedSettings(current), ...patch }
      for (const key of Object.keys(next) as Array<keyof PersistedSettings>) {
        if (next[key] === undefined) delete next[key]
      }
      return next
    },
    kv,
  )
}

export const useSettingsStore = create<SettingsState>((setState, getState) => ({
  aiApiKey: '',
  aiApiKeyStorage: 'session',
  aiModel: DEFAULT_AI_MODEL,
  theme: 'light',
  codeFontSize: CODE_FONT_SIZE_DEFAULT,
  revealAdvanced: false,
  projectSort: 'recent',
  loaded: false,
  load: async () => {
    if (getState().loaded) return
    if (loadInFlight) return loadInFlight
    loadInFlight = (async () => {
      try {
        const persisted = await readPersisted()
        const aiModel = normalizeAIModel(persisted.aiModel)
        const aiApiKeyStorage = normalizeAIApiKeyStorage(persisted.aiApiKeyStorage)
        setState({
          aiApiKey: aiApiKeyStorage === 'persistent' ? (persisted.aiApiKey ?? '') : '',
          aiApiKeyStorage,
          aiModel,
          theme: persisted.theme ?? 'light',
          codeFontSize: clampCodeFontSize(persisted.codeFontSize ?? CODE_FONT_SIZE_DEFAULT),
          revealAdvanced: persisted.revealAdvanced ?? false,
          projectSort: persisted.projectSort ?? 'recent',
          loaded: true,
        })
        if (aiApiKeyStorage === 'session' && persisted.aiApiKey) {
          await writeMerge({ aiApiKey: undefined, aiApiKeyStorage })
        }
        if (persisted.aiModel && persisted.aiModel !== aiModel) {
          await writeMerge({ aiModel })
        }
      } catch {
        // Leitura do IndexedDB FALHOU (Firefox modo privado, IDB bloqueado): sem
        // try/catch a store ficava `loaded:false` PARA SEMPRE e todo awaiter
        // coalescido rejeitava. Caímos para os defaults em memória com
        // `loaded:true` — a IDE funciona, só não persiste preferências.
        setState({ loaded: true })
      }
    })()
    try {
      await loadInFlight
    } finally {
      loadInFlight = null
    }
  },
  setAIApiKey: async (k, options) => {
    const aiApiKey = sanitizeAIApiKey(k) ?? ''
    const aiApiKeyStorage = options?.storage ?? getState().aiApiKeyStorage
    setState({ aiApiKey, aiApiKeyStorage })
    await writeMerge({
      aiApiKey: aiApiKeyStorage === 'persistent' ? aiApiKey : undefined,
      aiApiKeyStorage,
    })
  },
  setAIApiKeyStorage: async (aiApiKeyStorage) => {
    const aiApiKey = sanitizeAIApiKey(getState().aiApiKey) ?? ''
    setState({ aiApiKeyStorage })
    await writeMerge({
      aiApiKey: aiApiKeyStorage === 'persistent' ? aiApiKey : undefined,
      aiApiKeyStorage,
    })
  },
  clearAIApiKey: async () => {
    setState({ aiApiKey: '' })
    await writeMerge({ aiApiKey: undefined })
  },
  setAIModel: async (m) => {
    const aiModel = normalizeAIModel(m)
    setState({ aiModel })
    await writeMerge({ aiModel })
  },
  setTheme: async (theme) => {
    setState({ theme })
    await writeMerge({ theme })
  },
  setCodeFontSize: async (n) => {
    const codeFontSize = clampCodeFontSize(n)
    setState({ codeFontSize })
    await writeMerge({ codeFontSize })
  },
  increaseCodeFontSize: async () => {
    const codeFontSize = clampCodeFontSize(getState().codeFontSize + 1)
    setState({ codeFontSize })
    await writeMerge({ codeFontSize })
  },
  decreaseCodeFontSize: async () => {
    const codeFontSize = clampCodeFontSize(getState().codeFontSize - 1)
    setState({ codeFontSize })
    await writeMerge({ codeFontSize })
  },
  resetCodeFontSize: async () => {
    setState({ codeFontSize: CODE_FONT_SIZE_DEFAULT })
    await writeMerge({ codeFontSize: CODE_FONT_SIZE_DEFAULT })
  },
  setRevealAdvanced: async (revealAdvanced) => {
    setState({ revealAdvanced })
    await writeMerge({ revealAdvanced })
  },
  setProjectSort: async (projectSort) => {
    setState({ projectSort })
    await writeMerge({ projectSort })
  },
}))
