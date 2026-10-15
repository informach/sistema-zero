import { Elysia, t } from 'elysia'
import type { StudioAiAccountService } from '../../../application/ai-usage/studio-ai-account.service'
import { StudioAiUnavailableError } from '../../../domain/ai-usage/studio-ai.errors'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

const Limit = t.Nullable(t.Integer({ minimum: 1, maximum: 1_000_000_000 }))
export function studioAiAccountRoutes(deps: {
  service?: StudioAiAccountService
  internalToken?: string
}) {
  return new Elysia({ prefix: '/members/internal/studio-ai' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
    })
    .post(
      '/account',
      async ({ body, set }) => {
        set.headers['Cache-Control'] = 'no-store'
        if (body.actor.userId !== body.actor.accountId || body.actor.parent !== true)
          throw new AccessDeniedError('Apenas o responsável pode gerenciar a conexão.')
        if (!deps.service) throw new StudioAiUnavailableError()
        const { accountId } = body.actor
        switch (body.action.operation) {
          case 'view':
            return { account: await deps.service.view(accountId) }
          case 'start':
            return deps.service.begin(accountId, body.action.binding, body.action.callbackUrl)
          case 'complete':
            return {
              account: await deps.service.complete(
                accountId,
                body.action.binding,
                body.action.state,
                body.action.code,
              ),
            }
          case 'policy':
            return { account: await deps.service.policy(accountId, body.action.policy) }
          case 'disconnect':
            return { account: await deps.service.disconnect(accountId) }
        }
      },
      {
        body: t.Object({
          actor: t.Object({
            accountId: t.String({ format: 'uuid' }),
            userId: t.String({ format: 'uuid' }),
            parent: t.Literal(true),
          }),
          action: t.Union([
            t.Object({ operation: t.Literal('view') }),
            t.Object({ operation: t.Literal('disconnect') }),
            t.Object({
              operation: t.Literal('start'),
              binding: t.String({ pattern: '^[a-f0-9]{64}$' }),
              callbackUrl: t.String({ maxLength: 500 }),
            }),
            t.Object({
              operation: t.Literal('complete'),
              binding: t.String({ pattern: '^[a-f0-9]{64}$' }),
              state: t.String({ maxLength: 100 }),
              code: t.String({ minLength: 1, maxLength: 1024 }),
            }),
            t.Object({
              operation: t.Literal('policy'),
              policy: t.Object({
                source: t.Union([t.Literal('platform'), t.Literal('openrouter')]),
                externalDailyLimitMicroUsd: Limit,
                externalMonthlyLimitMicroUsd: Limit,
              }),
            }),
          ]),
        }),
      },
    )
}
