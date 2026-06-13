import type { AssetPlacement, HTMLNode, HTMLShell, HTMLTag } from '#ir'

const SUPPORTED_TAGS: ReadonlySet<HTMLTag> = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'span',
  'strong',
  'em',
  'button',
  'div',
  'header',
  'nav',
  'section',
  'footer',
  'main',
  'ul',
  'li',
  'a',
  'img',
  'form',
  'input',
  'textarea',
  'label',
])

/** Tags que seguram filhos — mapeadas recursivamente. */
const CONTAINER_TAGS: ReadonlySet<HTMLTag> = new Set([
  'div',
  'section',
  'header',
  'nav',
  'footer',
  'main',
  'ul',
  'form',
])

/** Tags sem conteúdo (self-closing). */
const VOID_TAGS: ReadonlySet<HTMLTag> = new Set(['img', 'input'])

/**
 * Tags de texto que TAMBÉM aceitam filhos inline (ex.: `<p>texto <span>x</span></p>`,
 * `<h2>Título <strong>!</strong></h2>`). Quando têm filhos-elemento, são mapeadas
 * recursivamente (como containers); quando só têm texto, viram uma folha com `text`.
 */
const INLINE_TEXT_TAGS: ReadonlySet<HTMLTag> = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'span',
  'strong',
  'em',
  'li',
  'label',
])

/**
 * Captura TODOS os atributos do elemento (exceto `id`, tratado à parte).
 * Atributos não modelados por um campo de bloco (ex.: `class`) continuam sendo
 * preservados aqui e re-emitidos pelo gerador; no round-trip IR↔blocos eles são
 * guardados no `data` do bloco. Assim um elemento com `class` vira bloco (em vez
 * de "código avançado") sem perder nada — "código é sagrado".
 */
function collectAllAttrs(el: Element): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'id') continue
    out[attr.name] = attr.value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Faz parsing parcial do HTML do usuário em SZ-IR. Apenas extrai o conteúdo do
 * <body>: ignora <head> e a estrutura do documento. Tudo que não for uma tag
 * suportada vira `rawHTML advanced`.
 */
export function parseHTML(source: string): HTMLNode[] {
  if (!source.trim()) return []
  // A descida recursiva (mapNode↔mapChildren) não tem guarda de profundidade;
  // um aninhamento patológico pode estourar a pilha (RangeError). Para honrar o
  // contrato de não-crashar, degradamos para um único nó avançado preservando o
  // HTML original verbatim ("código é sagrado").
  try {
    const doc = new DOMParser().parseFromString(source, 'text/html')
    return parseBodyNodes(doc)
  } catch {
    return [{ type: 'rawHTML', html: source, advanced: true }]
  }
}

/** Mapeia os filhos diretos de `<body>` em `HTMLNode[]`. */
function parseBodyNodes(doc: Document): HTMLNode[] {
  const body = doc.body
  if (!body) return []
  const out: HTMLNode[] = []
  for (const child of Array.from(body.childNodes)) {
    const node = mapNode(child)
    if (node) out.push(node)
  }
  return out
}

/**
 * Tags de "wiring" canônico que o gerador re-emite sozinho: APENAS o
 * `<script src="script.js">` e o `<link rel="stylesheet" href="style.css">`.
 * Só estes viram `null` (o gerador os recria). Qualquer outra referência —
 * `<script src="utils.js">`, CDNs, folhas de estilo extras como
 * `<link href="cores.css">` — é preservada como `rawHTML advanced` para não
 * sumir no round-trip código↔blocos ("código é sagrado"). `<script>`/`<style>`
 * inline também são preservados (ou extraídos para blocos, ver project.ts).
 */
function isCanonicalWiring(el: Element): boolean {
  const tag = el.tagName.toLowerCase()
  if (tag === 'script') {
    const src = el.getAttribute('src')
    return src !== null && pointsToCanonicalFile(src, 'script.js')
  }
  if (tag === 'link') {
    const rel = (el.getAttribute('rel') ?? '').toLowerCase()
    if (!rel.split(/\s+/).includes('stylesheet')) return false
    const href = el.getAttribute('href')
    return href !== null && pointsToCanonicalFile(href, 'style.css')
  }
  return false
}

/**
 * Decide se um `href`/`src` aponta para o arquivo canônico (`style.css` ou
 * `script.js`). Aceita os prefixos relativos comuns (`./`, `/`) e ignora
 * query/hash; um arquivo de mesmo nome em subpasta (`css/style.css`) NÃO conta
 * como canônico — é referência do aluno e deve ser preservada.
 */
function pointsToCanonicalFile(ref: string, file: 'style.css' | 'script.js'): boolean {
  const cleaned = (ref.trim().split(/[?#]/)[0] ?? '').replace(/^\.?\//, '')
  return cleaned === file
}

/**
 * Extrai a "casca" do documento (doctype, atributos de `<html>` e o conteúdo de
 * `<head>`) para preservá-la verbatim no round-trip código↔blocos. Retorna
 * `undefined` quando o HTML não tem casca relevante (ex.: só um fragmento).
 */
export function extractHTMLShell(source: string): HTMLShell | undefined {
  if (!source.trim()) return undefined
  const doc = new DOMParser().parseFromString(source, 'text/html')
  return extractShellFromDoc(doc, source)
}

/**
 * Extrai a casca a partir de um `Document` já parseado. `source` é usado só
 * para recuperar o doctype (que o DOM não expõe de forma textual confiável).
 * Lê `head.innerHTML` no estado ATUAL do documento — então remoções feitas
 * antes (ex.: `<style>` inline extraído para blocos) não vazam para a casca.
 */
function extractShellFromDoc(doc: Document, source: string): HTMLShell | undefined {
  const shell: HTMLShell = {}

  const doctypeMatch = source.match(/<!doctype[^>]*>/i)
  if (doctypeMatch) shell.doctype = doctypeMatch[0]

  const htmlEl = doc.documentElement
  if (htmlEl) {
    const attrs = Array.from(htmlEl.attributes)
      .map((attr) => ` ${attr.name}="${escapeAttrValue(attr.value)}"`)
      .join('')
    if (attrs) shell.htmlAttrs = attrs
  }

  const head = doc.head
  const headInner = head?.innerHTML.trim() ?? ''
  if (headInner) shell.head = head?.innerHTML ?? ''

  return Object.keys(shell).length > 0 ? shell : undefined
}

/**
 * Escapa o valor (DECODIFICADO) de um atributo para re-serialização dentro de
 * aspas duplas. Sem isso, uma aspa dupla embutida quebraria a fronteira do
 * atributo e corromperia o round-trip da casca de `<html>`.
 */
function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Resultado de {@link extractInlineAssets}: HTML + casca + fontes CSS/JS resolvidas. */
export interface InlineAssetsResult {
  html: HTMLNode[]
  htmlShell?: HTMLShell
  /** Fonte de CSS a parsear: `style.css` ou o conteúdo do `<style>` inline. */
  cssSource: string
  /** Fonte de JS a parsear: `script.js` ou o conteúdo do `<script>` inline. */
  jsSource: string
  cssPlacement: AssetPlacement
  jsPlacement: AssetPlacement
}

/** Tipos de `<script>` tratados como JS executável (extraível para blocos). */
const INLINE_SCRIPT_TYPES: ReadonlySet<string> = new Set([
  '',
  'text/javascript',
  'application/javascript',
  'module',
])

function isInHead(el: Element): boolean {
  return el.closest('head') !== null
}

/**
 * Faz TODO o trabalho de DOM do parse (precisa do `DOMParser` nativo — roda na
 * main thread, nunca em Web Worker). Resolve de onde vêm o CSS e o JS:
 *
 * - Se `style.css`/`script.js` têm conteúdo → `external` (comportamento atual).
 * - Senão, se o `index.html` tem EXATAMENTE UM `<style>`/`<script>` inline com
 *   conteúdo → extrai esse conteúdo (para virar blocos reais), grava o
 *   `placement` (`inline-head`/`inline-body-end`) e remove o elemento do
 *   documento antes de derivar `html`/casca (sem duplicar nem virar avançado).
 * - Casos ambíguos (vários inline) ficam como estão — preservados como
 *   `rawHTML advanced` e cobertos pelo aviso de degradação.
 *
 * O resultado é 100% serializável (`postMessage`): o worker só parseia as
 * strings `cssSource`/`jsSource` (livre de DOM).
 */
export function extractInlineAssets(
  indexHtml: string,
  styleCss: string,
  scriptJs: string,
): InlineAssetsResult {
  if (!indexHtml.trim()) {
    return {
      html: [],
      htmlShell: undefined,
      cssSource: styleCss,
      jsSource: scriptJs,
      cssPlacement: 'external',
      jsPlacement: 'external',
    }
  }

  // A descida recursiva (parseBodyNodes→mapNode↔mapChildren) não tem guarda de
  // profundidade; um aninhamento patológico pode estourar a pilha (RangeError).
  // Para honrar o contrato de não-crashar em TODOS os chamadores, degradamos para
  // um resultado mínimo seguro: o HTML vira um único nó avançado verbatim e o
  // CSS/JS recebidos são preservados como `external`.
  try {
    const doc = new DOMParser().parseFromString(indexHtml, 'text/html')

    let cssSource = styleCss
    let cssPlacement: AssetPlacement = 'external'
    if (!styleCss.trim()) {
      const styles = Array.from(doc.querySelectorAll('style')).filter(
        (el) => (el.textContent ?? '').trim() !== '',
      )
      const el = styles.length === 1 ? styles[0] : undefined
      if (el) {
        cssSource = el.textContent ?? ''
        cssPlacement = isInHead(el) ? 'inline-head' : 'inline-body-end'
        el.remove()
      }
    }

    let jsSource = scriptJs
    let jsPlacement: AssetPlacement = 'external'
    let jsModule = false
    if (!scriptJs.trim()) {
      const scripts = Array.from(doc.querySelectorAll('script')).filter((el) => {
        if (el.hasAttribute('src')) return false
        const type = (el.getAttribute('type') ?? '').toLowerCase()
        if (!INLINE_SCRIPT_TYPES.has(type)) return false
        return (el.textContent ?? '').trim() !== ''
      })
      const el = scripts.length === 1 ? scripts[0] : undefined
      if (el) {
        jsSource = el.textContent ?? ''
        jsPlacement = isInHead(el) ? 'inline-head' : 'inline-body-end'
        // Preserva se era module — senão o re-emitimos como clássico (globais + onclick).
        jsModule = (el.getAttribute('type') ?? '').toLowerCase() === 'module'
        el.remove()
      }
    }

    const html = parseBodyNodes(doc)
    const baseShell = extractShellFromDoc(doc, indexHtml)
    const shell: HTMLShell = { ...(baseShell ?? {}) }
    if (cssPlacement !== 'external') shell.cssPlacement = cssPlacement
    if (jsPlacement !== 'external') shell.jsPlacement = jsPlacement
    if (jsModule) shell.jsModule = true
    const htmlShell = Object.keys(shell).length > 0 ? shell : undefined

    return { html, htmlShell, cssSource, jsSource, cssPlacement, jsPlacement }
  } catch {
    return {
      html: [{ type: 'rawHTML', html: indexHtml, advanced: true }],
      htmlShell: undefined,
      cssSource: styleCss,
      jsSource: scriptJs,
      cssPlacement: 'external',
      jsPlacement: 'external',
    }
  }
}

/**
 * Mapeia os filhos de um elemento preservando a intercalação texto↔elemento.
 * Nós de texto não-vazios viram `{ type:'text' }` (mantendo os espaços ao redor
 * para fidelidade); espaços-em-branco puros são descartados; elementos são
 * mapeados recursivamente.
 */
function mapChildren(el: Element): HTMLNode[] {
  const children: HTMLNode[] = []
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const raw = child.textContent ?? ''
      if (raw.trim() === '') continue
      children.push({ type: 'text', text: raw })
      continue
    }
    const c = mapNode(child)
    if (c) children.push(c)
  }
  return children
}

function mapNode(node: Node): HTMLNode | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text.trim()) return null
    return { type: 'rawHTML', html: text, advanced: true }
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const tag = el.tagName.toLowerCase()

  if (isCanonicalWiring(el)) return null

  if (tag === 'canvas') {
    const w = Number.parseInt(el.getAttribute('width') ?? '0', 10)
    const h = Number.parseInt(el.getAttribute('height') ?? '0', 10)
    const id = el.getAttribute('id') ?? 'tela'
    // Largura/altura são opcionais — o tamanho costuma ser definido no JS.
    const canvas: Extract<HTMLNode, { type: 'canvas' }> = { type: 'canvas', id }
    if (w > 0) canvas.width = w
    if (h > 0) canvas.height = h
    return canvas
  }

  if (SUPPORTED_TAGS.has(tag as HTMLTag)) {
    const t = tag as HTMLTag
    const id = el.getAttribute('id') ?? undefined
    const attrs = collectAllAttrs(el)

    if (VOID_TAGS.has(t)) {
      const node: Extract<HTMLNode, { type: 'element' }> = { type: 'element', tag: t }
      if (id) node.id = id
      if (attrs) node.attrs = attrs
      return node
    }

    if (CONTAINER_TAGS.has(t)) {
      // Recursão: filhos não-mapeáveis viram `rawHTML`/`text` na própria
      // recursão, então nada se perde e a estrutura aninhada é preservada.
      const node: Extract<HTMLNode, { type: 'element' }> = {
        type: 'element',
        tag: t,
        children: mapChildren(el),
      }
      if (id) node.id = id
      if (attrs) node.attrs = attrs
      return node
    }

    const hasElementChild = Array.from(el.childNodes).some((n) => n.nodeType === Node.ELEMENT_NODE)
    // Tag de texto com filhos-elemento (ex.: <p>© <span></span> texto</p> ou
    // <h2>Título <strong>!</strong></h2>) → decompõe em blocos aninhados: cada
    // pedaço de texto vira um nó `text` e cada elemento é mapeado recursivamente.
    // Espaços-em-branco puros são descartados.
    if (hasElementChild && INLINE_TEXT_TAGS.has(t)) {
      const node: Extract<HTMLNode, { type: 'element' }> = {
        type: 'element',
        tag: t,
        children: mapChildren(el),
      }
      if (id) node.id = id
      if (attrs) node.attrs = attrs
      return node
    }
    // Folha não-inline (a, button) com filhos-elemento → preserva VERBATIM como
    // um único bloco avançado. Nada se perde.
    if (hasElementChild) {
      return { type: 'rawHTML', html: el.outerHTML, advanced: true }
    }
    const node: Extract<HTMLNode, { type: 'element' }> = {
      type: 'element',
      tag: t,
      text: el.textContent ?? '',
    }
    if (id) node.id = id
    if (attrs) node.attrs = attrs
    return node
  }

  // Tag desconhecida — preserva como avançado.
  return { type: 'rawHTML', html: el.outerHTML, advanced: true }
}
