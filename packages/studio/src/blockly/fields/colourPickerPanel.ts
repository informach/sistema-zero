/**
 * Painel de cor livre do FieldColourSZ — substitui o diálogo NATIVO do
 * `<input type=color>`: o seletor do navegador/SO abria no idioma do SISTEMA
 * (títulos em inglês p/ a criança) e com conta-gotas quebrado em Firefox/Linux.
 * Aqui tudo é nosso (PT, temas sz) e o conta-gotas usa a API EyeDropper quando
 * o navegador oferece (Chromium; Firefox/Safari não têm a API — o botão some).
 *
 * Sem canvas: o quadrado saturação/valor é feito de gradientes CSS empilhados
 * (funciona no happy-dom dos testes e não depende de getContext).
 */

export interface Hsv {
  /** Matiz 0–360. */
  h: number
  /** Saturação 0–1. */
  s: number
  /** Valor/brilho 0–1. */
  v: number
}

interface EyeDropperResult {
  sRGBHex: string
}
interface EyeDropperCtor {
  new (): { open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult> }
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export function hexToHsv(hex: string): Hsv {
  const raw = hex.replace('#', '')
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hsvToHex(hsv: Hsv): string {
  const h = ((hsv.h % 360) + 360) % 360
  const s = clamp01(hsv.s)
  const v = clamp01(hsv.v)
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/** Saturação/valor a partir do ponto clicado no quadrado (0,0 = canto sup. esq.). */
export function svFromPointer(rect: { width: number; height: number }, x: number, y: number): Hsv {
  const s = clamp01(x / Math.max(1, rect.width))
  const v = 1 - clamp01(y / Math.max(1, rect.height))
  return { h: 0, s, v }
}

export function supportsEyeDropper(target: typeof globalThis = globalThis): boolean {
  return typeof (target as { EyeDropper?: unknown }).EyeDropper === 'function'
}

export interface ColourPickerPanel {
  root: HTMLElement
  /** Sincroniza o painel com um hex vindo de fora (input HEX digitado). */
  setHex(hex: string): void
}

/**
 * Monta o painel (quadrado SV + matiz + conta-gotas). `onChange` recebe o hex
 * a cada interação — quem confirma/aplica no bloco é o dono (linha do HEX).
 */
export function buildColourPickerPanel(options: {
  initial: string
  onChange: (hex: string) => void
}): ColourPickerPanel {
  let hsv = hexToHsv(options.initial)

  const root = document.createElement('div')
  root.className = 'sz-colour-panel'

  const sv = document.createElement('div')
  sv.className = 'sz-colour-sv'
  sv.setAttribute('role', 'slider')
  sv.setAttribute('aria-label', 'Saturação e brilho da cor')
  const marker = document.createElement('span')
  marker.className = 'sz-colour-sv-marker'
  sv.append(marker)

  const hue = document.createElement('input')
  hue.type = 'range'
  hue.min = '0'
  hue.max = '360'
  hue.step = '1'
  hue.className = 'sz-colour-hue'
  hue.setAttribute('aria-label', 'Matiz da cor')

  const paint = () => {
    const base = hsvToHex({ h: hsv.h, s: 1, v: 1 })
    sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${base})`
    marker.style.left = `${hsv.s * 100}%`
    marker.style.top = `${(1 - hsv.v) * 100}%`
    marker.style.background = hsvToHex(hsv)
    hue.value = String(Math.round(hsv.h))
  }

  const emit = () => {
    paint()
    options.onChange(hsvToHex(hsv))
  }

  const pickFromEvent = (event: PointerEvent) => {
    const rect = sv.getBoundingClientRect()
    const picked = svFromPointer(rect, event.clientX - rect.left, event.clientY - rect.top)
    hsv = { h: hsv.h, s: picked.s, v: picked.v }
    emit()
  }
  sv.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    sv.setPointerCapture?.(event.pointerId)
    pickFromEvent(event)
  })
  sv.addEventListener('pointermove', (event) => {
    if (event.buttons !== 1) return
    pickFromEvent(event)
  })

  hue.addEventListener('input', () => {
    hsv = { ...hsv, h: Number(hue.value) }
    emit()
  })

  root.append(sv, hue)

  if (supportsEyeDropper()) {
    const eyedropper = document.createElement('button')
    eyedropper.type = 'button'
    eyedropper.className = 'sz-colour-eyedropper'
    eyedropper.textContent = '💧 Conta-gotas'
    eyedropper.title = 'Pegar uma cor da tela'
    eyedropper.addEventListener('click', async () => {
      const Ctor = (globalThis as { EyeDropper?: EyeDropperCtor }).EyeDropper
      if (!Ctor) return
      try {
        const result = await new Ctor().open()
        const hex = result.sRGBHex.toLowerCase()
        // Emite o hex EXATO capturado (hex→hsv→hex arredonda em cor não saturada).
        hsv = hexToHsv(hex)
        paint()
        options.onChange(hex)
      } catch {
        // Esc/cancelou o conta-gotas — não é erro.
      }
    })
    root.append(eyedropper)
  }

  paint()
  return {
    root,
    setHex(hex) {
      hsv = hexToHsv(hex)
      paint()
    },
  }
}
