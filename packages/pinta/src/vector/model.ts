/**
 * Modelo do desenho VETORIAL (asset `vector`). Só tipos + helpers puros de
 * validação — o editor/geometria/SVG vivem nos módulos irmãos (Fase 5).
 *
 * Os shapes são serializáveis (structured clone + JSON) e renderizam 1:1 como
 * elementos SVG reais, tanto no editor quanto no export.
 */
export interface Vec2 {
  x: number
  y: number
}

export interface VectorStroke {
  /** Cor hex `#rrggbb`. */
  color: string
  width: number
}

/** Degradê de 2 cores (linear com ângulo, ou radial). Cores hex, sem `'none'`. */
export interface VectorGradient {
  type: 'linear' | 'radial'
  /** Cor hex `#rrggbb` do começo (0%). */
  from: string
  /** Cor hex `#rrggbb` do fim (100%). */
  to: string
  /** Graus (só `linear`): 0 = →, 90 = ↓. Ignorado no radial. */
  angle: number
}

/** Preenchimento: cor sólida (hex ou `'none'`) OU degradê. */
export type VectorFill = string | VectorGradient

interface VectorShapeBase {
  id: string
  /** Cor sólida (`#rrggbb`/`'none'`) ou degradê. */
  fill: VectorFill
  /** `null` = sem contorno. */
  stroke: VectorStroke | null
  /** 0–1. */
  opacity: number
  /** Graus, em torno do centro do bounding box. */
  rotation: number
  /** Grupo: shapes com o MESMO id se movem/selecionam juntos. Ausente = solto. */
  groupId?: string
  /**
   * Escondida pelo olhinho do painel Camadas: some do PALCO e de TODO export/
   * prévia (paridade com a camada escondida do pixel). Ausente = visível
   * (convenção do sanitize: `false` OMITE a chave).
   */
  hidden?: boolean
  /**
   * Cadeado do painel Camadas: trancada, a forma não muda nem sai do desenho
   * (mover/estilo/pontos/apagar). Olho, nome e ordem seguem livres; ela
   * CONTINUA no export/prévia (lock ≠ hidden). Mesma convenção do `hidden`:
   * `true` emite a chave, o resto OMITE.
   */
  locked?: boolean
}

/** Só as formas visíveis (o funil de render/export respeita o olhinho). */
export function visibleShapes(shapes: VectorShape[]): VectorShape[] {
  return shapes.filter((s) => s.hidden !== true)
}

/** id do `<linearGradient>/<radialGradient>` de um shape (único = id do shape). */
export function gradientId(shapeId: string, prefix = ''): string {
  return `${prefix}pin-grad-${shapeId}`
}

export type VectorShape = VectorShapeBase &
  (
    | { type: 'rect'; x: number; y: number; w: number; h: number; rx: number }
    | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
    | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
    | { type: 'polygon'; points: Vec2[] }
    /** Pincel suavizado — o `d` já vem resolvido pelo smoothing. */
    | { type: 'path'; d: string }
    /**
     * Texto de UMA OU VÁRIAS linhas (`\n` separa). `x`/`y` são a ÂNCORA, e o
     * que ela significa depende do `align` (`text-anchor` start/middle/end) —
     * é o que faz as linhas se alinharem entre si de graça, pelo próprio SVG.
     *
     * ⭐ `'left'` é INEXPRIMÍVEL de propósito (não é só "chave omitida"): assim
     * o tipo impede escrever o padrão, e todo texto que já existe atravessa o
     * sanitize byte a byte. Leia sempre por `textAlignOf`.
     */
    | {
        type: 'text'
        x: number
        y: number
        text: string
        fontSize: number
        /** Ausente em documentos antigos = Nunito. */
        fontFamily?: VectorFontFamily
        align?: 'center' | 'right'
      }
    /**
     * FIGURA: um desenho de pixel art trazido da galeria. Move, gira e muda de
     * tamanho como qualquer forma, mas não se edita por dentro.
     *
     * `src` é SEMPRE um PNG data URL — os bytes ficam ASSADOS aqui dentro. Nada
     * de referência viva ao asset de origem: assim não existe ciclo A→B→A, o
     * desenho continua inteiro se a criança apagar o original, e o rasterizador
     * do export (que carrega o SVG por Blob URL, em modo estático) consegue ler,
     * o que uma URL externa não permitiria.
     */
    | {
        type: 'image'
        x: number
        y: number
        w: number
        h: number
        src: string
        /** Pixel art: sem borrar ao ampliar. Ausente = interpolação padrão. */
        pixelated?: true
      }
  )

export type VectorTextAlign = 'left' | 'center' | 'right'

export const VECTOR_FONT_FAMILIES = [
  'baloo-2',
  'nunito',
  'press-start-2p',
  'bungee',
  'fredoka',
] as const
export type VectorFontFamily = (typeof VECTOR_FONT_FAMILIES)[number]
export const DEFAULT_VECTOR_FONT_FAMILY: VectorFontFamily = 'nunito'

export interface VectorFontFamilyInfo {
  label: string
  /** Aproximação de largura para bounds/hit testing sem depender do DOM. */
  widthFactor: number
}

export const VECTOR_FONT_FAMILY_INFO: Record<VectorFontFamily, VectorFontFamilyInfo> = {
  'baloo-2': { label: 'Baloo 2', widthFactor: 0.58 },
  nunito: { label: 'Nunito', widthFactor: 0.56 },
  'press-start-2p': { label: 'Press Start 2P', widthFactor: 0.8 },
  bungee: { label: 'Bungee', widthFactor: 0.64 },
  fredoka: { label: 'Fredoka One', widthFactor: 0.6 },
}

export function isVectorFontFamily(value: unknown): value is VectorFontFamily {
  return typeof value === 'string' && (VECTOR_FONT_FAMILIES as readonly string[]).includes(value)
}

export function fontFamilyOf(shape: VectorShape): VectorFontFamily {
  return shape.type === 'text' && isVectorFontFamily(shape.fontFamily)
    ? shape.fontFamily
    : DEFAULT_VECTOR_FONT_FAMILY
}

export function fontFamilyLabel(family: VectorFontFamily): string {
  return VECTOR_FONT_FAMILY_INFO[family].label
}

/**
 * A família como valor de CSS — SEMPRE entre aspas.
 *
 * ⚠️ Sem as aspas, o nome vira uma sequência de identificadores CSS, e
 * identificador não pode começar com dígito: "Press Start 2P" tem o token "2P" e
 * "Baloo 2" tem o "2", então o navegador DESCARTA a declaração inteira e o texto
 * cai na fonte herdada. Medido em Chrome: as duas voltavam "Nunito, ui-sans-serif,
 * system-ui, sans-serif". Duas das cinco famílias nunca funcionaram por causa de um
 * par de aspas — e Nunito, Bungee e Fredoka escondiam o defeito por serem uma
 * palavra só.
 *
 * O `@font-face` (`vector/fonts.ts`) já cita entre aspas; quem faltava era o uso.
 */
export function fontFamilyCss(family: VectorFontFamily): string {
  return `'${VECTOR_FONT_FAMILY_INFO[family].label}'`
}

/** `'left'` quando a chave está ausente (ela só existe para center/right). */
export function textAlignOf(shape: VectorShape): VectorTextAlign {
  return shape.type === 'text' ? (shape.align ?? 'left') : 'left'
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const SAFE_VECTOR_ID = /^[A-Za-z0-9_-]{1,128}$/

export function isSafeVectorId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_VECTOR_ID.test(value)
}

export function isVectorColor(value: unknown): value is string {
  return value === 'none' || (typeof value === 'string' && HEX_COLOR.test(value))
}

function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

export function isVectorGradient(value: unknown): value is VectorGradient {
  if (!value || typeof value !== 'object') return false
  const g = value as Record<string, unknown>
  return (g.type === 'linear' || g.type === 'radial') && isHex(g.from) && isHex(g.to)
}

/** Normaliza um preenchimento vindo de fonte não confiável; `null` = inválido. */
function sanitizeFill(raw: unknown): VectorFill | null {
  if (isVectorGradient(raw)) {
    return {
      type: raw.type,
      from: raw.from,
      to: raw.to,
      angle: isFiniteNumber(raw.angle) ? ((raw.angle % 360) + 360) % 360 : 90,
    }
  }
  return isVectorColor(raw) ? raw : null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isVec2(value: unknown): value is Vec2 {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return isFiniteNumber(v.x) && isFiniteNumber(v.y)
}

/** Teto de caracteres do texto, contando os `\n`. Exportado: o diálogo capa antes. */
export const MAX_TEXT_CHARS = 400
/** Teto de LINHAS: sem ele a caixa do texto cresceria sem fim. */
export const MAX_TEXT_LINES = 12

/**
 * Regra ÚNICA do conteúdo de texto (o sanitize e o diálogo chamam esta):
 * normaliza a quebra de linha, capa caracteres e capa linhas. Idempotente.
 */
export function normalizeTextContent(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .slice(0, MAX_TEXT_CHARS)
    .split('\n')
    .slice(0, MAX_TEXT_LINES)
    .join('\n')
}
/** Teto do `d` do pincel — o sanitize DESCARTA acima disso; a criação (smoothing) capa antes. */
export const MAX_PATH_CHARS = 20_000
/** Teto de pontos do polígono. Exportado: o editor de pontos recusa passar disso. */
export const MAX_POLYGON_POINTS = 64
/** Piso do polígono — abaixo disso o sanitize DESCARTA a forma no próximo load. */
export const MIN_POLYGON_POINTS = 3
/**
 * Teto do `src` da FIGURA, no mesmo idioma do `MAX_PATH_CHARS`: acima disso o
 * sanitize DESCARTA a forma no próximo load, então quem insere recusa ANTES.
 */
export const MAX_IMAGE_SRC_CHARS = 300_000
/** Único esquema aceito na figura: bloqueia http(s), svg+xml e javascript:. */
const IMAGE_SRC_PREFIX = 'data:image/png;base64,'

/**
 * Valida um shape vindo de fonte não confiável (disco/import). Retorna o shape
 * normalizado ou `null` (descartar). Nunca lança.
 */
export function sanitizeVectorShape(raw: unknown): VectorShape | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  if (!isSafeVectorId(s.id)) return null
  const fill = sanitizeFill(s.fill)
  if (fill === null) return null
  let stroke: VectorStroke | null = null
  if (s.stroke != null) {
    const st = s.stroke as Record<string, unknown>
    if (!isVectorColor(st.color) || st.color === 'none' || !isFiniteNumber(st.width)) return null
    stroke = { color: st.color, width: Math.min(Math.max(st.width, 0.5), 64) }
  }
  const opacity = isFiniteNumber(s.opacity) ? Math.min(Math.max(s.opacity, 0), 1) : 1
  const rotation = isFiniteNumber(s.rotation) ? s.rotation % 360 : 0
  const groupId = isSafeVectorId(s.groupId) ? s.groupId : undefined
  const base = {
    id: s.id,
    fill,
    stroke,
    opacity,
    rotation,
    ...(groupId ? { groupId } : {}),
    ...(s.hidden === true ? { hidden: true } : {}),
    ...(s.locked === true ? { locked: true } : {}),
  }

  switch (s.type) {
    case 'rect':
      if (![s.x, s.y, s.w, s.h, s.rx].every(isFiniteNumber)) return null
      return { ...base, type: 'rect', x: s.x, y: s.y, w: s.w, h: s.h, rx: s.rx } as VectorShape
    case 'ellipse':
      if (![s.cx, s.cy, s.rx, s.ry].every(isFiniteNumber)) return null
      return { ...base, type: 'ellipse', cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry } as VectorShape
    case 'line':
      if (![s.x1, s.y1, s.x2, s.y2].every(isFiniteNumber)) return null
      return { ...base, type: 'line', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 } as VectorShape
    case 'polygon': {
      if (!Array.isArray(s.points) || s.points.length < 3) return null
      const points = s.points.slice(0, MAX_POLYGON_POINTS).filter(isVec2)
      if (points.length < 3) return null
      return { ...base, type: 'polygon', points } as VectorShape
    }
    case 'path':
      if (typeof s.d !== 'string' || !s.d || s.d.length > MAX_PATH_CHARS) return null
      return { ...base, type: 'path', d: s.d } as VectorShape
    case 'text': {
      if (![s.x, s.y].every(isFiniteNumber)) return null
      if (typeof s.text !== 'string') return null
      // Normaliza ANTES do trim: '\n\n' não é texto nenhum.
      const text = normalizeTextContent(s.text)
      if (!text.trim()) return null
      const fontSize = isFiniteNumber(s.fontSize) ? Math.min(Math.max(s.fontSize, 6), 200) : 24
      const align = s.align === 'center' || s.align === 'right' ? s.align : undefined
      const fontFamily = isVectorFontFamily(s.fontFamily) ? s.fontFamily : undefined
      return {
        ...base,
        type: 'text',
        x: s.x,
        y: s.y,
        text,
        fontSize,
        ...(fontFamily ? { fontFamily } : {}),
        ...(align ? { align } : {}),
      } as VectorShape
    }
    // ⚠️ O `default: return null` abaixo é o ÚNICO switch de shape que o
    // TypeScript não obriga a cobrir: variante nova esquecida aqui some do
    // desenho no próximo load, em silêncio.
    case 'image': {
      const w = s.w
      const h = s.h
      if (![s.x, s.y, w, h].every(isFiniteNumber)) return null
      if (!isFiniteNumber(w) || !isFiniteNumber(h) || w <= 0 || h <= 0) return null
      if (typeof s.src !== 'string') return null
      if (!s.src.startsWith(IMAGE_SRC_PREFIX)) return null
      if (s.src.length > MAX_IMAGE_SRC_CHARS) return null
      return {
        ...base,
        type: 'image',
        x: s.x,
        y: s.y,
        w,
        h,
        src: s.src,
        ...(s.pixelated === true ? { pixelated: true } : {}),
      } as VectorShape
    }
    default:
      return null
  }
}
