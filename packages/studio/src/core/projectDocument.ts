import { CURRENT_PROJECT_FORMAT_VERSION, projectFormatVersion } from './projectDocumentGuards'

export * from './projectDocumentGuards'

/** O caminho corrente não importa o conversor nem seus leitores históricos. */
export async function prepareProjectDocument(raw: unknown): Promise<unknown> {
  if (projectFormatVersion(raw) === CURRENT_PROJECT_FORMAT_VERSION) return raw
  const { migrateProjectDocument } = await import('../project-migrations/index')
  return (await migrateProjectDocument(raw)).document
}
