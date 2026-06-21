'use client'

import type { Project, StudioProjectPlayerProps } from '@sistemazero/studio'
import { type ComponentType, useEffect, useState } from 'react'

type PlayerComponent = ComponentType<StudioProjectPlayerProps>

/**
 * Player PÚBLICO (sem login) de um projeto compartilhado no Mural. Roda SÓ o jogo
 * (sem editor/código) num iframe sandbox — via o `StudioProjectPlayer` do
 * @sistemazero/studio (subpath `/player`: traz só a cadeia de preview, sem
 * Monaco/Blockly). Busca o projeto na rota mesma-origem `/api/studio/play/:id`
 * (stream do R2). Mostra apenas o jogo + o título — NUNCA o nome da criança.
 */
export function PublicPlayer({ id }: { id: string }) {
  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [mod, res] = await Promise.all([
          import('@sistemazero/studio/player'),
          fetch(`/api/studio/play/${encodeURIComponent(id)}`),
        ])
        if (!active) return
        if (!res.ok) {
          setStatus('error')
          return
        }
        const proj = (await res.json()) as Project
        if (!active) return
        setPlayer(() => mod.StudioProjectPlayer)
        setProject(proj)
        setStatus('ready')
      } catch {
        if (active) setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const title = typeof project?.name === 'string' && project.name.trim() ? project.name : 'Projeto'

  return (
    <main className="flex h-dvh w-full flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-3 border-border border-b-2 px-4 py-3">
        <span className="truncate font-bold [font-family:var(--font-display)] text-lg">
          {status === 'ready' ? title : 'Sistema Zero'}
        </span>
        <span className="shrink-0 text-muted-foreground text-xs">feito com Sistema Zero</span>
      </header>

      <div className="grid min-h-0 flex-1 place-items-center p-2 sm:p-4">
        {status === 'loading' ? (
          <p className="text-muted-foreground">Carregando o jogo…</p>
        ) : status === 'error' ? (
          <div className="space-y-1 text-center">
            <p className="text-3xl">🕹️</p>
            <p className="font-bold">Não encontramos este jogo.</p>
            <p className="text-muted-foreground text-sm">
              O link pode estar errado ou o projeto não está mais disponível.
            </p>
          </div>
        ) : Player && project ? (
          <div className="h-full w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
            <Player project={project} title={title} />
          </div>
        ) : null}
      </div>
    </main>
  )
}
