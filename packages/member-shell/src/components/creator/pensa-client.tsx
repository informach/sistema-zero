'use client'

import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { PrivateZappyVoice } from '@sistemazero/member-shell/components/private-zappy-voice'
import { VoiceInputButton } from '@sistemazero/member-shell/components/voice-input/voice-input-button'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import { PensaApiError, type PensaHostAdapter, type PensaTransport } from '@sistemazero/pensa'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { navigatePensaMission, pensaMissionPath } from '../../lib/pensa-next-mission'
import { notePensaRestoreFromView } from '../../lib/pensa-restore-pending'
import { EMBEDDED_APP_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { useFocusMode } from './focus-mode'
import { useHostChrome } from './use-host-chrome'

type PensaModule = typeof import('@sistemazero/pensa')

export function PensaClient({
  audience = 'kids',
  initialProjectId = null,
  initialHelpMissionId = null,
  viewerId,
  voiceEnabled = false,
  narrationEnabled = false,
  supportReadOnly = false,
}: {
  audience?: 'kids' | 'adult'
  initialProjectId?: string | null
  initialHelpMissionId?: string | null
  viewerId?: string
  voiceEnabled?: boolean
  narrationEnabled?: boolean
  /** Sessão de suporte só leitura já conhecida pela página. Sem ela, o Pensa descobre pela
   * recusa `IMPERSONATION_READONLY` do BFF e liga a mesma faixa de leitura. */
  supportReadOnly?: boolean
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
      mode: audience,
      theme: 'light',
      readOnly: supportReadOnly,
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
      mascotImages:
        audience === 'kids'
          ? {
              happy: BUILTIN_ART.happy.poster.url,
              thinking: BUILTIN_ART.thinking.poster.url,
              celebrating: BUILTIN_ART.celebrating.poster.url,
              sleeping: BUILTIN_ART.sleeping.poster.url,
              speaking: BUILTIN_ART.speaking.poster.url,
            }
          : undefined,
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
    [transport, viewerId, narrationEnabled, voiceEnabled, router, audience, supportReadOnly],
  )
  return (
    <div className={EMBEDDED_APP_FRAME}>
      {loadError ? (
        <PensaLoadError kids={audience === 'kids'} onRetry={() => void load()} />
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

/**
 * O Pensa não carregou (Canvas "Estados": "O Pensa não abriu agora"). Os jogos ficam no
 * servidor, então a frase diz que nada se perdeu e oferece tentar de novo. Sem atalho para o
 * Estúdio: aqui não dá para confirmar que a conta tem o Estúdio.
 * O Zappy pensando só aparece no Kids.
 */
function PensaLoadError({ kids, onRetry }: { kids: boolean; onRetry(): void }) {
  return (
    <div className="grid flex-1 place-items-center p-4">
      <section
        role="alert"
        aria-labelledby="pensa-load-error"
        className="flex w-full max-w-lg flex-col items-center gap-3 rounded-3xl bg-card p-7 text-center"
      >
        {kids ? (
          <img
            src={BUILTIN_ART.thinking.poster.url}
            alt=""
            width={96}
            height={96}
            className="size-24"
          />
        ) : null}
        <h2 id="pensa-load-error" className="font-extrabold text-2xl">
          O Pensa não abriu agora
        </h2>
        <p className="text-[0.9375rem] text-muted-foreground">
          Nada do que você fez no Pensa se perde. Tente de novo daqui a pouco.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-full bg-primary px-5 font-extrabold text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      </section>
    </div>
  )
}
