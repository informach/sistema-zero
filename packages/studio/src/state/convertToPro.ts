import { parse as parseJavaScript } from '@babel/parser'
import { type DefaultTreeAdapterMap, parse, serialize } from 'parse5'
import type { Project, ProjectTree } from '#core'
import { loadProTemplate } from '../components/code/pro-templates'
import { buildClassicFileMap } from '../export/fileMap'
import { identityMinifiers } from '../export/minify'
import { THREE_VERSION } from '../three/threeRuntimeContract'

const PUBLIC_PREFIX = 'public/'

/**
 * Converte um projeto BÁSICO (3 arquivos + extras + extensões) numa ÁRVORE Vite
 * pronta pro modo profissional (graduação do D2). Reaproveita o build clássico
 * do export (SEM minificar — é código-fonte que o aluno vai editar) para gerar o
 * index.html de produção + os assets, e os encaixa num esqueleto Vite vanilla-ts.
 *
 * CSS e materiais ficam em public; scripts clássicos preservam seu escopo global e módulos existentes
 * vão para src/converted, mantendo as tags e a ordem do HTML. Three é uma dependência
 * npm real, sem importmap CDN. A persistência guarda o original antes do commit.
 */
export async function convertClassicToProTree(project: Project): Promise<ProjectTree> {
  const tree: ProjectTree = {}

  // Config do Vite vanilla (package.json/vite.config.ts/tsconfig.json). Não
  // copiamos o index.html nem o src/ do template — usamos os arquivos do aluno.
  const template = await loadProTemplate('vanilla-vite')
  if (template) {
    for (const [path, node] of Object.entries(template.tree)) {
      if (path === 'index.html' || path === 'src' || path.startsWith('src/')) continue
      tree[path] = { ...node }
    }
  }

  // Conversion fails on omitted/colliding source instead of accepting export warnings.
  const { files: assets, imports } = await buildClassicFileMap(project, identityMinifiers, {
    conversion: true,
  })
  // The classic starter references canonical files even when they are empty.
  // An empty source is still a real file in a Vite project, not a missing dependency.
  assets['public/script.js'] ??= project.files['script.js'] ?? ''
  assets['public/style.css'] ??= project.files['style.css'] ?? ''
  const assetNames = Object.keys(assets)
    .filter((p) => p.startsWith(PUBLIC_PREFIX) && p !== `${PUBLIC_PREFIX}index.html`)
    .map((p) => p.slice(PUBLIC_PREFIX.length))

  let indexHtml = asString(assets[`${PUBLIC_PREFIX}index.html`])
  for (const name of assetNames) {
    // href/src="style.css" | "./style.css" | "/style.css" → "/style.css"
    indexHtml = indexHtml.replace(
      new RegExp(`(href|src)="\\.?/?${escapeRegExp(name)}"`, 'g'),
      `$1="/${name}"`,
    )
  }
  tree['index.html'] = { kind: 'file', content: indexHtml }

  for (const [path, content] of Object.entries(assets)) {
    if (path === `${PUBLIC_PREFIX}index.html`) continue
    // Materialized from Project.assets by the same local/export coordinator.
    // Never duplicate base64 inside the persistent source tree.
    if (path === 'public/sz-assets.js') continue
    if (typeof content !== 'string') continue
    tree[path] = { kind: 'file', content }
  }

  if (Object.keys(imports).length) {
    // These are the installed engines of the classic editor, not arbitrary URLs
    // supplied by the project. Vite resolves their bare imports from npm in Pro.
    if (
      Object.keys(imports).some(
        (specifier) => specifier !== 'three' && !specifier.startsWith('three/addons/'),
      )
    )
      throw new Error(
        'Uma biblioteca deste jogo ainda não tem uma versão npm conhecida. O original foi mantido.',
      )
    const packageNode = tree['package.json']
    if (packageNode?.kind !== 'file') throw new Error('O modelo Pro não tem package.json.')
    const pkg = JSON.parse(packageNode.content)
    pkg.dependencies = { ...pkg.dependencies, three: THREE_VERSION }
    pkg.devDependencies = { ...pkg.devDependencies, '@types/three': THREE_VERSION }
    tree['package.json'] = { kind: 'file', content: `${JSON.stringify(pkg, null, 2)}\n` }
  }
  convertModuleSources(tree, project, imports)

  // JavaScript and original typed extras share real npm resolution. Conversion
  // does not suppress diagnostics for dependencies or generated source.
  tree['tsconfig.json'] = {
    kind: 'file',
    content: `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ESNext',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          allowJs: true,
          checkJs: true,
          noEmit: true,
          lib: ['ESNext', 'DOM'],
          skipLibCheck: true,
        },
        include: ['src', 'public/**/*.js'],
      },
      null,
      2,
    )}\n`,
  }

  return ensureDirNodes(tree)
}

type HtmlNode = DefaultTreeAdapterMap['node']
type HtmlElement = DefaultTreeAdapterMap['element']
function convertModuleSources(
  tree: ProjectTree,
  project: Project,
  imports: Record<string, string>,
) {
  const index = tree['index.html']
  if (index?.kind !== 'file') throw new Error('Conversão sem index.html.')
  const document = parse(index.content)
  const scripts: HtmlElement[] = []
  const visit = (node: HtmlNode) => {
    if ('tagName' in node && node.tagName === 'script') scripts.push(node)
    if ('childNodes' in node) for (const child of node.childNodes) visit(child)
  }
  visit(document)
  const classic = new Set<string>()
  for (const script of scripts) {
    const type = script.attrs.find((attr) => attr.name === 'type')?.value
    const src = script.attrs.find((attr) => attr.name === 'src')?.value
    if (src && type !== 'module') classic.add(src.replace(/^\.?\//, ''))
  }
  const typed = new Map(
    (project.extraFiles ?? [])
      .filter((extra) => /\.tsx?$/.test(extra.name))
      .map((extra) => [extra.name.replace(/\.tsx?$/, '.js'), extra]),
  )
  const moved = new Map<string, string>()
  for (const [path, node] of Object.entries(tree)) {
    if (!path.startsWith(PUBLIC_PREFIX) || !/\.(?:js|mjs|cjs)$/.test(path) || node.kind !== 'file')
      continue
    const relative = path.slice(PUBLIC_PREFIX.length)
    const source = typed.get(relative)
    if (classic.has(relative)) {
      if (source)
        throw new Error(
          'O arquivo TypeScript ' +
            source.name +
            ' é carregado como script global. Separe seus módulos antes da conversão; o original foi mantido.',
        )
      // Classic scripts retain their scope, position, attributes, window globals,
      // sloppy-mode behavior and document.currentScript. Never wrap them in ESM.
      continue
    }
    const destination = `src/converted/${source?.name ?? relative}`
    tree[destination] = { kind: 'file', content: source?.content ?? node.content }
    moved.set(relative, destination)
    delete tree[path]
  }
  for (const script of scripts) {
    const type = script.attrs.find((attr) => attr.name === 'type')?.value
    const src = script.attrs.find((attr) => attr.name === 'src')
    if (type === 'importmap') {
      const content = script.childNodes.map((node) => ('value' in node ? node.value : '')).join('')
      const map = JSON.parse(content)
      if (
        !map.imports ||
        map.scopes ||
        Object.keys(map).some((key) => key !== 'imports') ||
        Object.entries(map.imports).some(([name, url]) => imports[name] !== url)
      )
        throw new Error(
          'O importmap personalizado precisa ser migrado para dependências npm antes da conversão.',
        )
      remove(script)
    } else if (src) {
      const path = src.value.replace(/^\.?\//, '')
      if (type === 'module') {
        const destination = moved.get(path)
        if (!destination)
          throw new Error(
            `O módulo ${src.value} precisa estar nos arquivos do projeto antes da conversão.`,
          )
        src.value = `/${destination}`
      } else if (path !== 'sz-assets.js' && tree[`public/${path}`]?.kind !== 'file') {
        throw new Error(
          `O script ${src.value} precisa estar nos arquivos do projeto antes da conversão.`,
        )
      }
    }
    // Inline scripts and HTML event handlers keep their original execution semantics.
    // Vite processes existing module tags and leaves classic scripts as classic.
  }
  // Imports from a module must not silently acquire a second, divergent copy of
  // a file that is also executed globally. Fail before promotion in that case.
  for (const [relative, destination] of moved) {
    const node = tree[destination]
    if (node?.kind !== 'file') continue
    tree[destination] = {
      kind: 'file',
      content: rewriteImports(node.content, relative, destination.endsWith('.ts'), moved, classic),
    }
  }
  for (const relative of classic) {
    const node = tree[`public/${relative}`]
    if (node?.kind === 'file') rewriteImports(node.content, relative, false, moved, classic, true)
  }
  for (const script of scripts) {
    if (script.attrs.some((attr) => attr.name === 'src')) continue
    const type = script.attrs.find((attr) => attr.name === 'type')?.value ?? ''
    if (!['', 'module', 'text/javascript', 'application/javascript'].includes(type)) continue
    for (const child of script.childNodes) {
      if (!('value' in child)) continue
      child.value = rewriteImports(
        child.value,
        'index.html',
        false,
        moved,
        classic,
        type !== 'module',
        true,
      )
    }
  }
  tree['index.html'] = { kind: 'file', content: serialize(document) }
}

function rewriteImports(
  code: string,
  source: string,
  typed: boolean,
  moved: ReadonlyMap<string, string>,
  classic: ReadonlySet<string>,
  global = false,
  inline = false,
): string {
  const ast = parseJavaScript(code, {
    sourceType: global ? 'script' : 'module',
    plugins: typed ? ['typescript'] : [],
    createImportExpressions: true,
  })
  const edits: Array<{ start: number; end: number; value: string }> = []
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    const node = value as Record<string, unknown>
    if (
      [
        'ImportDeclaration',
        'ExportNamedDeclaration',
        'ExportAllDeclaration',
        'ImportExpression',
      ].includes(String(node.type))
    ) {
      const specifier = node.source as {
        type?: string
        value?: string
        start?: number
        end?: number
      } | null
      if (global)
        throw new Error(
          `O script global ${source} usa importação dinâmica. Migre essa importação explicitamente antes da conversão; o original foi mantido.`,
        )
      if (
        specifier?.type === 'StringLiteral' &&
        typeof specifier.value === 'string' &&
        /^[./]/.test(specifier.value)
      ) {
        const base = source.split('/').slice(0, -1)
        const parts = specifier.value.startsWith('/') ? [] : [...base]
        for (const part of specifier.value.split('/')) {
          if (part === '..') parts.pop()
          else if (part && part !== '.') parts.push(part)
        }
        const relative = parts.join('/')
        if (classic.has(relative))
          throw new Error(
            `O arquivo ${relative} é usado como módulo e script global. Separe esses usos antes da conversão; o original foi mantido.`,
          )
        const target = moved.get(relative)
        if (
          target &&
          (inline || specifier.value.startsWith('/')) &&
          typeof specifier.start === 'number' &&
          typeof specifier.end === 'number'
        )
          edits.push({
            start: specifier.start,
            end: specifier.end,
            value: JSON.stringify(`/${target}`),
          })
      }
    }
    for (const [key, child] of Object.entries(node)) if (key !== 'loc') visit(child)
  }
  visit(ast.program)
  for (const edit of edits.sort((a, b) => b.start - a.start))
    code = code.slice(0, edit.start) + edit.value + code.slice(edit.end)
  return code
}

function remove(node: HtmlNode) {
  if ('parentNode' in node && node.parentNode)
    node.parentNode.childNodes = node.parentNode.childNodes.filter((child) => child !== node)
}

function asString(content: string | Uint8Array | undefined): string {
  if (content == null) return ''
  return typeof content === 'string' ? content : new TextDecoder().decode(content)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Garante um nó de pasta explícito para cada diretório ancestral (ProjectTree). */
function ensureDirNodes(tree: ProjectTree): ProjectTree {
  const out: ProjectTree = { ...tree }
  for (const path of Object.keys(tree)) {
    const segments = path.split('/')
    for (let i = 1; i < segments.length; i += 1) {
      const dir = segments.slice(0, i).join('/')
      if (!out[dir]) out[dir] = { kind: 'dir' }
    }
  }
  return out
}
