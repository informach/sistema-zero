import 'server-only'
import { RequestBodyTooLargeError, readJsonBodyWithLimit } from '@sistemazero/core/http'
import {
  isStudioProAssistanceRequest,
  isStudioProTemplateId,
  parseStudioProRevision,
  STUDIO_PRO_BUILDER_LIMITS,
  type StudioProAssistanceRequest,
  type StudioProBuilderCommand,
  studioProBuilderView,
  studioProChangeScopeIssue,
} from '@sistemazero/core/studio'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import { learnerIdentity } from '../lib/learner-identity'
import { isPrivilegedRole } from '../lib/studio-tier'
import type { MembersClient } from '../server/clients'
import { pensaSynthesisModel } from '../server/pensa-llm'
import type { SessionModule } from '../server/session'
import {
  StudioAssistanceContextError,
  sanitizeStudioAssistanceRequest,
  studioAssistanceMission,
} from '../server/studio-assistance'
import { refreshStudioBuilderPreview } from '../server/studio-builder'
import {
  preflightStudioProBuild,
  StudioProRuntimeInputError,
  StudioProRuntimeUpstreamError,
  studioProRuntimePublicStatus,
} from '../server/studio-pro-runtime'
import { earnedStudioTier } from '../server/studio-unlocks'
import { isStudioZappyAllowed } from '../server/zappy-access'
import { isUnsafeZappyText, redactZappySensitiveText } from '../server/zappy-safety'

const projectId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)
const id = z.string().uuid()
const bodySchema = z.discriminatedUnion('operation', [
  z
    .object({
      operation: z.literal('availability'),
      templateId: z.string().max(100).refine(isStudioProTemplateId),
    })
    .strict(),
  z
    .object({
      operation: z.literal('create'),
      kind: z.literal('pro'),
      mode: z.literal('code'),
      id,
      objective: z.string().trim().min(1).max(1000),
      base: z.unknown(),
      binaries: z.record(
        z.string().max(240),
        z
          .object({ base64: z.string().max(2000000), sha256: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict(),
      ),
      pensaMissionId: id.optional(),
      request: z
        .custom<StudioProAssistanceRequest>(isStudioProAssistanceRequest)
        .refine((value) => !value.mission, 'A missão deve ser consultada pelo servidor.')
        .optional(),
    })
    .strict(),
  z.object({ operation: z.literal('get'), id, projectId }).strict(),
  z.object({ operation: z.literal('cancel'), id, projectId }).strict(),
  z.object({ operation: z.literal('latest'), projectId }).strict(),
  z.object({ operation: z.literal('remove-project'), projectId }).strict(),
  z
    .object({ operation: z.literal('list'), projectId, before: z.string().max(100).optional() })
    .strict(),
  z
    .object({ operation: z.literal('discard'), id, projectId, version: z.number().int().min(0) })
    .strict(),
  z.object({ operation: z.literal('refresh-preview'), id, projectId }).strict(),
  z
    .object({
      operation: z.literal('check-application'),
      id,
      projectId,
      version: z.number().int().min(0),
      revisionHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
])
const error = (message: string, status: number) =>
  NextResponse.json({ error: { message } }, { status, headers: { 'Cache-Control': 'no-store' } })

export function createStudioBuilderRoutes(deps: {
  audience?: 'kids' | 'adult'
  members: MembersClient
  session: SessionModule
  preflight?: typeof preflightStudioProBuild
}) {
  return {
    studioBuilder: {
      POST: async (request: Request) => {
        const user = await deps.session.getSession()
        if (!user) return error('Entre novamente para continuar.', 401)
        if (user.status !== 'active') return error('Este perfil não está ativo.', 403)
        if (isReadonlyImpersonation(user))
          return error('Construção indisponível durante acesso de suporte.', 403)
        if (
          request.headers.get('sec-fetch-site') === 'cross-site' ||
          (request.headers.get('origin') &&
            request.headers.get('origin') !== new URL(request.url).origin)
        )
          return error('Origem inválida.', 403)
        let raw: unknown
        try {
          raw = await readJsonBodyWithLimit(request, STUDIO_PRO_BUILDER_LIMITS.maxPayloadBytes)
        } catch (cause) {
          return error(
            cause instanceof RequestBodyTooLargeError
              ? 'O projeto excede o limite da construção.'
              : 'Solicitação inválida.',
            cause instanceof RequestBodyTooLargeError ? 413 : 400,
          )
        }
        const parsed = bodySchema.safeParse(raw)
        if (!parsed.success) return error('Solicitação de construção inválida.', 400)
        const input = parsed.data
        // A revoked builder capability must not prevent owner-scoped cleanup of old jobs.
        if (input.operation !== 'remove-project') {
          const [access, gamification] = await Promise.all([
            deps.members.checkStudioAccess(),
            deps.members.getGamification(),
          ])
          if (
            access.status !== 200 ||
            access.body?.access?.['estudio-completo'] !== true ||
            gamification.status !== 200
          )
            return error('O Estúdio não está liberado para este perfil.', 403)
          const level = gamification.body?.level?.slug
          if (
            deps.audience === 'adult'
              ? !learnerIdentity(user, 'adult') ||
                !gamification.body?.journey?.capabilities.includes('ai') ||
                !gamification.body.journey.capabilities.includes('pro')
              : !isStudioZappyAllowed(user, level) ||
                !earnedStudioTier(level ?? 'noob', user.role, []).pro
          )
            return error('O construtor precisa do modo Pro e do Zappy liberados.', 403)
        }
        const actor = {
          ...(deps.audience === 'adult' ? { audience: 'adult' as const } : {}),
          userId: user.id,
          accountId: user.activeProfile?.accountId ?? user.id,
          privileged: user.status === 'active' && isPrivilegedRole(user.role),
        }
        const env = getEnv()
        const executionAvailable = async () => {
          if (!env.STUDIO_BUILDER_EXECUTOR_SECRET) return false
          try {
            const status = await deps.members.studioBuilderAvailability()
            return status.status === 200 && status.body?.available === true
          } catch {
            return false
          }
        }
        if (input.operation === 'availability') {
          const available =
            Boolean(env.STUDIO_PRO_RUNTIME_URL && env.STUDIO_PRO_RUNTIME_TOKEN) &&
            (await executionAvailable())
          return NextResponse.json(
            {
              available,
              ...(!available
                ? {
                    reason:
                      'O construtor ainda não está disponível neste ambiente. Você pode continuar pelo terminal.',
                  }
                : {}),
            },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        }
        if (
          (input.operation === 'create' || input.operation === 'refresh-preview') &&
          (!env.STUDIO_PRO_RUNTIME_URL || !env.STUDIO_PRO_RUNTIME_TOKEN)
        )
          return error('O ambiente de verificação ainda não está configurado.', 503)
        try {
          if (input.operation === 'list') {
            const response = await deps.members.studioBuilderHistory(actor, {
              projectId: input.projectId,
              ...(input.before ? { before: input.before } : {}),
            })
            if (response.status !== 200 || !response.body)
              return error(
                'Não foi possível consultar as propostas.',
                response.status >= 400 && response.status < 500 ? response.status : 503,
              )
            return NextResponse.json(response.body.page, {
              headers: { 'Cache-Control': 'no-store' },
            })
          }
          if (input.operation === 'check-application') {
            const saved = await deps.members.studioBuilder(actor, {
              operation: 'get',
              id: input.id,
              projectId: input.projectId,
            })
            if (saved.status !== 200) return error('Não foi possível conferir esta proposta.', 503)
            const job = saved.body?.state?.job
            let reason: string | undefined
            if (
              job?.phase !== 'review' ||
              !job.result ||
              job.assistance?.disposition === 'discarded'
            )
              reason = 'Esta proposta não está mais disponível para aplicar.'
            else if (
              job.version !== input.version ||
              job.result.revisionHash !== input.revisionHash
            )
              reason =
                'A proposta mudou. Consulte o estado e confira a revisão atual antes de aplicar.'
            else if (
              studioProChangeScopeIssue(job.assistance?.request, job.base.files, job.result.change)
            )
              reason = studioProChangeScopeIssue(
                job.assistance?.request,
                job.base.files,
                job.result.change,
              )!
            else if (job.assistance?.request.mission) {
              const mission = await studioAssistanceMission(
                deps.members,
                user,
                input.projectId,
                job.assistance.request.mission.id,
              )
              if (mission?.snapshotHash !== job.assistance.request.mission.snapshotHash)
                reason = 'O objetivo do Pensa mudou. Prepare uma nova proposta sobre o plano atual.'
            }
            return NextResponse.json(
              { allowed: !reason, ...(reason ? { reason } : {}) },
              { headers: { 'Cache-Control': 'no-store' } },
            )
          }
          if (input.operation === 'refresh-preview') {
            const job = await refreshStudioBuilderPreview({
              members: deps.members,
              actor,
              id: input.id,
              projectId: input.projectId,
              parentOrigin: new URL(request.url).origin,
              runtimeUrl: env.STUDIO_PRO_RUNTIME_URL!,
              runtimeToken: env.STUDIO_PRO_RUNTIME_TOKEN!,
              signal: request.signal,
            })
            return NextResponse.json(
              { job: job ? studioProBuilderView(job) : null },
              { headers: { 'Cache-Control': 'no-store' } },
            )
          }
          let command: StudioProBuilderCommand
          if (input.operation === 'create') {
            if (!(await executionAvailable()))
              return error(
                'A execução automática está indisponível. Seu pedido continua no editor.',
                503,
              )
            if (isUnsafeZappyText(input.objective))
              return error(
                'Vamos usar o construtor para melhorar o seu jogo. Escolha um objetivo de criação.',
                400,
              )
            let base: Awaited<ReturnType<typeof parseStudioProRevision>>
            try {
              base = await parseStudioProRevision(input.base)
            } catch {
              return error('A revisão enviada é inválida. Abra novamente o projeto.', 400)
            }
            if (!isStudioProTemplateId(base.templateId))
              return error('Este modelo não é compatível com a construção remota.', 400)
            let objective = redactZappySensitiveText(input.objective).text
            const assistance = sanitizeStudioAssistanceRequest(input.request)
            const mission = await studioAssistanceMission(
              deps.members,
              user,
              base.projectId,
              input.pensaMissionId,
            )
            if (mission) {
              assistance.mission = mission
              objective += `\nObjetivo do Pensa: ${mission.summary}`
            }
            if (!isStudioProAssistanceRequest(assistance))
              return error(
                'O contexto deste pedido, incluindo a missão, ficou grande demais. Resuma os critérios ou as decisões e tente novamente.',
                400,
              )
            await (deps.preflight ?? preflightStudioProBuild)({
              files: base.files,
              binaries: input.binaries,
              templateId: base.templateId,
              executionId: `builder-${input.id.replaceAll('-', '')}`,
              parentOrigin: new URL(request.url).origin,
              runtimeUrl: env.STUDIO_PRO_RUNTIME_URL!,
              runtimeToken: env.STUDIO_PRO_RUNTIME_TOKEN!,
              validate: true,
              signal: request.signal,
            })
            command = {
              operation: 'create',
              id: input.id,
              objective,
              model: env.OPENROUTER_STUDIO_BUILDER_MODEL || pensaSynthesisModel(),
              base,
              binaries: input.binaries,
              request: assistance,
              parentOrigin: new URL(request.url).origin,
            }
          } else command = input
          const response = await deps.members.studioBuilder(actor, command)
          if (response.status !== 200 || !response.body)
            return error(
              'Não foi possível registrar a execução. Consulte o estado antes de tentar novamente.',
              response.status >= 400 && response.status < 500 ? response.status : 502,
            )
          if (input.operation === 'cancel' && response.body.state) {
            // The durable cancellation already won. Ledger reconciliation must not hide it.
            await deps.members
              .studioAiUsage(actor, {
                operation: 'finish',
                runId: response.body.state.job.id,
              })
              .catch(() => console.error('[studio-builder] cancelled run settlement pending'))
          }
          return NextResponse.json(
            { job: response.body.state ? studioProBuilderView(response.body.state.job) : null },
            { headers: { 'Cache-Control': 'no-store' } },
          )
        } catch (cause) {
          if (cause instanceof StudioAssistanceContextError)
            return error(cause.message, cause.status)
          if (cause instanceof StudioProRuntimeInputError) return error(cause.message, cause.status)
          if (cause instanceof StudioProRuntimeUpstreamError)
            return error(cause.message, studioProRuntimePublicStatus(cause.status))
          console.error('[studio-builder] request failed', {
            operation: input.operation,
            name: cause instanceof Error ? cause.name : typeof cause,
          })
          return error(
            'A construção não pôde continuar. Consulte o estado da execução; seus arquivos estão preservados.',
            502,
          )
        }
      },
    },
  }
}
