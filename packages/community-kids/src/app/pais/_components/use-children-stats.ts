'use client'

import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { useEffect, useState } from 'react'
import type { ChildDashboardView } from '@/lib/types'

export type ChildrenStats =
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'ready'; children: ChildDashboardView[] }

/**
 * O progresso das crianças (XP, sequência, medalhas, a semana, a jornada). Uma consulta por
 * página; falha não derruba a área: cada tela mostra o que tem sem os números.
 */
export function useChildrenStats(): ChildrenStats {
  const [stats, setStats] = useState<ChildrenStats>({ state: 'loading' })
  useEffect(() => {
    let alive = true
    fetch('/api/parents/children-stats')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { children: ChildDashboardView[] }) => {
        if (alive) setStats({ state: 'ready', children: data.children ?? [] })
      })
      .catch(() => {
        if (alive) setStats({ state: 'failed' })
      })
    return () => {
      alive = false
    }
  }, [])
  return stats
}

export function statsFor(stats: ChildrenStats, profileId: string): ChildDashboardView | null {
  return stats.state === 'ready'
    ? (stats.children.find((child) => child.profileId === profileId) ?? null)
    : null
}

/** "3 aulas concluídas e 1 jogo publicado." (a semana numa frase, na língua dos pais). */
export function weekSentence(child: ChildDashboardView | null): string | null {
  const week = child?.week
  if (!week) return null
  const parts: string[] = []
  if (week.lessonsCompleted > 0)
    parts.push(
      week.lessonsCompleted === 1
        ? '1 aula concluída'
        : `${week.lessonsCompleted} aulas concluídas`,
    )
  const games = child.games?.length ?? 0
  if (games > 0) parts.push(games === 1 ? '1 jogo publicado' : `${games} jogos publicados`)
  const submissions = week.submissionsSubmitted ?? week.projectsSubmitted
  if (submissions > 0)
    parts.push(submissions === 1 ? '1 entrega enviada' : `${submissions} entregas enviadas`)
  if (week.badgesUnlocked > 0)
    parts.push(
      week.badgesUnlocked === 1 ? '1 medalha nova' : `${week.badgesUnlocked} medalhas novas`,
    )
  if (!parts.length) return null
  if (parts.length === 1) return `${parts[0]}.`
  return `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}.`
}
