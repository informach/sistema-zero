import type { ProjectTree } from '../../core/proProject'
import type { ProTextEdit } from '../../monaco/pro/languageService'
import { renameProNode } from '../../state/proTree'
import { normalizePythonProjectPath } from '../../state/pythonProjectLayout'
import { isNode, nodes } from '../blocks/nodes'
import {
  absolutePythonImport,
  movedPythonPath,
  type PythonModuleLocation,
  pythonModulePaths,
  pythonPathWithin,
  relativePythonImport,
} from './modulePaths'
import standardModules from './standardModules.json'
import type { PythonNode, PythonParsedDocument, PythonToken, PythonValue } from './types'

// CPython 3.14.2 sys.stdlib_module_names plus interpreter-owned browser modules.
// A cached, builtin or frozen module may outrank a source file; never guess its binding.
const reservedModules = new Set([
  ...standardModules,
  'js',
  'pyodide',
  'pyodide_js',
  '_pyodide',
  '_pyodide_core',
])
function inertPackage(document: PythonParsedDocument | undefined) {
  const body = document?.tree?.fields.body
  return (
    nodes(body) &&
    body.every(
      (statement) =>
        statement.kind === 'Pass' ||
        (statement.kind === 'Expr' &&
          isNode(statement.fields.value) &&
          statement.fields.value.kind === 'Constant' &&
          typeof statement.fields.value.fields.value === 'string'),
    )
  )
}

const sameLocation = (a: PythonModuleLocation | null, b: PythonModuleLocation | null) =>
  a?.path === b?.path && a?.kind === b?.kind

function imports(value: PythonValue, found: PythonNode[] = []): PythonNode[] {
  if (Array.isArray(value)) for (const child of value) imports(child, found)
  else if (isNode(value)) {
    if (value.kind === 'Import' || value.kind === 'ImportFrom') found.push(value)
    else for (const child of Object.values(value.fields)) imports(child, found)
  }
  return found
}
function identifier(value: PythonValue | undefined): string {
  if (typeof value !== 'string') throw new Error('O parser não identificou o nome deste import.')
  return value
}
function relativeLevel(node: PythonNode) {
  const level = node.fields.level
  if (
    !level ||
    typeof level !== 'object' ||
    Array.isArray(level) ||
    !('literal' in level) ||
    level.literal !== 'int' ||
    !/^\d{1,3}$/.test(level.value)
  )
    throw new Error('O parser não identificou o nível deste import relativo.')
  return Number(level.value)
}

/** Plan imports from CPython AST/tokens; never replace matching words in arbitrary source text. */
export function planPythonFileImports(input: {
  tree: ProjectTree
  documents: Readonly<Record<string, PythonParsedDocument>>
  entrypoint: string
  from: string
  /** Omitted when only collecting references before deletion. */
  to?: string
}): { edits: ProTextEdit[]; references: string[] } {
  const { tree, documents, from, to, entrypoint } = input
  const before = pythonModulePaths(tree, entrypoint)
  const references = new Set<string>()
  const edits: ProTextEdit[] = []
  const relevant =
    tree[from]?.kind === 'dir' ||
    Object.entries(tree).some(
      ([path, node]) =>
        node.kind === 'file' && /\.pyi?$/.test(path) && pythonPathWithin(path, from),
    )
  if (!relevant) return { edits, references: [] }
  if (to && /(^|\/)__init__\.pyi?$/.test(from))
    throw new Error('Mova a pasta do pacote para preservar seu __init__.py e seus imports.')
  const moved = (path: string) => (to ? movedPythonPath(path, from, to) : path)
  if (to)
    for (const [path, node] of Object.entries(tree)) {
      if (node.kind !== 'file' || !path.endsWith('.py') || tree[`${path}i`]?.kind !== 'file')
        continue
      if (`${moved(path)}i` !== moved(`${path}i`))
        throw new Error(
          `Mova a pasta que contém ${path} e seu arquivo de tipagem .pyi juntos para preservar seus imports.`,
        )
    }
  const changed = to ? renameProNode(tree, from, to, normalizePythonProjectPath) : null
  if (changed && !changed.tree)
    throw new Error(changed.error ?? 'Não foi possível planejar a mudança.')
  const after = to ? pythonModulePaths(changed!.tree!, moved(entrypoint)) : before
  const affects = (location: PythonModuleLocation | null) =>
    location &&
    (pythonPathWithin(location.path, from) ||
      (from.endsWith('.pyi') && location.path === from.slice(0, -1)) ||
      (/\/__init__\.pyi?$/.test(from) &&
        pythonPathWithin(location.path, from.slice(0, from.lastIndexOf('/')))))
  function nextName(location: PythonModuleLocation) {
    const next = { ...location, path: moved(location.path) }
    const name = after.nameOf(next)
    if (!name || !sameLocation(after.resolve(name), next))
      throw new Error(
        `O novo caminho de ${location.path} não pode ser importado a partir do arquivo inicial. Escolha um nome de módulo e uma pasta acessíveis.`,
      )
    const oldName = before.nameOf(location)
    if (oldName !== name) {
      if (
        reservedModules.has(oldName?.split('.')[0] ?? '') ||
        reservedModules.has(name.split('.')[0]!)
      )
        throw new Error(
          'Este caminho coincide com um módulo do Python ou do ambiente. Separe o módulo do projeto antes de reorganizar seus imports.',
        )
      for (const [index, target] of [
        [before, location],
        [after, next],
      ] as const) {
        const qualified = index.nameOf(target)
        const parts = qualified?.split('.') ?? []
        const count = target.kind === 'module' ? parts.length - 1 : parts.length
        for (let size = 1; size <= count; size++) {
          const parent = index.resolve(parts.slice(0, size).join('.'))
          if (parent?.kind !== 'package') continue
          // The destination tree has new paths; ASTs still belong to the original source.
          const original =
            index === after && to && pythonPathWithin(parent.path, to)
              ? from + parent.path.slice(to.length)
              : parent.path
          if (!inertPackage(documents[`${original}/__init__.py`]))
            throw new Error(
              `O pacote ${original} executa código em __init__.py e pode definir atributos ou mudar seus imports. Revise esse pacote antes de mover módulos.`,
            )
        }
      }
    }
    return name
  }
  for (const [path, node] of Object.entries(tree)) {
    if (node.kind !== 'file' || !/\.pyi?$/.test(path)) continue
    const document = documents[path]
    if (!document?.tree || document.source !== node.content || document.diagnostics.length)
      throw new Error(`Corrija a sintaxe de ${path} antes de reorganizar os imports.`)
    const fail = (message: string): never => {
      throw new Error(`${path}: ${message}`)
    }
    const tokensFor = (node: PythonNode) => {
      if (!node.range) return fail('O import não tem uma posição comprovada pelo parser.')
      let low = 0,
        high = document.tokens.length
      while (low < high) {
        const middle = (low + high) >>> 1
        if (document.tokens[middle]!.range.start < node.range.start) low = middle + 1
        else high = middle
      }
      const tokens: PythonToken[] = []
      for (let index = low; index < document.tokens.length; index++) {
        const token = document.tokens[index]!
        if (token.range.end > node.range.end) break
        tokens.push(token)
      }
      return tokens
    }
    const replace = (tokens: PythonToken[], value: string) => {
      const first = tokens[0],
        last = tokens.at(-1)
      if (!first || !last || tokens.some((token) => token.kind === 'COMMENT'))
        return fail('Separe os comentários do nome do módulo antes de movê-lo.')
      const start = first.range.start,
        end = last.range.end
      if (document.source.slice(start, end) !== value)
        edits.push({ path, start, length: end - start, text: value })
    }
    function renameAlias(alias: PythonNode, name: string, preserveBinding: boolean) {
      const old = identifier(alias.fields.name)
      if (old === name) return
      const tokens = tokensFor(alias),
        as = tokens.findIndex((token) => token.kind === 'NAME' && token.text === 'as')
      const aliasTokens = as < 0 ? tokens : tokens.slice(0, as)
      if (as < 0 && preserveBinding && old.includes('.'))
        return fail(
          `O import ${old} precisa de um apelido explícito antes desta mudança (import ${old} as nome). Assim, os usos do módulo continuam inequívocos.`,
        )
      replace(aliasTokens, name + (as < 0 && preserveBinding ? ` as ${old}` : ''))
    }
    for (const statement of imports(document.tree)) {
      if (!nodes(statement.fields.names)) return fail('A lista de imports não foi reconhecida.')
      const names = statement.fields.names
      if (statement.kind === 'Import') {
        for (const alias of names) {
          const name = identifier(alias.fields.name),
            target = before.resolve(name)
          if (affects(target)) references.add(path)
          if (!to) continue
          if (!target) {
            if (after.resolve(name))
              return fail(`A mudança faria ${name} esconder um módulo externo.`)
            continue
          }
          renameAlias(alias, nextName(target), true)
        }
        continue
      }
      const level = relativeLevel(statement)
      const module = statement.fields.module === null ? null : identifier(statement.fields.module)
      const oldPackage = path === entrypoint ? null : before.packageOf(path)
      const base = absolutePythonImport(oldPackage, module, level)
      const target = before.resolve(base)
      if (affects(target)) references.add(path)
      let newBase = target && to ? nextName(target) : base
      const nextNames = new Map<PythonNode, string>()
      const desiredBases = new Set<string>()
      for (const alias of names) {
        const name = identifier(alias.fields.name)
        if (
          name === '*' &&
          target &&
          target.kind !== 'module' &&
          pythonPathWithin(from, target.path)
        ) {
          references.add(path)
          if (to)
            return fail(
              'Substitua import * por nomes explícitos antes de mover os módulos desse pacote. As exportações podem depender do arquivo movido.',
            )
        }
        const child =
          name !== '*' && target?.kind !== 'module' ? before.resolve(`${base}.${name}`) : null
        if (affects(child)) references.add(path)
        if (!to) continue
        if (child) {
          const full = nextName(child),
            last = full.lastIndexOf('.')
          if (last < 0)
            return fail(
              'Este módulo deixaria o pacote. Use um import separado com apelido antes de movê-lo.',
            )
          const childBase = full.slice(0, last),
            childName = full.slice(last + 1)
          if (childName !== name && target?.kind === 'package') {
            const initializer = documents[`${target.path}/__init__.py`]
            if (
              initializer?.tokens.some(
                (token) => token.kind === 'NAME' && token.text.normalize('NFKC') === name,
              )
            )
              return fail(
                `O pacote também usa o nome ${name} em __init__.py. Use um import direto com apelido para distinguir o módulo desse atributo.`,
              )
          }
          desiredBases.add(childBase)
          nextNames.set(alias, childName)
        } else desiredBases.add(newBase)
      }
      if (!to) continue
      if (!target && after.resolve(base))
        return fail(`A mudança faria ${base} esconder um módulo externo.`)
      if (desiredBases.size > 1)
        return fail(
          'Separe este from/import em comandos individuais antes de mover módulos para pacotes diferentes.',
        )
      newBase = [...desiredBases][0] ?? newBase
      const newPackage = moved(path) === moved(entrypoint) ? null : after.packageOf(moved(path))
      const header = level ? relativePythonImport(newPackage, newBase) : newBase
      if (header !== '.'.repeat(level) + (module ?? '')) {
        const tokens = tokensFor(statement),
          end = tokens.findIndex((token) => token.kind === 'NAME' && token.text === 'import')
        if (end < 2) return fail('O nome do módulo não foi localizado no import.')
        replace(tokens.slice(1, end), header)
      }
      for (const [alias, name] of nextNames) renameAlias(alias, name, true)
    }
  }
  return { edits, references: [...references] }
}
