import 'server-only'
import {
  parseStudioProAssistanceRequest,
  type StudioProAssistanceRequest,
  studioProDigest,
} from '@sistemazero/core/studio'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { SessionUser } from '../lib/types'
import type { MembersClient } from './clients'
import { loadPensaContext } from './pensa/context'
import { PensaUnavailable } from './pensa/errors'
import { pensaStudioTutorMission } from './pensa/missions'
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
  members: MembersClient,
  user: SessionUser,
  projectId: string,
  missionId?: string,
): Promise<StudioProAssistanceRequest['mission']> {
  const match = /^pensa-([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})$/.exec(
    projectId,
  )
  if (!match) return undefined
  const context = await loadPensaContext(
    members,
    user,
    {
      profileId: user.id,
      accountId: user.activeProfile?.accountId ?? user.id,
      privileged: isPrivilegedRole(user.role),
    },
    match.slice(1).join('-'),
    '',
  ).catch((cause: unknown) => {
    throw new StudioAssistanceContextError(
      cause instanceof PensaUnavailable && cause.status === 409 ? 409 : 503,
      'Não consegui conferir a missão deste projeto. Atualize o Pensa antes de preparar uma alteração.',
    )
  })
  const mission = pensaStudioTutorMission(context.view, missionId)
  if (missionId && mission?.id !== missionId)
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
        objective: mission.objective,
        rules: mission.rules,
        checks: mission.checks,
      }),
    ),
    summary: redactZappySensitiveText(`${mission.title}. ${mission.objective}`).text.slice(0, 900),
  }
}
