import { describe, expect, test } from 'bun:test'
import {
  createPgzeroAudioQueue,
  PGZERO_AUDIO_POLL_MS,
  PGZERO_AUDIO_QUEUED_PLAYS,
  PGZERO_AUDIO_STALE_MS,
} from './audioQueue'
import type { PgzeroAudioCommand } from './protocol'

/** A host that answers only when the test says so. */
function host() {
  let time = 0
  const sent: { request: Record<string, unknown>; reply(value?: unknown): void }[] = []
  const queue = createPgzeroAudioQueue({
    now: () => time,
    send: (request) =>
      new Promise<string>((resolve) => {
        sent.push({
          request: JSON.parse(request),
          reply: (value = { version: 1, ok: true }) => resolve(JSON.stringify(value)),
        })
      }),
  })
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
  return {
    queue,
    sent,
    settle,
    advance(ms: number) {
      time += ms
    },
  }
}
const play = (voice: number): PgzeroAudioCommand => ['play', voice, 'sounds/bip.wav', false, 1]

describe('the frame audio queue', () => {
  test('a play that waited too long is dropped and reported as ended', async () => {
    const { queue, sent, settle, advance } = host()
    queue.pgzero([play(1), play(2)], false)
    expect(sent.map((item) => item.request.id)).toEqual([1])
    advance(PGZERO_AUDIO_STALE_MS + 1)
    sent[0]!.reply()
    await settle()
    // Voice 2 waited behind voice 1 for too long: it never reaches the host.
    expect(sent.length).toBe(1)
    expect(queue.takeEnded(64)).toEqual([2])
  })

  test('the backlog of plays is bounded: the oldest waiting play gives way', () => {
    const { queue, sent } = host()
    const commands = Array.from({ length: PGZERO_AUDIO_QUEUED_PLAYS + 5 }, (_, index) =>
      play(index + 1),
    )
    queue.pgzero(commands, false)
    // One is with the host; the queue keeps at most the newest QUEUED_PLAYS waiting.
    expect(sent.length).toBe(1)
    expect(queue.takeEnded(64)).toEqual([2, 3, 4, 5])
  })

  test('stop and volume are never dropped', async () => {
    const { queue, sent, settle, advance } = host()
    queue.pgzero([play(1), ['volume', 1, 0.5], ['stop', 1]], false)
    advance(PGZERO_AUDIO_STALE_MS * 4)
    for (let step = 0; step < 3; step++) {
      sent.at(-1)!.reply()
      await settle()
    }
    expect(sent.map((item) => item.request.op)).toEqual(['play', 'volume', 'stop'])
  })

  test('the voices the host reports as ended reach the game, from any reply', async () => {
    const { queue, sent, settle } = host()
    void queue.request(JSON.stringify({ version: 1, op: 'stop', id: null }))
    sent[0]!.reply({ version: 1, ok: true, ended: [7, 8, 'x', -1] })
    await settle()
    expect(queue.takeEnded(1)).toEqual([7])
    expect(queue.takeEnded(64)).toEqual([8])
  })

  test('while the game waits for sounds to end, the host is polled now and then', async () => {
    const { queue, sent, settle, advance } = host()
    queue.pgzero([], true)
    expect(sent.map((item) => item.request.op)).toEqual(['poll'])
    queue.pgzero([], true)
    expect(sent.length).toBe(1)
    sent[0]!.reply({ version: 1, ok: true, ended: [3] })
    await settle()
    expect(queue.takeEnded(64)).toEqual([3])
    advance(PGZERO_AUDIO_POLL_MS - 1)
    queue.pgzero([], true)
    expect(sent.length).toBe(1)
    advance(1)
    queue.pgzero([], true)
    expect(sent.length).toBe(2)
    // Nothing to wait for: no polling at all.
    advance(PGZERO_AUDIO_POLL_MS * 10)
    sent[1]!.reply()
    await settle()
    queue.pgzero([], false)
    expect(sent.length).toBe(2)
  })
})
