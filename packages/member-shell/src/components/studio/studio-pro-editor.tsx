'use client'

import '@sistemazero/studio/styles.css'
import type { Project, StudioTheme } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { useEffect, useState } from 'react'
import { loadStudioProModule, type StudioProModule } from './studio-pro-loader'

interface Props {
  /** Perfil (kids) ou conta (adulto) — namespeia o IndexedDB local do Studio. */
  viewerId: string | null
  /** Id do projeto PRO a abrir (persistido local no namespace do viewer). */
  projectId: string
  /** Tema fixado pelo app (segue a comunidade). */
  theme: StudioTheme
  /** Volta para a lista do Estúdio (`/estudio`). */
  onExit: () => void
}

type Loaded =
  | { kind: 'loading' }
  | { kind: 'load-error' }
  | { kind: 'unsupported' }
  | { kind: 'ready'; project: Project }
  | { kind: 'invalid' }

/**
 * Editor do modo CÓDIGO (projeto PRO / WebContainer) do Estúdio Completo. Vive no
 * member-shell para o adulto reaproveitar quando o Estúdio Completo virar produto
 * dele (hoje só o kids monta, na rota isolada `/estudio/pro/[id]` — a única com
 * COOP/COEP; ver o next.config do app). Carrega SÓ no client (Monaco/WebContainer
 * não existem no SSR): o import dinâmico roda num effect.
 *
 * Gate de capacidade ANTES de montar o editor pesado: sem `canRunProMode()`
 * (host não isolado / navegador incompatível) mostra um recado gentil. Projeto
 * inexistente ou clássico (`kind !== 'pro'`) → `onExit` (não é lugar dele).
 */
export function StudioProEditor({ viewerId, projectId, theme, onExit }: Props) {
  const [mod, setMod] = useState<StudioProModule | null>(null)
  const [state, setState] = useState<Loaded>({ kind: 'loading' })
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let active = true
    if (loadAttempt > 0) setMod(null)
    void (async () => {
      setState({ kind: 'loading' })
      const result = await loadStudioProModule()
      if (!active) return
      if (!result.module) {
        console.error('Não foi possível carregar o editor Pro.', result.error)
        setState({ kind: 'load-error' })
        return
      }
      const m = result.module
      setMod(m)
      if (!m.canRunProMode()) {
        setState({ kind: 'unsupported' })
        return
      }
      // Mesmo namespace por viewer do Estúdio Completo clássico — o projeto PRO
      // foi criado lá e persistido no IndexedDB deste perfil/conta.
      m.setStudioStorageNamespace(viewerId ?? '')
      const project = await m
        .createLocalPersistenceAdapter()
        .load(projectId)
        .catch(() => null)
      if (!active) return
      // A rota PRO é só para projetos PRO: um id ausente ou um projeto CLÁSSICO
      // (que roda Blocos+Ponte na /estudio, sem COEP) não abre aqui.
      if (project?.kind !== 'pro') {
        setState({ kind: 'invalid' })
        return
      }
      setState({ kind: 'ready', project })
    })()
    return () => {
      active = false
    }
  }, [viewerId, projectId, loadAttempt])

  // Projeto errado/ausente: devolve para a lista (efeito p/ não navegar no render).
  useEffect(() => {
    if (state.kind === 'invalid') onExit()
  }, [state.kind, onExit])

  if (state.kind === 'unsupported') {
    return (
      <div
        data-sz-theme={theme}
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center"
      >
        <h2 className="sz-display text-lg">O modo Código pede um computador</h2>
        <p className="max-w-md text-muted-foreground text-sm">
          O modo Código roda um servidor de verdade dentro do navegador, e isso precisa de um
          computador com um navegador compatível (Chrome ou Edge no desktop). No celular ou tablet
          você ainda pode criar jogos de blocos.
        </p>
        <Button variant="outline" size="sm" onClick={onExit}>
          Voltar ao Estúdio
        </Button>
      </div>
    )
  }

  if (state.kind === 'load-error') {
    return (
      <div
        data-sz-theme={theme}
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center"
      >
        <h2 className="sz-display text-lg">Não consegui carregar o modo Código</h2>
        <p className="max-w-md text-muted-foreground text-sm">
          Verifique sua conexão e tente novamente. Se continuar, volte ao Estúdio e abra o projeto
          de novo.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLoadAttempt((value) => value + 1)}>
            Tentar novamente
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            Voltar ao Estúdio
          </Button>
        </div>
      </div>
    )
  }

  if (state.kind !== 'ready' || !mod) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground text-sm">
        <Spinner /> Carregando o modo Código…
      </div>
    )
  }

  const StudioEditor = mod.StudioEditor
  return (
    <StudioEditor
      initialProject={state.project}
      persistence="local"
      theme={theme}
      features={{ professional: true }}
      onExit={onExit}
    />
  )
}
