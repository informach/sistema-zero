import type { PythonProjectDocument } from '../core/editableProject'
import type { ProjectTree } from '../core/proProject'
import { preservePythonWorkspaceDraft } from '../python/blocks/workspaceDraft'
import { addProDir, addProFile, removeProNode, renameProNode } from './proTree'
import {
  normalizePythonProjectPath,
  pythonFilesToTree,
  pythonProjectLayoutError,
} from './pythonProjectLayout'

type EditResult =
  | { project: PythonProjectDocument; error?: never }
  | { error: string; project?: never }

function withTree(
  source: PythonProjectDocument,
  tree: ProjectTree,
  entrypoint = source.python.entrypoint,
  moved?: { from: string; to: string },
): EditResult {
  const project: PythonProjectDocument =
    source.kind === 'pro'
      ? { ...source, tree, python: { ...source.python, entrypoint } }
      : {
          ...source,
          files: Object.fromEntries(
            Object.entries(tree).flatMap(([path, node]) =>
              node.kind === 'file' ? [[path, node.content]] : [],
            ),
          ),
          ir: null,
          blocksState: null,
          bridgeCodeAhead: true,
        }
  if (source.kind === 'classic' && project.kind === 'classic') {
    try {
      project.blocksState = preservePythonWorkspaceDraft(source, project.files, moved)
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível preservar os blocos deste projeto.',
      }
    }
  }
  const error = pythonProjectLayoutError(project)
  return error ? { error } : { project }
}

export function addPythonProjectNode(
  source: PythonProjectDocument,
  path: string,
  kind: 'file' | 'dir',
): EditResult {
  if (kind === 'dir' && source.kind !== 'pro')
    return { error: 'Use o modo Pro para organizar pastas vazias.' }
  const tree = source.kind === 'pro' ? source.tree : pythonFilesToTree(source.files)
  const result =
    kind === 'file'
      ? addProFile(tree, path, normalizePythonProjectPath)
      : addProDir(tree, path, normalizePythonProjectPath)
  return result.tree
    ? withTree(source, result.tree)
    : { error: result.error ?? 'Não foi possível criar o arquivo.' }
}

export function renamePythonProjectNode(
  source: PythonProjectDocument,
  from: string,
  to: string,
): EditResult {
  const tree = source.kind === 'pro' ? source.tree : pythonFilesToTree(source.files)
  const result = renameProNode(tree, from, to, normalizePythonProjectPath)
  if (!result.tree) return { error: result.error ?? 'Não foi possível renomear o arquivo.' }
  const normalized = normalizePythonProjectPath(to)!
  const entry = source.python.entrypoint
  const entrypoint =
    source.kind === 'pro' && (entry === from || entry.startsWith(`${from}/`))
      ? normalized + entry.slice(from.length)
      : entry
  if (!entrypoint.endsWith('.py')) return { error: 'O arquivo inicial precisa ter a extensão .py.' }
  return withTree(source, result.tree, entrypoint, { from, to: normalized })
}

export function removePythonProjectNode(source: PythonProjectDocument, path: string): EditResult {
  const tree = source.kind === 'pro' ? source.tree : pythonFilesToTree(source.files)
  return withTree(source, removeProNode(tree, path))
}
