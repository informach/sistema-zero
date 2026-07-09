/**
 * Captura de IMAGEM de TODOS os blocos do workspace — não só a área visível.
 *
 * Serve para a criança mandar o código (a "foto" dos blocos) ao professor e
 * vice-versa. O truque que pega TUDO (inclusive o que está rolado para fora da
 * tela): o Blockly mantém **todos** os blocos no DOM dentro de um único `<g>`
 * (`workspace.getCanvas()`) — rolar/dar zoom só aplica um `transform` nesse grupo,
 * não esconde nada. Então clonamos esse grupo, tiramos o transform e enquadramos
 * tudo pela moldura de `getBlocksBoundingBox()` num `<svg>` autônomo, que é então
 * rasterizado para PNG. Espelha a receita oficial do playground do Blockly v12.
 *
 * ⚠️ É uma feature de BROWSER (SVG→`<canvas>`→PNG + área de transferência): o
 * `bun test` (happy-dom) NÃO rasteriza nem copia — testar SÓ em browser real
 * (mesmo caveat do `captureCoverFromProject`). Os testes cobrem só a montagem do
 * SVG (pura). Algum bloco com `<image>` de URL EXTERNA "suja" o canvas (CORS) e o
 * `toBlob` falha — daí `downloaded:false` e o chamador avisa.
 */
import type * as Blockly from 'blockly/core'
import { triggerDownload } from '../export/download'

const SVG_NS = 'http://www.w3.org/2000/svg'
/** Fundo creme do tema claro quando não dá p/ ler a cor do tema do workspace. */
const BG_FALLBACK = '#fef9ef'
/** Nitidez do PNG (2× = telas retina). */
const PIXEL_SCALE = 2
/** Teto do maior lado do PNG (px): workspaces enormes não estouram a memória. */
const MAX_SIDE = 6000
/**
 * Famílias (por SUBSTRING, minúsculo) das fontes usadas no texto dos blocos — casa
 * com `FONT_STYLE.family` de `theme.ts` (`'Baloo 2'`/`'Nunito'`). O `next/font` do host
 * kids registra as fontes sob um nome HASHEADO (ex.: `__Baloo_2_ab12`), então filtrar
 * por substring captura tanto o nome literal quanto o do next/font.
 */
const EMBED_FONT_FAMILIES = ['baloo', 'nunito']

export interface ScreenshotResult {
  /** O PNG foi gerado e o download disparado. */
  downloaded: boolean
  /** A imagem também foi copiada para a área de transferência (best-effort). */
  copied: boolean
}

/** Junta as folhas de estilo do Blockly que estão no `<head>` (fonte/cor do texto
 * dos blocos). Sem elas o `<text>` sai sem formatação na imagem. */
export function collectBlocklyCss(): string {
  return Array.from(document.head.querySelectorAll('style'))
    .filter((el) => /\.blocklySvg/.test(el.textContent ?? '') || el.id.startsWith('blockly-'))
    .map((el) => el.textContent ?? '')
    .join('\n')
}

// ── Fontes embutidas (fidelidade do texto na imagem) ─────────────────────────
// O SVG é rasterizado via `<img src="data:image/svg+xml,…">`, que renderiza num
// contexto ISOLADO: ele NÃO enxerga as web fonts carregadas na página. Os CAMINHOS
// (fundo) dos blocos foram medidos pelo Blockly com a fonte REAL (Baloo 2); se o
// texto rasterizar noutra fonte, as métricas divergem e o texto transborda a moldura
// (corte à direita) e desloca os campos (empurrão à esquerda). Para bater, ESPELHAMOS
// as regras `@font-face` do documento (nome de família EXATO + `src` como data URI)
// dentro do SVG — assim a resolução de fonte no contexto isolado é idêntica à da
// página viva. Best-effort: folha cross-origin/fetch que falha é ignorada.

/**
 * O texto dos blocos referencia SEMPRE os nomes LITERAIS do `theme.ts`
 * (`FONT_STYLE.family` = `'Baloo 2', 'Nunito', …`). Mas o host kids carrega essas
 * fontes via `next/font`, que as registra sob um nome HASHEADO (`__Baloo_2_ab12`).
 * Se embutíssemos a `@font-face` com esse nome hasheado, o `<text>` (que pede
 * `'Baloo 2'`) NUNCA casaria → rasterizava no fallback largo → texto cortado à
 * direita e campos empurrados p/ a esquerda. Então re-emitimos a face sob o nome
 * LITERAL que o texto usa. Fonte sem 'baloo'/'nunito' no nome já foi filtrada antes.
 */
export function canonicalBlockFontFamily(family: string): string {
  const lower = family.toLowerCase()
  if (lower.includes('baloo')) return 'Baloo 2'
  if (lower.includes('nunito')) return 'Nunito'
  return family
}

let embeddedFontCssPromise: Promise<string> | null = null

/** Extrai a 1ª `url(...)` de um `src` de `@font-face` (ignora `data:` já embutido). */
function firstFontUrl(src: string): string | null {
  const m = src.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/)
  if (!m?.[2]) return null
  const raw = m[2].trim()
  if (raw.startsWith('data:')) return null
  try {
    return new URL(raw, document.baseURI).href
  } catch {
    return null
  }
}

function fontMimeFor(url: string): string {
  if (/\.woff2(\?|#|$)/i.test(url)) return 'font/woff2'
  if (/\.woff(\?|#|$)/i.test(url)) return 'font/woff'
  if (/\.ttf(\?|#|$)/i.test(url)) return 'font/ttf'
  if (/\.otf(\?|#|$)/i.test(url)) return 'font/otf'
  return 'font/woff2'
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Monta as regras `@font-face` (com `src` em data URI) das fontes do texto dos blocos. */
async function collectEmbeddedFontFaces(): Promise<string> {
  if (typeof document === 'undefined' || typeof CSSFontFaceRule === 'undefined') return ''
  const rules: CSSFontFaceRule[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList | undefined
    try {
      cssRules = sheet.cssRules // folha cross-origin lança aqui
    } catch {
      continue
    }
    if (!cssRules) continue
    for (const rule of Array.from(cssRules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue
      const family = (rule.style.getPropertyValue('font-family') || '').replace(/["']/g, '').trim()
      if (!family) continue
      const lower = family.toLowerCase()
      if (!EMBED_FONT_FAMILIES.some((f) => lower.includes(f))) continue
      rules.push(rule)
    }
  }

  const out: string[] = []
  for (const rule of rules) {
    const url = firstFontUrl(rule.style.getPropertyValue('src'))
    if (!url) continue
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const dataUri = `data:${fontMimeFor(url)};base64,${bufferToBase64(await res.arrayBuffer())}`
      const rawFamily = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim()
      // Nome LITERAL que o texto do bloco pede (`'Baloo 2'`/`'Nunito'`), não o
      // hasheado do next/font — senão a face embutida não casa (ver o helper).
      const family = canonicalBlockFontFamily(rawFamily)
      const weight = rule.style.getPropertyValue('font-weight') || 'normal'
      const style = rule.style.getPropertyValue('font-style') || 'normal'
      const range = rule.style.getPropertyValue('unicode-range')
      out.push(
        `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};` +
          `font-display:block;src:url(${dataUri}) format('${fontMimeFor(url).replace('font/', '')}')` +
          `${range ? `;unicode-range:${range}` : ''}}`,
      )
    } catch {
      // fetch/CORS falhou — segue sem esta fonte (a imagem sai como hoje).
    }
  }
  return out.join('\n')
}

/** Aguarda as fontes carregarem (métricas estáveis) — best-effort. */
async function ensureFontsReady(): Promise<void> {
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    // sem a API / rejeitou — segue.
  }
}

/**
 * Monta um `<svg>` autônomo (string XML) com TODOS os blocos, enquadrado pela
 * moldura total. Devolve `null` se o workspace estiver vazio (moldura sem área).
 */
export function buildBlocksSvg(
  workspace: Blockly.WorkspaceSvg,
  /** CSS extra (ex.: `@font-face` embutidas) injetado ANTES das folhas do Blockly. */
  extraCss = '',
): { svg: string; width: number; height: number } | null {
  const box = workspace.getBlocksBoundingBox()
  const width = box.right - box.left
  const height = box.bottom - box.top
  if (!(width > 0) || !(height > 0)) return null

  // O `<g>` com todos os blocos já existe; rolar a tela só o translada.
  const clone = workspace.getCanvas().cloneNode(true) as SVGGElement
  clone.removeAttribute('transform') // tira o pan/zoom — o viewBox enquadra tudo

  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('viewBox', `${box.left} ${box.top} ${width} ${height}`)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  const renderer = workspace.options?.renderer || 'zelos'
  const themeName = workspace.getTheme?.()?.name ?? 'sz-light'
  svg.setAttribute('class', `blocklySvg ${renderer}-renderer ${themeName}-theme`)

  const style = document.createElementNS(SVG_NS, 'style')
  // As `@font-face` embutidas vêm ANTES das folhas do Blockly (que declaram a
  // `font-family` do texto) — o texto rasteriza na MESMA fonte medida no editor.
  style.textContent = `${extraCss}\n${collectBlocklyCss()}`
  svg.appendChild(style)
  svg.appendChild(clone)

  // `&nbsp` sem ponto-e-vírgula é entidade não declarada e quebra o parser de imagem.
  const xml = new XMLSerializer().serializeToString(svg).replace(/&nbsp(?!;)/g, '&#160;')
  return { svg: xml, width, height }
}

/** Lê a cor de fundo do tema do workspace (fallback creme). */
function backgroundColour(workspace: Blockly.WorkspaceSvg): string {
  const colour = workspace.getTheme?.()?.getComponentStyle?.('workspaceBackgroundColour')
  return typeof colour === 'string' && colour ? colour : BG_FALLBACK
}

/** Rasteriza o `<svg>` (string) num PNG `Blob`, pintando o fundo do tema atrás. */
function rasterize(svgXml: string, width: number, height: number, bg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const scale = Math.min(PIXEL_SCALE, MAX_SIDE / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D indisponível.'))
      return
    }
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível gerar o PNG (imagem externa pode bloquear).'))
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('Não foi possível carregar o SVG dos blocos.'))
    img.src = `data:image/svg+xml,${encodeURIComponent(svgXml)}`
  })
}

/**
 * Copia o PNG para a área de transferência. Passa a PROMISE ao `ClipboardItem`
 * (não o blob resolvido) para preservar o gesto do usuário — o `write` é chamado
 * já no clique e o blob resolve depois. Best-effort: navegador sem suporte / gesto
 * perdido / permissão negada → `false` (o download segue valendo).
 */
function copyToClipboard(blobPromise: Promise<Blob>): Promise<boolean> {
  const clip = navigator.clipboard
  if (!clip?.write || typeof ClipboardItem === 'undefined') return Promise.resolve(false)
  try {
    return clip
      .write([new ClipboardItem({ 'image/png': blobPromise })])
      .then(() => true)
      .catch(() => false)
  } catch {
    return Promise.resolve(false)
  }
}

/**
 * Gera o PNG de TODOS os blocos e (1) dispara o download e (2) copia para a área
 * de transferência. Nunca lança: devolve o que deu certo. `downloaded:false`
 * significa que nem o PNG saiu (ex.: bloco com imagem externa "sujou" o canvas).
 */
export async function exportWorkspaceImage(
  workspace: Blockly.WorkspaceSvg,
  opts: { filename?: string } = {},
): Promise<ScreenshotResult> {
  // Fontes prontas + embutidas no SVG p/ o texto rasterizar na MESMA fonte do editor
  // (senão o texto transborda no fallback → corte à direita / campos empurrados).
  await ensureFontsReady()
  if (embeddedFontCssPromise === null) embeddedFontCssPromise = collectEmbeddedFontFaces()
  const fontCss = await embeddedFontCssPromise

  const built = buildBlocksSvg(workspace, fontCss)
  if (!built) return { downloaded: false, copied: false }

  const blobPromise = rasterize(built.svg, built.width, built.height, backgroundColour(workspace))
  // Dispara a cópia JÁ (best-effort) p/ não perder o gesto; o download espera o blob.
  const copyPromise = copyToClipboard(blobPromise)
  try {
    const blob = await blobPromise
    triggerDownload(blob, opts.filename ?? 'blocos.png')
    return { downloaded: true, copied: await copyPromise }
  } catch {
    await copyPromise.catch(() => false)
    return { downloaded: false, copied: false }
  }
}
