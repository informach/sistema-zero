import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PythonExecutionSnapshot } from '../protocol'
import { createPythonAudioService } from './service'

// Native media is replaced only for session authority/lifecycle checks. Actual sound needs browser QA.
const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio')
let instances: MediaElement[] = []
let begin: () => Promise<void> = () => Promise.resolve()
const services: ReturnType<typeof createPythonAudioService>[] = []
class MediaElement extends EventTarget {
  preload = ''
  volume = 1
  loop = false
  src = ''
  paused = false
  muted = false
  loads = 0
  plays = 0
  currentTime = 0
  play() {
    this.paused = false
    ++this.plays
    return begin()
  }
  pause() {
    this.paused = true
  }
  load() {
    ++this.loads
  }
  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }
  constructor() {
    super()
    instances.push(this)
  }
}
beforeEach(() => {
  instances = []
  begin = () => Promise.resolve()
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: MediaElement })
})
afterEach(() => {
  for (const service of services.splice(0)) service.dispose()
  if (originalAudio) Object.defineProperty(globalThis, 'Audio', originalAudio)
  else Reflect.deleteProperty(globalThis, 'Audio')
})

function wav() {
  const bytes = new Uint8Array(204)
  const view = new DataView(bytes.buffer)
  bytes.set(new TextEncoder().encode('RIFF'))
  view.setUint32(4, 196, true)
  bytes.set(new TextEncoder().encode('WAVEfmt '), 8)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  bytes.set(new TextEncoder().encode('data'), 36)
  view.setUint32(40, 160, true)
  return bytes
}
async function fixture() {
  const bytes = wav()
  const files: PythonExecutionSnapshot['files'] = [
    {
      path: 'bgm.wav',
      kind: 'asset',
      bytes,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
  ]
  const controller = new AbortController()
  const errors: Error[] = []
  let muted = false
  const muteListeners = new Set<() => void>()
  const service = createPythonAudioService({
    snapshot: { files },
    signal: controller.signal,
    onError: (error) => errors.push(error),
    hostAudio: {
      getMuted: () => muted,
      subscribe: (listener: () => void) => {
        muteListeners.add(listener)
        return () => muteListeners.delete(listener)
      },
    },
  })
  services.push(service)
  const exchange = async (request: unknown) =>
    JSON.parse(await service.exchange(JSON.stringify(request)))
  const play = (id: number, path = 'bgm.wav') =>
    exchange({ version: 1, op: 'play', id, path, loop: false, volume: 0.8 })
  const mute = (value: boolean) => {
    muted = value
    for (const listener of muteListeners) listener()
  }
  return { files, bytes, service, controller, errors, exchange, play, mute, muteListeners }
}

describe('session-owned Python audio', () => {
  test('host mute synchronizes existing and future voices without changing program volume or transport', async () => {
    const f = await fixture()
    await f.play(1)
    const first = instances[0]!
    const src = first.src
    f.mute(true)
    expect(first.muted).toBe(true)
    expect(first.volume).toBe(0.8)
    expect(first.paused).toBe(false)
    expect(first.src).toBe(src)
    await f.play(2)
    expect(instances[1]!.muted).toBe(true)
    f.mute(false)
    expect(instances.every((voice) => !voice.muted)).toBe(true)
    expect(first.volume).toBe(0.8)
    await f.exchange({ version: 1, op: 'stop', id: 1 })
    f.mute(true)
    f.mute(false)
    expect(first.src).toBe('')
    expect(first.paused).toBe(true)
    f.service.dispose()
    expect(f.muteListeners.size).toBe(0)
  })

  test('pause and resume of several voices act on each of them (pygame mixer.pause)', async () => {
    const f = await fixture()
    await f.play(1)
    await f.play(2)
    expect(await f.exchange({ version: 1, op: 'pause', ids: [1, 2, 99] })).toMatchObject({
      ok: true,
    })
    expect(instances.map((voice) => voice.paused)).toEqual([true, true])
    await f.exchange({ version: 1, op: 'resume', ids: [2] })
    expect(instances.map((voice) => voice.paused)).toEqual([true, false])
  })

  test('voice reserved before resource awaits reads latest host mute before native play', async () => {
    const f = await fixture()
    const playing = f.play(1)
    expect(instances).toHaveLength(0)
    f.mute(true)
    await playing
    expect(instances).toHaveLength(1)
    expect(instances[0]!.muted).toBe(true)
  })

  test('learner-shaped window messages cannot undo host mute or the author volume zero', async () => {
    const f = await fixture()
    f.mute(true)
    await f.exchange({ version: 1, op: 'play', id: 1, path: 'bgm.wav', loop: true, volume: 0 })
    const voice = instances[0]!
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'sz:audio', muted: false },
        source: window,
        origin: location.origin,
      }),
    )
    expect(voice.muted).toBe(true)
    expect(voice.loop).toBe(true)
    expect(voice.volume).toBe(0)
    f.mute(false)
    expect(voice.muted).toBe(false)
    expect(voice.volume).toBe(0)
    expect(voice.paused).toBe(false)
  })

  test('mute updates pending native play and cannot revive a voice after cancellation', async () => {
    const f = await fixture()
    const pending = Promise.withResolvers<void>()
    const entered = Promise.withResolvers<void>()
    begin = () => {
      entered.resolve()
      return pending.promise
    }
    const playing = f.play(1)
    await entered.promise
    f.mute(true)
    expect(instances[0]!.muted).toBe(true)
    f.controller.abort()
    pending.resolve()
    expect((await playing).ok).toBe(false)
    f.mute(false)
    expect(instances[0]!.paused).toBe(true)
    expect(instances[0]!.src).toBe('')
    expect(f.muteListeners.size).toBe(0)
  })
  test('overlaps distinct voices using one immutable asset URL, then releases everything', async () => {
    const f = await fixture()
    const revoked = spyOn(URL, 'revokeObjectURL')
    try {
      expect(await f.play(1)).toEqual({ version: 1, ok: true })
      f.bytes.fill(0) // the authorized Blob already captured the verified original bytes
      expect(await f.play(2)).toEqual({ version: 1, ok: true })
      expect(instances).toHaveLength(2)
      expect(instances[0]!.src).toBe(instances[1]!.src)
      expect(await f.exchange({ version: 1, op: 'stop', id: 1 })).toEqual({ version: 1, ok: true })
      expect(instances[0]!.src).toBe('')
      expect(instances[1]!.src).not.toBe('')
      f.service.dispose()
      expect(
        instances.every((audio) => audio.paused && audio.src === '' && audio.loads === 1),
      ).toBe(true)
      expect(revoked).toHaveBeenCalledTimes(1)
      f.service.dispose()
      expect(revoked).toHaveBeenCalledTimes(1)
      expect((await f.play(3)).ok).toBe(false)
    } finally {
      revoked.mockRestore()
    }
  })

  test('rejects absent/source assets and corrupt bytes before constructing media', async () => {
    const f = await fixture()
    expect((await f.play(1, 'absent.wav')).ok).toBe(false)
    const source = await fixture()
    source.service.dispose()
    source.files[0]!.kind = 'source'
    const service = createPythonAudioService({
      snapshot: { files: source.files },
      signal: new AbortController().signal,
      onError() {},
    })
    services.push(service)
    expect(
      JSON.parse(
        await service.exchange(
          JSON.stringify({
            version: 1,
            op: 'play',
            id: 1,
            path: 'bgm.wav',
            volume: 1,
            loop: false,
          }),
        ),
      ).ok,
    ).toBe(false)
    f.bytes[100] = 12
    expect((await f.play(2)).ok).toBe(false)
    expect(instances).toHaveLength(0)
  })

  test('bounds active voices, forbids replacement and releases an ended voice', async () => {
    const f = await fixture()
    for (let id = 1; id <= 16; id++) expect((await f.play(id)).ok).toBe(true)
    expect((await f.play(1)).ok).toBe(false)
    expect((await f.play(17)).ok).toBe(false)
    instances[0]!.dispatchEvent(new Event('ended'))
    expect((await f.play(17)).ok).toBe(true)
    expect(instances).toHaveLength(17)
    expect((await f.exchange({ version: 1, op: 'stop', id: null })).ok).toBe(true)
    expect(instances.every((audio) => audio.src === '')).toBe(true)
  })

  test('reports the voices that ended by themselves or could not play, never the stopped ones', async () => {
    const f = await fixture()
    expect((await f.play(1)).ended).toBeUndefined()
    await f.play(2)
    await f.play(3)
    // Stopped: never reported. Ended by itself: reported with the next reply, whatever it is.
    await f.exchange({ version: 1, op: 'stop', id: 2 })
    instances[0]!.dispatchEvent(new Event('ended'))
    // A poll does nothing but collect what ended.
    expect(await f.exchange({ version: 1, op: 'poll' })).toEqual({
      version: 1,
      ok: true,
      ended: [1],
    })
    expect(await f.exchange({ version: 1, op: 'poll' })).toEqual({ version: 1, ok: true })
    // A play that fails is over for the program as well.
    begin = () => Promise.reject(new Error('no'))
    instances[2]!.dispatchEvent(new Event('ended'))
    expect(await f.play(4)).toMatchObject({ ok: false, ended: [3, 4] })
    expect((await f.exchange({ version: 1, op: 'poll' })).ended).toBeUndefined()
  })

  test('a play refused at the voice limit is reported as ended; a repeated live id is not', async () => {
    const f = await fixture()
    for (let id = 1; id <= 16; id++) await f.play(id)
    expect(await f.play(17)).toMatchObject({ ok: false, ended: [17] })
    // Voice 1 is still playing: its id must not be reported as ended.
    const repeated = await f.play(1)
    expect(repeated.ok).toBe(false)
    expect(repeated.ended).toBeUndefined()
  })

  test('the music has its own channel: a crowd of sounds never refuses it', async () => {
    const f = await fixture()
    const music = (id: number) =>
      f.exchange({
        version: 1,
        op: 'play',
        id,
        path: 'bgm.wav',
        loop: true,
        volume: 1,
        music: true,
      })
    for (let id = 1; id <= 16; id++) await f.play(id)
    expect((await music(100)).ok).toBe(true)
    expect((await music(101)).ok).toBe(true)
    expect(await music(102)).toMatchObject({ ok: false, ended: [102] })
  })

  test('a play over the per-second command budget is reported as ended', async () => {
    const clock = spyOn(performance, 'now').mockReturnValue(100)
    try {
      const f = await fixture()
      for (let i = 0; i < 64; i++) await f.exchange({ version: 1, op: 'stop', id: null })
      expect(await f.play(9)).toMatchObject({ ok: false, ended: [9] })
    } finally {
      clock.mockRestore()
    }
  })

  test('loops=N plays the same element again at once and reports only the last end', async () => {
    const f = await fixture()
    await f.exchange({
      version: 1,
      op: 'play',
      id: 1,
      path: 'bgm.wav',
      loop: false,
      volume: 1,
      repeat: 2,
    })
    const audio = instances[0]!
    for (let round = 1; round <= 2; round++) {
      audio.currentTime = 0.4
      audio.dispatchEvent(new Event('ended'))
      expect(audio.currentTime).toBe(0)
      expect(audio.plays).toBe(1 + round)
      expect(audio.src).not.toBe('')
      expect((await f.exchange({ version: 1, op: 'poll' })).ended).toBeUndefined()
    }
    audio.dispatchEvent(new Event('ended'))
    expect(audio.src).toBe('')
    expect((await f.exchange({ version: 1, op: 'poll' })).ended).toEqual([1])
  })

  test('pause really pauses (the track keeps its place) and resume plays on', async () => {
    const f = await fixture()
    await f.play(1)
    const audio = instances[0]!
    audio.currentTime = 0.3
    expect((await f.exchange({ version: 1, op: 'pause', id: 1 })).ok).toBe(true)
    expect(audio.paused).toBe(true)
    expect(audio.currentTime).toBe(0.3)
    expect(audio.src).not.toBe('')
    expect((await f.exchange({ version: 1, op: 'resume', id: 1 })).ok).toBe(true)
    expect(audio.paused).toBe(false)
    expect(audio.currentTime).toBe(0.3)
  })

  test('a voice paused while it still loads starts paused', async () => {
    const f = await fixture()
    const pending = Promise.withResolvers<void>()
    begin = () => pending.promise
    const playing = f.play(1)
    while (instances.length === 0) await new Promise((resolve) => setTimeout(resolve, 0))
    await f.exchange({ version: 1, op: 'pause', id: 1 })
    pending.resolve()
    expect((await playing).ok).toBe(true)
    expect(instances[0]!.paused).toBe(true)
  })

  test('one stop or volume request reaches every voice it names', async () => {
    const f = await fixture()
    for (let id = 1; id <= 3; id++) await f.play(id)
    await f.exchange({ version: 1, op: 'volume', ids: [1, 3], volume: 0.25 })
    expect(instances.map((audio) => audio.volume)).toEqual([0.25, 0.8, 0.25])
    await f.exchange({ version: 1, op: 'stop', ids: [2, 3] })
    expect(instances.map((audio) => audio.src === '')).toEqual([false, true, true])
  })

  test('a poll carries nothing else', async () => {
    const f = await fixture()
    expect((await f.exchange({ version: 1, op: 'poll', id: 1 })).ok).toBe(false)
  })

  test('abort cancels pending native play and prevents a late success from restoring authority', async () => {
    const f = await fixture()
    let entered!: () => void
    let finish!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    begin = () => {
      entered()
      return new Promise<void>((resolve) => {
        finish = resolve
      })
    }
    const pending = f.play(1)
    await Promise.race([
      started,
      pending.then((response) => {
        throw new Error(
          `A reprodução terminou antes de chegar ao dispositivo: ${JSON.stringify(response)}`,
        )
      }),
    ])
    f.controller.abort()
    expect((await pending).ok).toBe(false)
    expect(instances[0]!.src).toBe('')
    finish()
    expect((await f.play(2)).ok).toBe(false)
    expect(instances).toHaveLength(1)
    expect(f.errors).toHaveLength(0)
  })

  test('reports blocked autoplay and post-start media errors without pretending to play', async () => {
    const f = await fixture()
    begin = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    expect((await f.play(1)).error).toContain('Clique em Jogar')
    expect(instances[0]!.src).toBe('')
    begin = () => Promise.resolve()
    expect((await f.play(2)).ok).toBe(true)
    instances[1]!.dispatchEvent(new Event('error'))
    expect(f.errors).toHaveLength(1)
    expect(f.errors[0]!.message).toContain('bgm.wav')
    expect(instances[1]!.src).toBe('')
  })

  test('revokes ownership while integrity checking is pending, before any media URL exists', async () => {
    const f = await fixture()
    const actual = await crypto.subtle.digest('SHA-256', f.bytes)
    let entered!: () => void
    let finish!: (value: ArrayBuffer) => void
    const hashing = new Promise<void>((resolve) => {
      entered = resolve
    })
    const digest = spyOn(crypto.subtle, 'digest').mockImplementation(() => {
      entered()
      return new Promise<ArrayBuffer>((resolve) => {
        finish = resolve
      })
    })
    const url = spyOn(URL, 'createObjectURL')
    try {
      const pending = f.play(1)
      await Promise.race([
        hashing,
        pending.then((response) => {
          throw new Error(
            `A reprodução terminou antes da verificação de bytes: ${JSON.stringify(response)}`,
          )
        }),
      ])
      f.controller.abort()
      expect((await pending).ok).toBe(false)
      finish(actual)
      // Drain the completed digest's microtasks; this is not an audio/performance timing assertion.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      expect(url).toHaveBeenCalledTimes(0)
      expect(instances).toHaveLength(0)
      expect(f.errors).toHaveLength(0)
    } finally {
      digest.mockRestore()
      url.mockRestore()
    }
  })

  test('applies a per-session command budget even without opening a sound', async () => {
    const clock = spyOn(performance, 'now').mockReturnValue(100)
    try {
      const f = await fixture()
      for (let i = 0; i < 64; i++)
        expect((await f.exchange({ version: 1, op: 'stop', id: null })).ok).toBe(true)
      expect((await f.exchange({ version: 1, op: 'stop', id: null })).ok).toBe(false)
      clock.mockReturnValue(1100)
      expect((await f.exchange({ version: 1, op: 'stop', id: null })).ok).toBe(true)
      expect(instances).toHaveLength(0)
    } finally {
      clock.mockRestore()
    }
  })
})
