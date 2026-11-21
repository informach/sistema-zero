import { parse } from '@babel/parser'
import { transform } from 'sucrase'
import type { Project, ProjectTree } from '#core'
import { VITE_CONFIG_VANILLA } from '../../components/code/pro-templates/base'
import { sameTextExceptLineBreaks } from '../../monaco/lineBreaks'

/**
 * Execução leve do Pro (etapa 3 do plano, "Pro em escala"): o projeto que o navegador consegue
 * montar IGUAL ao Vite é montado aqui mesmo, sem esperar o compilador do servidor. Todo o resto
 * vai ao servidor, como sempre (`kind: 'hosted'`, com o motivo).
 *
 * O que entra: o `index.html` com scripts de módulo e folhas de estilo locais, módulos TS e JS
 * com importações relativas (ou a partir da raiz), CSS sem `url()` nem `@import` e JSON. O que
 * não entra: biblioteca do npm, `vite.config` diferente do modelo, materiais (imagens, sons...),
 * JSX, `import.meta`, importação dinâmica com caminho calculado, consultas do Vite (`?raw`),
 * referências locais no HTML que o Vite reescreveria.
 *
 * Fidelidade: o Sucrase só tira os tipos (com o mesmo descarte de importações usadas só como tipo
 * do esbuild do Vite). Os módulos continuam ES modules NATIVOS: cada um vira um blob, e um mapa de
 * importação criado no topo da página liga `sz-light:N` ao blob. Assim valores exportados vivos,
 * ciclos e `await` no topo funcionam como no Vite. (O modo CommonJS do Sucrase não serve: um
 * `export let pontos` alterado dentro do módulo deixava a leitura local no valor antigo.)
 */

/** A mesma política do documento que o servidor monta (`studio-runtime/runtime/inline-preview.mjs`). */
export const LIGHT_PRO_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "script-src 'unsafe-inline' blob:",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  'worker-src blob:',
].join('; ')

export type LightProPlan =
  | { kind: 'light'; html: string; modules: number }
  | { kind: 'hosted'; reason: string }

/** A ordem de extensões do Vite (`resolve.extensions`). */
const EXTENSIONS = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'] as const
const SCRIPT = /\.(?:mjs|js|mts|ts)$/
const TYPED = /\.m?ts$/
const KEY = 'sz-light:'
const RESERVED = new Set(
  'await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield'.split(
    ' ',
  ),
)

class Hosted extends Error {}
const hosted = (reason: string): never => {
  throw new Hosted(reason)
}

function fileText(tree: ProjectTree, path: string): string | null {
  const node = tree[path]
  return node?.kind === 'file' ? node.content : null
}

function normalize(path: string): string | null {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (!parts.length) return null
      parts.pop()
    } else parts.push(part)
  }
  return parts.join('/')
}

/** Caminho local de um atributo do HTML ou de uma importação, ou `null` quando não é local. */
function localTarget(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(trimmed)) return null
  return trimmed
}

function resolveModule(tree: ProjectTree, importer: string, specifier: string): string {
  if (/[?#]/.test(specifier)) hosted(`consulta do Vite em ${specifier}`)
  let base: string | null
  if (specifier.startsWith('/')) base = normalize(specifier)
  else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const folder = importer.includes('/') ? importer.slice(0, importer.lastIndexOf('/')) : ''
    base = normalize(`${folder}/${specifier}`)
  } else return hosted(`biblioteca ${specifier}`)
  if (base === null) return hosted(`caminho fora do projeto: ${specifier}`)
  const candidates = [base]
  // Um arquivo TS que importa `./a.js` recebe o `a.ts`, como no Vite.
  if (TYPED.test(importer)) candidates.push(base.replace(/\.js$/, '.ts').replace(/\.mjs$/, '.mts'))
  for (const extension of EXTENSIONS) candidates.push(`${base}${extension}`)
  for (const extension of EXTENSIONS) candidates.push(`${base}/index${extension}`)
  for (const candidate of candidates) if (fileText(tree, candidate) !== null) return candidate
  return hosted(`arquivo não encontrado: ${specifier}`)
}

function checkCss(path: string, css: string): string {
  if (/@import\b/i.test(css)) hosted(`@import em ${path}`)
  for (const match of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi))
    if (!/^data:/i.test(match[2]?.trim() ?? '')) hosted(`url() em ${path}`)
  return css
}

function jsonModule(path: string, text: string): string {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return hosted(`JSON inválido em ${path}`)
  }
  const lines = [`const __szJson = ${JSON.stringify(value)};`, 'export default __szJson;']
  if (value && typeof value === 'object' && !Array.isArray(value))
    for (const key of Object.keys(value))
      if (/^[A-Za-z_$][\w$]*$/.test(key) && !RESERVED.has(key))
        lines.push(`export const ${key} = __szJson[${JSON.stringify(key)}];`)
  return lines.join('\n')
}

interface ModuleSource {
  start: number
  end: number
  value: string
  /** `import './x.css'`, sem nada importado (o único jeito de trazer CSS que fica igual ao Vite). */
  sideEffectOnly: boolean
}

/** Tira os tipos e acha as importações que SOBRARAM (as que o Vite também manteria). */
function scriptSources(path: string, content: string): { code: string; sources: ModuleSource[] } {
  let code = content
  if (TYPED.test(path)) {
    try {
      code = transform(content, { transforms: ['typescript'], disableESTransforms: true }).code
    } catch (error) {
      return hosted(
        `o código de ${path} não compila: ${error instanceof Error ? error.message : error}`,
      )
    }
  }
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(code, { sourceType: 'module', createImportExpressions: true })
  } catch (error) {
    return hosted(
      `o código de ${path} não compila: ${error instanceof Error ? error.message : error}`,
    )
  }
  const sources: ModuleSource[] = []
  const pending: unknown[] = [ast.program]
  while (pending.length) {
    const value = pending.pop()
    if (!value || typeof value !== 'object') continue
    if (Array.isArray(value)) {
      for (const item of value) pending.push(item)
      continue
    }
    const node = value as Record<string, unknown>
    const type = node.type
    if (type === 'MetaProperty') hosted(`import.meta em ${path}`)
    if (type === 'Decorator') hosted(`decorador em ${path}`)
    if (
      type === 'ImportDeclaration' ||
      type === 'ExportNamedDeclaration' ||
      type === 'ExportAllDeclaration' ||
      type === 'ImportExpression'
    ) {
      const source = node.source as { type?: string; value?: unknown; start?: number; end?: number }
      if (node.attributes && (node.attributes as unknown[]).length)
        hosted(`atributos de importação em ${path}`)
      if (source) {
        if (source.type !== 'StringLiteral' || typeof source.value !== 'string')
          hosted(`importação com caminho calculado em ${path}`)
        sources.push({
          start: source.start ?? 0,
          end: source.end ?? 0,
          value: String(source.value),
          sideEffectOnly:
            type === 'ImportDeclaration' && !(node.specifiers as unknown[] | undefined)?.length,
        })
      }
      if (type === 'ImportExpression' && node.options) hosted(`importação com opções em ${path}`)
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra') continue
      const child = node[key]
      if (child && typeof child === 'object') pending.push(child)
    }
  }
  return { code, sources: sources.sort((a, b) => a.start - b.start) }
}

function viteConfigIsTheTemplate(tree: ProjectTree): boolean {
  for (const name of ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts']) {
    const text = fileText(tree, name)
    if (text !== null && !sameTextExceptLineBreaks(text.trim(), VITE_CONFIG_VANILLA.trim()))
      return false
  }
  return true
}

function plan(project: Project): LightProPlan {
  if (project.kind !== 'pro' || !project.tree) return hosted('não é um projeto Pro')
  if (project.assets?.length) return hosted('o projeto tem materiais')
  const tree = project.tree
  if (!viteConfigIsTheTemplate(tree)) return hosted('vite.config diferente do modelo')
  const manifest = fileText(tree, 'package.json')
  if (manifest !== null) {
    let parsed: unknown
    try {
      parsed = JSON.parse(manifest)
    } catch {
      return hosted('package.json inválido')
    }
    const dependencies = (parsed as { dependencies?: unknown }).dependencies
    if (dependencies && typeof dependencies === 'object' && Object.keys(dependencies).length)
      return hosted('o projeto usa bibliotecas')
  }
  const indexHtml = fileText(tree, 'index.html')
  if (indexHtml === null) return hosted('sem index.html')

  const document = new DOMParser().parseFromString(indexHtml, 'text/html')
  const ids = new Map<string, number>()
  const modules: string[] = []
  const css: string[] = []
  const cssSeen = new Set<string>()
  const emptyModule = () => {
    const known = ids.get('')
    if (known !== undefined) return known
    ids.set('', modules.length)
    modules.push('export {}')
    return modules.length - 1
  }
  /** Ordem de avaliação dos ES modules (pós-ordem em profundidade), que é a ordem do CSS no Vite. */
  const visit = (path: string): number => {
    if (path.endsWith('.css')) {
      // O CSS Modules do Vite exporta os nomes das classes: o módulo vazio daria outro resultado.
      if (path.endsWith('.module.css')) return hosted(`CSS Modules em ${path}`)
      if (!cssSeen.has(path)) {
        cssSeen.add(path)
        css.push(checkCss(path, fileText(tree, path) ?? ''))
      }
      return emptyModule()
    }
    const known = ids.get(path)
    if (known !== undefined) return known
    const index = modules.length
    ids.set(path, index)
    modules.push('')
    const content = fileText(tree, path) ?? ''
    if (path.endsWith('.json')) {
      modules[index] = jsonModule(path, content)
      return index
    }
    if (!SCRIPT.test(path)) return hosted(`tipo de arquivo que o navegador não monta: ${path}`)
    const { code, sources } = scriptSources(path, content)
    let rewritten = ''
    let cursor = 0
    for (const source of sources) {
      const resolved = resolveModule(tree, path, source.value)
      if (resolved.endsWith('.css') && !source.sideEffectOnly)
        return hosted(`CSS importado com nome em ${path}`)
      const target = visit(resolved)
      rewritten += `${code.slice(cursor, source.start)}${JSON.stringify(`${KEY}${target}`)}`
      cursor = source.end
    }
    modules[index] = rewritten + code.slice(cursor)
    return index
  }

  if (document.querySelector('base')) return hosted('<base> no index.html')
  const handled = new Set<Element>()
  for (const script of document.querySelectorAll('script')) {
    const type = (script.getAttribute('type') ?? '').trim().toLowerCase()
    const src = script.getAttribute('src')
    if (type === 'importmap') return hosted('mapa de importação no index.html')
    if (type !== 'module') {
      if (src !== null && localTarget(src) !== null) return hosted('script comum com arquivo local')
      continue
    }
    if (src === null) return hosted('script de módulo escrito dentro do index.html')
    const local = localTarget(src)
    if (local === null) return hosted('script de módulo de fora do projeto')
    const entry = visit(
      resolveModule(tree, 'index.html', local.startsWith('/') ? local : `./${local}`),
    )
    const replacement = document.createElement('script')
    replacement.setAttribute('type', 'module')
    replacement.textContent = `import ${JSON.stringify(`${KEY}${entry}`)}`
    script.replaceWith(replacement)
    handled.add(replacement)
  }
  if (!handled.size) return hosted('sem script de módulo')
  for (const link of document.querySelectorAll('link')) {
    const href = link.getAttribute('href')
    const local = href === null ? null : localTarget(href)
    if (local === null) continue
    const rel = (link.getAttribute('rel') ?? '').trim().toLowerCase()
    if (rel !== 'stylesheet') return hosted(`link local que o Vite reescreveria: ${local}`)
    const path = normalize(local)
    const text = path === null ? null : fileText(tree, path)
    if (path === null || text === null) return hosted(`folha de estilo não encontrada: ${local}`)
    const style = document.createElement('style')
    style.textContent = checkCss(path, text)
    link.replaceWith(style)
    handled.add(style)
  }
  // O Vite também passa os <style> e os atributos style do HTML pelo CSS dele.
  for (const style of document.querySelectorAll('style'))
    if (!handled.has(style)) checkCss('index.html', style.textContent ?? '')
  for (const element of document.querySelectorAll('[style]'))
    checkCss('index.html', element.getAttribute('style') ?? '')
  for (const element of document.querySelectorAll('[src],[href],[srcset],[poster],[data]')) {
    if (handled.has(element)) continue
    for (const name of ['src', 'href', 'srcset', 'poster', 'data']) {
      const value = element.getAttribute(name)
      if (value !== null && localTarget(value) !== null)
        return hosted(`referência local no index.html: ${value}`)
    }
  }

  const head = document.head
  if (css.length) {
    const style = document.createElement('style')
    style.textContent = css.join('\n')
    head.append(style)
  }
  const bootstrap = document.createElement('script')
  const encoded = JSON.stringify(modules).replace(/</g, '\\u003c')
  bootstrap.textContent = `(()=>{const s=${encoded};const m={};for(let i=0;i<s.length;i++)m[${JSON.stringify(KEY)}+i]=URL.createObjectURL(new Blob([s[i]],{type:"text/javascript"}));const e=document.createElement("script");e.type="importmap";e.textContent=JSON.stringify({imports:m});document.currentScript.after(e)})()`
  const policy = document.createElement('meta')
  policy.setAttribute('http-equiv', 'Content-Security-Policy')
  policy.setAttribute('content', LIGHT_PRO_CSP)
  const referrer = document.createElement('meta')
  referrer.setAttribute('name', 'referrer')
  referrer.setAttribute('content', 'no-referrer')
  head.prepend(policy, referrer, bootstrap)
  return {
    kind: 'light',
    html: `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
    modules: modules.length,
  }
}

/** Monta o projeto no navegador quando dá para ficar igual ao Vite; senão diz por que vai ao servidor. */
export function planLightProBuild(project: Project): LightProPlan {
  try {
    return plan(project)
  } catch (error) {
    if (error instanceof Hosted) return { kind: 'hosted', reason: error.message }
    throw error
  }
}
