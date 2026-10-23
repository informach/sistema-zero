import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import type { StudioProBuilderPage, StudioProBuilderView } from '@sistemazero/core/studio'
import { StudioPythonPreviewReferenceSchema } from '@sistemazero/core/studio/python-preview-reference'
import type {
  StudioTutorAdapter,
  StudioTutorAskResult,
  StudioTutorHistoryMessage,
  StudioTutorHistoryPage,
} from '@sistemazero/studio'
import { sessionFetch as fetch } from './session-fetch'

interface ErrorBody {
  error?: { code?: string; message?: string }
}

async function readBody<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null
}

/**
 * Toda ida ao BFF precisa de teto de tempo. Sem ele, uma rede pendurada (celular,
 * wifi ruim, túnel) deixa a promessa sem resolver PARA SEMPRE: o painel trava em
 * "Zappy está pensando…", a pergunta que a criança digitou se perde e ela não
 * consegue perguntar de novo — o `finally` que libera o botão nunca roda.
 *
 * O teto da PERGUNTA é generoso de propósito: o servidor pode levar ~50s numa
 * resposta longa com reparo. Cortar antes disso mataria resposta legítima.
 */
const ASK_TIMEOUT_MS = 90_000
const QUICK_TIMEOUT_MS = 20_000

function timeout(ms: number): AbortSignal | undefined {
  // Navegador antigo sem `AbortSignal.timeout`: segue sem teto, como antes.
  return typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined
}

async function requireOk<T>(response: Response): Promise<T> {
  const body = await readBody<T & ErrorBody>(response)
  if (!response.ok || !body) {
    const error = Object.assign(
      new Error(body?.error?.message ?? 'Não foi possível falar com o Zappy agora.'),
      { code: body?.error?.code ?? 'ZAPPY_UNAVAILABLE', status: response.status },
    )
    throw error
  }
  return body
}

export interface StudioZappyAdapterOptions {
  /**
   * A missão do Pensa aberta no Estúdio (`?missao=`), ou uma função que
   * a devolve na hora da pergunta (a missão muda sem recriar o adapter). Vai no corpo como
   * `pensaMissionId`; o servidor só a usa se ela for do plano deste projeto e do Estúdio, e sem ela
   * consulta a próxima ação calculada pelo servidor.
   */
  pensaMissionId?: string | null | (() => string | null | undefined)
}

/** Adapter client-side do BFF. Não contém sessão, regras de rank nem chaves de IA. */
export function createStudioZappyAdapter(
  baseUrl = '/api/studio/zappy',
  options: StudioZappyAdapterOptions = {},
): StudioTutorAdapter {
  const currentTaskId = () =>
    typeof options.pensaMissionId === 'function' ? options.pensaMissionId() : options.pensaMissionId
  const build = async (command: unknown, signal?: AbortSignal) => {
    const response = await fetch(`${baseUrl}/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(170_000)])
        : AbortSignal.timeout(170_000),
    })
    return (await requireOk<{ job: StudioProBuilderView | null }>(response)).job
  }
  const contextual = (
    operation: object,
    transport: NonNullable<Parameters<StudioTutorAdapter['ask']>[1]>,
  ) =>
    transport.send((authorization, signal) =>
      fetch(baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        body: JSON.stringify({ ...operation, authorization }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(QUICK_TIMEOUT_MS)]),
      }),
    )
  return {
    async loadCredits(signal) {
      const response = await fetch('/api/members/ai-credits', {
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(QUICK_TIMEOUT_MS)])
          : timeout(QUICK_TIMEOUT_MS),
      })
      return (await requireOk<{ credits: AiCreditsView | null }>(response)).credits
    },
    builder: {
      async authorizePythonPreview(input, signal) {
        const response = await fetch(`${baseUrl}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          redirect: 'error',
          body: JSON.stringify({ operation: 'authorize-python-preview', ...input }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(QUICK_TIMEOUT_MS)]),
        })
        const body = await requireOk<{ reference: unknown }>(response)
        signal.throwIfAborted()
        return StudioPythonPreviewReferenceSchema.parse(body.reference)
      },
      async availability(templateId, signal, programmingLanguage) {
        const response = await fetch(`${baseUrl}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'availability', templateId, programmingLanguage }),
          cache: 'no-store',
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(QUICK_TIMEOUT_MS)])
            : timeout(QUICK_TIMEOUT_MS),
        })
        return requireOk<{ available: boolean; reason?: string }>(response)
      },
      async create(input, signal) {
        const pensaMissionId =
          input.base.version === 2 && input.base.configuration.programmingLanguage === 'python'
            ? undefined
            : currentTaskId()
        const job = await build(
          {
            operation: 'create',
            kind: 'pro',
            mode: 'code',
            ...input,
            ...(pensaMissionId ? { pensaMissionId } : {}),
          },
          signal,
        )
        if (!job) throw new Error('A construção não foi registrada.')
        return job
      },
      latest: (projectId, signal) => build({ operation: 'latest', projectId }, signal),
      get: (input, signal) => build({ operation: 'get', ...input }, signal),
      discard: (input) => build({ operation: 'discard', ...input }),
      refreshPreview: (input, signal) => build({ operation: 'refresh-preview', ...input }, signal),
      async checkApplication(input, signal) {
        const response = await fetch(`${baseUrl}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'check-application', ...input }),
          cache: 'no-store',
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(QUICK_TIMEOUT_MS)])
            : timeout(QUICK_TIMEOUT_MS),
        })
        return requireOk<{ allowed: boolean; reason?: string }>(response)
      },
      async list(input, signal) {
        const response = await fetch(`${baseUrl}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'list', ...input }),
          cache: 'no-store',
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(QUICK_TIMEOUT_MS)])
            : timeout(QUICK_TIMEOUT_MS),
        })
        return requireOk<StudioProBuilderPage>(response)
      },
      cancel: (input) => build({ operation: 'cancel', ...input }),
      async removeProject(projectId, signal) {
        await build({ operation: 'remove-project', projectId }, signal)
      },
    },
    async loadHistory(projectId, before, transport) {
      if (transport)
        return requireOk<StudioTutorHistoryPage>(
          await contextual(
            { operation: 'history', projectId, ...(before ? { before } : {}) },
            transport,
          ),
        )
      const query = new URLSearchParams({ projectId })
      if (before) query.set('before', before)
      const response = await fetch(`${baseUrl}?${query.toString()}`, {
        cache: 'no-store',
        signal: timeout(QUICK_TIMEOUT_MS),
      })
      return requireOk<{ messages: StudioTutorHistoryMessage[]; nextCursor: string | null }>(
        response,
      )
    },
    async deleteHistory(projectId, transport) {
      if (transport) {
        await requireOk<{ ok: true }>(
          await contextual({ operation: 'delete-history', projectId }, transport),
        )
        return
      }
      const response = await fetch(`${baseUrl}?projectId=${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
        signal: timeout(QUICK_TIMEOUT_MS),
      })
      await requireOk<{ ok: true }>(response)
    },
    async ask(input, transport) {
      const python = input.context.environment?.programmingLanguage === 'python'
      const pensaMissionId = python ? null : currentTaskId()
      if (python && !transport) throw new Error('O contexto da ajuda Python não está disponível.')
      const request = (extra: object = {}, signal = timeout(ASK_TIMEOUT_MS)) =>
        fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...input,
            ...extra,
            ...(pensaMissionId ? { pensaMissionId } : {}),
          }),
          signal,
          cache: 'no-store',
          redirect: 'error',
        })
      const response =
        python && transport
          ? await transport.send((authorization, signal) =>
              request(
                { authorization, transportVersion: 1 },
                AbortSignal.any([signal, AbortSignal.timeout(ASK_TIMEOUT_MS)]),
              ),
            )
          : await request()
      if (python && response.ok) {
        const envelope = await requireOk<{
          transportVersion: 1
          status: number
          body: StudioTutorAskResult & ErrorBody
        }>(response)
        if (envelope.transportVersion !== 1 || !Number.isInteger(envelope.status))
          throw new Error('A resposta da ajuda Python não é válida.')
        if (envelope.status < 200 || envelope.status >= 300)
          throw Object.assign(
            new Error(envelope.body?.error?.message ?? 'Não foi possível falar com o Zappy agora.'),
            {
              code: envelope.body?.error?.code ?? 'ZAPPY_UNAVAILABLE',
              status: envelope.status,
            },
          )
        return envelope.body
      }
      // O saldo vem AO LADO da resposta, não dentro dela (o `response` é o que o
      // members persiste no histórico, e crédito é volátil).
      return requireOk<StudioTutorAskResult>(response)
    },
    async feedback(input, transport) {
      if (transport) {
        await requireOk<{ ok: true }>(
          await contextual({ operation: 'feedback', ...input }, transport),
        )
        return
      }
      const response = await fetch(`${baseUrl}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: timeout(QUICK_TIMEOUT_MS),
      })
      await requireOk<{ ok: true }>(response)
    },
  }
}
