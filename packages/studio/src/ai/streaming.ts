/**
 * Parser SSE (Server-Sent Events) simples para respostas no formato
 * OpenAI-compatible (`data: {...}\n\n`). Cada chunk parseado vira um
 * delta `{ content?: string }` que o caller costuma concatenar para
 * formar a resposta final.
 *
 * Implementação manual (sem libs) — leve, sem dependências externas,
 * fácil de testar mockando `fetch`.
 */

export interface SSEDelta {
  content?: string
  finishReason?: string | null
}

export interface ParseSSEResult {
  /** Stream concluiu (recebeu [DONE]). */
  done: boolean
  /** Eventos parseados nesta chamada. */
  events: SSEDelta[]
  /** Buffer remanescente para a próxima chamada (linha incompleta). */
  remainder: string
}

/**
 * Parseia um chunk de bytes vindo do stream. Junta com o `prev` (resto de
 * chunk anterior) e devolve eventos + novo remainder.
 */
export function parseSSEChunk(chunk: string, prev = ''): ParseSSEResult {
  const buffer = prev + chunk
  // SSE separa eventos por linha em branco (\n\n).
  const events: SSEDelta[] = []
  let done = false
  const blocks = buffer.split('\n\n')
  // O último bloco pode estar incompleto — guardamos como remainder.
  const remainder = blocks.pop() ?? ''

  for (const block of blocks) {
    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed?.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        done = true
        continue
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: string }
            finish_reason?: string | null
          }>
        }
        const choice = parsed.choices?.[0]
        if (!choice) continue
        const evt: SSEDelta = {}
        if (choice.delta?.content) evt.content = choice.delta.content
        if (choice.finish_reason !== undefined) evt.finishReason = choice.finish_reason
        if (evt.content || evt.finishReason) events.push(evt)
      } catch {
        // Linha não-JSON — ignora (comentários SSE começam com `:`).
      }
    }
  }

  return { events, done, remainder }
}

export interface ConsumeSSEOptions {
  /** Aborta a leitura quando o sinal dispara (cancela o reader e rejeita). */
  signal?: AbortSignal
  /**
   * Tempo máximo (ms) sem receber NENHUM chunk antes de desistir. Protege
   * contra um servidor que abre o stream e fica "pendurado" sem fechar.
   * `0`/undefined desativa o timeout.
   */
  idleTimeoutMs?: number
}

function makeAbortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }
  const err = new Error(message)
  err.name = 'AbortError'
  return err
}

/**
 * Resultado de `reader.read()` derivado do próprio reader — os tipos de web
 * stream divergem entre lib.dom e @types/bun (ReadableStreamReadResult vs
 * ReadableStreamDefaultReadResult); derivar evita fixar em um dos dois.
 */
type ReadResult<T> = Awaited<ReturnType<ReadableStreamDefaultReader<T>['read']>>

/**
 * Faz `reader.read()` corrida com o `signal` de abort e com um timeout de
 * ociosidade. Resolve com o chunk normalmente; rejeita se abortar ou estourar
 * o timeout (o caller é responsável por cancelar o reader nesses casos).
 */
function readWithGuards<T>(
  reader: ReadableStreamDefaultReader<T>,
  signal: AbortSignal | undefined,
  idleTimeoutMs: number | undefined,
): Promise<ReadResult<T>> {
  if (!signal && !idleTimeoutMs) return reader.read()
  return new Promise((resolve, reject) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const finishResolve = (value: ReadResult<T>) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(value)
    }
    const finishReject = (err: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }
    function onAbort() {
      finishReject(makeAbortError('Stream de IA abortado'))
    }
    if (idleTimeoutMs && idleTimeoutMs > 0) {
      timer = setTimeout(
        () => finishReject(new Error(`Stream de IA ocioso por mais de ${idleTimeoutMs}ms`)),
        idleTimeoutMs,
      )
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    reader.read().then(finishResolve, finishReject)
  })
}

/**
 * Consome um ReadableStream chamando `onToken` para cada delta de conteúdo.
 * Devolve a string final concatenada. Aceita um `signal` para cancelar e um
 * `idleTimeoutMs` para não vazar a conexão se o servidor parar de responder.
 */
export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  onToken?: (token: string) => void,
  options: ConsumeSSEOptions = {},
): Promise<string> {
  const { signal, idleTimeoutMs } = options
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let remainder = ''

  if (signal?.aborted) {
    await reader.cancel().catch(() => undefined)
    throw makeAbortError('Stream de IA abortado')
  }

  try {
    // EOF natural fecha o stream sozinho; o break por [DONE] NÃO — a OpenRouter
    // emite `data: [DONE]` e mantém o body aberto, então precisamos cancelar o
    // reader nesse caso p/ não deixar a conexão travada até o GC.
    let reachedEof = false
    while (true) {
      const { value, done } = await readWithGuards(reader, signal, idleTimeoutMs)
      if (done) {
        reachedEof = true
        break
      }
      const chunk = decoder.decode(value, { stream: true })
      const result = parseSSEChunk(chunk, remainder)
      remainder = result.remainder
      for (const evt of result.events) {
        if (evt.content) {
          full += evt.content
          onToken?.(evt.content)
        }
      }
      if (result.done) break
    }
    // Liberou o último decode incremental: flush terminal recupera bytes de uma
    // sequência multi-byte truncada que o `{ stream: true }` ainda segurava.
    remainder += decoder.decode()
    // Quebramos por [DONE] (não foi EOF): cancela o reader p/ liberar a conexão.
    if (!reachedEof) await reader.cancel().catch(() => undefined)
    // Flush remainder final
    if (remainder.trim()) {
      const result = parseSSEChunk('\n\n', remainder)
      for (const evt of result.events) {
        if (evt.content) {
          full += evt.content
          onToken?.(evt.content)
        }
      }
    }
  } catch (err) {
    // Aborta/timeout: cancela o reader para liberar a conexão subjacente.
    await reader.cancel().catch(() => undefined)
    throw err
  }
  return full
}
