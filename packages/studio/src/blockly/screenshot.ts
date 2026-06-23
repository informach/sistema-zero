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

/**
 * Monta um `<svg>` autônomo (string XML) com TODOS os blocos, enquadrado pela
 * moldura total. Devolve `null` se o workspace estiver vazio (moldura sem área).
 */
export function buildBlocksSvg(
  workspace: Blockly.WorkspaceSvg,
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
  style.textContent = collectBlocklyCss()
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
  const built = buildBlocksSvg(workspace)
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
