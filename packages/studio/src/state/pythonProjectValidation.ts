import {
  StudioProjectDocumentSchema,
  StudioProjectIdSchema,
} from '@sistemazero/core/studio/project-document'
import {
  assertProjectContentPreserved,
  ProjectDocumentError,
  ProjectTooLargeError,
} from '../core/projectDocumentGuards'
import { sanitizePythonProjectAssets } from '../core/pythonAssets'
import type { PythonClassicProjectDocument, PythonProjectDocument } from '../core/pythonProject'
import { copyLocalRevision } from './projectStorageRevision'

export type {
  PythonClassicProjectDocument,
  PythonProjectDocument,
  PythonProProjectDocument,
} from '../core/pythonProject'

import { pythonProjectLayoutIssue } from './pythonProjectLayout'

export { pythonFilesToTree } from './pythonProjectLayout'

/**
 * Source-only reader for both Python variants. Syntax errors stay editable.
 * Visual caches are detached and retained, never trusted to execute or replace
 * source: the editor reparses the current source before accepting visual edits.
 */
export async function refinePythonProjectDocument(
  raw: unknown,
  options: { requestedId?: string; kind?: 'classic' | 'pro' } = {},
): Promise<PythonProjectDocument> {
  const document = StudioProjectDocumentSchema.parse(raw)
  if (document.programmingLanguage !== 'python' || (options.kind && document.kind !== options.kind))
    throw new ProjectDocumentError(
      'invalid-document',
      options.kind === 'pro'
        ? 'Este adaptador precisa de um projeto Python Pro.'
        : options.kind === 'classic'
          ? 'Este adaptador precisa de um projeto Python Clássico.'
          : 'Este adaptador precisa de um projeto Python.',
    )
  const id =
    options.requestedId === undefined
      ? document.id
      : StudioProjectIdSchema.parse(options.requestedId)
  const assets = sanitizePythonProjectAssets(document.assets)
  const project = copyLocalRevision(raw as { id: string }, { ...document, id, assets })
  assertProjectContentPreserved(document, project)
  const issue = pythonProjectLayoutIssue(project)
  if (issue?.code === 'too-large') throw new ProjectTooLargeError(issue.message)
  if (issue) throw new ProjectDocumentError(issue.code, issue.message)
  // A learner may be editing requirements.txt. Preserve that source and the
  // previous lock so reopening remains possible; execution checks their exact
  // correspondence before preparing any material or loading a runtime.
  return project
}

export async function refinePythonClassicProjectDocument(
  raw: unknown,
  options: { requestedId?: string } = {},
): Promise<PythonClassicProjectDocument> {
  const project = await refinePythonProjectDocument(raw, { ...options, kind: 'classic' })
  if (project.kind !== 'classic') throw new Error('O leitor retornou outro tipo de projeto.')
  return project
}
