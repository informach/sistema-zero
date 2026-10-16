import { expect, test } from 'bun:test'
import { type ModelRequest, OpenRouter, sse } from '../src/models/openrouter'

const request: ModelRequest = {
  model: 'fixture',
  messages: [],
  tools: [],
  maxOutputTokens: 256,
  price: { prompt: 0, completion: 0 },
}
function transport(body: string): typeof fetch {
  return Object.assign(async () => new Response(body), { preconnect: fetch.preconnect })
}
test('SSE comments and fragmented multiline data', async () => {
  const result = []
  for await (const data of sse(
    new Response(': heartbeat\r\ndata: one\r\ndata: two\r\n\r\n'),
    new AbortController().signal,
  ))
    result.push(data)
  expect(result).toEqual(['one\ntwo'])
})
test('truncated stream cannot yield executable tool calls', async () => {
  const provider = new OpenRouter(
    async () => 'synthetic',
    transport(
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call","function":{"name":"write","arguments":"{"}}]}}]}\n\n',
    ),
  )
  await expect(
    Array.fromAsync(provider.stream(request, new AbortController().signal)),
  ).rejects.toThrow('truncated')
})
test('completed stream records model, tool call and accounting', async () => {
  const body =
    'data: ' +
    JSON.stringify({
      id: 'gen',
      model: 'actual',
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, id: 'call', function: { name: 'read', arguments: '{}' } }],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { cost: 0.01 },
    }) +
    '\n\ndata: [DONE]\n\n'
  const events = await Array.fromAsync(
    new OpenRouter(async () => 'synthetic', transport(body)).stream(
      request,
      new AbortController().signal,
    ),
  )
  expect(events.at(-1)).toMatchObject({
    type: 'complete',
    model: 'actual',
    calls: [{ id: 'call' }],
    usage: { cost: 0.01 },
  })
})

test('generation identity is available before a truncated stream and reconciliation verifies the same finished generation', async () => {
  const provider = new OpenRouter(
    async () => 'synthetic',
    transport(
      'data: {"id":"generation-early","model":"actual","choices":[{"delta":{"content":"partial"}}]}\n\n',
    ),
  )
  const seen = []
  let failure = ''
  try {
    for await (const event of provider.stream(request, new AbortController().signal))
      seen.push(event)
  } catch (error) {
    failure = String(error)
  }
  expect(seen).toContainEqual({
    type: 'metadata',
    generationId: 'generation-early',
    model: 'actual',
    usage: undefined,
  })
  expect(failure).toContain('truncated')
  const accounted = new OpenRouter(
    async () => 'synthetic',
    transport(
      JSON.stringify({
        data: { id: 'generation-early', model: 'actual', total_cost: 0.03, finish_reason: 'stop' },
      }),
    ),
  )
  expect(
    (await accounted.generation('generation-early', new AbortController().signal)).total_cost,
  ).toBe(0.03)
  await expect(accounted.generation('different', new AbortController().signal)).rejects.toThrow(
    'identity',
  )
})
