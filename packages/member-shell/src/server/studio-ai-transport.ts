import 'server-only'
import type {
  StudioAiActor,
  StudioAiReservation,
  StudioAiRunRequest,
  StudioAiSettlement,
} from '@sistemazero/core/ai-credits'
import { getEnv } from '../lib/env'
import type { MembersClient } from './clients'
import { type PensaJsonTransport, PensaLlmError } from './pensa-llm'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const rejectedStatuses = new Set([400, 401, 402, 403, 404, 422, 429])

export async function readProviderJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.body) throw new PensaLlmError('IA sem corpo de resposta', undefined, false)
  const reader = response.body.getReader()
  let bytes = 0,
    text = ''
  const decoder = new TextDecoder()
  let onAbort = () => {}
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new PensaLlmError('Resposta de IA interrompida', undefined, false))
    signal.addEventListener('abort', onAbort, { once: true })
  })
  // Keep one abort listener for the whole body, not one per chunk.
  try {
    while (true) {
      if (signal.aborted) throw new PensaLlmError('Resposta de IA interrompida', undefined, false)
      const { done, value } = await Promise.race([reader.read(), aborted])
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_RESPONSE_BYTES)
        throw new PensaLlmError('Resposta de IA excede o limite', undefined, false)
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } finally {
    signal.removeEventListener('abort', onAbort)
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}
function tokens(value: unknown) {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 10_000_000
    ? (value as number)
    : undefined
}
export function providerUsage(
  value: unknown,
  generationLookup = false,
): Omit<StudioAiSettlement, 'attempt'> {
  const data = record(value)
  const usage = generationLookup ? record(data?.data) : record(data?.usage)
  const rawId = generationLookup ? usage?.id : data?.id
  const generationId =
    typeof rawId === 'string' && /^gen-[0-9A-Za-z-]{1,124}$/.test(rawId) && rawId.length <= 128
      ? rawId
      : undefined
  const cost = generationLookup ? usage?.total_cost : usage?.cost
  const actualMicroUsd =
    typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 && cost <= 1000
      ? Math.ceil(cost * 1_000_000)
      : undefined
  return {
    status: actualMicroUsd === undefined ? 'uncertain' : 'confirmed',
    ...(actualMicroUsd === undefined ? {} : { actualMicroUsd }),
    ...(generationId ? { generationId } : {}),
    promptTokens: tokens(generationLookup ? usage?.native_tokens_prompt : usage?.prompt_tokens),
    completionTokens: tokens(
      generationLookup ? usage?.native_tokens_completion : usage?.completion_tokens,
    ),
  }
}

/** Inference stays in the BFF; Members owns every durable permission and settlement. */
export function createStudioAiTransport(input: {
  members: Pick<MembersClient, 'studioAiUsage'>
  actor: StudioAiActor
  request: StudioAiRunRequest
  reservation: Extract<StudioAiReservation, { allowed: true }>
  signal?: AbortSignal
  /** Durable builder resumes at the next ledger attempt, never dispatching attempt 1 again. */
  completedAttempts?: number
}): { transport: PensaJsonTransport; finish: () => Promise<void> } {
  let attempt = input.completedAttempts ?? 0
  if (!Number.isSafeInteger(attempt) || attempt < 0 || attempt >= input.request.maxAttempts)
    throw new PensaLlmError('Contador de tentativas inválido', undefined, false)
  const { members, actor, request, reservation } = input
  const call = async (action: Parameters<MembersClient['studioAiUsage']>[1]) => {
    const result = await members.studioAiUsage(actor, action)
    if (result.status !== 200 || !result.body)
      throw new PensaLlmError('Registro de uso de IA indisponível', undefined, false)
    return result.body
  }
  const settle = async (settlement: StudioAiSettlement) => {
    // Safe to retry only this idempotent acknowledgement, never the dispatch or inference.
    for (let n = 0; ; n++) {
      try {
        await call({ operation: 'settle', runId: request.runId, settlement })
        return
      } catch (error) {
        if (n === 1) throw error
      }
    }
  }
  const transport: PensaJsonTransport = async (body, bodyTimeoutMs, signal) => {
    const caller = signal ?? input.signal
    if (caller?.aborted || ++attempt > request.maxAttempts)
      throw new PensaLlmError('Operação de IA encerrada', undefined, false)
    const serialized = JSON.stringify(body)
    if (
      body.model !== request.model ||
      body.max_tokens !== request.maxOutputTokens ||
      Buffer.byteLength(serialized, 'utf8') > request.inputBytes
    )
      throw new PensaLlmError('Contexto ultrapassou a reserva de IA', undefined, false)
    if (reservation.source === 'platform' && !getEnv().OPENROUTER_API_KEY)
      throw new PensaLlmError('IA não configurada', 503, false)
    const { dispatch } = await call({ operation: 'dispatch', runId: request.runId, attempt })
    if (!dispatch || dispatch.source !== reservation.source)
      throw new PensaLlmError('Permissão de IA inválida', undefined, false)
    const apiKey = dispatch.source === 'openrouter' ? dispatch.apiKey : getEnv().OPENROUTER_API_KEY
    if (!apiKey) throw new PensaLlmError('Conexão de IA indisponível', 503, false)
    if (caller?.aborted) {
      await settle({ attempt, status: 'rejected' })
      throw new PensaLlmError('Operação cancelada antes da chamada', undefined, false)
    }
    const controller = new AbortController()
    const abort = () => controller.abort()
    caller?.addEventListener('abort', abort, { once: true })
    if (caller?.aborted) controller.abort()
    let timer = setTimeout(abort, 30_000)
    let recorded = false
    try {
      // The caller cannot supply provider preferences, tools, plugins or image billing.
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-OpenRouter-Title': 'Sistema Zero Studio',
          ...(getEnv().OPENROUTER_REFERER ? { 'HTTP-Referer': getEnv().OPENROUTER_REFERER! } : {}),
        },
        body: JSON.stringify({
          ...body,
          usage: { include: true },
          provider: { require_parameters: true, max_price: reservation.priceCaps },
        }),
      })
      clearTimeout(timer)
      timer = setTimeout(abort, bodyTimeoutMs)
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined)
        await settle({
          attempt,
          status: rejectedStatuses.has(res.status) ? 'rejected' : 'uncertain',
        })
        recorded = true
        throw new PensaLlmError(`Provedor de IA indisponível (${res.status})`, res.status, false)
      }
      const data = await readProviderJson(res, controller.signal)
      const usage = providerUsage(data)
      await settle({ ...usage, attempt })
      recorded = true
      // Missing usage can be resolved by the durable reconciliation worker. Never invent zero cost.
      if (record(data)?.error)
        throw new PensaLlmError('O provedor não concluiu a geração', undefined, false)
      return data
    } catch (cause) {
      if (!recorded) await settle({ attempt, status: 'uncertain' })
      if (cause instanceof PensaLlmError) throw cause
      throw new PensaLlmError('A chamada de IA foi interrompida', undefined, false)
    } finally {
      clearTimeout(timer)
      caller?.removeEventListener('abort', abort)
      controller.abort()
    }
  }
  return {
    transport,
    finish: async () => {
      try {
        await call({ operation: 'finish', runId: request.runId })
      } catch {
        console.error('[studio-ai] fechamento pendente; reserva expira pela política do servidor', {
          runId: request.runId,
        })
      }
    },
  }
}
