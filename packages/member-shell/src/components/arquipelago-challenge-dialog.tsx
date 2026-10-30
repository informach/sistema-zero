'use client'

import '@sistemazero/studio/styles.css'
import {
  type DesafioAberto,
  ResultadoDaVerificacaoSchema,
} from '@sistemazero/arquipelago-contracts'
import {
  createLocalPersistenceAdapter,
  type EditableStudioProject,
  type StudioHandle,
  StudioLesson,
  type StudioPersistenceAdapter,
} from '@sistemazero/studio'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import { challengeDraftScope } from '../lib/arquipelago-challenge'

type Prepared = { project: EditableStudioProject; adapter: StudioPersistenceAdapter }

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

  useEffect(() => {
    mounted.current = true
    let active = true
    const element = dialog.current
    element?.showModal()
    const scope = challengeDraftScope(audience, desafio.jogadorId, desafio.id, desafio.revisao)
    const adapter = createLocalPersistenceAdapter({ namespace: scope.namespace })
    const release = adapter.beginOpening?.(scope.projectId)
    releaseOpening.current = release
    void (async () => {
      const saved = await adapter.load(scope.projectId)
      const project = saved ?? (await prepareProjectForHost(desafio.projetoInicial))
      if (!project)
        throw new Error('O projeto inicial deste desafio não é compatível com o Estúdio em blocos.')
      // C02 (30/10/2026): o Members já confere Python e Pro, mas o Python precisa de um contexto
      // de runtime que só existe em aulas e salas, e o Pro de um build. Até isso existir aqui,
      // esses desafios não abrem no jogo (e ficam fora da publicação).
      if (project.programmingLanguage === 'python' || project.kind === 'pro')
        throw new Error(
          'Este desafio usa Python ou o Pro, que ainda não abrem dentro do jogo. Seu progresso continua igual.',
        )
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
        { revisao: desafio.revisao, projeto: project },
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
      <details className="max-h-[30vh] overflow-y-auto border-b border-border p-3">
        <summary className="cursor-pointer font-medium">O desafio e as dicas</summary>
        <p className="mt-2 whitespace-pre-wrap">{desafio.enunciado}</p>
        {hints.map((d) => (
          <p key={d.id} className="mt-2 text-sm">
            {d.text}
          </p>
        ))}
        {desafio.desafioExtra && (
          <p className="mt-2 text-sm">
            <strong>{desafio.desafioExtra.titulo}: </strong>
            {desafio.desafioExtra.texto}
          </p>
        )}
      </details>
      {error && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">
        {prepared ? (
          <StudioLesson
            ref={handle}
            initialProject={prepared.project}
            persistence={prepared.adapter}
            initialMode={prepared.project.mode === 'bridge' ? 'bridge' : 'blocks'}
            allowedModes={['blocks', 'bridge']}
            level="avancado-3d"
            grantedBlockIds={desafio.blocosPermitidos ?? undefined}
            features={{ extensions: false }}
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
      </div>
      <footer className="max-h-[30vh] overflow-y-auto border-t border-border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium">
            Objetivos do projeto · {passed}/{required.length}
          </span>
          <Button disabled={busy || !ready} onClick={() => void verify()}>
            {busy ? 'Aguarde…' : 'Verificar projeto'}
          </Button>
        </div>
        {stale && (
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            O projeto mudou. Verifique novamente para conferir esta versão.
          </p>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-sm">Ver objetivos</summary>
          <ul className="mt-2 space-y-2">
            {desafio.objetivos.map((o) => (
              <li key={o.id} className="text-sm">
                {results.find((r) => r.id === o.id)?.passou ? '✓ ' : '○ '}
                {o.label}
                {o.optional ? ' (extra)' : ''}
                {o.hint && <p className="text-muted-foreground">{o.hint}</p>}
              </li>
            ))}
          </ul>
        </details>
      </footer>
    </dialog>
  )
}
