'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { AiStatusView } from '@/lib/types'

/** Cache de processo: o status da IA não muda durante a sessão. */
let cached: boolean | null = null

/**
 * A IA da copy está configurada no ambiente? Busca `GET /ai/status` uma vez
 * (cache de módulo) — os botões de IA só aparecem quando `true`. Erro/ausência
 * de chave → `false` (o linter passivo segue funcionando de qualquer jeito).
 */
export function useAiStatus(): boolean {
  const [configured, setConfigured] = useState(cached ?? false)

  useEffect(() => {
    if (cached !== null) return
    let alive = true
    apiGet<AiStatusView>('/api/marketing/ai/status')
      .then((res) => {
        cached = res.configured
        if (alive) setConfigured(res.configured)
      })
      .catch(() => {
        cached = false
      })
    return () => {
      alive = false
    }
  }, [])

  return configured
}
