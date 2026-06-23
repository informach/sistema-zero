'use client'

import '@sistemazero/studio/styles.css'
import type { Project, StudioShareAdapter } from '@sistemazero/studio'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'

// O package do Estúdio é pesado (Monaco/Blockly/IndexedDB) e NÃO roda no SSR — por
// isso carregamos o módulo inteiro DENTRO de um effect (igual ao public-player) e o
// server renderiza só o placeholder. `mod` guarda os exports carregados.
type StudioModule = typeof import('@sistemazero/studio')
type View = { name: 'list' } | { name: 'editor'; projectId: string }
type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'not-found' }

/**
 * Estúdio Completo embarcado na comunidade kids (produto vendável). Hospeda a navegação
 * lista ⇄ editor (o package não tem router — quem roteia é o host; aqui é estado local)
 * com persistência LOCAL (IndexedDB do navegador, a experiência do playground). Recursos
 * CLÁSSICOS: o `<StudioEditor>` já vem com terminal/IA/profissional OFF por default —
 * por isso NÃO passamos `features` (sem WebContainer = sem necessidade de COOP/COEP). O
 * botão "Compartilhar" publica no Mural via o caminho standalone (sem aula).
 */
export function StudioFullClient() {
  const [mod, setMod] = useState<StudioModule | null>(null)
  const [view, setView] = useState<View>({ name: 'list' })
  // O Estúdio SEGUE o tema da comunidade (next-themes) — sem toggle próprio e sem
  // destoar do app ao redor. `resolvedTheme` é undefined no 1º render → cai em claro.
  const { resolvedTheme } = useTheme()
  const studioTheme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    let active = true
    void (async () => {
      const m = await import('@sistemazero/studio')
      if (!active) return
      setMod(m)
      // Aquece os chunks pesados (Blockly/Monaco) enquanto a criança olha a lista.
      m.prefetchStudioModes()
    })()
    return () => {
      active = false
    }
  }, [])

  // Adapter de COMPARTILHAR (Mural) — standalone (SEM aula): `describe` rascunha a
  // descrição via IA no servidor (fail-soft) e `publish` sobe projeto + capa por
  // multipart à rota standalone, que devolve os links. Memoizado (o Studio o latcha).
  const share = useMemo<StudioShareAdapter>(
    () => ({
      async generateDescription({ project, title }) {
        try {
          const res = await fetch('/api/studio/describe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              files: {
                html: project.files['index.html'],
                css: project.files['style.css'],
                js: project.files['script.js'],
              },
              title,
            }),
          })
          if (!res.ok) return ''
          const body = (await res.json()) as { description?: string }
          return body.description ?? ''
        } catch {
          return '' // fail-soft: a criança escreve do zero
        }
      },
      async publish({ project, coverDataUrl, title, description }) {
        const form = new FormData()
        form.set('title', title)
        form.set('description', description)
        form.set('clientIdempotencyKey', crypto.randomUUID())
        form.set(
          'project',
          new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }),
        )
        if (coverDataUrl) {
          const blob = await (await fetch(coverDataUrl)).blob()
          form.set('cover', new File([blob], 'cover', { type: blob.type || 'image/png' }))
        }
        const res = await fetch('/api/studio/publish-standalone', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          muralUrl?: string
          playUrl?: string
          error?: { message?: string }
        } | null
        if (!res.ok) {
          throw new Error(body?.error?.message ?? 'Não foi possível publicar agora.')
        }
        return { muralUrl: body?.muralUrl, playUrl: body?.playUrl }
      },
    }),
    [],
  )

  const openProject = useCallback((projectId: string) => setView({ name: 'editor', projectId }), [])
  const backToList = useCallback(() => setView({ name: 'list' }), [])

  // Container ALTO p/ o editor ocupar o máximo do espaço da comunidade kids (a largura
  // é o `max-w-5xl` do layout). `min-h` garante usabilidade em telas baixas.
  return (
    <div className="h-[calc(100dvh-8rem)] min-h-[34rem] w-full overflow-hidden rounded-2xl border-2 border-border bg-card">
      {mod === null ? (
        <div className="grid h-full place-items-center text-muted-foreground text-sm">
          Carregando o Estúdio…
        </div>
      ) : view.name === 'list' ? (
        <mod.ProjectList onOpenProject={openProject} theme={studioTheme} />
      ) : (
        <EditorScreen
          mod={mod}
          projectId={view.projectId}
          onExit={backToList}
          share={share}
          theme={studioTheme}
        />
      )}
    </div>
  )
}

/** Carrega o projeto do IndexedDB e monta o editor completo (volta à lista no "Projetos"). */
function EditorScreen({
  mod,
  projectId,
  onExit,
  share,
  theme,
}: {
  mod: StudioModule
  projectId: string
  onExit: () => void
  share: StudioShareAdapter
  theme: 'light' | 'dark'
}) {
  const adapter = useMemo(() => mod.createLocalPersistenceAdapter(), [mod])
  const [state, setState] = useState<EditorState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    adapter
      .load(projectId)
      .then((project) => {
        if (!active) return
        setState(project ? { status: 'ready', project } : { status: 'not-found' })
      })
      .catch(() => {
        if (active) setState({ status: 'not-found' })
      })
    return () => {
      active = false
    }
  }, [adapter, projectId])

  // Projeto sumiu (apagado noutra aba) → volta à lista sem travar.
  useEffect(() => {
    if (state.status !== 'not-found') return
    const timer = setTimeout(onExit, 1200)
    return () => clearTimeout(timer)
  }, [state.status, onExit])

  if (state.status === 'loading') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Carregando projeto…
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Projeto não encontrado. Voltando à lista…
      </div>
    )
  }
  return (
    <mod.StudioEditor
      initialProject={state.project}
      persistence="local"
      onExit={onExit}
      share={share}
      theme={theme}
    />
  )
}
