import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Telegram } from '@sistemazero/agent-integrations/telegram'
import { z } from 'zod'
import { Outbound } from '../src/integrations/outbound'
import { Store } from '../src/store/client'

test('accepted notification with lost response remains uncertain across restart and never resends without reconciliation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-outbound-'))
  let store = new Store(join(directory, 'state.sqlite')),
    outbound = new Outbound(store),
    sends = 0
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch() {
      sends++
      await writeFile(join(directory, 'accepted.json'), JSON.stringify({ message_id: 42 }))
      return new Response('lost or corrupt response', { status: 200 })
    },
  })
  const bot = new Telegram('123456:test-token', server.url.origin)
  const input = { chatId: '12345', text: 'fixture', silent: false }
  const invoke = () =>
    outbound.execute('telegram', '123456', 'intent-123', input, 'run', () =>
      bot.send(input, AbortSignal.timeout(5000)),
    )
  try {
    await expect(invoke()).rejects.toThrow('TRANSPORT_OR_RESPONSE_UNKNOWN')
    expect(JSON.parse(await readFile(join(directory, 'accepted.json'), 'utf8'))).toEqual({
      message_id: 42,
    })
    await store.close()
    store = new Store(join(directory, 'state.sqlite'))
    outbound = new Outbound(store)
    await expect(invoke()).rejects.toThrow('Uncertain outbound')
    const rows = z
      .array(z.object({ id: z.string(), state: z.string() }))
      .parse(await store.call({ op: 'document.list', namespace: 'outbound' }))
    const receipt = rows[0]
    if (!receipt) throw new Error('Receipt missing')
    expect(receipt.state).toBe('unknown')
    await outbound.reconcile(
      receipt.id,
      'confirmed',
      'Message 42 was inspected in the destination chat',
      { message_id: 42 },
    )
    expect(await invoke()).toMatchObject({ duplicate: true, value: { message_id: 42 } })
    expect(sends).toBe(1)
    await expect(
      outbound.execute(
        'telegram',
        '123456',
        'intent-123',
        { ...input, chatId: '67890' },
        'run',
        async () => null,
      ),
    ).rejects.toThrow('different content or destination')
  } finally {
    await store.close()
    await server.stop(true)
  }
})
