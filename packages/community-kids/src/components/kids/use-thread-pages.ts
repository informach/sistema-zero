'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api'
import type { HubPage, HubThreadView } from '@/lib/types'
import { type MuralSort, sortQuery } from './mural-sort'

const enc = encodeURIComponent

/**
 * A lista de tópicos de um canal (o Clube e o Mural) e as páginas dela, por cursor.
 *
 * O cursor do hub carrega a ORDEM do filtro do Mural, então trocar de filtro (ou de canal) é
 * recomeçar a lista, nunca continuar a de antes. Cada recomeço abre uma VEZ nova, e uma página
 * pedida na vez anterior que chega depois é descartada (full review de 11/09/2026). Antes, um
 * "Carregar mais" em voo na ordem antiga resolvia depois da troca de filtro e misturava as duas
 * listas; e, até a primeira página nova chegar, o botão seguia na tela com o cursor antigo, que o
 * hub recusa na ordem nova.
 */
export function useThreadPages(channelId: string | null, sort: MuralSort) {
  const [threads, setThreads] = useState<HubThreadView[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const turn = useRef(0)

  /** Recomeça a lista e devolve a vez desta carga. Sem cursor, some o "Carregar mais". */
  const restart = useCallback(() => {
    turn.current += 1
    setCursor(null)
    setHasMore(false)
    setLoadingMore(false)
    return turn.current
  }, [])

  /** A carga ainda é a da vez? Um recomeço depois dela a aposenta. */
  const isTurn = useCallback((t: number) => t === turn.current, [])

  const showFirstPage = useCallback((page: HubPage<HubThreadView>) => {
    setThreads(page.items)
    setCursor(page.nextCursor)
    setHasMore(page.hasMore)
  }, [])

  const loadMore = useCallback(async () => {
    if (!channelId || !cursor || loadingMore) return
    const t = turn.current
    setLoadingMore(true)
    try {
      const page = await apiGet<HubPage<HubThreadView>>(
        `/api/hub/channels/${enc(channelId)}/threads?cursor=${enc(cursor)}${sortQuery(sort, '&')}`,
      )
      if (t !== turn.current) return
      setThreads((prev) => [...prev, ...page.items])
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      // A mensagem do hub (um cursor recusado, por exemplo) não é para criança.
      if (t === turn.current) toast.error('Não consegui trazer mais agora. Tente de novo!')
    } finally {
      if (t === turn.current) setLoadingMore(false)
    }
  }, [channelId, cursor, loadingMore, sort])

  return { threads, hasMore, loadingMore, restart, isTurn, showFirstPage, loadMore }
}
