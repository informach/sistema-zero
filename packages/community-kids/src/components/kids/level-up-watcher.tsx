'use client'

import { useEffect, useState } from 'react'
import { isLevelUp } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'
import { LevelUpCelebration } from './level-up-celebration'

/**
 * Detecta SUBIDA DE NÍVEL comparando o nível atual (vindo do servidor) com o ÚLTIMO
 * visto (localStorage por PERFIL). Dispara a comemoração UMA vez, seja qual for a ação
 * que fez subir (publicar no Mural OU concluir um curso já publicado). Robusto à
 * assincronia do webhook hub→members: o nível certo chega na próxima carga/refresh e
 * a comparação acende a festa.
 *
 * Persiste por PERFIL (`profileKey`) — irmãos no mesmo navegador não herdam o nível um
 * do outro. NÃO comemora na 1ª vez (sem valor salvo = só registra), nem em queda
 * (defensivo — o nível nunca regride no backend).
 */
export function LevelUpWatcher({
  levelSlug,
  profileKey,
}: {
  levelSlug?: string
  profileKey: string
}) {
  const [celebrate, setCelebrate] = useState<StudentLevelSlug | null>(null)

  useEffect(() => {
    if (!levelSlug) return
    const key = `sz:kids:level:${profileKey}`
    let seen: string | null = null
    try {
      seen = localStorage.getItem(key)
    } catch {
      // localStorage indisponível (modo privado/quota) → sem detecção, sem crash.
      return
    }
    if (isLevelUp(seen, levelSlug)) setCelebrate(levelSlug as StudentLevelSlug)
    try {
      localStorage.setItem(key, levelSlug)
    } catch {
      /* idem — best-effort */
    }
  }, [levelSlug, profileKey])

  if (!celebrate) return null
  return <LevelUpCelebration level={celebrate} onClose={() => setCelebrate(null)} />
}
