import { ProblemasDePublicacaoSchema } from '@sistemazero/arquipelago-contracts'
import { z } from 'zod'

const apiError = z.object({ error: z.object({ code: z.string().optional(), message: z.string() }) })

/** Recusa do serviço do jogo, com o código para quem precisa reagir a um caso (o 409 do manifesto). */
export class GameRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message)
  }
}

/**
 * Chama o BFF do jogo (`/api/arquipelago/*`). `editHint` acrescenta, no 409, o lembrete de reabrir
 * o desafio que está no editor (o manifesto tem o recado próprio).
 */
export async function gameRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
  signal?: AbortSignal,
  { editHint = true }: { editHint?: boolean } = {},
): Promise<unknown> {
  const res = await fetch(`/api/arquipelago/${path}`, {
    method,
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  // Uma recusa da borda (corpo grande demais, por exemplo) pode não vir em JSON.
  const raw: unknown = await res.json().catch(() => null)
  signal?.throwIfAborted()
  if (!res.ok) {
    const parsed = apiError.safeParse(raw)
    const issues = ProblemasDePublicacaoSchema.safeParse(raw)
    const details = issues.success ? issues.data.problemas.map((p) => p.mensagem).join(' ') : ''
    const fallback =
      res.status === 413
        ? 'O arquivo é grande demais para um envio só.'
        : 'Não foi possível concluir esta operação.'
    throw new GameRequestError(
      `${parsed.success ? parsed.data.error.message : fallback}${details ? ` ${details}` : ''}${res.status === 409 && editHint ? ' Sua edição permanece aqui. Reabra a versão atual antes de tentar salvar novamente.' : ''}`,
      res.status,
      parsed.success ? (parsed.data.error.code ?? null) : null,
    )
  }
  return raw
}
