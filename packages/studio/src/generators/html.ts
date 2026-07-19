import type { HTMLNode, HTMLShell } from '#ir'
import { HTML_ELEMENT_CATALOG } from '../html/catalog'
import { headContainsCanonicalScript } from '../html/wiring'
import { escapeScriptContent, escapeStyleContent } from './escape'
import { assertGeneratorDepth } from './js'
import { countLines, SourceMapBuilder } from './sourceMap'

/**
 * Guarda de profundidade ITERATIVA para a árvore HTML. As recursões de
 * renderização (`renderElement`/`renderNodesWithMap`/`renderInline`) não tinham
 * guarda — um DOM patologicamente aninhado estourava a pilha do motor no meio da
 * geração, e os chamadores na thread principal não capturavam. Rodando aqui (com
 * pilha explícita, sem recursão), abortamos com {@link GeneratorDepthError}
 * antes do crash. `assertGeneratorDepth` compartilha o teto único com o gerador
 * de JS.
 */
function assertHTMLDepth(nodes: HTMLNode[]): void {
  const stack: Array<{ list: HTMLNode[]; depth: number }> = [{ list: nodes, depth: 0 }]
  while (stack.length > 0) {
    const { list, depth } = stack.pop() as { list: HTMLNode[]; depth: number }
    assertGeneratorDepth(depth)
    for (const node of list) {
      if (node.type === 'element' && node.children && node.children.length > 0) {
        stack.push({ list: node.children, depth: depth + 1 })
      }
    }
  }
}

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
  /**
   * Linha (1-based) em `code` onde começa o CORPO do CSS inline (`<style>`),
   * quando `cssPlacement` é inline. `undefined` para CSS externo/ausente. Permite
   * remapear o source map do CSS para dentro do index.html (ver
   * generateProjectFilesWithMap), para o realce bloco↔código funcionar mesmo com
   * CSS embutido no HTML.
   */
  cssInlineStartLine?: number
  /** Análogo a {@link cssInlineStartLine} para o JS inline (`<script>`). */
  jsInlineStartLine?: number
}

export function generateHTML(opts: GenerateHTMLOptions): string {
  return generateHTMLWithMap(opts).code
}

/**
 * Versão que devolve {code, map}. Mapeia cada nó top-level do <body> para a
 * faixa de linhas onde ele foi renderizado dentro do arquivo `index.html`.
 */
export function generateHTMLWithMap(opts: GenerateHTMLOptions): GenerateHTMLWithMapResult {
  assertHTMLDepth(opts.body)
  const map = new SourceMapBuilder()
  const title = escapeHtml(opts.title ?? 'Sistema Zero')
  const cssHref = opts.cssHref ?? 'style.css'
  const jsSrc = opts.jsSrc ?? 'script.js'
  const cssPlacement = opts.shell?.cssPlacement ?? 'external'
  const jsPlacement = opts.shell?.jsPlacement ?? 'external'
  // Script inline é CLÁSSICO por padrão (preserva globais + `onclick="..."`).
  // Só vira module quando a casca diz que o original ERA module — sinal
  // autoritativo posto pelo `extractInlineAssets` do parser a partir do
  // `type="module"` real do `<script>`. NÃO farejamos o texto gerado: um
  // `import`/`export` no início de QUALQUER linha (inclusive dentro de uma
  // string/template/comentário do aluno, ou do JS vindo dos blocos — que nunca é
  // ESM) ligava o `m` do regex e promovia o script a module, derrubando as
  // funções globais e os handlers `onclick="..."` no preview E no site exportado.
  const jsModule = opts.shell?.jsModule === true

  // Assets que vão DENTRO do <head> (placement inline-head). Guardamos a string
  // EXATA de cada bloco inline (idêntica à que vai parar no `code`) para depois
  // localizar, por busca, a linha onde o corpo do CSS/JS começa — e remapear o
  // source map do trecho para dentro do index.html (ver generateProjectFilesWithMap).
  let cssInlineBlock: string | null = null
  let jsInlineBlock: string | null = null
  const headExtra: string[] = []
  if (cssPlacement === 'inline-head' && opts.cssCode) {
    cssInlineBlock = inlineStyle(opts.cssCode)
    headExtra.push(cssInlineBlock)
  }
  if (jsPlacement === 'inline-head' && opts.jsCode) {
    jsInlineBlock = inlineScript(opts.jsCode, jsModule)
    headExtra.push(jsInlineBlock)
  }
  if (jsPlacement === 'external-head' && !headContainsCanonicalScript(opts.shell?.head)) {
    headExtra.push(`    <script src="${jsSrc}"></script>`)
  }
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
  if (cssPlacement === 'inline-body-end' && opts.cssCode) {
    cssInlineBlock = inlineStyle(opts.cssCode)
    bodyEnd.push(cssInlineBlock)
  }
  if (jsPlacement === 'external' && !headContainsCanonicalScript(opts.shell?.head)) {
    bodyEnd.push(`    <script src="${jsSrc}"></script>`)
  } else if (jsPlacement === 'inline-body-end' && opts.jsCode) {
    jsInlineBlock = inlineScript(opts.jsCode, jsModule)
    bodyEnd.push(jsInlineBlock)
  }
  const bodyEndText = bodyEnd.length > 0 ? `\n${bodyEnd.join('\n')}` : ''

  const code = `${head}\n${bodyHtml}${bodyEndText}\n  </body>\n</html>\n`
  return {
    code,
    map,
    cssInlineStartLine: firstInlineBodyLine(code, cssInlineBlock),
    jsInlineStartLine: firstInlineBodyLine(code, jsInlineBlock),
  }
}

/**
 * Linha (1-based) em `code` onde começa o CORPO de um bloco inline
 * (`<style>`/`<script>`) — a linha logo APÓS o abridor `    <style>`/
 * `    <script ...>`. O `block` é a string EXATA embutida no documento (contém o
 * CSS/JS do aluno), então a busca é única. Devolve `undefined` quando não há
 * bloco inline ou (defensivo) quando ele não é encontrado.
 */
function firstInlineBodyLine(code: string, block: string | null): number | undefined {
  if (!block) return undefined
  const idx = code.indexOf(block)
  if (idx === -1) return undefined
  // O bloco é sempre precedido por '\n' (separador do headExtra/bodyEnd), então a
  // linha do abridor = nº de linhas do prefixo + 1; o corpo começa na seguinte.
  const openerLine = countLines(code.slice(0, idx)) + 1
  return openerLine + 1
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
  if (
    cssPlacement === 'external' ||
    cssPlacement === 'external-head' ||
    cssPlacement === undefined
  ) {
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
  assertHTMLDepth(nodes)
  return renderNodesWithMap(nodes, indentSpaces).code
}

/** Tags sem conteúdo/fechamento — renderizadas como `<tag ... />`. */
const VOID_TAGS = new Set(
  HTML_ELEMENT_CATALOG.filter((entry) => entry.parserShape === 'void').map((entry) => entry.tag),
)

function canvasTag(node: Extract<HTMLNode, { type: 'canvas' }>): string {
  // Largura/altura são opcionais: quando ausentes, o tamanho é definido depois
  // pelos blocos de Canvas no JavaScript (ex.: canvas.width = largura da janela).
  const w = node.width !== undefined ? ` width="${node.width}"` : ''
  const h = node.height !== undefined ? ` height="${node.height}"` : ''
  const cls = node.class ? ` class="${escapeAttr(node.class)}"` : ''
  return `<canvas id="${escapeAttr(node.id)}"${cls}${w}${h}></canvas>`
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
  } else if (node.type === 'comment') {
    rendered = `${pad}<!--${escapeCommentText(node.text)}-->`
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
    let column = pad.length + open.length + text.length + 1
    const inline = (node.children ?? [])
      .map((child) => {
        const rendered = renderInline(child, map, startLine, column)
        column += rendered.length
        return rendered
      })
      .join('')
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
function renderInline(
  node: HTMLNode,
  map?: SourceMapBuilder,
  line?: number,
  startColumn?: number,
): string {
  let rendered: string
  if (node.type === 'text') rendered = escapeHtml(node.text)
  else if (node.type === 'comment') rendered = `<!--${escapeCommentText(node.text)}-->`
  else if (node.type === 'rawHTML') rendered = node.html.trim()
  else if (node.type === 'canvas') rendered = canvasTag(node)
  else {
    const attrs = renderAttrs(node)
    if (VOID_TAGS.has(node.tag)) rendered = `<${node.tag}${attrs} />`
    else {
      const open = `<${node.tag}${attrs}>`
      const text = node.text ? escapeHtml(node.text) : ''
      let childColumn =
        startColumn === undefined ? undefined : startColumn + open.length + text.length
      const inner = (node.children ?? [])
        .map((child) => {
          const childRendered = renderInline(child, map, line, childColumn)
          if (childColumn !== undefined) childColumn += childRendered.length
          return childRendered
        })
        .join('')
      rendered = `${open}${text}${inner}</${node.tag}>`
    }
  }
  if (map && node.__id && line !== undefined && startColumn !== undefined) {
    map.record(node.__id, 'index.html', line, line, startColumn, startColumn + rendered.length)
  }
  return rendered
}

/** Mantém o conteúdo dentro de uma única fronteira de comentário válida. */
function escapeCommentText(text: string): string {
  const withoutTerminator = text.replace(/--/g, '- -')
  return withoutTerminator.endsWith('-') ? `${withoutTerminator} ` : withoutTerminator
}

// Nome de atributo HTML válido: letra/underscore/dois-pontos inicial, depois
// letras, dígitos, hífen, ponto, dois-pontos. Atributos com nome fora disso
// (ex.: vindos de um parse adversário) são descartados — o valor já é escapado,
// mas um nome não validado poderia injetar tokens fora do par chave="valor".
const VALID_ATTR_NAME = /^[A-Za-z_:][A-Za-z0-9_:.-]*$/

/**
 * Atributos que carregam URL: o VALOR é navegado/baixado pelo navegador, então
 * um esquema `javascript:`/`vbscript:`/`data:text/html` ali EXECUTA código. O
 * escape de `&"<>` não protege contra isso (a URL é um valor válido), por isso
 * o esquema é filtrado por allowlist em `renderAttrs`. Lista derivada dos
 * atributos URL do HTML (e SVG `xlink:href`/`href`) que disparam navegação,
 * submissão ou fetch de recurso.
 */
const URL_ATTRS: ReadonlySet<string> = new Set([
  'href',
  'src',
  'xlink:href',
  'formaction',
  'action',
  'poster',
  'background',
  'cite',
  'longdesc',
  'data',
  'srcset',
  'ping',
  'manifest',
])

/**
 * Esquema (protocolo) NÃO permitido num valor de URL. `javascript:`/`vbscript:`
 * executam código; `data:text/html`/`data:application/xhtml` renderizam markup
 * com script no contexto do documento. Tudo barrado ANTES de comparar (a URL é
 * só descartada). Aceitamos data: de IMAGEM (`data:image/...`), comum em ícones.
 */
function isDangerousUrl(value: string): boolean {
  // Esquema = sequência antes do primeiro ':' SEM '/', '?' ou '#' no caminho —
  // assim `caminho/arq.png`, `#ancora`, `//cdn/x` e `?q=1` (relativos) passam.
  // Caracteres de controle (incl. \t \n \r, que o navegador IGNORA dentro do
  // esquema: `java\tscript:`) são removidos antes de medir o esquema.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intencional - remover os caracteres de controle (que o navegador ignora no esquema) e o que fecha o bypass java<TAB>script:
  const cleaned = value.replace(/[\u0000-\u0020]/g, '').toLowerCase()
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/.exec(cleaned)
  if (!schemeMatch) return false // relativo / âncora / protocolo-relativo `//` → ok
  const scheme = schemeMatch[1]
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel') {
    return false
  }
  if (scheme === 'data') {
    // Só data: de imagem é aceito (ícone embutido); data:text/html etc. barrado.
    return !cleaned.startsWith('data:image/')
  }
  // Qualquer outro esquema (javascript:, vbscript:, file:, blob:, …) é barrado.
  return true
}

/**
 * CHOKEPOINT DE SEGURANÇA: todo atributo de elemento emitido nos arquivos do
 * aluno (preview de origem nula E site exportado para uma origem real) passa por
 * aqui — qualquer que seja a FONTE da IR (blocos locais OU JSON importado de um
 * estranho). Duas defesas, além do escape de `&"<>` do valor:
 * 1. DESCARTA handlers inline (`on*`: onclick/onerror/onload/…) — eles executam
 *    JS e o escape do valor não os neutraliza (o nome é que é perigoso).
 * 2. Para atributos que carregam URL (ver {@link URL_ATTRS}), REJEITA valores
 *    cujo esquema não esteja na allowlist ({@link isDangerousUrl}) — barra
 *    `javascript:`/`vbscript:`/`data:text/html`, preservando URLs http(s),
 *    relativas, âncoras (`#x`) e protocolo-relativas (`//cdn`).
 * O escape-hatch AUDITADO para markup avançado continua sendo o nó `rawHTML`
 * (modo avançado, autorado pelo aluno) — NÃO tentamos sanear `rawHTML` por regex
 * aqui; ele tem seu próprio caminho de confiança.
 */
function renderAttrs(node: Extract<HTMLNode, { type: 'element' }>): string {
  const parts: string[] = []
  if (node.id) parts.push(`id="${escapeAttr(node.id)}"`)
  if (node.attrs) {
    for (const [k, v] of Object.entries(node.attrs)) {
      if (!VALID_ATTR_NAME.test(k)) continue
      // Handler inline (onclick, onerror, onload, …): descartado sempre.
      if (/^on/i.test(k)) continue
      // Atributo de URL com esquema perigoso (javascript:, data:text/html, …):
      // descartado. Comparação case-insensitive no nome (HTML não diferencia).
      if (URL_ATTRS.has(k.toLowerCase()) && isDangerousUrl(v)) continue
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
  // O par chave="valor" já é seguro só com `&`/`"` escapados (o `"` fecha o
  // valor); ainda assim escapamos `<`/`>` para alinhar com `escapeHtml` e por
  // defesa em profundidade — um `<`/`>` solto num valor de atributo não deveria
  // sangrar para o stream de tags.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function indent(s: string, n: number): string {
  const pad = ' '.repeat(n)
  return s
    .split('\n')
    .map((line) => (line.length ? pad + line : line))
    .join('\n')
}
