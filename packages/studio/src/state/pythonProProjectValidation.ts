import {
  type PythonProProjectDocument,
  refinePythonProjectDocument,
} from './pythonProjectValidation'

export type { PythonProProjectDocument } from './pythonProjectValidation'

/** Strict Pro entry point retained for callers that require the tree variant. */
export async function refinePythonProProjectDocument(
  raw: unknown,
  options: { requestedId?: string } = {},
): Promise<PythonProProjectDocument> {
  const project = await refinePythonProjectDocument(raw, { ...options, kind: 'pro' })
  if (project.kind !== 'pro') throw new Error('O leitor retornou outro tipo de projeto.')
  return project
}
