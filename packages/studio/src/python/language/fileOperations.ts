import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import {
  applyPythonLanguagePatch,
  isPythonLanguageSourcePath,
  parsePythonLanguageCommand,
} from '@sistemazero/core/studio/python-language'
import type { ProjectTree } from '../../core/proProject'
import type { ProTextEdit } from '../../monaco/pro/languageService'
import { applyProTextEdits } from '../../state/proTextEdits'
import { isNode } from '../blocks/nodes'
import { createPythonAnalysisController } from './controller'
import { planPythonFileImports } from './fileImports'
import { pythonPathWithin } from './modulePaths'
import { assertPythonRenameIdentifier } from './renameIdentifier'
import { PYTHON_ANALYSIS_LIMITS, type PythonParsedDocument, type PythonValue } from './types'

function sourceFiles(tree: ProjectTree) {
  return Object.entries(tree).flatMap(([path, file]) =>
    file.kind === 'file' && isPythonLanguageSourcePath(path)
      ? [{ path, source: file.content, version: 1 }]
      : [],
  )
}
function preflight(tree: ProjectTree, entrypoint: string) {
  const changes = sourceFiles(tree)
  const command = parsePythonLanguageCommand({
    version: 1,
    id: 'imports',
    kind: 'sync',
    entrypoint,
    baseRevision: 0,
    revision: 1,
    changes,
  })
  if (command.kind !== 'sync') throw new Error('Pedido de análise inválido.')
  applyPythonLanguagePatch({ revision: 0, files: {} }, new Map(), command)
  return changes
}
function nodeCount(value: PythonValue): number {
  if (Array.isArray(value)) return value.reduce((total, child) => total + nodeCount(child), 0)
  return isNode(value)
    ? 1 + Object.values(value.fields).reduce((total, child) => total + nodeCount(child), 0)
    : 0
}

/** A lazy, isolated CPython parser; source is parsed as data and never executed. */
export function createPythonFileOperations(
  options: Parameters<typeof createPythonAnalysisController>[0],
) {
  const controller = createPythonAnalysisController(options)
  const instanceId = crypto.randomUUID()
  let disposed = false,
    generation = 0
  async function plan(
    tree: ProjectTree,
    operation:
      | { kind: 'file'; from: string; to?: string }
      | { kind: 'symbol'; name: string; edits: ProTextEdit[] },
  ) {
    const project = options.project()
    if (disposed || project?.kind !== 'pro') throw new Error('O editor Python foi encerrado.')
    if (operation.kind === 'file' && !tree[operation.from]) throw new Error('Item não encontrado.')
    if (operation.kind === 'symbol' && (!operation.name || operation.name.length > 256))
      throw new Error('Escolha um nome Python válido com até 256 caracteres.')
    const captured = ++generation
    const current = () => !disposed && captured === generation && options.project() === project
    const files = preflight(tree, project.python.entrypoint)
    for (const file of files) {
      const saved = project.tree[file.path]
      if (saved?.kind !== 'file' || saved.content !== file.source)
        throw new Error('O código mudou. Abra a operação novamente.')
    }
    if (
      operation.kind === 'file' &&
      tree[operation.from]?.kind !== 'dir' &&
      !files.some(({ path }) => pythonPathWithin(path, operation.from))
    )
      return { edits: [], references: [] }
    return controller.run({
      current,
      async execute(parser) {
        const documents: Record<string, PythonParsedDocument> = {}
        let nodes = 0,
          tokens = 0
        const parse = async (
          path: string,
          source: string,
          message?: string,
          compilable = false,
        ) => {
          const revision = await studioProDigest(source)
          if (!current()) throw new DOMException('O projeto mudou.', 'AbortError')
          const document = await parser.parse(
            {
              projectId: project.id,
              instanceId,
              generation: captured,
              path,
              revision,
            },
            source,
            undefined,
            { compilable },
          )
          if (!document.tree || document.diagnostics.length)
            throw new Error(
              message ??
                `Corrija ${path} antes desta mudança: ${document.diagnostics[0]?.message ?? 'sintaxe inválida'}`,
            )
          return document
        }
        const validateEdits = async (edits: ProTextEdit[]) => {
          const candidate = applyProTextEdits(tree, edits)
          preflight(candidate, project.python.entrypoint)
          for (const path of new Set(edits.map((edit) => edit.path))) {
            const file = candidate[path]
            if (file?.kind !== 'file' || !isPythonLanguageSourcePath(path))
              throw new Error('A mudança deve alcançar apenas arquivos Python do projeto.')
            await parse(path, file.content, undefined, true)
          }
        }
        if (operation.kind === 'symbol') {
          const identifier = await parse(
            project.python.entrypoint,
            `${operation.name} = None\n`,
            'Escolha um nome Python válido, sem espaços nem palavras reservadas.',
            true,
          )
          assertPythonRenameIdentifier(identifier, operation.name)
          await validateEdits(operation.edits)
          return { edits: operation.edits, references: [] }
        }
        for (const { path, source } of files) {
          const document = await parse(path, source)
          // Bound retained ASTs across the whole operation, not only each individual file.
          nodes += nodeCount(document.tree)
          tokens += document.tokens.length
          if (nodes > PYTHON_ANALYSIS_LIMITS.nodes || tokens > PYTHON_ANALYSIS_LIMITS.tokens)
            throw new Error(
              'Este projeto ultrapassa o limite de reorganização dos imports. Seus arquivos foram preservados.',
            )
          documents[path] = document
        }
        const result = planPythonFileImports({
          tree,
          documents,
          entrypoint: project.python.entrypoint,
          from: operation.from,
          to: operation.to,
        })
        if (result.edits.length) await validateEdits(result.edits)
        return result
      },
    })
  }
  return {
    async rename(tree: ProjectTree, from: string, to: string) {
      return (await plan(tree, { kind: 'file', from, to })).edits
    },
    async references(tree: ProjectTree, path: string) {
      return (await plan(tree, { kind: 'file', from: path })).references
    },
    async validateRename(tree: ProjectTree, name: string, edits: ProTextEdit[]) {
      await plan(tree, { kind: 'symbol', name, edits })
    },
    dispose() {
      disposed = true
      generation++
      controller.dispose()
    },
  }
}
