'use client'
import type { PensaNarratableRef } from '@sistemazero/core/pensa'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  hasLessonMediaFocus,
  registerLessonMedia,
  requestLessonMediaFocus,
} from '../lib/lesson-media-focus'
import { privateVoiceErrorText, readPrivateVoiceUrl } from '../lib/private-voice'
import { sessionFetch } from '../lib/session-fetch'

export function PrivateZappyVoice({
  reference,
  viewerId,
}: {
  reference: PensaNarratableRef
  viewerId: string
}) {
  return (
    <PrivateZappyVoicePlayer
      key={JSON.stringify([viewerId, reference])}
      reference={reference}
      viewerId={viewerId}
    />
  )
}
function PrivateZappyVoicePlayer({
  reference,
  viewerId,
}: {
  reference: PensaNarratableRef
  viewerId: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [error, setError] = useState('')
  const owner = useRef(Symbol('private-zappy'))
  const player = useRef<HTMLAudioElement | null>(null)
  const controller = useRef<AbortController | null>(null)
  const stop = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    player.current?.pause()
    setState('idle')
  }, [])
  useEffect(() => {
    const unregister = registerLessonMedia(owner.current, stop)
    const hidden = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      stop()
      unregister()
      player.current = null
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [stop])
  async function play() {
    if (state !== 'idle') {
      stop()
      return
    }
    setError('')
    setState('loading')
    const request = new AbortController()
    controller.current = request
    const isCurrent = () =>
      controller.current === request &&
      !request.signal.aborted &&
      hasLessonMediaFocus(owner.current)
    // Safari pode pedir um segundo gesto depois de a síntese terminar. Reutiliza o
    // áudio já preparado e chama play dentro desse gesto, sem outra ida ao servidor.
    if (player.current?.src && hasLessonMediaFocus(owner.current)) {
      try {
        await player.current.play()
        if (isCurrent()) setState('playing')
      } catch {
        if (isCurrent()) {
          setError('Toque em Ouvir novamente para tocar a fala.')
          setState('idle')
        }
      }
      return
    }
    const audio = new Audio()
    player.current = audio
    try {
      if (!(await requestLessonMediaFocus(owner.current))) {
        if (controller.current === request) stop()
        return
      }
      if (!isCurrent()) return
      const response = await sessionFetch('/api/voice/narrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-sz-viewer': viewerId },
        body: JSON.stringify(reference),
        signal: request.signal,
      })
      const url = await readPrivateVoiceUrl(response)
      if (!isCurrent()) return
      audio.src = url
      audio.onended = () => {
        if (player.current === audio) setState('idle')
      }
      audio.onerror = () => {
        if (player.current !== audio) return
        audio.removeAttribute('src')
        setError('Não consegui tocar a fala. Aperte Ouvir para tentar de novo.')
        setState('idle')
      }
      await audio.play()
      if (isCurrent()) setState('playing')
    } catch (cause) {
      if (controller.current !== request) return
      // Frase da nossa rota ou a gentil fixa; "Failed to fetch" e o erro do parser não chegam
      // à tela (vão ao console pelo `privateVoiceErrorText`).
      if (!request.signal.aborted) setError(privateVoiceErrorText(cause))
      setState('idle')
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="min-h-11 rounded-full border px-4 py-2 text-sm font-bold"
        onClick={() => void play()}
        aria-label={
          state === 'playing'
            ? 'Parar a voz do Zappy'
            : state === 'loading'
              ? 'Cancelar a preparação da voz'
              : 'Ouvir na voz do Zappy'
        }
      >
        {state === 'playing'
          ? '■ Parar'
          : state === 'loading'
            ? 'Preparando voz… Cancelar'
            : '♪ Ouvir'}
      </button>
      {error ? (
        <span role="status" className="text-sm">
          {error}
        </span>
      ) : null}
    </span>
  )
}
