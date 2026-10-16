import type { GameUI } from './ui'

export type SoundChannel = 'music' | 'effects'
/** Optional local media. Streaming avoids decoding an entire music track into a PCM buffer. */
export function createSoundBank(ui: GameUI) {
  const definitions = new Map<string, { url: string; channel: SoundChannel }>()
  const voices = new Map<HTMLAudioElement, SoundChannel>()
  const volumes = { music: 0.25, effects: 0.65 }
  const revisions = new WeakMap<HTMLAudioElement, number>()
  let disposed = false,
    music: HTMLAudioElement | undefined,
    musicId: string | undefined,
    activeMusicId: string | undefined
  const pause = (voice: HTMLAudioElement) => {
    revisions.set(voice, (revisions.get(voice) ?? 0) + 1)
    voice.pause()
  }
  const release = (voice: HTMLAudioElement) => {
    if (!voices.has(voice)) return
    voices.delete(voice)
    voice.onended = null
    voice.onerror = null
    pause(voice)
    voice.removeAttribute('src')
    voice.load()
    if (voice === music) {
      music = undefined
      activeMusicId = undefined
    }
  }
  const sync = () => {
    for (const [voice, channel] of voices) voice.volume = ui.soundEnabled ? volumes[channel] : 0
  }
  const run = (voice: HTMLAudioElement) => {
    const revision = (revisions.get(voice) ?? 0) + 1
    revisions.set(voice, revision)
    const failed = () => {
      if (!disposed && voices.has(voice) && revisions.get(voice) === revision) {
        release(voice)
        ui.note('Não foi possível tocar o áudio. Confira o material e ative o som novamente.')
      }
    }
    try {
      void voice.play().catch(failed)
    } catch {
      failed()
    }
  }
  const play = (id: string) => {
    if (disposed || !ui.soundEnabled || ui.phase !== 'playing') return
    const definition = definitions.get(id)
    if (!definition) return
    if (definition.channel === 'music' && activeMusicId === id && music) {
      run(music)
      return
    }
    if (
      definition.channel === 'effects' &&
      [...voices.values()].filter((channel) => channel === 'effects').length >= 4
    )
      return
    if (definition.channel === 'music' && music) release(music)
    const voice = new Audio()
    voice.preload = 'metadata'
    voice.src = definition.url
    voice.loop = definition.channel === 'music'
    voices.set(voice, definition.channel)
    voice.volume = volumes[definition.channel]
    voice.onended = () => release(voice)
    voice.onerror = () => {
      if (!disposed && voices.has(voice)) {
        release(voice)
        ui.note('Um áudio não pôde ser carregado. O jogo continua disponível.')
      }
    }
    if (definition.channel === 'music') {
      music = voice
      activeMusicId = id
    }
    run(voice)
  }
  const offSound = ui.onSound((enabled) => {
    sync()
    if (!enabled) {
      for (const [voice, channel] of voices) {
        if (channel === 'music') pause(voice)
        else release(voice)
      }
    } else if (ui.phase === 'playing' && musicId) play(musicId)
  })
  const offPhase = ui.onPhase((phase) => {
    if (phase === 'playing') {
      if (musicId) play(musicId)
      return
    }
    for (const [voice, channel] of voices) {
      if (phase === 'paused' && channel === 'music') pause(voice)
      else release(voice)
    }
  })
  const offResult = ui.onResult(() => {
    for (const voice of voices.keys()) release(voice)
  })
  return {
    define(id: string, path: string, channel: SoundChannel) {
      if (disposed) throw new Error('Áudio encerrado.')
      if (!/^[a-z0-9-]{1,40}$/.test(id) || (!definitions.has(id) && definitions.size >= 16))
        throw new Error('Limite ou ID de áudio inválido.')
      const url = new URL(path, location.href),
        base = new URL('.', location.href)
      if (
        !path ||
        url.username ||
        url.password ||
        /%2f|%5c/i.test(url.pathname) ||
        !['music', 'effects'].includes(channel) ||
        url.origin !== base.origin ||
        !/^https?:$/.test(url.protocol) ||
        !url.pathname.startsWith(base.pathname) ||
        url.search ||
        url.hash ||
        !/\.(mp3|ogg|wav|webm|m4a)$/i.test(url.pathname)
      )
        throw new Error('Use um caminho de áudio local dos Materiais.')
      if (musicId === id && music) release(music)
      definitions.set(id, { url: url.href, channel })
    },
    effect(id: string) {
      if (definitions.get(id)?.channel === 'effects') play(id)
    },
    music(id: string) {
      if (definitions.get(id)?.channel !== 'music') return
      musicId = id
      play(id)
    },
    volume(channel: SoundChannel, value: number) {
      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1 ||
        !['music', 'effects'].includes(channel)
      )
        throw new Error('Volume precisa estar entre 0 e 1.')
      volumes[channel] = value
      sync()
    },
    stop() {
      musicId = undefined
      for (const voice of voices.keys()) release(voice)
    },
    inspect: () => ({
      definitions: definitions.size,
      voices: voices.size,
      music: !!music,
      volumes: { ...volumes },
    }),
    dispose() {
      if (disposed) return
      disposed = true
      offSound()
      offPhase()
      offResult()
      for (const voice of voices.keys()) release(voice)
      definitions.clear()
      musicId = undefined
    },
  }
}
