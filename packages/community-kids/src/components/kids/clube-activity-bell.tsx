'use client'

import { Bell } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { HubMyThreadView } from '@/lib/types'

/** Baseline por PERFIL: threadId → commentCount visto por último (padrão do level-up-watcher). */
function storageKey(viewerId: string): string {
  return `sz:kids:clube:seen:${viewerId}`
}

function readBaseline(viewerId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(storageKey(viewerId))
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function writeBaseline(viewerId: string, map: Record<string, number>): void {
  try {
    localStorage.setItem(storageKey(viewerId), JSON.stringify(map))
  } catch {
    // best-effort (modo privado): sem baseline, o sino só não persiste o "visto".
  }
}

/**
 * Sino "novas respostas nas suas conversas": busca os tópicos do PRÓPRIO aluno
 * (`/api/hub/my-threads`) e compara o `commentCount` atual com um baseline em
 * `localStorage` (por perfil). Conversa que cresceu → aparece na lista + pontinho no sino.
 * Abrir a lista marca tudo como visto (atualiza o baseline). É o "motivo de voltar" ao
 * Clube — leve, sem tabela de notificação, sem expor autor de terceiros (só as próprias).
 */
export function ClubeActivityBell({
  viewerId,
  channelIds,
  onOpenThread,
}: {
  viewerId: string
  /**
   * Canais do servidor ATUAL (Clube). O `/my-threads` traz as conversas do aluno de
   * TODOS os servidores (o mesmo endpoint alimenta o picker "Mostrar meu jogo", que
   * precisa dos jogos do Mural) — então o sino filtra por estes canais p/ mostrar SÓ
   * o que é deste servidor. Sem isso, um post do Mural aparecia no sino do Clube.
   */
  channelIds: string[]
  /** Abre a conversa clicada (o pai busca o tópico por id e mostra a `ThreadDetail`). */
  onOpenThread: (id: string) => void
}) {
  const [allThreads, setAllThreads] = useState<HubMyThreadView[]>([])
  const [fresh, setFresh] = useState<HubMyThreadView[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!viewerId) return
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet<{ items: HubMyThreadView[] }>('/api/hub/my-threads')
        if (alive) setAllThreads(res.items)
      } catch {
        // best-effort — sem sino se o hub soluçar.
      }
    })()
    return () => {
      alive = false
    }
  }, [viewerId])

  // Só as conversas DESTE servidor (o /my-threads vem de todos).
  const channelSet = useMemo(() => new Set(channelIds), [channelIds])
  const threads = useMemo(
    () => allThreads.filter((t) => channelSet.has(t.channelId)),
    [allThreads, channelSet],
  )

  // "Novas respostas" = cresceu desde o último visto (baseline por perfil).
  useEffect(() => {
    const baseline = readBaseline(viewerId)
    setFresh(threads.filter((t) => t.commentCount > (baseline[t.id] ?? 0)))
  }, [threads, viewerId])

  const markSeen = useCallback(() => {
    // Mescla no baseline existente (não apaga o de outros servidores).
    const baseline = readBaseline(viewerId)
    for (const t of threads) baseline[t.id] = t.commentCount
    writeBaseline(viewerId, baseline)
    setFresh([])
  }, [threads, viewerId])

  const toggle = () => {
    setOpen((v) => {
      const next = !v
      if (next && fresh.length > 0) markSeen()
      return next
    })
  }

  // Sem nada novo E sem histórico → não renderiza (não polui o cabeçalho).
  if (threads.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={fresh.length > 0 ? `${fresh.length} novas respostas` : 'Suas conversas'}
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card transition-colors hover:border-primary"
      >
        <Bell className="size-4" />
        {fresh.length > 0 ? (
          <span className="-right-0.5 -top-0.5 absolute grid size-4 place-items-center rounded-full bg-primary font-bold text-[10px] text-primary-foreground">
            {fresh.length > 9 ? '9+' : fresh.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border-2 border-border bg-card p-2 shadow-[0_4px_0_var(--border)]">
          <p className="px-2 py-1 font-bold text-muted-foreground text-xs">
            {fresh.length > 0 ? 'Novas respostas 💬' : 'Suas conversas'}
          </p>
          <ul className="flex flex-col">
            {(fresh.length > 0 ? fresh : threads).slice(0, 6).map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenThread(t.id)
                    setOpen(false)
                  }}
                  className="block w-full truncate rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
