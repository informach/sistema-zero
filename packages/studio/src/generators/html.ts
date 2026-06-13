import type { HTMLNode, HTMLShell } from '#ir'
import { escapeScriptContent, escapeStyleContent } from './escape'
import { countLines, SourceMapBuilder } from './sourceMap'

export interface GenerateHTMLOptions {
  title?: string
  body: HTMLNode[]
  cssHref?: string
  jsSrc?: string
  /** Casca do documento (head/doctype) preservada do código original. */
  shell?: HTMLShell
  /**
   * CSS já gerado, necessário só quando `shell.cssPlacement` é inline (o CSS
   * vai para dentro do `index.html`, não para `style.css`).
   */
  cssCode?: string
  /** JS já gerado, análogo a {@link cssCode} para `shell.jsPlacement` inline. */
  jsCode?: string
}

export interface GenerateHTMLWithMapResult {
  code: string
  map: SourceMapBuilder
}

export function generateHTML(opts: GenerateHTMLOptions): string {
  return generateHTMLWithMap(opts).code
}

/**
 * Versão que devolve {code, map}. Mapeia cada nó top-level do <body> para a
 * faixa de linhas onde ele foi renderizado dentro do arquivo `index.html`.
 */
export function generateHTMLWithMap(opts: GenerateHTMLOptions): GenerateHTMLWithMapResult {
  const map = new SourceMapBuilder()
  const title = escapeHtml(opts.title ?? 'Sistema Zero')
  const cssHref = opts.cssHref ?? 'style.css'
  const jsSrc = opts.jsSrc ?? 'script.js'
  const cssPlacement = opts.shell?.cssPlacement ?? 'external'
  const jsPlacement = opts.shell?.jsPlacement ?? 'external'
  // Script inline é CLÁSSICO por padrão (preserva globais + `onclick="..."`).
  // Só vira module quando o original era module ou usa import/export no topo.
  const jsModule =
    opts.shell?.jsModule === true || /^\s*(?:import|export)\b/m.test(opts.jsCode ?? '')

  // Assets que vão DENTRO do <head> (placement inline-head).
  const headExtra: string[] = []
  if (cssPlacement === 'inline-head' && opts.cssCode) headExtra.push(inlineStyle(opts.cssCode))
  if (jsPlacement === 'inline-head' && opts.jsCode)
    headExtra.push(inlineScript(opts.jsCode, jsModule))
  const headExtraText = headExtra.length > 0 ? `\n${headExtra.join('\n')}` : ''

  // Quando há uma casca preservada do código (head/doctype customizados pelo
  // aluno), re-emitimos verbatim — "código é sagrado". Senão, usamos o
  // cabeçalho padrão. Em ambos os casos `countLines` mantém o source map
  // alinhado, pois o corpo começa logo após `<body>`.
  const head = opts.shell
    ? buildHeadFromShell(opts.shell, headExtraText)
    : buildDefaultHead(title, cssHref, cssPlacement, headExtraText)

  let line = countLines(head) + 1 // primeira linha disponível para body
  const pieces: string[] = []
  for (const node of opts.body) {
    const rendered = renderNode(node, 4, map, line)
    const lines = countLines(rendered)
    pieces.push(rendered)
    // Join por '\n' (separador, não linha adicional).
    line += lines
  }
  const bodyHtml = pieces.join('\n')

  // Assets/wiring que vão no FIM do <body>.
  const bodyEnd: string[] = []
  if (cssPlacement === 'inline-body-end' && opts.cssCode) bodyEnd.push(inlineStyle(opts.cssCode))
  if (jsPlacement === 'external') {
    bodyEnd.push(`    <script src="${jsSrc}"></script>`)
  } else if (jsPlacement === 'inline-body-end' && opts.jsCode) {
    bodyEnd.push(inlineScript(opts.jsCode, jsModule))
  }
  const bodyEndText = bodyEnd.length > 0 ? `\n${bodyEnd.join('\n')}` : ''

  const code = `${head}\n${bodyHtml}${bodyEndText}\n  </body>\n</html>\n`
  return { code, map }
}

/** Cabeçalho padrão (sem casca preservada), até `<body>`. */
function buildDefaultHead(
  title: string,
  cssHref: string,
  cssPlacement: HTMLShell['cssPlacement'],
  headExtraText: string,
): string {
  const lines = [
    '<!doctype html>',
    '<html lang="pt-BR">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    `    <title>${title}</title>`,
  ]
  // Só linka style.css quando o CSS é externo; inline vai via headExtraText.
  if (cssPlacement === 'external' || cssPlacement === undefined) {
    lines.push(`    <link rel="stylesheet" href="${cssHref}" />`)
  }
  return `${lines.join('\n')}${headExtraText}\n  </head>\n  <body>`
}

/**
 * Reconstrói o cabeçalho do documento (até `<body>`) a partir da casca
 * preservada. `head` é o innerHTML verbatim de `<head>`; `headExtraText` é o
 * conteúdo inline (style/script) injetado antes de fechar o `<head>`.
 */
function buildHeadFromShell(shell: HTMLShell, headExtraText: string): string {
  const doctype = shell.doctype ?? '<!doctype html>'
  const htmlAttrs = shell.htmlAttrs ?? ' lang="pt-BR"'
  // Ao injetar assets inline (style/script) no fim do <head>, aparamos o espaço
  // em branco final da casca — senão sobram linhas em branco onde o elemento
  // extraído estava (ex.: o `<style>` que viramos blocos).
  if (headExtraText) {
    const headInner = (shell.head ?? '').replace(/\s*$/, '')
    return `${doctype}\n<html${htmlAttrs}>\n  <head>${headInner}${headExtraText}\n  </head>\n  <body>`
  }
  const headInner = shell.head ?? ''
  return `${doctype}\n<html${htmlAttrs}>\n  <head>${headInner}</head>\n  <body>`
}

/**
 * `<style>` inline (placement inline-head/body-end), indentado para leitura.
 * Neutraliza `</style` literal no CSS — senão o elemento fecharia cedo e o
 * documento persistido ficaria corrompido.
 */
function inlineStyle(css: string): string {
  return `    <style>\n${indent(escapeStyleContent(css.trimEnd()), 6)}\n    </style>`
}

/**
 * `<script>` inline. Clássico por padrão (globais + `onclick`); module só quando
 * pedido. Neutraliza `</script` literal no JS (mesma proteção que o preview já
 * aplica) — senão o `</script>` fecharia o elemento cedo, truncando o JS.
 */
function inlineScript(js: string, module: boolean): string {
  const attr = module ? ' type="module"' : ''
  return `    <script${attr}>\n${indent(escapeScriptContent(js.trimEnd()), 6)}\n    </script>`
}

export function renderNodes(nodes: HTMLNode[], indentSpaces = 0): string {
  return renderNodesWithMap(nodes, indentSpaces).code
}

/** Tags sem conteúdo/fechamento — renderizadas como `<tag ... />`. */
const VOID_TAGS = new Set(['img', 'input', 'br', 'hr'])

function canvasTag(node: Extract<HTMLNode, { type: 'canvas' }>): string {
  // Largura/altura são opcionais: quando ausentes, o tamanho é definido depois
  // pelos blocos de Canvas no JavaScript (ex.: canvas.width = largura da janela).
  const w = node.width !== undefined ? ` width="${node.width}"` : ''
  const h = node.height !== undefined ? ` height="${node.height}"` : ''
  return `<canvas id="${escapeAttr(node.id)}"${w}${h}></canvas>`
}

function renderNodesWithMap(
  nodes: HTMLNode[],
  indentSpaces: number,
  map?: SourceMapBuilder,
  startLine?: number,
): { code: string; lines: number } {
  const pieces: string[] = []
  let line = startLine ?? 1
  for (const node of nodes) {
    const rendered = renderNode(node, indentSpaces, map, startLine === undefined ? undefined : line)
    pieces.push(rendered)
    line += countLines(rendered)
  }
  const code = pieces.join('\n')
  return { code, lines: countLines(code) }
}

function renderNode(
  node: HTMLNode,
  indentSpaces: number,
  map?: SourceMapBuilder,
  startLine?: number,
): string {
  const pad = ' '.repeat(indentSpaces)
  let rendered: string
  if (node.type === 'canvas') {
    rendered = `${pad}${canvasTag(node)}`
  } else if (node.type === 'rawHTML') {
    rendered = indent(node.html.trimEnd(), indentSpaces)
  } else if (node.type === 'text') {
    rendered = `${pad}${escapeHtml(node.text)}`
  } else {
    rendered = renderElement(node, indentSpaces, map, startLine)
  }
  recordHTMLNode(map, node.__id, startLine, indentSpaces, rendered)
  return rendered
}

function renderElement(
  node: Extract<HTMLNode, { type: 'element' }>,
  indentSpaces: number,
  map?: SourceMapBuilder,
  startLine?: number,
): string {
  const pad = ' '.repeat(indentSpaces)
  const attrs = renderAttrs(node)
  if (VOID_TAGS.has(node.tag)) {
    return `${pad}<${node.tag}${attrs} />`
  }
  const open = `<${node.tag}${attrs}>`
  const close = `</${node.tag}>`
  const hasChildren = node.children && node.children.length > 0
  const hasText = node.text !== undefined && node.text !== ''
  if (!hasChildren && !hasText) return `${pad}${open}${close}`
  if (!hasChildren) return `${pad}${open}${escapeHtml(node.text ?? '')}${close}`
  // Conteúdo inline/misto (texto intercalado com elementos, ex.:
  // `<p>© <span></span> texto</p>`): renderiza tudo numa só linha para
  // preservar os espaços originais e manter o round-trip estável.
  const hasTextChild = (node.children ?? []).some((c) => c.type === 'text')
  if (hasTextChild) {
    const text = hasText ? escapeHtml(node.text ?? '') : ''
    const inline = (node.children ?? []).map(renderInline).join('')
    return `${pad}${open}${text}${inline}${close}`
  }
  const inner = renderNodesWithMap(
    node.children ?? [],
    indentSpaces + 2,
    map,
    startLine === undefined ? undefined : startLine + 1 + (hasText ? 1 : 0),
  ).code
  const textLine = hasText ? `${pad}  ${escapeHtml(node.text ?? '')}\n` : ''
  return `${pad}${open}\n${textLine}${inner}\n${pad}${close}`
}

function recordHTMLNode(
  map: SourceMapBuilder | undefined,
  id: string | undefined,
  startLine: number | undefined,
  indentSpaces: number,
  rendered: string,
): void {
  if (!map || !id || startLine === undefined) return
  const lines = countLines(rendered)
  const lastLine = rendered.split('\n').at(-1) ?? ''
  map.record(
    id,
    'index.html',
    startLine,
    startLine + lines - 1,
    indentSpaces + 1,
    lastLine.length + 1,
  )
}

/** Renderiza um nó "inline" (sem quebras de linha nem indentação). */
function renderInline(node: HTMLNode): string {
  if (node.type === 'text') return escapeHtml(node.text)
  if (node.type === 'rawHTML') return node.html.trim()
  if (node.type === 'canvas') {
    return canvasTag(node)
  }
  const attrs = renderAttrs(node)
  if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs} />`
  const text = node.text ? escapeHtml(node.text) : ''
  const inner = (node.children ?? []).map(renderInline).join('')
  return `<${node.tag}${attrs}>${text}${inner}</${node.tag}>`
}

// Nome de atributo HTML válido: letra/underscore/dois-pontos inicial, depois
// letras, dígitos, hífen, ponto, dois-pontos. Atributos com nome fora disso
// (ex.: vindos de um parse adversário) são descartados — o valor já é escapado,
// mas um nome não validado poderia injetar tokens fora do par chave="valor".
const VALID_ATTR_NAME = /^[A-Za-z_:][A-Za-z0-9_:.-]*$/

function renderAttrs(node: Extract<HTMLNode, { type: 'element' }>): string {
  const parts: string[] = []
  if (node.id) parts.push(`id="${escapeAttr(node.id)}"`)
  if (node.attrs) {
    for (const [k, v] of Object.entries(node.attrs)) {
      if (!VALID_ATTR_NAME.test(k)) continue
      parts.push(`${k}="${escapeAttr(v)}"`)
    }
  }
  return parts.length === 0 ? '' : ` ${parts.join(' ')}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function indent(s: string, n: number): string {
  const pad = ' '.repeat(n)
  return s
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}
