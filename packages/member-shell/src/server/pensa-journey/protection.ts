import 'server-only'
import { createHash } from 'node:crypto'
import type { PensaFileTicket, PensaJourneyActor, PensaJourneyView } from '@sistemazero/core/pensa'
import type { MembersClient } from '../clients'
import { r2CopyObjectUgc, r2HeadObjectUgc } from '../r2'
import { JourneyChildError } from './errors'

function value<T>(response: { status: number; body: T | null }): T {
  if (response.status !== 200 || !response.body)
    throw new JourneyChildError(
      'Não consegui proteger esta versão. Seu jogo atual continua salvo. Atualize e tente de novo.',
    )
  return response.body
}
// Repetir uma cópia interrompida usa as mesmas chaves; não cria backups órfãos por clique.
function checkpointId(projectId: string, cycleId: string, revision: number | string): string {
  const h = createHash('sha256').update(`${projectId}:${cycleId}:${revision}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}
export async function copyPensaFiles(ticket: PensaFileTicket) {
  // Pequenos lotes limitam o pico de rede; cada COPY aguarda confirmação do armazenamento.
  for (let index = 0; index < ticket.files.length; index += 4) {
    await Promise.all(
      ticket.files.slice(index, index + 4).map(async (file) => {
        await r2CopyObjectUgc(file.source, file.destination)
        if ((await r2HeadObjectUgc(file.destination)) !== true)
          throw new Error('A cópia ainda não foi confirmada.')
      }),
    )
  }
}
export async function protectJourney(
  members: MembersClient,
  actor: PensaJourneyActor,
  view: PensaJourneyView,
  copyFiles: typeof copyPensaFiles = copyPensaFiles,
) {
  const creation = value(
    await members.getCreationDownload('studio', `pensa-${view.project.id.replaceAll('-', '')}`),
  )
  const id = checkpointId(
    view.project.id,
    view.journey.cycleId,
    `${view.journey.revision}:${creation.revision}`,
  )
  const prepared = value(
    await members.pensaJourneyProtect(actor, view.project.id, {
      type: 'prepare',
      id,
      expectedRevision: view.journey.revision,
    }),
  )
  if (!('files' in prepared)) throw new Error('A cópia não foi preparada.')
  await copyFiles(prepared)
  const committed = value(
    await members.pensaJourneyProtect(actor, view.project.id, { type: 'commit', id: prepared.id }),
  )
  if (!('journey' in committed)) throw new Error('A cópia não foi confirmada.')
  return committed
}
export async function restoreJourney(
  members: MembersClient,
  actor: PensaJourneyActor,
  view: PensaJourneyView,
  targetId: string,
) {
  const protectedView = await protectJourney(members, actor, view)
  const id = checkpointId(
    `${view.project.id}:${targetId}`,
    protectedView.journey.cycleId,
    protectedView.journey.revision,
  )
  const prepared = value(
    await members.pensaJourneyProtect(actor, view.project.id, {
      type: 'restore_prepare',
      id,
      checkpointId: targetId,
      expectedRevision: protectedView.journey.revision,
    }),
  )
  if (!('files' in prepared)) throw new Error('A restauração não foi preparada.')
  await copyPensaFiles(prepared)
  return value(
    await members.pensaJourneyProtect(actor, view.project.id, { type: 'restore_commit', id }),
  )
}
