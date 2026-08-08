/**
 * Cores do canvas do Blockly LIDAS DO TEMA em tempo de execução.
 *
 * O Blockly não lê custom properties nos `componentStyles` — precisa de cor
 * concreta. Antes havia uma tabela HEX fixa espelhando os tokens; desde que os
 * tokens passaram a apontar para os primitivos da marca (`--sz-kids-*`), a
 * MESMA linha de código produz cores diferentes conforme o host importe ou não
 * o `@sistemazero/ui/theme-kids.css` — nenhuma tabela estática consegue estar
 * certa nos dois. Sem isto o canvas fica creme dentro de um app azul, que é
 * justo o que mais denuncia "outro app".
 *
 * A leitura é feita num elemento DENTRO do root do Studio (para pegar o
 * `[data-sz-theme]` correto) e cai na tabela de reserva quando o ambiente não
 * resolve (happy-dom nos testes, token ausente).
 */

export interface SzBlocklyPalette {
  bg: string
  panel: string
  panelSoft: string
  fg: string
  border: string
  accent: string
  grid: string
}

/** Reserva = os valores históricos (creme/quase-preto), usados sem DOM. */
export const SZ_BLOCKLY_FALLBACK: Record<'dark' | 'light', SzBlocklyPalette> = {
  dark: {
    bg: '#030406',
    panel: '#07090d',
    panelSoft: '#12151b',
    fg: '#f5f7f9',
    border: '#16181d',
    accent: '#37A6F5',
    grid: '#1b212a',
  },
  light: {
    bg: '#fef9ef',
    panel: '#fffdf8',
    panelSoft: '#f4ecdc',
    fg: '#1a1410',
    border: '#e6d8c2',
    accent: '#1565C0',
    grid: '#efe3cf',
  },
}

const TOKENS: Record<keyof Omit<SzBlocklyPalette, 'grid'>, string> = {
  bg: '--color-sz-bg',
  panel: '--color-sz-panel',
  panelSoft: '--color-sz-panel-soft',
  fg: '--color-sz-fg',
  border: '--color-sz-border',
  accent: '--color-sz-accent',
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function toHexTriplet(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, '0')).join('')}`
}

/** Canvas 1×1 reaproveitado como conversor de cor (criado sob demanda). */
let paintCtx: CanvasRenderingContext2D | null | undefined

/**
 * Qualquer cor CSS → `#rrggbb`. `null` quando não dá para converter.
 *
 * ⚠️ O caminho principal é PINTAR num canvas 1×1 e ler o pixel: os tokens são
 * `oklch(…)`/`oklab(…)`/`color-mix(…)` e o `getComputedStyle` devolve esses
 * formatos crus — uma regex de `rgb()` falharia em todos eles (foi o que fez o
 * canvas do Blockly continuar creme dentro do app azul no primeiro QA).
 */
export function cssColorToHex(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(raw)
  if (rgb?.[1]) {
    const parts = rgb[1].split(/[,\s/]+/).filter(Boolean)
    if (parts.length >= 3) {
      const channels = parts.slice(0, 3).map((part) => {
        const n = Number.parseFloat(part)
        return part.includes('%') ? (n / 100) * 255 : n
      })
      if (!channels.some(Number.isNaN)) {
        return toHexTriplet(channels[0] as number, channels[1] as number, channels[2] as number)
      }
    }
  }
  if (typeof document === 'undefined') return null
  if (paintCtx === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    paintCtx = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!paintCtx) return null
  try {
    // `fillStyle` MANTÉM o valor anterior quando a cor é inválida — daí os dois
    // sentinelas opostos: se os dois resultados baterem, a cor foi entendida.
    const read = (sentinel: string): string => {
      if (!paintCtx) return ''
      paintCtx.fillStyle = sentinel
      paintCtx.fillStyle = raw
      paintCtx.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0] = paintCtx.getImageData(0, 0, 1, 1).data
      return toHexTriplet(r, g, b)
    }
    const onBlack = read('#000000')
    const onWhite = read('#ffffff')
    return onBlack === onWhite ? onBlack : null
  } catch {
    return null
  }
}

/**
 * Lê a paleta do tema vigente. `root` deve estar DENTRO da subárvore que carrega
 * o `[data-sz-theme]` (o tema claro declara os tokens no próprio elemento do
 * Studio, então ler do `document.documentElement` traria os valores errados).
 */
export function readSzPalette(root: Element | null, theme: 'dark' | 'light'): SzBlocklyPalette {
  const fallback = SZ_BLOCKLY_FALLBACK[theme]
  if (!root || typeof window === 'undefined' || typeof getComputedStyle !== 'function') {
    return fallback
  }
  // Um elemento-sonda: `color` aceita a var e o getComputedStyle devolve a cor
  // já resolvida (custom property crua viria como texto, sem resolver color-mix).
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none'
  root.appendChild(probe)
  try {
    const read = (token: string): string | null => {
      probe.style.color = ''
      probe.style.color = `var(${token})`
      return cssColorToHex(getComputedStyle(probe).color)
    }
    const bg = read(TOKENS.bg)
    const panel = read(TOKENS.panel)
    const panelSoft = read(TOKENS.panelSoft)
    const fg = read(TOKENS.fg)
    const border = read(TOKENS.border)
    const accent = read(TOKENS.accent)
    // Tudo ou nada: uma paleta meio-lida misturaria fundo NOVO com borda VELHA,
    // que é pior que a reserva coerente.
    if (!bg || !panel || !panelSoft || !fg || !border || !accent) return fallback
    return {
      bg,
      panel,
      panelSoft,
      fg,
      border,
      accent,
      // A grade é um detalhe do fundo: a borda diluída nele lê melhor que uma
      // cor fixa, e acompanha o tema sozinha.
      grid: mixHex(bg, border, 0.55),
    }
  } catch {
    return fallback
  } finally {
    probe.remove()
  }
}

/** Mistura dois hex em sRGB (`amount` = quanto de `a`). */
export function mixHex(a: string, b: string, amount: number): string {
  const parse = (hex: string): [number, number, number] | null => {
    const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
    if (!m?.[1]) return null
    const n = Number.parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const ca = parse(a)
  const cb = parse(b)
  if (!ca || !cb) return a
  const mixed = ca.map((channel, i) => clamp255(channel * amount + (cb[i] ?? 0) * (1 - amount)))
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
