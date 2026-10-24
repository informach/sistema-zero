import type { PgzeroAudioCommand } from './protocol'

/** A sound effect still waiting after this long is dropped: a late effect is worse than none. */
export const PGZERO_AUDIO_STALE_MS = 250
/** Sound effects waiting at once; past this the oldest waiting effect is dropped. */
export const PGZERO_AUDIO_QUEUED_PLAYS = 16
/** While Python waits for sounds to end, the host is asked this often. */
export const PGZERO_AUDIO_POLL_MS = 250
const ENDED_RETAINED = 256
const SKIPPED = JSON.stringify({ version: 1, ok: true })

interface Entry {
  request: string
  /** Voice of a Pygame Zero play: reported as ended if it never plays. */
  voice?: number
  /**
   * A sound effect played once may be dropped when stale or crowded. The music and a sound that
   * repeats are never dropped: the game would go silent, or on_music_end would run for nothing.
   */
  droppable?: boolean
  poll?: boolean
  at: number
  resolve(value: string): void
  reject(reason: unknown): void
}

/**
 * The frame's one ordered channel to the host's media service, shared by sz_audio (a request
 * at a time from Python) and Pygame Zero (commands that travel with each frame). It is bounded:
 * a Pygame Zero play that waited too long, or that would make the backlog grow, is dropped and
 * reported as ended, so the program's bookkeeping (Sound voices, music) stays right.
 */
/** The media service's request for one frame command. */
function serviceRequest(command: PgzeroAudioCommand) {
  switch (command[0]) {
    case 'play': {
      const [, id, path, repeat, volume, music] = command
      return {
        version: 1,
        op: 'play',
        id,
        path,
        loop: repeat < 0,
        volume,
        ...(repeat > 0 ? { repeat } : {}),
        ...(music ? { music: true } : {}),
      }
    }
    case 'stop':
      return Array.isArray(command[1])
        ? { version: 1, op: 'stop', ids: command[1] }
        : { version: 1, op: 'stop', id: command[1] }
    case 'volume':
      return Array.isArray(command[1])
        ? { version: 1, op: 'volume', ids: command[1], volume: command[2] }
        : { version: 1, op: 'volume', id: command[1], volume: command[2] }
    default:
      return { version: 1, op: command[0], id: command[1] }
  }
}

export function createPgzeroAudioQueue(options: {
  send(request: string): Promise<string>
  now?: () => number
}) {
  const now = options.now ?? (() => performance.now())
  const queue: Entry[] = []
  const ended: number[] = []
  let busy = false
  let closed = false
  let pollQueued = false
  let lastPoll = Number.NEGATIVE_INFINITY

  function report(voice: number) {
    ended.push(voice)
    if (ended.length > ENDED_RETAINED) ended.splice(0, ended.length - ENDED_RETAINED)
  }
  function harvest(response: string) {
    try {
      const value: unknown = JSON.parse(response)
      const list = value && typeof value === 'object' ? (value as { ended?: unknown }).ended : null
      if (Array.isArray(list))
        for (const voice of list)
          if (typeof voice === 'number' && Number.isSafeInteger(voice) && voice > 0) report(voice)
    } catch {
      // A response the service did not write is ignored.
    }
  }
  function drop(entry: Entry) {
    if (entry.voice !== undefined) report(entry.voice)
    entry.resolve(SKIPPED)
  }
  function pump() {
    while (!busy && !closed) {
      const next = queue.shift()
      if (!next) return
      if (next.droppable && now() - next.at > PGZERO_AUDIO_STALE_MS) {
        drop(next)
        continue
      }
      busy = true
      let sent: Promise<string>
      try {
        sent = options.send(next.request)
      } catch (error) {
        sent = Promise.reject(error)
      }
      sent
        .then(
          (response) => {
            harvest(response)
            next.resolve(response)
          },
          (reason: unknown) => {
            // The play never reached the host: for the program it has ended.
            if (next.voice !== undefined) report(next.voice)
            next.reject(reason)
          },
        )
        .finally(() => {
          busy = false
          if (next.poll) pollQueued = false
          pump()
        })
    }
  }
  function enqueue(entry: Omit<Entry, 'at' | 'resolve' | 'reject'>) {
    return new Promise<string>((resolve, reject) => {
      if (closed) {
        reject(new DOMException('Execução encerrada.', 'AbortError'))
        return
      }
      queue.push({ ...entry, at: now(), resolve, reject })
      pump()
    })
  }

  return {
    /** An sz_audio request: never dropped. */
    request: (request: string) => enqueue({ request }),
    /** The commands of one Pygame Zero frame. Fire and forget: a sound never stops the game. */
    pgzero(commands: readonly PgzeroAudioCommand[], watch: boolean) {
      for (const command of commands) {
        const droppable = command[0] === 'play' && command[3] === 0 && !command[5]
        if (droppable) {
          const effects = queue.filter((entry) => entry.droppable)
          if (effects.length >= PGZERO_AUDIO_QUEUED_PLAYS) {
            queue.splice(queue.indexOf(effects[0]!), 1)
            drop(effects[0]!)
          }
        }
        void enqueue({
          request: JSON.stringify(serviceRequest(command)),
          ...(command[0] === 'play' ? { voice: command[1], droppable } : {}),
        }).catch(() => {})
      }
      const time = now()
      if (watch && !pollQueued && time - lastPoll >= PGZERO_AUDIO_POLL_MS) {
        lastPoll = time
        pollQueued = true
        void enqueue({ request: JSON.stringify({ version: 1, op: 'poll' }), poll: true }).catch(
          () => {},
        )
      }
    },
    /** Voices that ended (or were dropped) since the last call, at most `limit`. */
    takeEnded: (limit: number) => ended.splice(0, limit),
    pump,
    close() {
      closed = true
      for (const entry of queue.splice(0))
        entry.reject(new DOMException('Execução encerrada.', 'AbortError'))
    },
  }
}
