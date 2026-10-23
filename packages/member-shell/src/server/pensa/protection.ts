import 'server-only'
import { createHash } from 'node:crypto'
import type { PensaActor, PensaRestoreRequest } from '@sistemazero/core/pensa'
import type { PensaClient, PensaFileTicket, PensaProjectBase } from '../pensa-client'
import { r2CopyObjectUgc, r2HeadObjectUgc } from '../r2'
import type { PensaContext } from './context'
import { PensaUnavailable } from './errors'

export async function copyPensaFiles(ticket: PensaFileTicket) {
  for (let offset = 0; offset < ticket.files.length; offset += 4) {
    const copied = await Promise.allSettled(
      ticket.files.slice(offset, offset + 4).map(async (file) => {
        await r2CopyObjectUgc(file.source, file.destination)
        if ((await r2HeadObjectUgc(file.destination)) !== true)
          throw new PensaUnavailable(
            'A cópia ainda não foi confirmada. Seu jogo continua salvo.',
            'COPY_NOT_CONFIRMED',
          )
      }),
    )
    const failed = copied.find((result) => result.status === 'rejected')
    if (failed?.status === 'rejected') throw failed.reason
  }
}

interface PensaProtectionDependencies {
  refreshContext: () => Promise<PensaContext>
  copyFiles?: typeof copyPensaFiles
}

async function copyAndCommit(
  members: Pick<PensaClient, 'pensaProtect'>,
  actor: PensaActor,
  context: PensaContext,
  ticket: PensaFileTicket,
  type: 'commit' | 'restore_commit',
  dependencies: PensaProtectionDependencies,
) {
  try {
    await (dependencies.copyFiles ?? copyPensaFiles)(ticket)
    const fresh = await dependencies.refreshContext()
    const committed = await members.pensaProtect(
      actor,
      context.view.project.id,
      { type, id: ticket.id },
      fresh.capabilities,
    )
    if (committed.status !== 200 || !committed.body || !('project' in committed.body))
      throw new PensaUnavailable(
        'Não consegui confirmar a cópia. Sua versão atual continua guardada. Atualize antes de continuar.',
        'COPY_NOT_CONFIRMED',
        committed.status >= 400 ? committed.status : 503,
      )
    return committed
  } catch (cause) {
    try {
      const aborted = await members.pensaProtect(
        actor,
        context.view.project.id,
        { type: 'abort', id: ticket.id },
        context.capabilities,
      )
      if (aborted.status !== 200)
        console.error('[pensa] limpeza de cópia pendente', { status: aborted.status })
    } catch {
      console.error('[pensa] limpeza de cópia pendente', { status: 503 })
    }
    throw cause
  }
}

export async function protectPensaProject(
  members: Pick<PensaClient, 'pensaProtect'>,
  actor: PensaActor,
  context: PensaContext,
  input: PensaRestoreRequest,
  dependencies: PensaProtectionDependencies,
): Promise<PensaProjectBase> {
  const prepared = await members.pensaProtect(
    actor,
    context.view.project.id,
    {
      type: 'prepare',
      id: input.requestId,
      baseRevisionId: input.baseRevisionId,
      saveRevision: input.saveRevision,
    },
    context.capabilities,
  )
  if (prepared.status !== 200 || !prepared.body || !('files' in prepared.body))
    throw new PensaUnavailable(
      'Não consegui preparar a cópia. Seu jogo continua salvo. Atualize e tente de novo.',
      'CHECKPOINT_UNAVAILABLE',
      prepared.status >= 400 ? prepared.status : 503,
    )
  const committed = await copyAndCommit(
    members,
    actor,
    context,
    prepared.body,
    'commit',
    dependencies,
  )
  if (committed.status !== 200 || !committed.body || !('project' in committed.body))
    throw new PensaUnavailable(
      'Não consegui confirmar a cópia. Seu jogo continua salvo.',
      'CHECKPOINT_UNAVAILABLE',
    )
  return committed.body
}

export async function restorePensaProject(
  members: Pick<PensaClient, 'pensaProtect'>,
  actor: PensaActor,
  context: PensaContext,
  checkpointId: string,
  input: PensaRestoreRequest,
  dependencies: PensaProtectionDependencies,
): Promise<PensaProjectBase> {
  const hash = createHash('sha256').update(`${input.requestId}:before-restore`).digest('hex')
  const protectionId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  await protectPensaProject(
    members,
    actor,
    context,
    { ...input, requestId: protectionId },
    dependencies,
  )
  const fresh = await dependencies.refreshContext()
  const prepared = await members.pensaProtect(
    actor,
    context.view.project.id,
    {
      type: 'restore_prepare',
      id: input.requestId,
      checkpointId,
      baseRevisionId: input.baseRevisionId,
      saveRevision: input.saveRevision,
    },
    fresh.capabilities,
  )
  if (prepared.status !== 200 || !prepared.body || !('files' in prepared.body))
    throw new PensaUnavailable(
      'Não consegui preparar a restauração. Sua versão atual continua guardada.',
      'RESTORE_UNAVAILABLE',
      prepared.status >= 400 ? prepared.status : 503,
    )
  const committed = await copyAndCommit(
    members,
    actor,
    context,
    prepared.body,
    'restore_commit',
    dependencies,
  )
  if (committed.status !== 200 || !committed.body || !('project' in committed.body))
    throw new PensaUnavailable(
      'Não consegui confirmar a restauração. Atualize antes de continuar.',
      'RESTORE_UNAVAILABLE',
    )
  return committed.body
}
