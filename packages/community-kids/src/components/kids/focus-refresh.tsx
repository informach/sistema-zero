'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Re-sincroniza os dados do servidor (ranking, nível, XP, foguinho) quando a criança
 * VOLTA para esta tela — troca de aba, volta do segundo plano, foca a janela. O placar
 * depende do XP de OUTRAS crianças, então uma tela parada não muda sozinha; ao voltar,
 * `router.refresh()` rebusca os Server Components (o número do ranking já é calculado
 * ao vivo no servidor). Com THROTTLE (mín. ~30s entre refreshes) para não consultar à
 * toa quem alterna muito. Montar SÓ nas telas que mostram ranking (perfil/home). Sem UI.
 */
export function FocusRefresh({ minIntervalMs = 30_000 }: { minIntervalMs?: number }) {
  const router = useRouter()
  const lastRef = useRef(0)

  useEffect(() => {
    const maybeRefresh = () => {
      const now = Date.now()
      if (now - lastRef.current < minIntervalMs) return
      lastRef.current = now
      router.refresh()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') maybeRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', maybeRefresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', maybeRefresh)
    }
  }, [router, minIntervalMs])

  return null
}
