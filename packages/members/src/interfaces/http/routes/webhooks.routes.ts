import { PayloadTooLargeError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import type { AwardGamificationService } from '../../../application/gamification/award-gamification.service'
import type { GrantEntitlementService } from '../../../application/grant-entitlement/grant-entitlement.service'
import type { RevokeEntitlementService } from '../../../application/revoke-entitlement/revoke-entitlement.service'
import type { TeacherThreadsService } from '../../../application/teacher-threads/teacher-threads.service'
import { currentChallengeKey } from '../../../domain/gamification/challenges'
import { deterministicSourceId } from '../../../domain/gamification/source-id'
import type { HubGateway } from '../../../domain/ports/hub-gateway.port'
import type { ProcessedWebhookRepository } from '../../../domain/ports/processed-webhook-repository.port'
import { ValidationError } from '../../../domain/shared/errors'
import {
  ChallengeWebhookBody,
  ClubeWebhookBody,
  GrantWebhookBody,
  MuralCommentWebhookBody,
  MuralMessageWebhookBody,
  PlaysMilestoneWebhookBody,
  ShowcaseWebhookBody,
  StandaloneShowcaseWebhookBody,
  SubscriptionWebhookBody,
} from '../dtos'
import { getRawBody, isOversizeBody } from '../raw-body'
import { assertWebhookSignature } from '../webhook-auth'

// Namespace FIXO p/ derivar o id determinístico do turno do Mural a partir da
// entrega (idempotência do webhook). NUNCA mudar — mudaria a chave e reprocessaria.
const MURAL_MESSAGE_NAMESPACE = 'b7d3e6a1-9c4f-42b8-8e05-1a6f27c930d4'

/**
 * `x-delivery-id` vira PK `text` em `processed_webhooks` — só é alcançável após
 * o HMAC, mas um id anômalo não deve virar linha gigante (gateway honesto manda
 * ids curtos). Acima do teto → 400 (truncar criaria colisão de dedupe).
 */
const MAX_DELIVERY_ID_LENGTH = 200
function resolveDeliveryId(headers: Record<string, string | undefined>): string | null {
  const id = headers['x-delivery-id']
  if (!id) return null
  if (id.length > MAX_DELIVERY_ID_LENGTH)
    throw new ValidationError(`x-delivery-id excede ${MAX_DELIVERY_ID_LENGTH} caracteres`)
  return id
}

function parsePaidAt(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    throw new ValidationError('paidAt inválido (deve ser uma data ISO-8601 válida)')
  return d
}

export interface WebhooksRoutesDeps {
  grant: GrantEntitlementService
  revoke: RevokeEntitlementService
  processed: ProcessedWebhookRepository
  /** Notifica o hub (comunidade) no grant → invalida o cache de acesso na hora. */
  hub: HubGateway
  /** Registra o marco `course_showcased` quando o hub avisa que o aluno publicou no Mural. */
  award: AwardGamificationService
  /** Canal de retorno: o hub manda o motivo da moderação do Mural → mensagem ao aluno. */
  teacherThreads: TeacherThreadsService
  webhookSecret: string
  toleranceSeconds: number
  now: () => Date
  logger: Logger
}

/**
 * Webhooks de entrada (funil → gateway → members). HMAC verificado sobre o corpo
 * bruto + dedupe por `x-delivery-id` (entrega ≥1 vez): checa ANTES, registra só
 * DEPOIS do sucesso → falha transitória continua retryável.
 */
export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  // HMAC verificado no `transform` (roda ANTES da validação do corpo) → uma
  // requisição sem assinatura válida nunca chega à validação/handler (401 antes
  // de 422; nada de side-effect antes da autenticação). 413 tem precedência.
  const verify = ({
    request,
    headers,
  }: {
    request: Request
    headers: Record<string, string | undefined>
  }) => {
    if (isOversizeBody(request)) throw new PayloadTooLargeError()
    assertWebhookSignature({
      secret: deps.webhookSecret,
      method: request.method,
      path: new URL(request.url).pathname,
      rawBody: getRawBody(request),
      signatureHeader: headers['x-signature'],
      toleranceSeconds: deps.toleranceSeconds,
    })
  }

  return new Elysia({ prefix: '/members/webhooks' })
    .onTransform(verify)
    .post(
      '/grant',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }

        const grantedAt = parsePaidAt(body.paidAt) ?? deps.now()

        const result = await deps.grant.execute({
          userId: body.userId,
          offerRef: body.offerRef,
          paymentId: body.paymentId,
          grantedAt,
          subscription: body.subscription ?? null,
          accessPeriodMonths: body.accessPeriodMonths ?? null,
        })

        // Oferta não resolvida no catálogo (404) → 502 SEM marcar a entrega: o
        // gateway/funil re-entrega (auto-cura uma corrida; uma divergência de slug
        // permanente aflora como falhas repetidas em vez de sumir silenciosamente).
        if (!result.offerFound) {
          deps.logger.warn('grant.offer_unresolved', { offerRef: body.offerRef })
          set.status = 502
          return { ok: false, error: 'OFFER_UNRESOLVED' }
        }

        // Oferta resolvida mas SEM nenhum item (drift de contrato — itens
        // malformados são descartados no parse do gateway do catálogo): marcar a
        // entrega aqui deixaria o comprador sem acesso em silêncio. 502 → re-entrega
        // (a falha repetida é o alarme).
        if (result.itemsResolved === 0) {
          deps.logger.error('grant.offer_empty', { offerRef: body.offerRef })
          set.status = 502
          return { ok: false, error: 'OFFER_EMPTY' }
        }

        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'grant')
        // Comunidade: avisa o hub p/ liberar espaços community_gated/course_gated NA
        // HORA (best-effort — nunca lança; o TTL do cache de acesso do hub cobre se falhar).
        await deps.hub.notifyAccessChanged(body.userId, 'grant')
        return { ok: true, granted: result.granted }
      },
      { body: GrantWebhookBody },
    )
    .post(
      '/subscription',
      async ({ headers, body }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }

        const result =
          body.event === 'canceled'
            ? await deps.revoke.cancel(body.subscriptionId)
            : await deps.revoke.expire(body.subscriptionId)

        if (deliveryId) await deps.processed.markProcessed(deliveryId, `subscription.${body.event}`)
        for (const userId of result.userIds) {
          await deps.hub.notifyAccessChanged(userId, body.event)
        }
        return { ok: true, affected: result.affected }
      },
      { body: SubscriptionWebhookBody },
    )
    .post(
      // O hub avisa que o aluno PUBLICOU o projeto do curso no Mural dos Criadores.
      // Grava o marco `course_showcased` (idempotente por user+curso): junto de
      // `course_complete`, qualifica o curso p/ o nível do aluno. Aqui o award precisa
      // ser observado: se falhar, NÃO marcamos a entrega para manter o retry possível.
      '/showcase',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        const awarded = await deps.award.awardCourseShowcased({
          userId: body.userId,
          accountId: body.accountId,
          courseId: body.courseId,
          audience: body.audience,
        })
        if (!awarded) {
          set.status = 502
          return { ok: false, error: 'SHOWCASE_AWARD_FAILED' }
        }
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'showcase')
        return { ok: true }
      },
      { body: ShowcaseWebhookBody },
    )
    .post(
      // O hub avisa que o aluno publicou no Mural com a tag do DESAFIO do mês
      // (posse Clube+Estúdio já validada lá). Revalida o MÊS aqui: mismatch (clock
      // skew/retry atrasado que virou o mês) → 200 SEM award — nunca 5xx, o retry
      // martelaria um evento que jamais vai passar. Award = XP real (dedupado pelo
      // sourceId determinístico do mês) + badge `challenge-first`.
      '/challenge',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        if (body.challengeKey !== currentChallengeKey(deps.now())) {
          deps.logger.warn('challenge.month_mismatch', { challengeKey: body.challengeKey })
          if (deliveryId) await deps.processed.markProcessed(deliveryId, 'challenge')
          return { ok: true, ignored: true }
        }
        const awarded = await deps.award.awardChallengeEntry({
          userId: body.userId,
          accountId: body.accountId,
          audience: body.audience,
          monthKey: body.challengeKey,
        })
        if (!awarded) {
          set.status = 502
          return { ok: false, error: 'CHALLENGE_AWARD_FAILED' }
        }
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'challenge')
        return { ok: true }
      },
      { body: ChallengeWebhookBody },
    )
    .post(
      // O hub avisa que a equipe APROVOU um tópico/comentário do Clube → recompensa a
      // criança (XP + badge de comunidade). Premiar só na aprovação bloqueia farm e
      // conteúdo rejeitado. Idempotente pelo `contentId` no ledger. Se o award falhar,
      // NÃO marca a entrega (mantém o retry) — mesma régua do showcase/challenge.
      '/clube',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        const awarded = await deps.award.awardClubeContribution({
          userId: body.userId,
          accountId: body.accountId,
          audience: body.audience,
          kind: body.kind,
          contentId: body.contentId,
        })
        if (!awarded) {
          set.status = 502
          return { ok: false, error: 'CLUBE_AWARD_FAILED' }
        }
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'clube')
        return { ok: true }
      },
      { body: ClubeWebhookBody },
    )
    .post(
      // O hub avisa que a equipe APROVOU um comentário no MURAL → marco `mural_comment`
      // (amount 0) que conta p/ a missão "comentar no Mural". Só o aprovado entra →
      // anti-farm por moderação. Idempotente pelo `commentId`. Award falhou → NÃO marca
      // a entrega (mantém o retry), mesma régua do clube/showcase.
      '/mural-comment',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        const awarded = await deps.award.awardMuralComment({
          userId: body.userId,
          accountId: body.accountId,
          audience: body.audience,
          commentId: body.commentId,
        })
        if (!awarded) {
          set.status = 502
          return { ok: false, error: 'MURAL_COMMENT_AWARD_FAILED' }
        }
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'mural-comment')
        return { ok: true }
      },
      { body: MuralCommentWebhookBody },
    )
    .post(
      // O hub avisa que a criança publicou um jogo STANDALONE no Mural (posse do
      // Estúdio já validada lá no publish). Grava o marco `studio_published` (missões)
      // + o XP diário `studio_publish_day` (1×/dia — streak/liga de quem só cria).
      // Award falhou → NÃO marca a entrega (retry), mesma régua do showcase.
      '/showcase-standalone',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        const awarded = await deps.award.awardStudioStandalonePublished({
          userId: body.userId,
          accountId: body.accountId,
          audience: body.audience,
          playId: body.playId,
        })
        if (!awarded) {
          set.status = 502
          return { ok: false, error: 'STANDALONE_SHOWCASE_AWARD_FAILED' }
        }
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'showcase-standalone')
        return { ok: true }
      },
      { body: StandaloneShowcaseWebhookBody },
    )
    .post(
      // O hub avisa que um jogo do AUTOR cruzou 10/100 jogadas no /jogar público.
      // Marco amount 0 → badges plays-10/plays-100 (+ troféu do quarto na de 100).
      // Idempotente por playId; award falhou → NÃO marca a entrega (retry do hub).
      '/plays-milestone',
      async ({ headers, body, set }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        const awarded = await deps.award.awardPlaysMilestone({
          userId: body.userId,
          accountId: body.accountId,
          audience: body.audience,
          playId: body.playId,
          milestone: body.milestone,
        })
        if (!awarded) {
          set.status = 502
          return { ok: false, error: 'PLAYS_MILESTONE_AWARD_FAILED' }
        }
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'plays-milestone')
        return { ok: true }
      },
      { body: PlaysMilestoneWebhookBody },
    )
    .post(
      // O hub avisa que a equipe MODEROU (escondeu/recusou) um jogo do Mural COM um
      // motivo p/ a criança → vira mensagem `teacher` numa conversa `mural_publication`
      // (canal de retorno). Idempotente por id DETERMINÍSTICO da entrega (retry não
      // duplica o recado). Falha → NÃO marca a entrega (retry), régua dos demais.
      '/mural-message',
      async ({ headers, body }) => {
        const deliveryId = resolveDeliveryId(headers)
        if (deliveryId && (await deps.processed.isProcessed(deliveryId))) {
          return { ok: true, deduped: true }
        }
        await deps.teacherThreads.systemPostByContext({
          userId: body.userId,
          accountId: body.accountId ?? null,
          audience: body.audience,
          contextType: 'mural_publication',
          contextRef: body.contextRef,
          title: body.title ?? null,
          authorId: null,
          authorName: body.moderatorName ?? null,
          body: body.reason,
          dedupeId: deliveryId
            ? deterministicSourceId(MURAL_MESSAGE_NAMESPACE, deliveryId)
            : undefined,
        })
        if (deliveryId) await deps.processed.markProcessed(deliveryId, 'mural-message')
        return { ok: true }
      },
      { body: MuralMessageWebhookBody },
    )
}
