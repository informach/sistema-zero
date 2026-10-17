'use client'

import { PrivateZappyVoice } from '@sistemazero/member-shell/components/private-zappy-voice'
import { VoiceInputButton } from '@sistemazero/member-shell/components/voice-input/voice-input-button'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { PensaApiError, type PensaHostAdapter, type PensaTransport } from '@sistemazero/pensa'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { navigatePensaMission, pensaMissionPath } from '@/lib/pensa-next-mission'
import { notePensaRestoreFromView } from '@/lib/pensa-restore-pending'
import { EMBEDDED_APP_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { useFocusMode } from './focus-mode'
import { useHostChrome } from './use-host-chrome'

type PensaModule = typeof import('@sistemazero/pensa')

export function PensaClient({
  initialProjectId = null,
  initialHelpMissionId = null,
  viewerId,
  voiceEnabled = false,
  narrationEnabled = false,
}: {
  initialProjectId?: string | null
  initialHelpMissionId?: string | null
  viewerId?: string
  voiceEnabled?: boolean
  narrationEnabled?: boolean
}) {
  const [module, setModule] = useState<PensaModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const router = useRouter()
  const { setWorkspaceActive } = useFocusMode()
  const { chrome } = useHostChrome({ cloud: null })
  const load = useCallback(async () => {
    setLoadError(false)
    try {
      setModule(await import('@sistemazero/pensa'))
    } catch {
      setLoadError(true)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  const transport = useMemo<PensaTransport>(
    () => ({
      async request<T>(
        path: string,
        init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown },
      ): Promise<T> {
        const response = await sessionFetch(`/api/pensa${path}`, {
          method: init?.method ?? 'GET',
          cache: 'no-store',
          headers: {
            ...(viewerId ? { 'x-sz-viewer': viewerId } : {}),
            ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
          },
          body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
        })
        const body: unknown =
          response.status === 204 ? null : await response.json().catch(() => null)
        if (!response.ok) {
          const envelope = body && typeof body === 'object' && 'error' in body ? body.error : null
          const message =
            envelope &&
            typeof envelope === 'object' &&
            'message' in envelope &&
            typeof envelope.message === 'string'
              ? envelope.message
              : 'Não consegui falar com seu plano. Tente novamente.'
          const code =
            envelope &&
            typeof envelope === 'object' &&
            'code' in envelope &&
            typeof envelope.code === 'string'
              ? envelope.code
              : 'REQUEST_FAILED'
          throw new PensaApiError(message, response.status, code)
        }
        notePensaRestoreFromView(viewerId ?? null, body)
        return body as T
      },
    }),
    [viewerId],
  )
  const adapter = useMemo<PensaHostAdapter>(
    () => ({
      transport,
      viewerId,
      mode: 'kids',
      theme: 'light',
      renderListen:
        narrationEnabled && viewerId
          ? (reference) => <PrivateZappyVoice viewerId={viewerId} reference={reference} />
          : undefined,
      renderVoiceInput:
        voiceEnabled && viewerId
          ? (input) => (
              <VoiceInputButton
                {...input}
                viewerId={viewerId}
                maxLength={4000}
                transcriptMaxChars={4000}
                context="Pensa: contar minha ideia de jogo"
                preserveOverflow
                onSpoken={() => {}}
              />
            )
          : undefined,
      mascotImages: {
        happy: '/zappy/happy.webp',
        thinking: '/zappy/thinking.webp',
        celebrating: '/zappy/celebrating.webp',
        sleeping: '/zappy/sleeping.webp',
      },
      onOpenMission: (mission) =>
        navigatePensaMission(pensaMissionPath(mission), (path) => router.push(path)),
      onOpenGame: (game) =>
        navigatePensaMission(
          game.studioAuthoring === 'code'
            ? `/estudio/pro/${encodeURIComponent(game.studioProjectId)}`
            : `/estudio?projeto=${encodeURIComponent(game.studioProjectId)}`,
          (path) => router.push(path),
        ),
    }),
    [transport, viewerId, narrationEnabled, voiceEnabled, router],
  )
  return (
    <div className={EMBEDDED_APP_FRAME}>
      {loadError ? (
        <div role="alert">
          <p>Não consegui carregar o Pensa.</p>
          <button type="button" onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      ) : module ? (
        <module.PensaHostChromeProvider value={chrome}>
          <module.PensaApp
            adapter={adapter}
            initialProjectId={initialProjectId}
            initialHelpMissionId={initialHelpMissionId}
            onWorkspaceChange={setWorkspaceActive}
          />
        </module.PensaHostChromeProvider>
      ) : (
        <EmbeddedAppLoadingBody label="Carregando o Pensa…" />
      )}
    </div>
  )
}
