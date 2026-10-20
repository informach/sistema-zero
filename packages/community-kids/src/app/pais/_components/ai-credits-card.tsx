'use client'

import { type AiCreditsView, diaCivilPorExtenso } from '@sistemazero/core/ai-credits'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { Bot } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * O aviso de transparência aos pais: o ÚNICO lugar do Kids que diz "inteligência artificial" (o
 * guarda `tests/copy-sem-ia.test.ts` só aceita este trecho). Separa o que é automático (a ajuda do
 * Zappy no Estúdio e o Pensa) do que é da equipe (as falas do Zappy nas fases e os Recados).
 */
export const AI_DISCLOSURE =
  'A ajuda do Zappy no Estúdio e o Pensa são assistentes virtuais, feitos com inteligência artificial. As falas do Zappy nas fases são escritas pela nossa equipe, e nos Recados quem responde é a equipe.'

/**
 * O aviso SEMPRE aparece na Conta, fora do cartão de créditos: o cartão some quando a consulta
 * falha e para a equipe (sem teto), e a transparência não pode depender disso.
 */
export function AiTransparencyNotice() {
  return (
    <section aria-labelledby="parents-ai-who" className="kids-carta flex flex-col gap-2 p-6">
      <h2 id="parents-ai-who" className="sz-display text-xl">
        Quem responde à criança
      </h2>
      <p className="text-muted-foreground text-sm">{AI_DISCLOSURE}</p>
    </section>
  )
}

/**
 * Os créditos do Zappy e do Pensa da família no mês (os dois dividem o mesmo total). Some em falha,
 * e para a equipe, que não tem teto. A descrição automática do Mural e o "Construir" do Pro gastam
 * do mesmo total (`server/openrouter.ts` e `server/studio-builder.ts` do member-shell).
 */
/** O que gasta crédito, inteiro e verdadeiro (as falas do Zappy nas fases não gastam). */
export const CREDIT_USES =
  'Cada pergunta ao Zappy no Estúdio ou pedido ao Pensa usa um crédito. A descrição automática ao publicar no Mural também usa, assim como construir com o Zappy no modo Pro.'

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
        <Bot className="size-5 text-primary" aria-hidden="true" /> Créditos do Zappy e do Pensa
        neste mês
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
      <p className="text-muted-foreground text-sm">{CREDIT_USES}</p>
      <p className="text-muted-foreground text-sm">
        Na tela da criança, os créditos aparecem como ideias.
      </p>
    </section>
  )
}
