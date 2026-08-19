/**
 * Área de transferência do APLICATIVO (08/2026): copiar num desenho, voltar à
 * galeria, abrir (ou criar) outro e colar. Antes o pedaço copiado vivia na
 * sessão do editor (pixel) ou num ref do escopo vetorial, e morria ao sair.
 *
 * Tipada por ESTILO: o pixel viaja com as CORES efetivas do desenho de origem
 * (não só índices) — é o que permite colar entre paletas diferentes e virar
 * FIGURA dentro de um vetor; o vetor viaja como shapes + o tamanho do documento
 * de origem (para centralizar num documento de outro tamanho).
 *
 * Espelho best-effort em `localStorage` (padrão do `sz:block-clipboard` do
 * Estúdio): sobrevive à aba fechada e atravessa abas. Só quando o JSON cabe no
 * teto; falha de quota/ausência de storage = só memória, sem erro. Entre a
 * memória e o espelho vence o mais RECENTE (copiar na aba B e colar na A tem
 * que dar o da aba B).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { decodeBitmap, encodeBitmap } from '../core/bitmapCodec'
import { PALETTE_SIZE } from '../core/palette'
import { PINTA_LIMITS, type PintaBitmap } from '../core/project'
import { sanitizeVectorShape, type VectorShape } from '../vector/model'

export type PintaClipboardItem =
  | { kind: 'pixel'; bitmap: PintaBitmap; colors: readonly string[] }
  | { kind: 'shapes'; shapes: VectorShape[]; width: number; height: number }

export interface PintaClipboardState {
  /** O que está guardado em MEMÓRIA (a leitura pública é `get()`, que consulta o espelho). */
  item: PintaClipboardItem | null
  /** Guarda em memória e, cabendo, no espelho. */
  set(item: PintaClipboardItem): void
  /** Lê o mais recente entre memória e espelho; `null` = vazio. */
  get(): PintaClipboardItem | null
  clear(): void
}

export type PintaClipboardStore = StoreApi<PintaClipboardState>

export const CLIPBOARD_STORAGE_KEY = 'pinta:clipboard'
/** Teto do JSON espelhado — acima disso fica só em memória (localStorage tem ~5 MB por origem). */
export const CLIPBOARD_MIRROR_MAX_CHARS = 1_000_000

const MAX_DOC_SIDE = 4096
const HEX = /^#[0-9a-f]{6}$/i

interface MirrorEnvelope {
  v: 1
  at: number
  kind: 'pixel' | 'shapes'
  bitmap?: unknown
  colors?: unknown
  shapes?: unknown
  width?: unknown
  height?: unknown
}

/** Um `Storage` mínimo (o localStorage de verdade, ou um Map nos testes). */
export interface ClipboardMirror {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultMirror(): ClipboardMirror | null {
  try {
    const storage = (globalThis as { localStorage?: ClipboardMirror }).localStorage
    return storage ?? null
  } catch {
    // Acesso ao storage pode LANÇAR (contexto restrito/privado).
    return null
  }
}

function serialize(item: PintaClipboardItem, at: number): string {
  const envelope: MirrorEnvelope =
    item.kind === 'pixel'
      ? { v: 1, at, kind: 'pixel', bitmap: encodeBitmap(item.bitmap), colors: [...item.colors] }
      : { v: 1, at, kind: 'shapes', shapes: item.shapes, width: item.width, height: item.height }
  return JSON.stringify(envelope)
}

/** Lê o espelho com o mesmo rigor de um import: qualquer coisa fora do lugar = vazio. */
export function parseClipboardMirror(
  text: string | null,
): { item: PintaClipboardItem; at: number } | null {
  if (!text) return null
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const env = raw as Partial<MirrorEnvelope>
  if (env.v !== 1 || typeof env.at !== 'number' || !Number.isFinite(env.at)) return null
  if (env.kind === 'pixel') {
    const bitmap = decodeBitmap(env.bitmap)
    if (!bitmap) return null
    if (!Array.isArray(env.colors)) return null
    // Teto da paleta efetiva (base + extras): um espelho adulterado com milhares de
    // cores não passa (o pedaço só referencia índices até aí mesmo).
    if (env.colors.length > PALETTE_SIZE + PINTA_LIMITS.maxExtraColors) return null
    const colors = env.colors.filter(
      (c): c is string => typeof c === 'string' && (c === '' || HEX.test(c)),
    )
    if (colors.length !== env.colors.length) return null
    return { item: { kind: 'pixel', bitmap, colors }, at: env.at }
  }
  if (env.kind === 'shapes') {
    if (!Array.isArray(env.shapes)) return null
    // Mais formas que um documento aceita nunca colariam: corta antes de sanear tudo.
    const shapes = env.shapes
      .slice(0, PINTA_LIMITS.maxShapes)
      .map(sanitizeVectorShape)
      .filter((s): s is VectorShape => s !== null)
    if (shapes.length === 0) return null
    const width = clampSide(env.width)
    const height = clampSide(env.height)
    if (width === null || height === null) return null
    return { item: { kind: 'shapes', shapes, width, height }, at: env.at }
  }
  return null
}

function clampSide(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < 1 || rounded > MAX_DOC_SIDE) return null
  return rounded
}

export function createClipboardStore(
  options: {
    /**
     * Espelho durável. `undefined` = o `localStorage` da página; `null` = SÓ memória
     * (o bloco de aula usa: o desenho da aula é isolado da galeria pessoal, e o espelho
     * é compartilhado pela origem inteira).
     */
    mirror?: ClipboardMirror | null
    /** Perfil/namespace dono do clipboard persistente. Vazio mantém a chave legada. */
    namespace?: string
    /** Relógio injetável (testes). */
    now?: () => number
  } = {},
): PintaClipboardStore {
  const mirror = options.mirror === undefined ? defaultMirror() : options.mirror
  const namespace = options.namespace?.trim() ?? ''
  const storageKey = namespace
    ? `${CLIPBOARD_STORAGE_KEY}:${encodeURIComponent(namespace)}`
    : CLIPBOARD_STORAGE_KEY
  const now = options.now ?? (() => Date.now())
  let memoryAt = 0

  return createStore<PintaClipboardState>((set, get) => ({
    item: null,
    set: (item) => {
      const at = now()
      memoryAt = at
      set({ item })
      if (!mirror) return
      try {
        const text = serialize(item, at)
        if (text.length <= CLIPBOARD_MIRROR_MAX_CHARS) mirror.setItem(storageKey, text)
        // Grande demais para o espelho: o que estava lá seria MAIS VELHO que a
        // memória, e `get()` devolveria o errado numa aba nova; some com ele.
        else mirror.removeItem(storageKey)
      } catch {
        // Quota cheia / storage indisponível: fica só a memória — e o espelho ANTIGO
        // sai (senão uma aba nova leria um item mais velho que o copiado agora).
        try {
          mirror.removeItem(storageKey)
        } catch {
          // idem
        }
      }
    },
    get: () => {
      const memory = get().item
      if (!mirror) return memory
      let mirrored: { item: PintaClipboardItem; at: number } | null = null
      try {
        mirrored = parseClipboardMirror(mirror.getItem(storageKey))
      } catch {
        mirrored = null
      }
      if (!mirrored) return memory
      if (!memory || mirrored.at > memoryAt) {
        // O espelho é mais novo (outra aba copiou depois): passa a valer, e a
        // memória acompanha para não reler o JSON a cada colar.
        memoryAt = mirrored.at
        set({ item: mirrored.item })
        return mirrored.item
      }
      return memory
    },
    clear: () => {
      memoryAt = 0
      set({ item: null })
      try {
        mirror?.removeItem(storageKey)
      } catch {
        // idem
      }
    },
  }))
}
