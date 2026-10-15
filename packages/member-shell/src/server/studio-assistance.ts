import 'server-only'
import {
  parseStudioProAssistanceRequest,
  type StudioProAssistanceRequest,
  studioProDigest,
} from '@sistemazero/core/studio'
import type { MembersClient } from './clients'
import { studioTutorTask } from './pensa-journey/missions'
import { redactZappySensitiveText } from './zappy-safety'

export class StudioAssistanceContextError extends Error {
  constructor(
    readonly status: 400 | 409 | 503,
    message: string,
  ) {
    super(message)
  }
}

export function sanitizeStudioAssistanceRequest(
  input: StudioProAssistanceRequest | undefined,
): StudioProAssistanceRequest {
  const request = parseStudioProAssistanceRequest(
    input ?? { version: 1, intent: 'change', scope: 'part', criteria: [] },
  )
  if (request.mission)
    throw new StudioAssistanceContextError(
      400,
      'A referência ao Pensa deve ser consultada pelo servidor.',
    )
  const redact = (value: string) => redactZappySensitiveText(value).text
  return parseStudioProAssistanceRequest({
    ...request,
    criteria: request.criteria.map(redact),
    ...(request.diagnostic ? { diagnostic: redact(request.diagnostic) } : {}),
    ...(request.baseline
      ? {
          baseline: {
            ...request.baseline,
            diagnostics: request.baseline.diagnostics.map((item) => ({
              ...item,
              message: redact(item.message),
            })),
          },
        }
      : {}),
    ...(request.decisions
      ? { decisions: { ...request.decisions, summary: redact(request.decisions.summary) } }
      : {}),
  })
}

/** The mission snapshot is read through the authenticated Members client; client text is not ownership. */
export async function studioAssistanceMission(
  members: Pick<MembersClient, 'pensaJourneyGet' | 'pensaGetStage'>,
  projectId: string,
  taskId?: string,
): Promise<StudioProAssistanceRequest['mission']> {
  const match = /^pensa-([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})$/.exec(
    projectId,
  )
  if (!match) return undefined
  const journey = await members.pensaJourneyGet(match.slice(1).join('-'))
  if (journey.status !== 200 || !journey.body)
    throw new StudioAssistanceContextError(503, 'Não foi possível consultar o objetivo do Pensa.')
  const stage = await members.pensaGetStage(journey.body.journey.cycleId, 'z')
  if (stage.status !== 200 || !stage.body)
    throw new StudioAssistanceContextError(503, 'Não foi possível consultar as tarefas do Pensa.')
  const mission = studioTutorTask(stage.body.tasks ?? [], taskId)
  if (taskId && mission?.id !== taskId)
    throw new StudioAssistanceContextError(
      409,
      'A missão vinculada mudou. Consulte o plano antes de preparar outra alteração.',
    )
  if (!mission) return undefined
  return {
    id: mission.id,
    snapshotHash: await studioProDigest(
      JSON.stringify({
        id: mission.id,
        title: mission.title,
        summary: mission.summary,
        guide: mission.guide,
      }),
    ),
    summary: redactZappySensitiveText(`${mission.title}. ${mission.summary ?? ''}`).text.slice(
      0,
      900,
    ),
  }
}
