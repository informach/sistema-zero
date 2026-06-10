import { isReservedProjectFileName, normalizeExtraFileName } from '#core'
import { buildInterceptorScript } from './interceptors'

export interface PreviewExtraFile {
  /** Nome relativo (ex.: `utils.js`, `cores.css`). */
  name: string
  language: 'html' | 'css' | 'javascript'
  content: string
}

export interface BuildPreviewDocInput {
  html: string
  css: string
  js: string
  /** Scripts adicionais (ex.: runtimes de extensões oficiais instaladas). */
  extensionScripts?: string[]
  /** Arquivos extras criados pelo aluno (Fase 3). */
  extraFiles?: PreviewExtraFile[]
  /**
   * Origem da app, usada como `targetOrigin` do postMessage dos interceptors
   * (defesa em profundidade). Quando ausente, usa `'*'`.
   */
  parentOrigin?: string
}

/**
 * Combina os arquivos do usuário + interceptors + extensões em um único
 * documento HTML que é atribuído como srcdoc do iframe sandboxed.
 *
 * Arquivos extras:
 * - `.html` → fragmento inserido no `<body>` antes do script principal.
 * - `.css` → inline como `<style>` adicional.
 * - `.js`  → cada um vira `<script type="module">` com `data:text/javascript;base64,…`
 *   no source. Importmap mapeia `./nome.js` para o data URL — assim
 *   `import { algo } from './utils.js'` funciona dentro do iframe sandbox
 *   sem allow-same-origin (data: URLs são opacas e self-contained).
 */
export function buildPreviewDoc(input: BuildPreviewDocInput): string {
  const userHtml = input.html.trim()
  const { headInner, bodyInner } = splitHtml(userHtml)

  const extScripts = (input.extensionScripts ?? []).map((s) => scriptTag(s)).join('\n')
  const safeExtraFiles = (input.extraFiles ?? [])
    .map((file) => {
      const safeName = normalizeExtraFileName(file.name)
      if (safeName && isReservedProjectFileName(safeName)) return null
      return safeName ? { ...file, name: safeName } : null
    })
    .filter((file): file is PreviewExtraFile => Boolean(file))

  const extraHtml = safeExtraFiles
    .filter((f) => f.language === 'html')
    .map((f) => splitHtml(f.content).bodyInner)
    .filter(Boolean)
    .join('\n')

  const extraCss = safeExtraFiles
    .filter((f) => f.language === 'css')
    .map((f) => `<style data-file="${escapeAttr(f.name)}">${escapeStyleContent(f.content)}</style>`)
    .join('\n')

  // Extras JS: cada um vira data URL e entra no importmap como `./nome.js`.
  const extraJsFiles = safeExtraFiles.filter((f) => f.language === 'javascript')
  const importmap: Record<string, string> = {}
  for (const file of extraJsFiles) {
    const dataUrl = `data:text/javascript;base64,${base64Encode(file.content)}`
    importmap[`./${file.name}`] = dataUrl
    importmap[file.name] = dataUrl
  }
  const importmapTag =
    Object.keys(importmap).length > 0
      ? `<script type="importmap">${JSON.stringify({ imports: importmap })}</script>`
      : ''

  // O CSS canônico entra como <style> inline para não depender de fetch
  // de style.css (iframe sandbox sem allow-same-origin não consegue resolver
  // hrefs relativos a parent).
  const styleTag = input.css ? `<style>${escapeStyleContent(input.css)}</style>` : ''

  // O JS canônico vira <script type="module"> APENAS quando usa import/export
  // (precisa do importmap dos extras). Senão é clássico, para preservar funções
  // globais e handlers `onclick="..."` da página do aluno — em module, nomes do
  // topo não viram globais e o `onclick` quebraria. Erros continuam capturados
  // pelo interceptor global.
  const jsNeedsModule = /^\s*(?:import|export)\b/m.test(input.js)
  const userScript = input.js ? scriptTag(input.js, jsNeedsModule ? { type: 'module' } : {}) : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
${scriptTag(buildInterceptorScript(input.parentOrigin))}
${extScripts}
${importmapTag}
${styleTag}
${extraCss}
${headInner}
</head>
<body>
${bodyInner}
${extraHtml}
${userScript}
</body>
</html>`
}

function splitHtml(html: string): { headInner: string; bodyInner: string } {
  if (!/<html[\s>]/i.test(html)) {
    return { headInner: '', bodyInner: html }
  }
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  let headInner = headMatch?.[1] ?? ''
  headInner = headInner.replace(/<link[^>]*href=["'][^"']*style\.css["'][^>]*>/gi, '')
  let bodyInner = bodyMatch?.[1] ?? html
  bodyInner = bodyInner.replace(/<script[^>]*src=["'][^"']*script\.js["'][^>]*><\/script>/gi, '')
  return { headInner: headInner.trim(), bodyInner: bodyInner.trim() }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function scriptTag(code: string, attrs: Record<string, string> = {}): string {
  const attrText = Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('')
  return `<script${attrText}>${escapeScriptContent(code)}</script>`
}

function escapeScriptContent(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script')
}

function escapeStyleContent(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}

function base64Encode(s: string): string {
  // btoa não lida bem com caracteres multi-byte; passamos por utf-8 → bytes → btoa.
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(s)
    let bin = ''
    for (const byte of bytes) bin += String.fromCharCode(byte)
    return btoa(bin)
  }
  // Fallback Node (testes)
  // biome-ignore lint/suspicious/noExplicitAny: API Node opcional
  const Buf = (globalThis as any).Buffer
  return Buf ? Buf.from(s, 'utf-8').toString('base64') : s
}
