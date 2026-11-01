'use client'

import '@sistemazero/studio/styles.css'
import {
  type DesafioAberto,
  ResultadoDaVerificacaoSchema,
} from '@sistemazero/arquipelago-contracts'
import { isStudioProArtifact } from '@sistemazero/core/studio'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import {
  createLocalPersistenceAdapter,
  type EditableStudioProject,
  STUDIO_PRO_BUILD_LIMITS,
  type StudioHandle,
  StudioLesson,
  type StudioPersistenceAdapter,
  StudioPortalContainerProvider,
  type StudioProRuntimeAdapter,
} from '@sistemazero/studio'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import { challengeDraftScope } from '../lib/arquipelago-challenge'
import { cn } from '../lib/cn'
import { createProToolchainPreparer } from '../lib/pro-toolchain'
import { sessionFetch } from '../lib/session-fetch'
import { useArquipelagoChallengeRuntime } from './studio/use-arquipelago-challenge-runtime'

type Prepared = { project: EditableStudioProject; adapter: StudioPersistenceAdapter }

/** A coluna da Missão recolhida no computador (preferência deste navegador). */
const CHAVE_MISSAO_RECOLHIDA = 'sz:arquipelago:missao-recolhida'
/** O balão de primeira vez já foi visto neste navegador. */
const CHAVE_BALAO_VISTO = 'sz:arquipelago:missao-balao-visto'

function lerMarca(chave: string): boolean {
  try {
    return window.localStorage.getItem(chave) === '1'
  } catch {
    return false
  }
}

function gravarMarca(chave: string, valor: boolean): void {
  try {
    if (valor) window.localStorage.setItem(chave, '1')
    else window.localStorage.removeItem(chave)
  } catch {
    // Sem armazenamento (janela privada): a escolha vale só até fechar.
  }
}

/** Estúdio de tarefa, sem produto livre e sem gabarito no navegador. */
export function ArquipelagoChallengeDialog({
  desafio,
  audience,
  onFinish,
}: {
  desafio: DesafioAberto
  audience: 'kids' | 'adult'
  onFinish: (completed: boolean) => void
}) {
  useBodyScrollLock(true)
  const hints = useMemo(
    () => desafio.dicas.map((text) => ({ id: crypto.randomUUID(), text })),
    [desafio.dicas],
  )
  // As dicas abrem uma por vez; quantas ela abriu vai com a conferência (A26, a medição).
  const [openHints, setOpenHints] = useState(0)
  const openHintsRef = useRef(0)
  openHintsRef.current = openHints
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [stale, setStale] = useState(false)
  const [results, setResults] = useState(desafio.ultimosResultados)
  const handle = useRef<StudioHandle | null>(null)
  const mounted = useRef(false)
  const operation = useRef<AbortController | null>(null)
  const editing = useRef(0)
  const completed = useRef(false)
  const locked = useRef(false)
  const unsubscribe = useRef<(() => void) | undefined>(undefined)
  const dialog = useRef<HTMLDialogElement | null>(null)
  const releaseOpening = useRef<(() => void) | undefined>(undefined)
  // O diálogo vira o contêiner dos menus do Studio depois do `showModal()` (fora dele, inertes).
  const [portalContainer, setPortalContainer] = useState<HTMLDialogElement | null>(null)
  const [missaoRecolhida, setMissaoRecolhida] = useState(() => lerMarca(CHAVE_MISSAO_RECOLHIDA))
  // No celular a Missão é a primeira aba; o Estúdio fica montado embaixo dela.
  const [aba, setAba] = useState<'missao' | 'estudio'>('missao')
  const [balao, setBalao] = useState(() => !lerMarca(CHAVE_BALAO_VISTO))

  useEffect(() => {
    mounted.current = true
    let active = true
    const element = dialog.current
    element?.showModal()
    // Os menus do Studio e os campos, as listas e o botão direito do Blockly abrem fora do
    // Estúdio: com o diálogo como contêiner dos portais, eles abrem dentro dele.
    setPortalContainer(element)
    const scope = challengeDraftScope(audience, desafio.jogadorId, desafio.id, desafio.revisao)
    const adapter = createLocalPersistenceAdapter({ namespace: scope.namespace })
    const release = adapter.beginOpening?.(scope.projectId)
    releaseOpening.current = release
    void (async () => {
      const saved = await adapter.load(scope.projectId)
      const project = saved ?? (await prepareProjectForHost(desafio.projetoInicial))
      if (!project)
        throw new Error('O projeto inicial deste desafio não é compatível com o Estúdio em blocos.')
      if (active) {
        setPrepared({ project: { ...project, id: scope.projectId, name: desafio.titulo }, adapter })
        setStale(desafio.ultimosResultados.length > 0)
      }
    })().catch((cause: unknown) => {
      if (active)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível abrir seu projeto. Seu rascunho foi mantido.',
        )
      release?.()
    })
    return () => {
      active = false
      mounted.current = false
      element?.close()
      operation.current?.abort()
      unsubscribe.current?.()
      release?.()
    }
  }, [audience, desafio])

  // C02b (30/10/2026): o Python ganha o ambiente pelo desafio (serviço do jogo e Members) e o Pro
  // compila no executor pela rota do desafio. Nenhum dos dois depende do Estúdio Completo.
  const project = prepared?.project ?? null
  const isPython = project?.programmingLanguage === 'python'
  const isPro = project?.kind === 'pro'
  const runtime = useArquipelagoChallengeRuntime({
    project,
    userId: desafio.jogadorId,
    audience,
    desafioId: desafio.id,
    revisao: desafio.revisao,
  })
  const proRuntime = useMemo<StudioProRuntimeAdapter | undefined>(() => {
    if (!isPro) return undefined
    const url = `/api/arquipelago/desafios/${encodeURIComponent(desafio.id)}/pro`
    return {
      limits: STUDIO_PRO_BUILD_LIMITS,
      prepareDependencies: createProToolchainPreparer(url, sessionFetch, {
        revisao: desafio.revisao,
      }),
      async build({ project, signal }) {
        const res = await sessionFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisao: desafio.revisao,
            project: {
              kind: 'pro',
              tree: project.tree,
              assets: project.assets,
              proMeta: project.proMeta,
            },
          }),
          signal,
        })
        const body = (await res.json().catch(() => null)) as {
          artifact?: unknown
          output?: string
          durationMs?: number
          error?: { message?: string; output?: string }
        } | null
        if (!res.ok || !body || !isStudioProArtifact(body.artifact)) {
          const error = new Error(
            body?.error?.message ?? 'Não foi possível compilar o projeto.',
          ) as Error & { output?: string }
          if (body?.error?.output) error.output = body.error.output
          throw error
        }
        return { artifact: body.artifact, output: body.output, durationMs: body.durationMs }
      },
    }
  }, [isPro, desafio.id, desafio.revisao])
  const pythonWaiting = isPython && !runtime.environment

  async function verify() {
    if (locked.current || !handle.current || !ready) return
    locked.current = true
    setBusy(true)
    setError('')
    const controller = new AbortController()
    operation.current = controller
    try {
      await handle.current.save()
      const project = handle.current.getProject()
      if (!project) throw new Error('Aguarde o Estúdio carregar.')
      const version = editing.current
      const raw = await apiSend(
        `/api/arquipelago/desafios/${desafio.id}/verificar`,
        'POST',
        { revisao: desafio.revisao, projeto: project, dicas: openHintsRef.current },
        undefined,
        { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(170_000)]) },
      )
      const result = ResultadoDaVerificacaoSchema.parse(raw)
      if (!mounted.current) return
      setResults(result.resultados)
      setStale(version !== editing.current)
      completed.current ||= result.passou
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível verificar agora. Seu projeto continua guardado; tente novamente.',
        )
    } finally {
      locked.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function finish() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      await handle.current?.save()
      if (mounted.current) onFinish(completed.current)
    } catch {
      if (mounted.current) setError('Não consegui guardar seu rascunho. Tente voltar novamente.')
    } finally {
      locked.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const required = desafio.objetivos.filter((o) => !o.optional)
  const passed = required.filter((o) => results.some((r) => r.id === o.id && r.passou)).length
  const recolher = (valor: boolean) => {
    setMissaoRecolhida(valor)
    gravarMarca(CHAVE_MISSAO_RECOLHIDA, valor)
  }
  const fecharBalao = () => {
    setBalao(false)
    gravarMarca(CHAVE_BALAO_VISTO, true)
  }
  return (
    <dialog
      ref={dialog}
      aria-label={desafio.titulo}
      className="fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col bg-background p-0 text-foreground backdrop:bg-black/60"
      onCancel={(event) => {
        event.preventDefault()
        void finish()
      }}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <Button variant="outline" disabled={busy} onClick={() => void finish()}>
          Voltar ao jogo
        </Button>
        <h1 className="min-w-0 flex-1 font-semibold">{desafio.titulo}</h1>
        <span className="text-sm text-muted-foreground">Rascunho guardado neste navegador</span>
      </header>
      <div role="group" aria-label="Mostrar" className="flex border-b border-border lg:hidden">
        {(
          [
            ['missao', 'Missão'],
            ['estudio', 'Estúdio'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            aria-pressed={aba === id}
            aria-controls={id === 'missao' ? 'arq-missao' : 'arq-estudio'}
            className={cn(
              'min-h-11 flex-1 border-b-2 px-3 text-sm font-semibold',
              aba === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground',
            )}
            onClick={() => setAba(id)}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="relative flex min-h-0 flex-1">
        <aside
          id="arq-missao"
          aria-labelledby="arq-missao-titulo"
          className={cn(
            'absolute inset-0 z-10 flex-col gap-4 overflow-y-auto bg-card p-4 lg:static lg:z-auto lg:w-72 lg:shrink-0 lg:border-r lg:border-border 2xl:w-80',
            aba === 'missao' ? 'flex' : 'hidden',
            missaoRecolhida ? 'lg:hidden' : 'lg:flex',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="arq-missao-titulo" className="text-lg font-bold">
              Missão
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              aria-expanded={true}
              aria-controls="arq-missao"
              onClick={() => recolher(true)}
            >
              Recolher
            </Button>
          </div>
          {balao && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm"
            >
              {audience === 'kids' && (
                <img
                  src={BUILTIN_ART.happy.poster.url}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0"
                />
              )}
              <div className="flex flex-col gap-2">
                <p>Aqui está o pedido. Monte o projeto e clique em Verificar projeto.</p>
                <Button variant="outline" size="sm" className="self-start" onClick={fecharBalao}>
                  Entendi
                </Button>
              </div>
            </div>
          )}
          <section aria-labelledby="arq-pedido" className="flex flex-col gap-1">
            <h3 id="arq-pedido" className="text-sm font-semibold text-muted-foreground">
              O pedido
            </h3>
            <p className="whitespace-pre-wrap">{desafio.enunciado}</p>
          </section>
          {desafio.imagem && (
            <figure className="flex flex-col gap-1">
              <figcaption className="text-sm font-semibold text-muted-foreground">
                Como fica
              </figcaption>
              <img
                src={desafio.imagem}
                alt="O jogo pronto, do jeito que o pedido descreve."
                className="w-full rounded-lg border border-border"
              />
            </figure>
          )}
          <section aria-labelledby="arq-objetivos" className="flex flex-col gap-2">
            <h3 id="arq-objetivos" className="text-sm font-semibold text-muted-foreground">
              Objetivos · {passed}/{required.length}
            </h3>
            <ul className="flex flex-col gap-2">
              {desafio.objetivos.map((o) => {
                const resultado = results.find((r) => r.id === o.id)
                return (
                  <li
                    key={o.id}
                    className="flex gap-2 text-sm"
                    data-feito={resultado?.passou ? '' : undefined}
                  >
                    <span
                      aria-hidden="true"
                      className={resultado?.passou ? 'text-green-600' : 'text-muted-foreground'}
                    >
                      {resultado?.passou ? '✓' : '○'}
                    </span>
                    <span>
                      <span className="sr-only">{resultado?.passou ? 'Feito: ' : 'Falta: '}</span>
                      {o.label}
                      {o.optional ? ' (extra)' : ''}
                      {/* A dica do objetivo só depois de verificar e faltar, como nas aulas. */}
                      {o.hint && resultado && !resultado.passou && (
                        <span className="mt-1 block text-muted-foreground">{o.hint}</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
          {desafio.desafioExtra && (
            <p className="text-sm">
              <strong>{desafio.desafioExtra.titulo}: </strong>
              {desafio.desafioExtra.texto}
            </p>
          )}
          {hints.length > 0 && (
            <section aria-label="Dicas" className="flex flex-col gap-2">
              {hints.slice(0, openHints).map((d) => (
                <p key={d.id} className="text-sm">
                  {d.text}
                </p>
              ))}
              {openHints < hints.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setOpenHints((n) => Math.min(n + 1, hints.length))}
                >
                  {openHints === 0 ? 'Ver uma dica' : 'Ver outra dica'}
                </Button>
              ) : null}
            </section>
          )}
        </aside>
        {missaoRecolhida && (
          <button
            type="button"
            aria-expanded={false}
            aria-controls="arq-missao"
            className="hidden w-11 shrink-0 items-start justify-center border-r border-border bg-card pt-4 text-sm font-semibold lg:flex"
            onClick={() => recolher(false)}
          >
            <span className="[writing-mode:vertical-rl]">Mostrar a missão</span>
          </button>
        )}
        <div id="arq-estudio" className="min-h-0 min-w-0 flex-1">
          <StudioPortalContainerProvider value={portalContainer}>
            {prepared && pythonWaiting ? (
              <div role="status" className="flex flex-col items-start gap-3 p-6">
                <span>{runtime.error ?? 'Preparando o ambiente Python…'}</span>
                {runtime.error && (
                  <Button variant="outline" onClick={runtime.retry}>
                    Tentar de novo
                  </Button>
                )}
              </div>
            ) : prepared ? (
              <StudioLesson
                ref={handle}
                initialProject={prepared.project}
                persistence={prepared.adapter}
                initialMode={
                  isPro ? 'code' : prepared.project.mode === 'bridge' ? 'bridge' : 'blocks'
                }
                allowedModes={isPro ? ['code'] : ['blocks', 'bridge']}
                level="avancado-3d"
                // A régua de blocos do jogo é a paleta do JavaScript; Python e Pro abrem pela ilha.
                grantedBlockIds={
                  isPython || isPro ? undefined : (desafio.blocosPermitidos ?? undefined)
                }
                pythonLevel={isPython ? 3 : undefined}
                features={{ extensions: false, professional: isPro }}
                proRuntime={proRuntime}
                runtimeEnvironment={runtime.environment}
                onReady={() => {
                  releaseOpening.current?.()
                  releaseOpening.current = undefined
                  setReady(true)
                  unsubscribe.current?.()
                  unsubscribe.current = handle.current?.onProjectChange?.(() => {
                    editing.current++
                    setStale(true)
                  })
                }}
                onError={(e) => {
                  releaseOpening.current?.()
                  setError(e.message)
                }}
                style={{ height: '100%' }}
              />
            ) : (
              <p role="status" className="p-6">
                {error ? 'Não foi possível abrir o Estúdio.' : 'Abrindo o Estúdio…'}
              </p>
            )}
          </StudioPortalContainerProvider>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-medium">
            Objetivos do projeto · {passed}/{required.length}
          </span>
          {stale && (
            <span role="status" className="text-sm text-muted-foreground">
              O projeto mudou. Verifique novamente para conferir esta versão.
            </span>
          )}
        </div>
        <Button disabled={busy || !ready || pythonWaiting} onClick={() => void verify()}>
          {busy ? 'Aguarde…' : 'Verificar projeto'}
        </Button>
      </footer>
    </dialog>
  )
}
