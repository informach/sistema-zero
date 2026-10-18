import {
  isStudioPortablePath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/portable-path'
import {
  STUDIO_PRO_BUILD_LIMITS,
  type StudioProBuildLimits,
  studioProBuildFileLimitError,
} from '@sistemazero/core/studio/pro-build'
import { STUDIO_PRO_REVISION_LIMITS } from '@sistemazero/core/studio/pro-revision'
import type { StudioProjectTree as ProjectTree } from '@sistemazero/core/studio/project-document'
import type { PythonProjectDocument } from '../core/pythonProject'

export interface PythonProjectLayoutLimits extends Partial<StudioProBuildLimits> {
  /** Classic source files other than the entrypoint and requirements.txt. */
  maxExtraFiles?: number
}

/** No schema clone, hashing, interpreter or material decoding on a source edit. */
export function pythonProjectLayoutIssue(
  project: PythonProjectDocument,
  limits: PythonProjectLayoutLimits = {},
): { code: 'invalid-document' | 'too-large'; message: string } | null {
  const files: Record<string, string> = Object.create(null)
  const directories: string[] = []
  if (project.kind === 'pro') {
    for (const [path, node] of Object.entries(project.tree)) {
      if (node.kind === 'file') files[path] = node.content
      else directories.push(path)
      const parts = path.split('/')
      for (let index = 1; index < parts.length; index++)
        if (project.tree[parts.slice(0, index).join('/')]?.kind !== 'dir')
          return {
            code: 'invalid-document',
            message: 'As pastas dos arquivos precisam existir no projeto.',
          }
    }
  } else Object.assign(files, project.files)
  if ([...Object.keys(files), ...directories].some((path) => !isStudioPortablePath(path)))
    return {
      code: 'invalid-document',
      message: 'Use caminhos relativos portáteis, sem atalhos de pasta ou nomes reservados.',
    }
  if (typeof files[project.python.entrypoint] !== 'string')
    return { code: 'invalid-document', message: 'O arquivo inicial precisa continuar no projeto.' }
  const effective: StudioProBuildLimits = {
    maxFiles: Math.min(STUDIO_PRO_BUILD_LIMITS.maxFiles, limits.maxFiles ?? Infinity),
    maxFileChars: Math.min(STUDIO_PRO_BUILD_LIMITS.maxFileChars, limits.maxFileChars ?? Infinity),
    maxTotalChars: Math.min(
      STUDIO_PRO_BUILD_LIMITS.maxTotalChars,
      limits.maxTotalChars ?? Infinity,
    ),
    maxRequestBytes: Math.min(
      STUDIO_PRO_BUILD_LIMITS.maxRequestBytes,
      limits.maxRequestBytes ?? Infinity,
    ),
  }
  const extraCount = Object.keys(files).filter(
    (path) => path !== project.python.entrypoint && path !== 'requirements.txt',
  ).length
  if (
    studioProBuildFileLimitError(files, effective) ||
    (project.kind === 'classic' && extraCount > (limits.maxExtraFiles ?? Infinity)) ||
    directories.length > STUDIO_PRO_REVISION_LIMITS.maxDirectories
  )
    return { code: 'too-large', message: 'O projeto Python ultrapassou os limites de arquivos.' }
  const materialPaths = (project.assets ?? []).flatMap((asset) =>
    asset.proPath ? [asset.proPath] : [],
  )
  if (studioPortableFileConflict([...Object.keys(files), ...materialPaths], directories))
    return {
      code: 'invalid-document',
      message: 'Há caminhos conflitantes entre os materiais e os arquivos Python.',
    }
  return null
}

export function normalizePythonProjectPath(path: string): string | null {
  const normalized = path.trim().replace(/\\/g, '/')
  return isStudioPortablePath(normalized) ? normalized : null
}

export function pythonFilesToTree(files: Readonly<Record<string, string>>): ProjectTree {
  const tree: ProjectTree = Object.create(null)
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    for (let index = 1; index < parts.length; index++)
      tree[parts.slice(0, index).join('/')] = { kind: 'dir' }
    tree[path] = { kind: 'file', content }
  }
  return tree
}

export function pythonProjectLayoutError(
  project: PythonProjectDocument,
  limits?: PythonProjectLayoutLimits,
): string | null {
  return pythonProjectLayoutIssue(project, limits)?.message ?? null
}
