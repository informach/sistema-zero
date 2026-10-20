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
  constructor(readonly references: PythonExtensionReference[]) {
    super(
      `Turtle ainda é usada em ${references
        .slice(0, 20)
        .map(({ path, line }) => `${path}:${line}`)
        .join(
          ', ',
        )}. Ajuste esses imports antes de remover. Seu código e seus materiais foram preservados.`,
    )
  }
}

/** Only CPython AST data is inspected; learner source is never evaluated. */
export async function inspectPythonTurtleRemoval(
  project: PythonProjectDocument,
  analysis: Pick<PythonAnalysisController, 'run'>,
  current: () => void,
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
  const shadowed = [`${base}turtle.py`, `${base}turtle/__init__.py`].some(
    (path) => tree[path]?.kind === 'file',
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
            `Não foi possível conferir ${path}: corrija a sintaxe antes de remover Turtle. Seus arquivos foram preservados.`,
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
                alias.fields.name.split('.')[0] === 'turtle',
            )
          if (
            !shadowed &&
            references.length < 20 &&
            (imported ||
              (absoluteFrom &&
                typeof value.fields.module === 'string' &&
                value.fields.module.split('.')[0] === 'turtle'))
          ) {
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
