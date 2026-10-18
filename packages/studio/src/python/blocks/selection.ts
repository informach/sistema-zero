import type { PythonNode } from '../language/types'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec, PythonBlockRole } from './contract'

/** A small first palette; the dependency graph adds only the helpers it actually needs. */
export const PYTHON_STARTER_BLOCK_IDS = Object.freeze([
  'sz_py_assign',
  'sz_py_arithmetic',
  'sz_py_negative',
  'sz_py_compare',
  'sz_py_if',
  'sz_py_for',
  'sz_py_range',
  'sz_py_print',
  'sz_py_input',
  'sz_py_int',
] as const)

const semanticDependencies: Readonly<Record<string, readonly string[]>> = {
  sz_py_variable: ['sz_py_assign'],
  sz_py_function: ['sz_py_return', 'sz_py_call'],
  sz_py_return: ['sz_py_function'],
  sz_py_class: ['sz_py_function', 'sz_py_attribute', 'sz_py_assign', 'sz_py_call'],
  sz_py_import: ['sz_py_alias'],
  sz_py_import_from: ['sz_py_alias'],
  sz_py_parameters: ['sz_py_parameter'],
  sz_py_break: ['sz_py_for'],
  sz_py_continue: ['sz_py_for'],
  sz_py_len: ['sz_py_list'],
  sz_py_random_choice: ['sz_py_list'],
  sz_py_text_join: ['sz_py_list'],
  sz_py_subscript: ['sz_py_list', 'sz_py_dictionary'],
  sz_py_delete: ['sz_py_list', 'sz_py_dictionary'],
  sz_py_set_create: ['sz_py_list'],
}
const receiverDependencies = {
  text: ['sz_py_text'],
  List: ['sz_py_list'],
  Tuple: ['sz_py_tuple'],
  Dict: ['sz_py_dictionary'],
  Set: ['sz_py_set', 'sz_py_set_create'],
} as const
export interface PythonCatalogEntry {
  id: string
  owner: PythonBlockCodec['owner']
  title: string
  path: readonly string[]
  level: 1 | 2 | 3
  role: PythonBlockRole
  api: string
  help: string
  dependencies: readonly string[]
  starter?: boolean
}

/** Framework-free metadata shared by toolbox/search, admin, help and assistant context. */
export function describePythonCatalog(
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
): readonly PythonCatalogEntry[] {
  const ids = new Set(codecs.map((codec) => codec.id))
  if (ids.size !== codecs.length) throw new Error('O catálogo Python tem identidades duplicadas.')
  return codecs.map((codec) => {
    const dependencies = new Set([
      ...(semanticDependencies[codec.id] ?? []),
      ...(codec.dependencies ?? []),
    ])
    for (const kind of codec.receiverKinds ?? []) {
      for (const id of receiverDependencies[kind]) dependencies.add(id)
      dependencies.add('sz_py_assign')
    }
    const seen = new Set<PythonNode>()
    function child(value: PythonNode, role: PythonBlockRole) {
      if (seen.has(value)) return
      seen.add(value)
      // Defaults are trusted catalog examples, not learner code: no alias inference here.
      const found = codecs.find(
        (candidate) =>
          (candidate.role === role || (role === 'format' && candidate.id === 'sz_py_text')) &&
          (!candidate.bindingFor ||
            JSON.stringify(candidate.bindingFor(value)) ===
              JSON.stringify(candidate.bindingFor(candidate.defaultNode()))) &&
          candidate.decode(value),
      )
      if (!found) throw new Error(`O exemplo de ${codec.id} depende de uma sintaxe sem bloco.`)
      if (found.id !== codec.id) dependencies.add(found.id)
    }
    const shape = codec.decode(codec.defaultNode())
    if (!shape) throw new Error(`O bloco ${codec.id} não possui exemplo válido.`)
    for (const input of shape.inputs) for (const value of input.nodes) child(value, input.role)
    for (const control of codec.controls ?? []) {
      if (!codec.reshape) throw new Error(`O bloco ${codec.id} não implementa sua opção.`)
      const expanded = codec.reshape(
        shape,
        control.key,
        control.kind === 'optional'
          ? true
          : Math.max(Number(shape.extra?.[control.key] ?? 0), 1, control.minimum ?? 0),
      )
      for (const input of expanded.inputs) for (const value of input.nodes) child(value, input.role)
    }
    if (codec.role === 'value') dependencies.add('sz_py_expression')
    if (codec.binding?.module) dependencies.add('sz_py_import')
    for (const id of dependencies)
      if (!ids.has(id)) throw new Error(`Dependência Python não registrada: ${id}.`)
    return Object.freeze({
      id: codec.id,
      owner: codec.owner,
      title: codec.title,
      path: Object.freeze([
        codec.owner === 'programming' ? 'Programação' : 'Turtle',
        codec.category,
      ]),
      level: codec.level,
      role: codec.role,
      api: codec.api,
      help: codec.help,
      dependencies: Object.freeze([...dependencies].sort()),
      ...(codec.starter ? { starter: true } : {}),
    })
  })
}

export interface PythonPaletteSelection {
  entries: readonly PythonCatalogEntry[]
  explicitIds: readonly string[]
  dependencyIds: readonly string[]
}

/** Selection never grants runtime capabilities or installs an extension. */
export function selectPythonPalette(options: {
  level: 1 | 2 | 3
  /** Explicit admin curation may include an advanced approved block at an earlier level. */
  allowBlocks?: readonly string[]
  /** Additional categories, used only when there is no explicit block curation. */
  allowCategories?: readonly string[]
  installedExtensions: ReadonlySet<string>
  /** Required host gate: unfinished/unqualified codecs cannot leak into a palette. */
  approvedBlockIds: ReadonlySet<string>
  catalog?: readonly PythonCatalogEntry[]
}): PythonPaletteSelection {
  const catalog = options.catalog ?? describePythonCatalog()
  const registry = new Map(catalog.map((entry) => [entry.id, entry]))
  if (registry.size !== catalog.length)
    throw new Error('O catálogo Python tem identidades duplicadas.')
  const installed = (entry: PythonCatalogEntry) =>
    entry.owner === 'programming' || options.installedExtensions.has(entry.owner)
  const allowed = (entry: PythonCatalogEntry) =>
    installed(entry) && options.approvedBlockIds.has(entry.id)
  // Preserve the existing lesson curation contract: an empty list means level policy.
  const requested = options.allowBlocks?.length
    ? [...new Set(options.allowBlocks)]
    : options.level === 1
      ? [
          ...PYTHON_STARTER_BLOCK_IDS,
          ...catalog
            .filter((entry) => entry.owner !== 'programming' && entry.starter)
            .map((entry) => entry.id),
        ].filter((id) => {
          const entry = registry.get(id)
          return entry && allowed(entry)
        })
      : catalog
          .filter((entry) => entry.level <= options.level && allowed(entry))
          .map((entry) => entry.id)
  if (!options.allowBlocks?.length && options.allowCategories?.length)
    for (const entry of catalog)
      if (
        allowed(entry) &&
        options.allowCategories.some((category) => entry.path.slice(1).includes(category)) &&
        !requested.includes(entry.id)
      )
        requested.push(entry.id)
  const selected = new Set<string>()
  function add(id: string) {
    if (selected.has(id)) return
    const entry = registry.get(id)
    if (!entry) throw new Error(`Bloco Python desconhecido na seleção: ${id}.`)
    if (!allowed(entry))
      throw new Error(`O bloco ${entry.title} depende de um recurso indisponível nesta tarefa.`)
    selected.add(id)
    for (const dependency of entry.dependencies) add(dependency)
  }
  for (const id of requested) add(id)
  const explicit = new Set(requested)
  return Object.freeze({
    entries: Object.freeze(catalog.filter((entry) => selected.has(entry.id))),
    explicitIds: Object.freeze(requested),
    dependencyIds: Object.freeze([...selected].filter((id) => !explicit.has(id))),
  })
}

export function searchPythonPalette(selection: PythonPaletteSelection, query: string) {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR')
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean)
  return selection.entries.filter((entry) => {
    const text = normalize([entry.title, entry.api, entry.help, ...entry.path].join(' '))
    return terms.every((term) => text.includes(term))
  })
}
