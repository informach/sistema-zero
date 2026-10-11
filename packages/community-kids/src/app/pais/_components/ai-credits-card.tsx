'use client'

import { type AiCreditsView, diaCivilPorExtenso } from '@sistemazero/core/ai-credits'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { Bot } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * O uso da IA da família no mês (o Zappy e o Pensa dividem o mesmo total). Some em falha, e para
 * a equipe, que não tem teto.
 */
export function FamilyAiCredits() {
  const [view, setView] = useState<AiCreditsView | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/ai-credits')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { credits: AiCreditsView | null }) => {
        if (alive && data.credits) setView(data.credits)
        else if (alive) setFailed(true)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (failed || !view || view.unlimited) return null

  const usadoMes = view.monthLimit - view.monthRemaining
  const usadoHoje = view.dayLimit - view.dayRemaining
  const pct = Math.min(100, Math.round((usadoMes / view.monthLimit) * 100))
  return (
    <section aria-labelledby="parents-ai" className="kids-carta flex flex-col gap-4 p-6">
      <h2 id="parents-ai" className="sz-display flex items-center gap-2 text-xl">
        <Bot className="size-5 text-primary" aria-hidden="true" /> Ajuda da IA neste mês
      </h2>
      <p className="sz-display text-[2rem] leading-none tabular-nums">
        {usadoMes}
        <span className="font-sans text-base text-muted-foreground"> de {view.monthLimit}</span>
      </p>
      <div
        className="h-3 overflow-hidden rounded-full bg-background"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={view.monthLimit}
        aria-valuenow={usadoMes}
        aria-label={`${usadoMes} de ${view.monthLimit} usados neste mês`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-muted-foreground text-sm">
        Renova em {diaCivilPorExtenso(view.monthRenewsOn)}. Hoje: {usadoHoje} de {view.dayLimit}. As
        crianças da família dividem o mesmo total.
      </p>
    </section>
  )
}
