'use client'

import { createProToolchainPreparer } from '../../lib/pro-toolchain'
import { sessionFetch } from '../../lib/session-fetch'
import { authorizeJavaScriptCreation } from '../../lib/studio-javascript-creation'
import '@sistemazero/studio/styles.css'
import type {
  EditableStudioProject as Project,
  StudioEditorProps,
  StudioMoldaLibraryAdapter,
  StudioPersistenceAdapter,
  StudioPintaLibraryAdapter,
  StudioTaskSession,
  StudioTeamLibraryAdapter,
  StudioTheme,
  StudioTutorConfig,
} from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { useEffect, useMemo, useState } from 'react'
import {
  assertPensaJavaScriptProject,
  PensaProjectLanguageRefused,
} from '../../lib/pensa-studio-link'
import {
  loadPreparedStudioProProject,
  loadStudioProModule,
  type StudioProModule,
} from './studio-pro-loader'
import { useFreeStudioRuntime } from './use-free-runtime'

interface Props {
  audience?: 'kids' | 'adult'
  /** Identidade real do perfil/conta, usada nas autorizações de execução. */
  viewerId: string | null
  /** Chave local do host; adulto usa adult:<id>, separada da identidade autenticada. */
  storageNamespace?: string
  /** Id do projeto PRO a abrir (persistido local no namespace do viewer). */
  projectId: string
  /** Tema fixado pelo app (segue a comunidade). */
  theme: StudioTheme
  /** Volta para o destino definido pelo host (lista ou plano do Pensa). */
  onExit: () => void
  /** Tutor opcional do host. Ausente em aulas e hosts que não contrataram o recurso. */
  tutor?: StudioTutorConfig
  share?: StudioEditorProps['share']
  onChange?: StudioEditorProps['onChange']
  onError?: StudioEditorProps['onError']
  prepareProject?: () => Promise<void>
  pintaLibrary?: StudioPintaLibraryAdapter
  moldaLibrary?: StudioMoldaLibraryAdapter
  taskSession?: StudioTaskSession
  teamLibrary?: StudioTeamLibraryAdapter
  onEditDrawing?: (id: string, tab?: Window | null) => void
  onEditCreation?: (id: string) => void
  runtimeEnvironment?: StudioEditorProps['runtimeEnvironment']
  proRuntime?: StudioEditorProps['proRuntime']
  /** Kids Complete Studio. Contextual lesson/live hosts supply their own authority. */
  freeRuntime?: boolean
}

type Loaded =
  | { kind: 'loading' }
  | { kind: 'load-error' }
  | { kind: 'unsupported' }
  | {
      kind: 'ready'
      project: Project
      opening: {
        release: () => void
        persistence: StudioPersistenceAdapter
      }
    }
  | { kind: 'invalid' }
  | { kind: 'pensa-refused'; message: string }

/**
 * Editor do modo CÓDIGO (projeto PRO / WebContainer) do Estúdio Completo. Vive no
 * member-shell para o adulto reaproveitar quando o Estúdio Completo virar produto
 * dele (hoje só o kids monta, na rota isolada `/estudio/pro/[id]` — a única com
 * COOP/COEP; ver o next.config do app). Carrega SÓ no client (Monaco/WebContainer
 * não existem no SSR): o import dinâmico roda num effect.
 *
 * Gate de capacidade ANTES de montar o editor pesado: sem `canRunProMode()`
 * (host não isolado / navegador incompatível) mostra um recado gentil. Projeto
 * inexistente ou clássico (`kind !== 'pro'`) oferece retorno e nova tentativa.
 */
export function StudioProEditor(props: Props) {
  // A profile switch must unmount the previous document before any effect can
  // change its namespace; waiting for useEffect leaves one render of old data.
  return (
    <StudioProEditorSession
      key={JSON.stringify([
        props.viewerId,
        props.audience ?? 'kids',
        props.storageNamespace ?? props.viewerId,
        props.projectId,
      ])}
      {...props}
    />
  )
}

function StudioProEditorSession({
  viewerId,
  audience = 'kids',
  storageNamespace = viewerId ?? '',
  projectId,
  theme,
  onExit,
  tutor,
  share,
  onChange,
  onError,
  prepareProject,
  pintaLibrary,
  moldaLibrary,
  taskSession,
  teamLibrary,
  onEditDrawing,
  onEditCreation,
  runtimeEnvironment,
  proRuntime,
  freeRuntime = false,
}: Props) {
  const prepareDependencies = useMemo(
    () =>
      freeRuntime
        ? createProToolchainPreparer('/api/studio/pro-runtime/dependencies', sessionFetch)
        : undefined,
    [freeRuntime],
  )
  const [mod, setMod] = useState<StudioProModule | null>(null)
  const [state, setState] = useState<Loaded>({ kind: 'loading' })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const free = useFreeStudioRuntime({
    project: state.kind === 'ready' ? state.project : null,
    viewerId,
    audience,
    enabled: freeRuntime && !runtimeEnvironment && !taskSession,
  })

  useEffect(() => {
    let active = true
    const lifetime = new AbortController()
    let opening: Extract<Loaded, { kind: 'ready' }>['opening'] | undefined
    let retained = false
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
      // Mesmo namespace por viewer do Estúdio Completo clássico — o projeto PRO
      // foi criado lá e persistido no IndexedDB deste perfil/conta.
      const project = await loadPreparedStudioProProject({
        module: m,
        namespace: storageNamespace,
        projectId,
        prepare: prepareProject,
        authorize: freeRuntime
          ? async (loaded, signal) => {
              if (loaded.kind === 'pro' && loaded.programmingLanguage !== 'python')
                await authorizeJavaScriptCreation('pro', signal)
            }
          : undefined,
        active: () => active,
        signal: lifetime.signal,
        onOpening: (owner) => {
          opening = owner
        },
      })
      if (!active) return
      // A rota PRO é só para projetos PRO: um id ausente ou um projeto CLÁSSICO
      // (que roda Blocos+Ponte na /estudio, sem COEP) não abre aqui.
      if (project?.kind !== 'pro') {
        setState({ kind: 'invalid' })
        return
      }
      assertPensaJavaScriptProject(project)
      if (project.programmingLanguage !== 'python' && !proRuntime && !m.canRunProMode()) {
        setState({ kind: 'unsupported' })
        return
      }
      if (!opening) throw new Error('A abertura do projeto não foi iniciada.')
      retained = true
      setState({ kind: 'ready', project, opening })
    })()
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof PensaProjectLanguageRefused) {
          setState({ kind: 'pensa-refused', message: error.message })
          return
        }
        console.error('Não foi possível abrir o projeto Pro.', error)
        setState({ kind: 'load-error' })
      })
      .finally(() => {
        if (!retained) opening?.release()
      })
    return () => {
      active = false
      lifetime.abort()
      opening?.release()
    }
  }, [storageNamespace, projectId, loadAttempt, prepareProject, proRuntime, freeRuntime])

  if (state.kind === 'pensa-refused') {
    return (
      <div role="alert" className="grid h-full place-content-center gap-3 p-6 text-center">
        <p>{state.message}</p>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Voltar
        </Button>
      </div>
    )
  }
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
          Voltar
        </Button>
      </div>
    )
  }

  if (state.kind === 'load-error' || state.kind === 'invalid') {
    return (
      <div
        data-sz-theme={theme}
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center"
      >
        <h2 className="sz-display text-lg">Não consegui carregar o modo Código</h2>
        <p className="max-w-md text-muted-foreground text-sm">
          {state.kind === 'invalid'
            ? 'Este projeto Pro não está disponível neste perfil. Confira a conexão para buscar seus projetos ou volte ao Estúdio.'
            : 'Verifique sua conexão e tente novamente. Se continuar, volte ao Estúdio e abra o projeto de novo.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLoadAttempt((value) => value + 1)}>
            Tentar novamente
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            Voltar
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
    <div className="flex h-full min-h-0 flex-col">
      {state.project.programmingLanguage === 'python' && (free.loading || free.error) && (
        <div
          role={free.error ? 'alert' : 'status'}
          className="flex items-center gap-2 px-3 py-2 text-sm"
        >
          {free.error ?? 'Preparando Python…'}
          {free.error && (
            <button type="button" onClick={free.retry}>
              Tentar novamente
            </button>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <StudioEditor
          initialProject={state.project}
          persistence={state.opening.persistence}
          onProjectOpeningSettled={state.opening.release}
          theme={theme}
          features={{ professional: true }}
          tutor={tutor}
          share={share}
          onChange={onChange}
          onError={onError}
          pintaLibrary={pintaLibrary}
          moldaLibrary={moldaLibrary}
          taskSession={taskSession}
          teamLibrary={teamLibrary}
          onEditDrawing={onEditDrawing}
          onEditCreation={onEditCreation}
          runtimeEnvironment={runtimeEnvironment ?? free.environment}
          prepareProDependencies={prepareDependencies}
          proRuntime={state.project.programmingLanguage === 'python' ? undefined : proRuntime}
          pythonLevel={
            state.project.programmingLanguage === 'python' && freeRuntime ? 3 : undefined
          }
          allowedModes={state.project.programmingLanguage === 'python' ? ['code'] : undefined}
          onExit={onExit}
        />
      </div>
    </div>
  )
}
