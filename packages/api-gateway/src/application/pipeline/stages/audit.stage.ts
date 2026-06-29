import type { AuditEmitter, AuditEvent } from '../../../domain/audit/audit-emitter.port'
import type { GatewayContext, Stage } from '../stage.port'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Finalizer de AUDITORIA: quando a rota é `audit`-marcada e respondeu com SUCESSO
 * (2xx) por um ator resolvido, emite um evento ao auth (fire-and-forget). Roda SEMPRE
 * (é finalizer), mas só emite no caminho feliz de mutação — nunca em 3xx/4xx/5xx/erro.
 * NUNCA bloqueia a resposta: o `emit` é disparado sem `await` e, no caso em que o alvo
 * só existe no corpo da RESPOSTA, a LEITURA do corpo é adiada para fora do caminho
 * quente (clona síncrono — barato — e lê no disparo assíncrono), para que o finalize e
 * o cliente não esperem a auditoria nem fiquem reféns de um corpo de upstream lento.
 */
export function createAuditStage(deps: { emitter: AuditEmitter }): Stage {
  return {
    name: 'audit',
    run(ctx: GatewayContext) {
      const audit = ctx.route?.route.audit
      if (!audit) return undefined
      const status = ctx.response?.status ?? 500
      if (status < 200 || status >= 300) return undefined
      if (!MUTATING_METHODS.has(ctx.method)) return undefined
      // Sem ator resolvido (ex.: HMAC S2S) não há quem auditar — pula.
      const actor = ctx.user
      if (!actor) return undefined

      const event: AuditEvent = {
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        // Sessão de suporte: o ator REAL é o impersonador, não o `sub` impersonado.
        impersonatorId: actor.impersonatorId,
        action: audit.action ?? ctx.route?.route.id ?? 'unknown',
        method: ctx.method,
        path: ctx.url.pathname,
        status,
        ip: ctx.clientIp || undefined,
        userAgent: ctx.request.headers.get('user-agent') ?? undefined,
        requestId: ctx.requestId,
      }

      // Alvo conhecido de forma SÍNCRONA (path param ou campo do corpo já bufferizado).
      const syncTarget =
        firstParam(ctx.route?.params) ?? targetFromBody(ctx.rawBody, audit.targetField)
      if (syncTarget !== undefined || !audit.targetResponseField) {
        void deps.emitter.emit({ ...event, targetId: syncTarget })
        return undefined
      }

      // Alvo nasce no corpo da RESPOSTA (ex.: criação de usuário): CLONA agora — barato,
      // só tees o stream ANTES do finalize consumir `ctx.response.body` — e adia a leitura.
      const clone = ctx.response?.clone()
      void (async () => {
        const targetId = await targetFromResponse(clone, audit.targetResponseField)
        await deps.emitter.emit({ ...event, targetId })
      })()
      return undefined
    },
  }
}

/** Recurso afetado: nomes comuns primeiro, senão o 1º param capturado. */
function firstParam(params: Readonly<Record<string, string>> | undefined): string | undefined {
  if (!params) return undefined
  return params.id ?? params.userId ?? params.paymentId ?? Object.values(params)[0]
}

/** Fallback para rotas sem path param: campo string simples no corpo JSON. */
function targetFromBody(
  rawBody: string | undefined,
  field: string | undefined,
): string | undefined {
  if (!rawBody || !field) return undefined
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>
    return stringAtPath(parsed, field)
  } catch {
    return undefined
  }
}

/** Mínimo que o leitor precisa — evita o atrito de tipos entre o `Response` do Bun e o do undici. */
interface JsonBody {
  json(): Promise<unknown>
}

/**
 * Fallback para rotas cujo id do alvo nasce no upstream (ex.: criação de usuário).
 * Recebe um CLONE dedicado da resposta (o chamador clona no caminho quente e adia esta
 * leitura), então consome `clone.json()` direto — sem voltar a clonar.
 */
async function targetFromResponse(
  clone: JsonBody | undefined,
  field: string | undefined,
): Promise<string | undefined> {
  if (!clone || !field) return undefined
  try {
    const parsed = (await clone.json()) as Record<string, unknown>
    return stringAtPath(parsed, field)
  } catch {
    return undefined
  }
}

/** Campo simples ou caminho pontilhado (`user.id`) dentro de um objeto JSON. */
function stringAtPath(source: Record<string, unknown>, path: string): string | undefined {
  let current: unknown = source
  for (const part of path.split('.')) {
    if (!part || typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' && current.trim() ? current : undefined
}
