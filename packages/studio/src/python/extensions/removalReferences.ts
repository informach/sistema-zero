import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import {
  isPythonLanguageSourcePath,
  PYTHON_LANGUAGE_LIMITS,
} from '@sistemazero/core/studio/python-language'
import type { PythonProjectDocument } from '../../core/editableProject'
import { pythonFilesToTree } from '../../state/pythonProjectLayout'
import { isNode } from '../blocks/nodes'
import { assertPythonVisualDraftSettled } from '../blocks/workspaceDraft'
import type { PythonAnalysisController } from '../language/controller'
import { pythonParentPath } from '../language/modulePaths'
import { PYTHON_ANALYSIS_LIMITS, type PythonValue } from '../language/types'

export interface PythonExtensionReference {
  path: string
  line: number
}
export class PythonExtensionInUseError extends Error {
  constructor(
    readonly references: PythonExtensionReference[],
    /** What is still in use and what to do, before the list of places. */
    reason?: { subject: string; advice: string },
  ) {
    const places = references
      .slice(0, 20)
      .map(({ path, line }) => `${path}:${line}`)
      .join(', ')
    super(
      `${reason?.subject ?? 'Turtle ainda é usada'} em ${places}. ${reason?.advice ?? 'Ajuste esses imports antes de remover.'} Seu código e seus materiais foram preservados.`,
    )
  }
}

/** What a removal or a swap looks for in the learner's code. */
export interface PythonReferenceQuery {
  /** Imported modules that count as a use (``import pyray``, ``from raylib import *``). */
  modules: readonly string[]
  /** Name shown in the messages (Turtle, Raylib 2D…). */
  label: string
  /**
   * When present, only these names count, wherever they are used: as a name (``draw_cube(…)``
   * after ``from pyray import *``) or as an attribute (``pyray.draw_cube``, ``rl.DrawCube``).
   * The imports themselves then do not count.
   */
  names?: ReadonlySet<string>
}

/** Only CPython AST data is inspected; learner source is never evaluated. */
export function inspectPythonTurtleRemoval(
  project: PythonProjectDocument,
  analysis: Pick<PythonAnalysisController, 'run'>,
  current: () => void,
): Promise<PythonExtensionReference[]> {
  return inspectPythonReferences(project, analysis, current, {
    modules: ['turtle'],
    label: 'Turtle',
  })
}

/** Where the learner's code uses a module (or some of its names); source is never evaluated. */
export async function inspectPythonReferences(
  project: PythonProjectDocument,
  analysis: Pick<PythonAnalysisController, 'run'>,
  current: () => void,
  query: PythonReferenceQuery,
): Promise<PythonExtensionReference[]> {
  assertPythonVisualDraftSettled(project)
  const tree = project.kind === 'classic' ? pythonFilesToTree(project.files) : project.tree
  const files = Object.entries(tree).flatMap(([path, file]) =>
    file.kind === 'file' && isPythonLanguageSourcePath(path)
      ? [{ path, source: file.content }]
      : [],
  )
  const sizes = files.map(({ source }) => new TextEncoder().encode(source).length)
  if (
    files.length > PYTHON_LANGUAGE_LIMITS.maxFiles ||
    sizes.some((size) => size > PYTHON_LANGUAGE_LIMITS.maxFileBytes) ||
    sizes.reduce((a, b) => a + b, 0) > PYTHON_LANGUAGE_LIMITS.maxTotalBytes
  )
    throw new Error(
      'O projeto ultrapassou o limite da análise de remoção. Seus arquivos foram preservados.',
    )
  const root = pythonParentPath(project.python.entrypoint)
  const base = root ? `${root}/` : ''
  // Namespace directories and analysis-only .pyi files do not hide the runtime module.
  // A module of the learner with the same name (pyray.py) is what the import loads.
  const modules = query.modules.filter(
    (module) =>
      ![`${base}${module}.py`, `${base}${module}/__init__.py`].some(
        (path) => tree[path]?.kind === 'file',
      ),
  )
  const instanceId = crypto.randomUUID()
  return analysis.run({
    current() {
      current()
      return true
    },
    async execute(parser) {
      const references: PythonExtensionReference[] = []
      let nodeCount = 0,
        tokenCount = 0
      for (const { path, source } of files) {
        current()
        const revision = await studioProDigest(source)
        current()
        const document = await parser.parse(
          { projectId: project.id, instanceId, generation: 1, path, revision },
          source,
        )
        current()
        if (!document.tree || document.diagnostics.length)
          throw new Error(
            `Não foi possível conferir ${path}: corrija a sintaxe antes de remover ${query.label}. Seus arquivos foram preservados.`,
          )
        tokenCount += document.tokens.length
        const pending: PythonValue[] = [document.tree]
        while (pending.length) {
          const value = pending.pop()!
          if (Array.isArray(value)) {
            pending.push(...value)
            continue
          }
          if (!isNode(value)) continue
          nodeCount++
          if (
            nodeCount > PYTHON_ANALYSIS_LIMITS.nodes ||
            tokenCount > PYTHON_ANALYSIS_LIMITS.tokens
          )
            throw new Error(
              'O projeto ultrapassou o limite da análise de remoção. Seus arquivos foram preservados.',
            )
          const level = value.fields.level
          const absoluteFrom =
            value.kind === 'ImportFrom' &&
            level &&
            typeof level === 'object' &&
            !Array.isArray(level) &&
            'literal' in level &&
            level.literal === 'int' &&
            level.value === '0'
          const imported =
            value.kind === 'Import' &&
            Array.isArray(value.fields.names) &&
            value.fields.names.some(
              (alias) =>
                isNode(alias) &&
                typeof alias.fields.name === 'string' &&
                modules.includes(alias.fields.name.split('.')[0]!),
            )
          const used = query.names
            ? (value.kind === 'Name' &&
                typeof value.fields.id === 'string' &&
                query.names.has(value.fields.id)) ||
              (value.kind === 'Attribute' &&
                typeof value.fields.attr === 'string' &&
                query.names.has(value.fields.attr))
            : imported ||
              (absoluteFrom &&
                typeof value.fields.module === 'string' &&
                modules.includes(value.fields.module.split('.')[0]!))
          if (modules.length && references.length < 20 && used) {
            const offset = value.range?.start ?? 0
            references.push({ path, line: source.slice(0, offset).split(/\r\n|\r|\n/).length })
          }
          pending.push(...Object.values(value.fields))
        }
      }
      current()
      return references.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
    },
  })
}
