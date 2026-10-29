'use client'
import '@sistemazero/studio/styles.css'
import { MinijogoAbertoSchema } from '@sistemazero/arquipelago-contracts'
import { StudioProjectPlayer } from '@sistemazero/studio/player'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'
import { useBodyScrollLock } from '@sistemazero/ui/scroll-lock'
import { useEffect, useRef, useState } from 'react'
import { sessionFetch } from '../lib/session-fetch'

/** Mesmo player isolado do Estúdio, sem editor ou gravação do projeto aprovado. */
export function ArquipelagoMinijogoPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [dados, setDados] = useState<{
    titulo: string
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
        if (!controle.signal.aborted) setDados({ titulo: d.titulo, projeto })
      } catch {
        if (!controle.signal.aborted) setErro(true)
      }
    })()
    return () => controle.abort()
  }, [url, rodada])
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
            onError={() => setErro(true)}
          />
        </div>
      ) : (
        <p role="status">Preparando o jogo.</p>
      )}
    </dialog>
  )
}
