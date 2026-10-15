'use client'

import { useEffect, useState } from 'react'
import { nextMissionLabel, resolveNextPensaMission } from '@/lib/pensa-next-mission'

/**
 * O rótulo do "Continuar" do Guia do Pensa quando a PRÓXIMA missão é em outra oficina
 * ("Continuar no Pinta"), descoberto depois de concluir, que é quando o botão aparece. Em
 * EQUIPE só conta a próxima missão que é DESTA criança; sem nenhuma, "Voltar ao plano".
 * Melhor esforço: sem resposta, `undefined` e o guia fica com "Continuar meu caminho"; o clique
 * descobre o destino de novo de qualquer jeito (o plano pode ter mudado).
 */
export function useNextMissionLabel(input: {
  enabled: boolean
  taskId: string | null
  projectId: string | null
  current: 'studio' | 'pinta' | 'molda'
}): string | undefined {
  const { enabled, taskId, projectId, current } = input
  const [found, setFound] = useState<{ taskId: string; label?: string } | null>(null)
  useEffect(() => {
    if (!enabled || !taskId || !projectId) return
    let active = true
    void resolveNextPensaMission(projectId)
      .then((next) => {
        if (active)
          setFound({
            taskId,
            label: nextMissionLabel(next.destination, current, { backToPlan: next.backToPlan }),
          })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [enabled, taskId, projectId, current])
  return found && found.taskId === taskId ? found.label : undefined
}
