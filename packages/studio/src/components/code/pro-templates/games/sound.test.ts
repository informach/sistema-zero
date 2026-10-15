import { expect, test } from 'bun:test'
import { SOUND_SOURCE } from './sound.source.generated'

interface Bank {
  define(id: string, path: string, channel: 'music' | 'effects'): void
  music(id: string): void
  effect(id: string): void
  volume(channel: 'music' | 'effects', value: number): void
  inspect(): {
    definitions: number
    voices: number
    music: boolean
    volumes: { music: number; effects: number }
  }
  dispose(): void
}
function fixture() {
  const audio: Media[] = [],
    notes: string[] = []
  class Media {
    src = ''
    volume = 1
    loop = false
    preload = ''
    paused = true
    onended: (() => void) | null = null
    onerror: (() => void) | null = null
    pending: Array<{ resolve(): void; reject(error: Error): void }> = []
    constructor() {
      audio.push(this)
    }
    play() {
      this.paused = false
      return new Promise<void>((resolve, reject) => this.pending.push({ resolve, reject }))
    }
    pause() {
      this.paused = true
    }
    load() {}
    removeAttribute() {
      this.src = ''
    }
  }
  const phase = new Set<(value: string) => void>(),
    sound = new Set<(value: boolean) => void>(),
    result = new Set<() => void>()
  const ui = {
    phase: 'menu',
    soundEnabled: false,
    onPhase(callback: (value: string) => void) {
      phase.add(callback)
      return () => phase.delete(callback)
    },
    onSound(callback: (value: boolean) => void) {
      sound.add(callback)
      return () => sound.delete(callback)
    },
    onResult(callback: () => void) {
      result.add(callback)
      return () => result.delete(callback)
    },
    note(text: string) {
      notes.push(text)
    },
  }
  const code = new Bun.Transpiler({ loader: 'ts' })
    .transformSync(SOUND_SOURCE)
    .replace(/^export\s+/gm, '')
  const create = new Function('Audio', 'location', `${code}; return createSoundBank;`)(Media, {
    href: 'https://game.test/project/index.html',
  }) as (ui: unknown) => Bank
  return {
    bank: create(ui),
    audio,
    notes,
    listeners: [phase, sound, result],
    phase(value: string) {
      ui.phase = value
      for (const callback of phase) callback(value)
    },
    sound(value: boolean) {
      ui.soundEnabled = value
      for (const callback of sound) callback(value)
    },
  }
}
test('sound bank waits for a gesture, switches tracks, mixes channels and caps voices', () => {
  const f = fixture()
  f.bank.define('a', 'studio-assets/a.ogg', 'music')
  f.bank.define('b', 'studio-assets/b.ogg', 'music')
  f.bank.define('fx', 'studio-assets/a.wav', 'effects')
  f.bank.music('a')
  f.phase('playing')
  expect(f.audio).toHaveLength(0)
  f.sound(true)
  expect(f.audio).toHaveLength(1)
  expect(f.audio[0]!.volume).toBe(0.25)
  f.bank.music('b')
  expect(f.audio[0]!.src).toBe('')
  expect(f.audio[1]!.src).toEndWith('/b.ogg')
  for (let n = 0; n < 20; n++) f.bank.effect('fx')
  expect(f.bank.inspect().voices).toBe(5)
  f.bank.volume('effects', 0.2)
  expect(f.audio[2]!.volume).toBe(0.2)
  f.sound(false)
  expect(f.bank.inspect().voices).toBe(1)
  expect(f.audio[1]!.paused).toBe(true)
  f.bank.dispose()
  expect(f.bank.inspect().voices).toBe(0)
  expect(f.listeners.map((set) => set.size)).toEqual([0, 0, 0])
})
test('pause cancels old play rejections without releasing the resumed track; current errors remain visible', async () => {
  const f = fixture()
  f.bank.define('a', 'a.ogg', 'music')
  f.bank.music('a')
  f.phase('playing')
  f.sound(true)
  const media = f.audio[0]!,
    interrupted = media.pending[0]!
  f.phase('paused')
  f.phase('playing')
  interrupted.reject(new Error('play interrupted by pause'))
  await Promise.resolve()
  expect(f.notes).toEqual([])
  expect(f.bank.inspect().voices).toBe(1)
  media.pending.at(-1)!.reject(new Error('autoplay denied'))
  await Promise.resolve()
  expect(f.notes).toHaveLength(1)
  expect(f.bank.inspect().voices).toBe(0)
  f.bank.dispose()
})
test('remote, traversal, invalid channels/volumes and unbounded definitions are rejected', () => {
  const f = fixture()
  for (const path of [
    'https://other.test/a.ogg',
    '../a.ogg',
    'data:audio/ogg;base64,AAAA',
    'a.ogg?q=x',
    'a.html',
  ])
    expect(() => f.bank.define('a', path, 'music')).toThrow()
  expect(() => f.bank.volume('music', NaN)).toThrow()
  expect(() => f.bank.volume('music', 1.1)).toThrow()
  for (let n = 0; n < 16; n++) f.bank.define('s-' + n, 'a.wav', 'effects')
  expect(() => f.bank.define('overflow', 'a.wav', 'effects')).toThrow()
  f.bank.dispose()
})
