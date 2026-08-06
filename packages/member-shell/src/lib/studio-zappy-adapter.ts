import type {
  StudioTutorAdapter,
  StudioTutorAskResult,
  StudioTutorHistoryMessage,
} from '@sistemazero/studio'

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

/** Adapter client-side do BFF. Não contém sessão, regras de rank nem chaves de IA. */
export function createStudioZappyAdapter(baseUrl = '/api/studio/zappy'): StudioTutorAdapter {
  return {
    async loadHistory(projectId, before) {
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
    async deleteHistory(projectId) {
      const response = await fetch(`${baseUrl}?projectId=${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
        signal: timeout(QUICK_TIMEOUT_MS),
      })
      await requireOk<{ ok: true }>(response)
    },
    async ask(input) {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: timeout(ASK_TIMEOUT_MS),
      })
      // O saldo vem AO LADO da resposta, não dentro dela (o `response` é o que o
      // members persiste no histórico, e crédito é volátil).
      return requireOk<StudioTutorAskResult>(response)
    },
    async feedback(input) {
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
