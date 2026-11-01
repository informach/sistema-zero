'use client'
import '@sistemazero/studio/styles.css'
import { MinijogoAbertoSchema } from '@sistemazero/arquipelago-contracts'
import type { StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import type { PythonProjectDocument } from '@sistemazero/studio'
import { StudioProjectPlayer } from '@sistemazero/studio/player'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import { sessionFetch } from '../lib/session-fetch'

/**
 * Mesmo player isolado do Estúdio, sem editor ou gravação do projeto aprovado. O minijogo em
 * Python (o quadro 6 do Recife e do Pico, lacunas de 01/11/2026) roda no ambiente do próprio
 * desafio: o serviço do jogo confere que a pessoa o concluiu e o Members, que o projeto é do
 * ambiente do desafio. Só execução; nada de editar, exportar ou terminal.
 */
export function ArquipelagoMinijogoPlayer({
  url,
  onClose,
  userId,
  audience,
  environmentUrl,
}: {
  url: string
  onClose: () => void
  userId: string
  audience: 'kids' | 'adult'
  /** The family preview uses its own authenticated, profile-scoped authorization route. */
  environmentUrl?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [dados, setDados] = useState<{
    titulo: string
    desafioId: string
    revisao?: number
    projeto: NonNullable<Awaited<ReturnType<typeof prepareProjectForHost>>>
  } | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  useBodyScrollLock(true)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    return () => {
      if (anterior?.isConnected) anterior.focus()
    }
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: Jogar de novo também repete uma leitura que falhou.
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void (async () => {
      try {
        const r = await sessionFetch(url, { cache: 'no-store', signal: controle.signal })
        if (!r.ok) throw new Error('indisponivel')
        const d = MinijogoAbertoSchema.parse(await r.json())
        const projeto = await prepareProjectForHost(d.projeto)
        if (!projeto) throw new Error('projeto-invalido')
        if (!controle.signal.aborted)
          setDados({ titulo: d.titulo, desafioId: d.desafioId, revisao: d.revisao, projeto })
      } catch {
        if (!controle.signal.aborted) setErro(true)
      }
    })()
    return () => controle.abort()
  }, [url, rodada])
  const desafioId = dados?.desafioId
  const revisao = dados?.revisao
  const ambientePython = useMemo(() => {
    if (!desafioId || !revisao) return undefined
    return (project: PythonProjectDocument, signal: AbortSignal) =>
      import('@sistemazero/studio/challenge-runtime').then(
        ({ createArquipelagoChallengeRuntimeEnvironment }) =>
          createArquipelagoChallengeRuntimeEnvironment({
            project,
            userId,
            context: { audience, desafioId, revisao, projectId: project.id },
            signal,
            request: (pedido, sinal) =>
              apiSend(
                environmentUrl ??
                  `/api/arquipelago/desafios/${encodeURIComponent(desafioId)}/ambiente`,
                'POST',
                { revisao, pedido },
                undefined,
                { signal: AbortSignal.any([sinal, AbortSignal.timeout(15_000)]) },
              ),
          }),
      )
  }, [desafioId, revisao, userId, audience, environmentUrl])
  // O minijogo Pro (o quadro 6 das Nuvens e o Farol no Pro, lacunas de 01/11/2026): compila pela
  // rota Pro do desafio, com a sessão de quem joga, e toca o artefato isolado. Na prévia da família
  // (`environmentUrl`) não: a sessão do responsável não abre a rota de desafio da criança.
  const proBuild = useMemo(() => {
    if (!desafioId || !revisao || environmentUrl) return undefined
    return async (
      project: { kind?: unknown; tree?: unknown; assets?: unknown; proMeta?: unknown },
      signal: AbortSignal,
    ) => {
      const r = await sessionFetch(
        `/api/arquipelago/desafios/${encodeURIComponent(desafioId)}/pro`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisao,
            project: {
              kind: 'pro',
              tree: project.tree,
              assets: project.assets,
              proMeta: project.proMeta,
            },
          }),
          signal,
        },
      )
      const corpo = (await r.json().catch(() => null)) as {
        artifact?: unknown
        error?: { message?: string }
      } | null
      if (!r.ok || !corpo?.artifact)
        throw new Error(corpo?.error?.message ?? 'Não foi possível abrir o jogo agora.')
      return corpo.artifact as StudioProArtifact
    }
  }, [desafioId, revisao, environmentUrl])
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-label={dados?.titulo ?? 'Minijogo'}
      className="fixed inset-0 m-auto flex h-[92dvh] max-h-none w-[96vw] max-w-6xl flex-col gap-3 rounded-2xl border border-border bg-background p-3 text-foreground backdrop:bg-black/70"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{dados?.titulo ?? 'Abrindo minijogo'}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="sz-btn-gradient min-h-11 px-4"
            onClick={() => {
              setErro(false)
              setRodada((v) => v + 1)
            }}
          >
            Jogar de novo
          </button>
          <button type="button" className="min-h-11 rounded-xl border px-4" onClick={onClose}>
            Voltar
          </button>
        </div>
      </header>
      {erro ? (
        <p role="alert">O minijogo não abriu agora. Volte e tente novamente.</p>
      ) : dados ? (
        <div className="min-h-0 flex-1">
          <StudioProjectPlayer
            key={rodada}
            project={dados.projeto}
            title={dados.titulo}
            pythonRuntimeEnvironment={ambientePython}
            proBuild={proBuild}
            onError={() => setErro(true)}
          />
        </div>
      ) : (
        <p role="status">Preparando o jogo.</p>
      )}
    </dialog>
  )
}
