import { z } from 'zod'
import { boundedJson } from './http'

const toolDelta = z.object({
  index: z.number().int().nonnegative(),
  id: z.string().optional(),
  function: z.object({ name: z.string().optional(), arguments: z.string().optional() }).optional(),
})
const chunkSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  error: z.object({ message: z.string() }).passthrough().optional(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullable().optional(),
            tool_calls: z.array(toolDelta).optional(),
          })
          .default({}),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .default([]),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      cost: z.number().optional(),
    })
    .passthrough()
    .optional(),
})
export type ModelMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}
export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}
export type ModelEvent =
  | { type: 'text'; text: string }
  | {
      type: 'metadata'
      generationId: string
      model: string
      usage?: z.infer<typeof chunkSchema>['usage']
    }
  | {
      type: 'complete'
      text: string
      calls: ToolCall[]
      model: string
      generationId: string
      usage: z.infer<typeof chunkSchema>['usage']
      finish: string
    }
export type ModelRequest = {
  model: string
  messages: ModelMessage[]
  tools: {
    type: 'function'
    function: { name: string; description: string; parameters: Record<string, unknown> }
  }[]
  maxOutputTokens: number
  price: { prompt: number; completion: number }
}
export interface ModelProvider {
  stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelEvent>
}

export async function* sse(response: Response, signal: AbortSignal): AsyncIterable<string> {
  if (!response.body) throw new Error('Provider returned no stream')
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let pending = ''
  let data: string[] = []
  let bytes = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const chunk = await reader.read()
      if (chunk.done) break
      pending += decoder.decode(chunk.value, { stream: true })
      let newline = pending.indexOf('\n')
      while (newline >= 0) {
        const line = pending.slice(0, newline).replace(/\r$/, '')
        pending = pending.slice(newline + 1)
        if (line === '') {
          if (data.length) yield data.join('\n')
          data = []
          bytes = 0
        } else if (line.startsWith('data:')) {
          const value = line.slice(5).replace(/^ /, '')
          bytes += Buffer.byteLength(value)
          if (bytes > 256000) throw new Error('Provider event too large')
          data.push(value)
        }
        newline = pending.indexOf('\n')
      }
      if (Buffer.byteLength(pending) > 256000) throw new Error('Provider line too large')
    }
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
}
export class OpenRouter implements ModelProvider {
  constructor(
    private key: () => Promise<string>,
    private transport: typeof fetch = fetch,
  ) {}
  async generation(id: string, signal: AbortSignal) {
    if (!id || id.length > 256)
      throw new Error('Generation identity unavailable; keep the reservation pending')
    const response = await this.transport(
      `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${await this.key()}` },
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      },
    )
    const result = z
      .object({
        data: z.object({
          id: z.string(),
          total_cost: z.number().finite().nonnegative(),
          model: z.string(),
          finish_reason: z.string().nullable(),
          cancelled: z.boolean().nullable().optional(),
        }),
      })
      .parse(await boundedJson(response, 64000)).data
    if (result.id !== id || (!result.finish_reason && !result.cancelled))
      throw new Error('Generation is still pending or identity changed')
    return result
  }
  async *stream(request: ModelRequest, signal: AbortSignal): AsyncIterable<ModelEvent> {
    const response = await this.transport('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.key()}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'Sistema Zero TUI',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        tools: request.tools.length ? request.tools : undefined,
        stream: true,
        max_tokens: request.maxOutputTokens,
        provider: {
          require_parameters: true,
          data_collection: 'deny',
          allow_fallbacks: false,
          max_price: {
            prompt: request.price.prompt * 1000000,
            completion: request.price.completion * 1000000,
          },
        },
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(180000)]),
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(
        `OpenRouter HTTP ${response.status}; retry only after reviewing limits and connection`,
      )
    }
    let text = '',
      model = request.model,
      generationId = '',
      finish = '',
      done = false
    let usage: z.infer<typeof chunkSchema>['usage']
    const calls = new Map<number, ToolCall>()
    for await (const data of sse(response, signal)) {
      if (data === '[DONE]') {
        done = true
        break
      }
      const chunk = chunkSchema.parse(JSON.parse(data))
      if (chunk.error)
        throw new Error(`Provider stream error: ${chunk.error.message.slice(0, 1000)}`)
      const previousId = generationId
      if (chunk.id) {
        if (generationId && generationId !== chunk.id)
          throw new Error('Generation identity changed during stream')
        generationId = chunk.id
      }
      if (chunk.model) model = chunk.model
      if (chunk.usage) usage = chunk.usage
      if (generationId && (previousId !== generationId || chunk.usage))
        yield { type: 'metadata', generationId, model, usage }
      for (const choice of chunk.choices) {
        if (choice.finish_reason) finish = choice.finish_reason
        if (choice.delta.content) {
          text += choice.delta.content
          if (Buffer.byteLength(text) > 128000) throw new Error('Model output exceeds limit')
          yield { type: 'text', text: choice.delta.content }
        }
        for (const delta of choice.delta.tool_calls ?? []) {
          if (delta.index > 15) throw new Error('Too many tool calls')
          const call = calls.get(delta.index) ?? {
            id: '',
            type: 'function',
            function: { name: '', arguments: '' },
          }
          if (delta.id) call.id = delta.id
          if (delta.function?.name) call.function.name += delta.function.name
          if (delta.function?.arguments) call.function.arguments += delta.function.arguments
          if (Buffer.byteLength(call.function.arguments) > 64000)
            throw new Error('Tool arguments exceed limit')
          calls.set(delta.index, call)
        }
      }
    }
    if (!done || !finish) throw new Error('Provider stream truncated before completion')
    if (finish !== 'stop' && finish !== 'tool_calls')
      throw new Error(`Provider did not complete: ${finish}`)
    const complete = [...calls.values()]
    for (const call of complete) {
      if (!call.id || !call.function.name) throw new Error('Incomplete tool call')
      JSON.parse(call.function.arguments)
    }
    if (new Set(complete.map((call) => call.id)).size !== complete.length)
      throw new Error('Duplicate tool call ID')
    yield { type: 'complete', text, calls: complete, model, generationId, usage, finish }
  }
}
export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  context_length: z.number(),
  supported_parameters: z.array(z.string()).optional(),
  pricing: z.object({ prompt: z.string(), completion: z.string() }),
})
export async function modelCatalog(signal: AbortSignal) {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  })
  return z.object({ data: z.array(modelSchema) }).parse(await boundedJson(response, 4_000_000)).data
}
