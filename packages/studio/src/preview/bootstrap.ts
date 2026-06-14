import { isReservedProjectFileName, normalizeExtraFileName } from '#core'
import type { ExtensionPermission } from '#extensions'
import { escapeScriptContent, escapeStyleContent } from '../generators/escape'
import { buildPreviewCSPMetaTag } from './csp'
import { buildInterceptorScript } from './interceptors'
import { buildLoopGuardRuntime, instrumentLoops } from './loopGuard'
import { buildPermissionGuardRuntime } from './permissionGuard'
import { buildStorageBridgeRuntime } from './storageBridge'
import { transpileExtra } from './transpile'

export interface PreviewExtraFile {
  /** Nome relativo (ex.: `utils.js`, `cores.css`, `tipos.ts`). */
  name: string
  language: 'html' | 'css' | 'javascript' | 'typescript'
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
  /**
   * Permissões concedidas (união dos manifests das extensões instaladas). O
   * permissionGuard usa isto + a baseline do aluno para liberar/travar rede.
   */
  installedPermissions?: readonly ExtensionPermission[]
  /** Origens liberadas pelo professor para fetch/XHR (opt-in). */
  fetchAllowedOrigins?: readonly string[]
  /** Orçamento de tempo síncrono do loopGuard (ms). */
  loopBudgetMs?: number
  /**
   * Snapshot do `localStorage` persistido deste projeto, semeado no bridge de
   * armazenamento (src/preview/storageBridge.ts) para que os blocos "guardar/ler"
   * funcionem e o estado sobreviva ao recarregar. Ausente/vazio = começa zerado.
   */
  localStorageSnapshot?: Record<string, string>
  /** Projeto deste doc — carimbado nas mensagens de escrita do bridge. */
  storageProjectId?: string
  /**
   * Módulos ESM de extensões instaladas (`specifier → URL`, ex.:
   * `{ three: 'https://esm.sh/three@0.180.0' }`). Entram no importmap e suas
   * origens são liberadas no `script-src` da CSP.
   */
  extensionImports?: Record<string, string>
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

  // Quando há módulos ESM de extensão (ex.: three), os scripts que os usam
  // PRECISAM ser `type="module"` (importmap). Módulos são DEFERIDOS e rodam em
  // ordem após o parse — então o bootstrap da extensão (que importa three e
  // define window.SZGame3D) executa ANTES do código do aluno, que também vira
  // module para enxergar o global. (Caso comum sem isso: o script clássico do
  // aluno roda durante o parse, antes do module da extensão → SZGame3D undefined.)
  const needsModules = Object.keys(input.extensionImports ?? {}).length > 0
  const extScripts = (input.extensionScripts ?? [])
    .map((s) => scriptTag(s, needsModules ? { type: 'module' } : {}))
    .join('\n')
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

  // Extras de script (JS e TS): cada um é transpilado (TS/TSX/JSX → JS via
  // Sucrase; .js/.mjs passam direto), instrumentado contra loop infinito (código
  // do aluno), vira data URL e entra no importmap. Para extras TS, mapeamos
  // também as formas comuns de import (`./nome`, `./nome.js`) além de `./nome.ts`.
  const extraJsFiles = safeExtraFiles.filter(
    (f) => f.language === 'javascript' || f.language === 'typescript',
  )
  const importmap: Record<string, string> = {}
  // Módulos ESM de extensões (specifier → URL pinada, ex.: three via CDN).
  for (const [spec, url] of Object.entries(input.extensionImports ?? {})) {
    if (spec && typeof url === 'string') importmap[spec] = url
  }
  for (const file of extraJsFiles) {
    const transpiled = transpileExtra(file.name, file.content)
    const dataUrl = `data:text/javascript;base64,${base64Encode(instrumentLoops(transpiled))}`
    for (const key of importmapKeysFor(file.name)) {
      // Skip-on-conflict: o PRIMEIRO specifier (módulo de extensão ou extra
      // anterior, ex.: `utils.ts` vs `utils.js` que ambos mapeiam `./utils`)
      // vence. Sobrescrever quebraria silenciosamente o import que já resolvia.
      if (key in importmap) {
        console.warn(
          `[studio] Specifier de importmap em conflito ignorado: "${key}" (de "${file.name}").`,
        )
        continue
      }
      importmap[key] = dataUrl
    }
  }
  // Invariante: o JSON do importmap NÃO passa por escapeScriptContent (suas
  // inserções de `\` são escapes inválidos de JSON e quebrariam o JSON.parse do
  // navegador). A ÚNICA substituição segura para JSON é neutralizar o fechamento
  // literal `</script` (que encerraria o elemento cedo): `<\/script` é JSON
  // válido (`\/` ≡ `/`) e o tokenizer HTML não fecha o <script>.
  const importmapTag =
    Object.keys(importmap).length > 0
      ? `<script type="importmap">${JSON.stringify({ imports: importmap }).replace(/<\/script/gi, '<\\/script')}</script>`
      : ''

  // O CSS canônico entra como <style> inline para não depender de fetch
  // de style.css (iframe sandbox sem allow-same-origin não consegue resolver
  // hrefs relativos a parent).
  const styleTag = input.css ? `<style>${escapeStyleContent(input.css)}</style>` : ''

  // O JS canônico vira <script type="module"> APENAS quando o PRÓPRIO código do
  // aluno usa import/export (precisa do importmap dos extras). Senão é clássico,
  // para preservar funções globais e handlers `onclick="..."` da página do aluno
  // — em module, nomes do topo não viram globais e o `onclick` quebraria. Erros
  // continuam capturados pelo interceptor global. A detecção de module usa o JS
  // ORIGINAL (a guarda de loop não adiciona import/export); o conteúdo executado
  // é o instrumentado.
  const jsNeedsModule = /^\s*(?:import|export)\b/m.test(input.js)
  const instrumentedJs = instrumentLoops(input.js)
  // ⚠️ Em TODOS os caminhos o JS do aluno é emitido como script EXTERNO via
  // `data:text/javascript;base64,…`, NÃO inline. Motivo: inline o conteúdo
  // passaria por `escapeScriptContent`, que insere `\` em `</script`, `<!--` e
  // `<script` — neutralização que corrompe literais legítimos do aluno (um regex
  // `/<!--/u` vira `/<\!--/u` → SyntaxError; `/<\/script>/` muda de significado).
  // A data: URL é opaca e self-contained (não passa pelo tokenizer HTML do
  // documento pai), então dispensa esse escape e preserva o código verbatim.
  // Semântica preservada por tipo:
  //  - module (jsNeedsModule): external type="module" — importmap resolve igual,
  //    escopo de módulo é idêntico inline vs externo.
  //  - clássico (default): external SEM defer — script clássico externo mantém
  //    escopo global (globais/onclick funcionam) e roda na ordem do documento
  //    (data: URL não faz round-trip de rede).
  //  - clássico DEFERIDO (needsModules e !jsNeedsModule): external + `defer` —
  //    escopo global + ordem APÓS o module da extensão (que define p.ex.
  //    window.SZGame3D). `<script defer>` INLINE é ignorado, por isso externo.
  const jsNeedsDeferredClassic = !jsNeedsModule && needsModules
  let userScript = ''
  if (instrumentedJs) {
    const dataUrl = `data:text/javascript;base64,${base64Encode(instrumentedJs)}`
    if (jsNeedsModule) {
      userScript = scriptTag('', { type: 'module', src: dataUrl })
    } else if (jsNeedsDeferredClassic) {
      userScript = scriptTag('', { defer: '', src: dataUrl })
    } else {
      userScript = scriptTag('', { src: dataUrl })
    }
  }

  // Camadas de segurança no <head>, em ordem (defesa em profundidade):
  // CSP → interceptor (console/erros/heartbeat) → permissionGuard (rede) →
  // loopGuard (runtime do __szLoopTick) → storageBridge (localStorage shim) →
  // IMPORTMAP → scripts de extensão (NÃO instrumentados) → estilos → conteúdo do
  // <head> do aluno → corpo → código do aluno. ⚠️ O importmap PRECISA vir antes
  // de QUALQUER `<script type="module">`
  // (extScripts viram module quando há extensionImports) — senão o `import ...
  // from 'three'` falha com "Failed to resolve module specifier".
  const cspMeta = buildPreviewCSPMetaTag({
    fetchAllowedOrigins: input.fetchAllowedOrigins,
    scriptAllowedOrigins: extensionImportOrigins(input.extensionImports),
  })
  const permissionGuard = buildPermissionGuardRuntime({
    granted: input.installedPermissions,
    fetchAllowedOrigins: input.fetchAllowedOrigins,
  })
  const permissionGuardTag = permissionGuard ? scriptTag(permissionGuard) : ''
  const loopGuardTag = scriptTag(buildLoopGuardRuntime(input.loopBudgetMs))
  // Bridge de armazenamento: shima localStorage/sessionStorage (a origem opaca do
  // sandbox os faria LANÇAR) e espelha o store `local` ao parent. Vem antes do
  // importmap/extensões/aluno para que `localStorage` já exista quando rodarem.
  const storageBridgeTag = scriptTag(
    buildStorageBridgeRuntime({
      localSnapshot: input.localStorageSnapshot,
      parentOrigin: input.parentOrigin,
      projectId: input.storageProjectId,
    }),
  )

  return `<!doctype html>
<html lang="pt-BR">
<head>
${cspMeta}
<meta charset="UTF-8" />
${scriptTag(buildInterceptorScript(input.parentOrigin))}
${permissionGuardTag}
${loopGuardTag}
${storageBridgeTag}
${importmapTag}
${extScripts}
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
  // Quando há <html> mas FALTA <body>, não despejamos o documento inteiro no
  // corpo gerado (doctype + <html> + <head> completo viriam junto, duplicando o
  // <head> e renderizando o conteúdo do head como texto). Removemos doctype,
  // a casca <html>/</html> e o bloco <head>...</head> antes de usar como corpo.
  let bodyInner: string
  if (bodyMatch) {
    bodyInner = bodyMatch[1] ?? ''
  } else {
    bodyInner = html
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
  }
  bodyInner = bodyInner.replace(/<script[^>]*src=["'][^"']*script\.js["'][^>]*><\/script>/gi, '')
  return { headInner: headInner.trim(), bodyInner: bodyInner.trim() }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/** Origens (esquema+host) das URLs de módulos de extensão, para liberar na CSP. */
function extensionImportOrigins(imports?: Record<string, string>): string[] {
  if (!imports) return []
  const origins = new Set<string>()
  for (const url of Object.values(imports)) {
    try {
      origins.add(new URL(url).origin)
    } catch {
      // URL inválida → ignora (o importmap também não a usará de forma útil).
    }
  }
  return Array.from(origins)
}

/**
 * Chaves de importmap para um extra. JS/MJS: `./nome.js` e `nome.js`. TS/TSX/JSX:
 * além de `./nome.ts`, mapeia também `./nome.js`/`./nome` (formas de import mais
 * comuns em TS) para a MESMA data URL transpilada.
 */
function importmapKeysFor(name: string): string[] {
  const keys = [`./${name}`, name]
  const base = name.match(/^(.*)\.(?:tsx?|jsx)$/i)?.[1]
  if (base) {
    keys.push(`./${base}.js`, `${base}.js`, `./${base}`, base)
  }
  return keys
}

function scriptTag(code: string, attrs: Record<string, string> = {}): string {
  const attrText = Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('')
  return `<script${attrText}>${escapeScriptContent(code)}</script>`
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
