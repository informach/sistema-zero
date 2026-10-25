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
const play = (voice: number): PgzeroAudioCommand => ['play', voice, 'sounds/bip.wav', 0, 1, false]
const music = (voice: number): PgzeroAudioCommand => ['play', voice, 'music/tema.ogg', -1, 1, true]

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

  test('the music and repeating sounds are never dropped, however long they wait', async () => {
    const { queue, sent, settle, advance } = host()
    const once: PgzeroAudioCommand = ['play', 3, 'music/fim.ogg', 0, 1, true]
    const loops: PgzeroAudioCommand = ['play', 4, 'sounds/motor.wav', 2, 1, false]
    const forever: PgzeroAudioCommand = ['play', 5, 'sounds/vento.wav', -1, 1, false]
    queue.pgzero([play(1), music(2), once, loops, forever, play(6)], false)
    advance(PGZERO_AUDIO_STALE_MS * 4)
    for (let step = 0; step < 5; step++) {
      sent.at(-1)!.reply()
      await settle()
    }
    // Only the late sound effect (6) gave way; the music and the loops all reached the host.
    expect(sent.map((item) => item.request.id)).toEqual([1, 2, 3, 4, 5])
    expect(queue.takeEnded(64)).toEqual([6])
    expect(sent[1]!.request).toEqual({
      version: 1,
      op: 'play',
      id: 2,
      path: 'music/tema.ogg',
      loop: true,
      volume: 1,
      music: true,
    })
    expect(sent[3]!.request.repeat).toBe(2)
    expect(sent[3]!.request.loop).toBe(false)
  })

  test('a crowded backlog drops sound effects only, never the music', () => {
    const { queue, sent } = host()
    queue.pgzero([play(1), music(2)], false)
    queue.pgzero(
      Array.from({ length: PGZERO_AUDIO_QUEUED_PLAYS + 3 }, (_, index) => play(index + 10)),
      false,
    )
    const ended = queue.takeEnded(64)
    expect(ended).not.toContain(2)
    expect(ended).toEqual([10, 11, 12])
    expect(sent.length).toBe(1)
  })

  test('a play that never reaches the host (the channel fails) is reported as ended', async () => {
    const queue = createPgzeroAudioQueue({
      now: () => 0,
      send: () => Promise.reject(new Error('canal fechado')),
    })
    queue.pgzero([music(9)], false)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(queue.takeEnded(64)).toEqual([9])
  })

  test('stop and volume of several voices travel as one request each', () => {
    const { queue, sent } = host()
    queue.pgzero(
      [
        ['stop', [1, 2, 3]],
        ['volume', [4, 5], 0.5],
        ['pause', 7],
      ],
      false,
    )
    expect(sent[0]!.request).toEqual({ version: 1, op: 'stop', ids: [1, 2, 3] })
  })

  test('a tone note becomes a play of the note the host builds', () => {
    const { queue, sent } = host()
    queue.pgzero([['tone', 9, 440, 11025, 0.5]], false)
    expect(sent[0]!.request).toEqual({
      version: 1,
      op: 'play',
      id: 9,
      tone: { hz: 440, samples: 11025 },
      loop: false,
      volume: 0.5,
    })
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
