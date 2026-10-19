import { hasAdultCapability } from '../server/adult-capabilities'
import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import {
  normalizarRoteiroDoZappy,
  ZAPPY_PRONUNCIATION_PROFILE_VERSION,
} from '@sistemazero/core/learning/scene'
import { PensaNarratableRefSchema } from '@sistemazero/core/pensa'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import type { PrivateNarratableRef } from '../lib/private-narration'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { SessionUser } from '../lib/types'
import type { MembersClient } from '../server/clients'
import { readKidsCapabilities } from '../server/creative-apps-access'
import { loadPensaContext, type PensaContextMembers } from '../server/pensa/context'
import { redactPensaText } from '../server/pensa/privacy'
import { r2DeleteObjectUgc, r2PresignGetUgc, r2PutObjectUgc } from '../server/r2'
import type { SessionModule } from '../server/session'
import { getStudioZappyAccessForRequest } from '../server/zappy-access'
import { redactZappySensitiveText } from '../server/zappy-safety'

const uuid = z.uuid()
export const NarratableRefSchema = z.union([
  PensaNarratableRefSchema,
  z.strictObject({
    origin: z.literal('studio_message'),
    projectId: z.string().min(1).max(100),
    messageId: uuid,
  }),
])
const fail = (status: number, message: string) =>
  NextResponse.json(
    { error: { code: 'VOICE_UNAVAILABLE', message } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )

export type PrivateNarrationMembers = Partial<Pick<MembersClient, 'getAdultProfileReadonly'>> &
  PensaContextMembers &
  Pick<
    MembersClient,
    | 'checkPensaAccessReadonly'
    | 'checkCreativeToolsAccessReadonly'
    | 'getGamification'
    | 'zappyHistory'
    | 'pensaMissionContext'
    | 'privateNarration'
  >

export async function resolvePrivateNarration(
  members: PrivateNarrationMembers,
  user: SessionUser,
  ref: PrivateNarratableRef,
  loadContext = loadPensaContext,
  audience: 'kids' | 'adult' = 'kids',
): Promise<string | null> {
  if (ref.origin === 'studio_message') {
    const capability =
      audience === 'adult'
        ? (await hasAdultCapability(members, user, 'ai'))
          ? 'allowed'
          : 'locked'
        : await getStudioZappyAccessForRequest(members, user)
    if (capability === 'unavailable') throw new Error('Jornada indisponível')
    if (capability !== 'allowed') return null
    const access = await members.checkCreativeToolsAccessReadonly()
    if (access.body?.access?.['estudio-completo'] !== true && !isPrivilegedRole(user.role))
      return null
    let cursor: string | undefined
    for (let page = 0; page < 10; page++) {
      const history = await members.zappyHistory(ref.projectId, cursor)
      if (history.status !== 200) return null
      const message = history.body?.messages.find(
        (m) => m.id === ref.messageId && m.role === 'assistant',
      )
      if (message) return message.text
      const next = history.body?.nextCursor
      if (!next || next === cursor) break
      cursor = next
    }
    return null
  }
  const access = await members.checkPensaAccessReadonly()
  const capability =
    audience === 'adult'
      ? (await hasAdultCapability(members, user, 'pensa'))
        ? 'allowed'
        : 'locked'
      : await readKidsCapabilities(members, ['pensa', 'ai'])
  if (capability === 'unavailable') throw new Error('Jornada indisponível')
  if (access.body?.access?.pensa !== true || capability !== 'allowed') return null
  const actor = {
    ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
    profileId: user.id,
    accountId: user.activeProfile?.accountId ?? user.id,
    privileged: isPrivilegedRole(user.role),
  }
  if (ref.origin === 'pensa_mission') {
    const target = await members.pensaMissionContext(actor, ref.missionId)
    if (target.status !== 200 || !target.body) return null
    const context = await loadContext(members, user, actor, target.body.projectId, '')
    const mission = context.view.revision?.plan.missions.find((item) => item.id === ref.missionId)
    if (!mission || mission.contentRevision !== ref.contentRevision) return null
    if (ref.section === 'objective') return mission.objective
    if (ref.section === 'setup')
      return mission.kind === 'setup' ? mission.setup.recommendation : null
    if (ref.section === 'rule')
      return mission.rules.find((item) => item.id === ref.itemId)?.text ?? null
    const check = mission.checks.find((item) => item.id === ref.itemId)
    return check ? `${check.action}. ${check.expected}` : null
  }
  const context = await loadContext(members, user, actor, ref.projectId, '')
  if (ref.origin === 'pensa_definition')
    return context.view.revision?.id === ref.projectRevisionId
      ? context.view.revision.definition[ref.section]
      : null
  if (ref.origin === 'pensa_draft')
    return context.view.draft?.id === ref.draftId &&
      context.view.draft.revision === ref.draftRevision
      ? (context.view.draft.definition?.[ref.section] ?? null)
      : null
  const message = context.view.messages.find(
    (m) => m.id === ref.messageId && m.revision === ref.messageRevision && m.role === 'assistant',
  )
  return message?.text ?? null
}

export function createPrivateNarrationRoutes({
  members,
  session,
  audience = 'kids',
  resolveSource = (user, ref) =>
    resolvePrivateNarration(members, user, ref, loadPensaContext, audience),
}: {
  audience?: 'kids' | 'adult'
  members: PrivateNarrationMembers
  session: Pick<SessionModule, 'getSession'>
  resolveSource?: (user: SessionUser, ref: PrivateNarratableRef) => Promise<string | null>
}) {
  return {
    privateNarration: {
      POST: async (req: Request) => {
        const user = await session.getSession()
        if (!user || isReadonlyImpersonation(user) || req.headers.get('x-sz-viewer') !== user.id)
          return fail(403, 'Abra seu perfil de novo para ouvir.')
        if (audience === 'adult') {
          if (!(await hasAdultCapability(members, user, 'ai')))
            return fail(403, 'A narração será liberada na formação avançada.')
          const pref = await members.getAdultProfileReadonly?.().catch(() => null)
          if (pref?.status !== 200 || !pref.body?.voiceEnabled)
            return fail(403, 'Ative a voz nas suas preferências para ouvir.')
        }
        const env = getEnv()
        if (!env.ELEVENLABS_API_KEY)
          return fail(503, 'A voz do Zappy está descansando. Você pode continuar lendo.')
        const parsed = NarratableRefSchema.safeParse(await req.json().catch(() => null))
        if (!parsed.success) return fail(400, 'Escolha uma fala do Zappy para ouvir.')
        let original: string | null
        try {
          original = await resolveSource(user, parsed.data)
        } catch {
          return fail(503, 'Não consegui conferir essa fala agora. Você pode continuar lendo.')
        }
        if (!original) return fail(404, 'Essa fala mudou. Atualize o caminho antes de ouvir.')
        // A fala do Pensa passa pela régua do Pensa ("placar até 9999 9999" não é telefone); a do
        // tutor, pela do tutor.
        const redact =
          parsed.data.origin === 'studio_message' ? redactZappySensitiveText : redactPensaText
        const text = normalizarRoteiroDoZappy(redact(original).text)
        if (!text || text.length > 4000)
          return fail(400, 'Esta fala ficou longa para ouvir de uma vez. O texto continua aqui.')
        const voice = env.ELEVENLABS_VOICE_ID || 'uj19ZrP8mFHr1twXk7aq'
        const model = 'eleven_multilingual_v2'
        const id = createHash('sha256')
          .update(
            JSON.stringify([
              user.id,
              ...(audience === 'adult' ? ['adult'] : []),
              parsed.data,
              voice,
              model,
              ZAPPY_PRONUNCIATION_PROFILE_VERSION,
              text,
            ]),
          )
          .digest('hex')
        const actor = {
          ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
          profileId: user.id,
          accountId: user.activeProfile?.accountId ?? user.id,
          privileged: isPrivilegedRole(user.role),
        }
        const ref = parsed.data
        let sourceProject: string | undefined
        if (ref.origin === 'pensa_mission') {
          const target = await members.pensaMissionContext(actor, ref.missionId).catch(() => null)
          if (!target || target.status >= 500)
            return fail(503, 'Não consegui conferir essa fala agora. Você pode continuar lendo.')
          sourceProject = target.status === 200 ? target.body?.projectId : undefined
        } else if (ref.origin !== 'studio_message') sourceProject = ref.projectId
        if (ref.origin !== 'studio_message' && !sourceProject)
          return fail(404, 'Essa fala não está mais disponível.')
        const input = {
          id,
          chars: text.length,
          leaseId: randomUUID(),
          ...(sourceProject ? { projectId: sourceProject } : {}),
        }
        const reservation = await members
          .privateNarration(actor, { ...input, type: 'claim' })
          .catch(() => null)
        if (reservation?.status !== 200 || !reservation.body)
          return reservation?.status === 429
            ? fail(429, 'A voz descansou por hoje. O texto continua disponível.')
            : fail(503, 'Não consegui preparar a voz agora. Você pode continuar lendo.')
        if (reservation.body.status === 'waiting')
          return fail(
            409,
            'Essa fala está sendo preparada. Espere um pouquinho e aperte Ouvir de novo.',
          )
        const key = reservation.body.key
        try {
          if (reservation.body.status === 'generate') {
            const response = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`,
              {
                method: 'POST',
                headers: {
                  'xi-api-key': env.ELEVENLABS_API_KEY,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({ text, model_id: model }),
                signal: AbortSignal.timeout(45000),
              },
            )
            if (!response.ok) throw new Error('VOICE_PROVIDER_FAILED')
            const bytes = new Uint8Array(await response.arrayBuffer())
            if (bytes.length < 100 || bytes.length > 4 * 1024 * 1024) throw new Error('VOICE_SIZE')
            await r2PutObjectUgc({
              key,
              body: bytes,
              contentType: 'audio/mpeg',
              cacheControl: 'private, no-store',
            })
            const committed = await members.privateNarration(actor, { ...input, type: 'commit' })
            if (committed.status !== 200) throw new Error('VOICE_COMMIT_FAILED')
          }
          // Uma exclusão, revisão ou troca de acesso durante a síntese invalida o resultado.
          if ((await resolveSource(user, parsed.data)) !== original)
            throw new Error('VOICE_SOURCE_CHANGED')
          return NextResponse.json(
            {
              url: await r2PresignGetUgc(key, {
                expiresInSeconds: 60,
                responseContentType: 'audio/mpeg',
              }),
            },
            { headers: { 'Cache-Control': 'private, no-store' } },
          )
        } catch (cause) {
          // Só a origem e o NOME do erro: nada da fala, da chave do provedor ou do corpo dele.
          const name = (value: unknown) => (value instanceof Error ? value.name : typeof value)
          console.error('[pensa] voz privada falhou', {
            origin: parsed.data.origin,
            name: name(cause),
            reason:
              cause instanceof Error && cause.message.startsWith('VOICE_') ? cause.message : null,
          })
          if (reservation.body.status === 'generate') {
            await members
              .privateNarration(actor, { ...input, type: 'fail' })
              .catch((failure: unknown) =>
                console.error('[pensa] voz privada: reserva não liberada', {
                  origin: parsed.data.origin,
                  name: name(failure),
                }),
              )
            await r2DeleteObjectUgc(key).catch((failure: unknown) =>
              console.error('[pensa] voz privada: áudio não apagado', {
                origin: parsed.data.origin,
                name: name(failure),
              }),
            )
          }
          return fail(503, 'Não consegui preparar a voz agora. Você pode continuar lendo.')
        }
      },
    },
  }
}
