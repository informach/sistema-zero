import {
  StudioPythonPreviewAudioSchema,
  StudioPythonPreviewMessageSchema,
} from '@sistemazero/core/studio/python-preview-bridge'
import { isStudioPythonWebOrigin } from '@sistemazero/core/studio/python-preview-input'
import type { StudioHostAudioPreference } from '../types'
import type { StandalonePythonPlayerObserver } from './standalonePlayer'

/** The service writes this metadata; project payloads and the opaque learner frame cannot. */
export function createPythonPreviewContext(): {
  observer: StandalonePythonPlayerObserver
  hostAudio?(signal: AbortSignal): Promise<StudioHostAudioPreference>
} {
  const parentOrigin = document.querySelector<HTMLMetaElement>(
      'meta[name="studio-python-preview-parent"]',
    )?.content,
    parameters = new URLSearchParams(location.hash.slice(1)),
    session = parameters.get('studio-preview-session'),
    previewId = /^\/v1\/python-previews\/([a-f0-9]{64})\/index\.html$/.exec(location.pathname)?.[1]
  const embedded =
    document.querySelector('meta[name="studio-python-preview-parent"]') !== null ||
    /^\/v1\/python-previews(?:\/|$)/.test(location.pathname) ||
    parameters.has('studio-preview-session')
  if (!embedded) return { observer: {} }
  if (
    !parentOrigin ||
    !isStudioPythonWebOrigin(parentOrigin) ||
    new URL(parentOrigin).origin !== parentOrigin ||
    window.parent === window ||
    !previewId ||
    parameters.size !== 1 ||
    !session ||
    !StudioPythonPreviewMessageSchema.safeParse({
      type: 'studio-python-preview',
      version: 1,
      session,
      previewId,
      status: 'loading',
    }).success
  )
    return {
      observer: {},
      hostAudio: async () => {
        throw new Error('O contexto de som da proposta é inválido.')
      },
    }
  const parentWindow = window.parent
  const report = (status: 'loading' | 'ready' | 'unavailable') =>
    window.parent.postMessage(
      { type: 'studio-python-preview', version: 1, session, previewId, status },
      parentOrigin,
    )
  const observer: StandalonePythonPlayerObserver = {
    session() {
      report('loading')
    },
    event(event) {
      if (event.type === 'failed') report('unavailable')
      else if (
        event.type === 'state' &&
        ['running', 'waiting-input', 'completed', 'paused'].includes(event.state)
      )
        report('ready')
    },
    failed() {
      report('unavailable')
    },
  }
  return {
    observer,
    hostAudio(signal) {
      if (signal.aborted) return Promise.reject(signal.reason)
      const requestId = crypto.randomUUID()
      let sequence = -1
      let muted = true
      let closed = false
      const listeners = new Set<() => void>()
      return new Promise<StudioHostAudioPreference>((resolve, reject) => {
        const close = () => {
          if (closed) return
          closed = true
          clearTimeout(timer)
          window.removeEventListener('message', receive)
          signal.removeEventListener('abort', close)
          listeners.clear()
          reject(signal.reason ?? new DOMException('Proposta encerrada.', 'AbortError'))
        }
        const preference: StudioHostAudioPreference = {
          getMuted() {
            if (closed) throw new DOMException('Proposta encerrada.', 'AbortError')
            return muted
          },
          subscribe(listener) {
            if (closed) return () => {}
            listeners.add(listener)
            return () => {
              listeners.delete(listener)
            }
          },
        }
        const receive = (event: MessageEvent<unknown>) => {
          if (
            closed ||
            signal.aborted ||
            event.source !== parentWindow ||
            event.origin !== parentOrigin
          )
            return
          const parsed = StudioPythonPreviewAudioSchema.safeParse(event.data)
          if (!parsed.success) return
          const value = parsed.data
          if (
            value.session !== session ||
            value.previewId !== previewId ||
            value.requestId !== requestId ||
            value.sequence !== sequence + 1
          )
            return
          sequence = value.sequence
          muted = value.muted
          if (sequence === 0) {
            clearTimeout(timer)
            resolve(preference)
          }
          for (const listener of [...listeners]) {
            if (closed) break
            try {
              listener()
            } catch (error) {
              reportError(error)
            }
          }
        }
        const timer = setTimeout(() => {
          reject(new Error('O editor não confirmou a preferência de som da proposta.'))
          close()
        }, 5000)
        window.addEventListener('message', receive)
        signal.addEventListener('abort', close, { once: true })
        if (signal.aborted) {
          close()
          return
        }
        try {
          parentWindow.postMessage(
            {
              type: 'studio-python-preview-audio-ready',
              version: 1,
              session,
              previewId,
              requestId,
            },
            parentOrigin,
          )
        } catch (error) {
          reject(error)
          close()
        }
      })
    },
  }
}
