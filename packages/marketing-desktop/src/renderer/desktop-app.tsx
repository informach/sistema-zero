import { errorMessage, Workbench } from '@sistemazero/marketing-workbench'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useMemo, useState } from 'react'
import type { ConnectionState } from '../shared/connection'
import type { ProviderStatus } from '../shared/contracts'
import { DesktopConnection } from './connection'
import { DesktopUpdateControls } from './updates'
import { desktopWorkbench } from './workbench-adapter'

export function DesktopApp() {
  const [state, setState] = useState<ConnectionState | null>(null),
    [providers, setProviders] = useState<ProviderStatus[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [speech, setSpeech] = useState<{ available: boolean; reason?: string } | null>(null)
  const [installing, setInstalling] = useState(false),
    [installation, setInstallation] = useState('')
  const port = useMemo(
    () =>
      state?.origin && state.userId
        ? desktopWorkbench(window.marketing, { origin: state.origin, userId: state.userId })
        : null,
    [state?.origin, state?.userId],
  )
  useEffect(() => {
    let live = true
    void window.marketing
      .speechStatus()
      .then((value) => {
        if (live) setSpeech(value)
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (!installing && !busy) return
    return window.marketing.onProgress(({ stage }) => setInstallation(stage))
  }, [installing, busy])
  useEffect(() => {
    let live = true
    void window.marketing
      .status()
      .then((value) => {
        if (live) setProviders(value)
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [])
  return (
    <>
      <DesktopConnection onChange={setState} />
      <main className="mx-auto max-w-[1500px] space-y-5 p-5 lg:p-8">
        <DesktopUpdateControls />
        <section
          className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
          aria-label="Assinaturas de inteligência artificial"
        >
          <p className="text-sm font-semibold">Suas assinaturas</p>
          {providers.map((provider) => (
            <div key={provider.provider} className="flex items-center gap-2 text-sm">
              <span>
                {provider.provider === 'codex' ? 'Codex' : 'Claude Code'} ·{' '}
                {provider.available ? provider.mode : (provider.reason ?? 'Não conectado')}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || installing || !provider.client.installed}
                onClick={() => {
                  setBusy(true)
                  setError('')
                  setInstallation('Conclua o acesso no navegador oficial do provedor.')
                  void window.marketing
                    .login(provider.provider)
                    .then(() => window.marketing.status())
                    .then(setProviders)
                    .catch((error) => setError(errorMessage(error)))
                    .finally(() => setBusy(false))
                }}
              >
                {provider.available ? 'Gerenciar acesso' : 'Conectar'}
              </Button>
              {!provider.client.installed ? (
                <Button
                  size="sm"
                  disabled={busy || installing || !provider.client.installable}
                  onClick={() => {
                    setInstalling(true)
                    setError('')
                    setInstallation('Preparando cliente oficial')
                    void window.marketing
                      .installClient(provider.provider)
                      .then(() => window.marketing.status())
                      .then(setProviders)
                      .catch((error) => setError(errorMessage(error)))
                      .finally(() => setInstalling(false))
                  }}
                >
                  {provider.client.managed ? 'Reparar cliente' : 'Instalar cliente'} ·{' '}
                  {Math.ceil(provider.client.downloadBytes / 1024 ** 2)} MB
                </Button>
              ) : null}
              {provider.client.version ? (
                <span className="text-xs text-muted-foreground">v{provider.client.version}</span>
              ) : null}
              {!provider.client.installed && !provider.client.installable ? (
                <span className="text-xs text-muted-foreground">
                  Instalação pelo app disponível no Windows x64.
                </span>
              ) : null}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Cada pessoa usa sua própria conta.</p>
        </section>
        <section
          className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
          aria-label="Ferramentas de vídeo do computador"
        >
          <p className="text-sm">
            Transcrição local ·{' '}
            {speech?.available ? 'Instalada' : (speech?.reason ?? 'Conferindo instalação…')}
          </p>
          {!speech?.available ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || installing || !speech}
              onClick={() => {
                setInstalling(true)
                setError('')
                setInstallation('Preparando instalação')
                void window.marketing
                  .installSpeech()
                  .then(() => window.marketing.speechStatus())
                  .then(setSpeech)
                  .catch((error) => setError(errorMessage(error)))
                  .finally(() => setInstalling(false))
              }}
            >
              Instalar transcrição · 148 MB
            </Button>
          ) : null}
        </section>
        {installing || busy ? (
          <>
            <p role="status" className="text-sm">
              {installation}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void window.marketing.cancel().catch((error) => setError(errorMessage(error)))
              }
            >
              Cancelar
            </Button>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {port && state?.status !== 'disconnected' ? (
          <Workbench key={port.identity} port={port} />
        ) : (
          <section className="rounded-xl border bg-card p-8">
            <h1 className="text-xl font-semibold">Seu trabalho, junto da equipe</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Conecte este computador ao servidor para abrir projetos e continuar as peças.
            </p>
          </section>
        )}
      </main>
    </>
  )
}
