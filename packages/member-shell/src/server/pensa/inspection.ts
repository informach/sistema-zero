import 'server-only'
import { ProjectDocumentError } from '@sistemazero/studio/project-document'
import { validateStudioCreationSnapshot } from '@sistemazero/studio/project-validation'
import type { CreationDownloadTicketView } from '../../lib/types'
import { r2ReadCreationJson } from '../r2'
import { PENSA_RUNTIME_EXTENSIONS } from './catalog'
import { PensaUnavailable } from './errors'

export interface PensaGameInspection {
  creationId: string
  saveRevision: string
  contentFingerprint: string | null
  authoring: 'blocks' | 'code'
  runtimeExtensionId: string | null
  installedExtensionIds: string[]
}

/** Only a server-authorized ticket can locate the file; the browser supplies no storage key. */
export async function inspectPensaGame(
  ticket: CreationDownloadTicketView,
  expectedCreationId: string,
  readJson: typeof r2ReadCreationJson = r2ReadCreationJson,
): Promise<PensaGameInspection> {
  if (
    ticket.summary.tool !== 'studio' ||
    ticket.summary.itemId !== expectedCreationId ||
    ticket.summary.deletedAt ||
    ticket.revision !== ticket.summary.revision
  )
    throw new PensaUnavailable(
      'A versão salva do jogo mudou. Atualize antes de continuar.',
      'CREATION_CHANGED',
      409,
    )
  const document = await readJson(ticket.storageKey)
  const project = (() => {
    try {
      return validateStudioCreationSnapshot(document, expectedCreationId)
    } catch (cause) {
      if (!(cause instanceof ProjectDocumentError)) throw cause
      throw new PensaUnavailable(
        'Esta criação não é compatível com o Pensa. Seu projeto continua guardado.',
        'PENSA_PROJECT_UNSUPPORTED',
        409,
      )
    }
  })()
  const installedExtensionIds = [...new Set(project.installedExtensions.map((item) => item.id))]
  const runtimes = installedExtensionIds.filter((id) => PENSA_RUNTIME_EXTENSIONS.includes(id))
  if (runtimes.length > 1)
    throw new PensaUnavailable(
      'Este jogo tem extensões de jogo em conflito. Peça ajuda para ajustar a preparação.',
      'EXTENSION_CONFLICT',
      409,
    )
  return {
    creationId: expectedCreationId,
    saveRevision: String(ticket.revision),
    // The saved index owns the public content fingerprint. A parts manifest cannot
    // reproduce studioContentFingerprint without loading all asset payloads.
    contentFingerprint: ticket.summary.contentFingerprint ?? null,
    authoring: project.kind === 'pro' || project.mode === 'code' ? 'code' : 'blocks',
    runtimeExtensionId: runtimes[0] ?? null,
    installedExtensionIds,
  }
}
