'use client'

import { Gift, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { MissionsMeView, MissionView } from '@/lib/types'
import { ZappyCoin } from './zappy-coin'

/** Texto da meta da missão (PT, tom kids) — derivado do goalType + alvo. */
function missionLabel(m: MissionView): string {
  const n = m.target
  switch (m.goalType) {
    case 'lesson_complete':
      return n === 1 ? 'Conclua 1 aula' : `Conclua ${n} aulas`
    case 'quiz_passed':
      return n === 1 ? 'Acerte 1 quiz' : `Acerte ${n} quizzes`
    case 'unit_complete':
      return n === 1 ? 'Abra 1 baú de unidade' : `Abra ${n} baús`
    case 'studio_submitted':
      return n === 1 ? 'Envie uma atividade ao professor' : `Envie ${n} atividades ao professor`
    case 'studio_passed':
      return n === 1 ? 'Crie 1 projeto no Estúdio' : `Crie ${n} projetos no Estúdio`
    case 'course_showcased':
      return n === 1 ? 'Publique um jogo no Mural' : `Publique ${n} jogos no Mural`
    case 'course_rated':
      return n === 1 ? 'Classifique um curso' : `Classifique ${n} cursos`
    case 'room_item_buy':
      return n === 1 ? 'Decore seu quarto' : `Ganhe ${n} itens para o quarto`
    case 'avatar_part_buy':
      return n === 1 ? 'Personalize seu avatar' : `Ganhe ${n} peças do avatar`
    case 'mural_comment':
      return n === 1 ? 'Comente no Mural' : `Comente ${n} vezes no Mural`
    case 'clube_thread':
      return n === 1 ? 'Converse no Clube' : `Converse ${n} vezes no Clube`
    default:
      return 'Complete a missão'
  }
}

/**
 * Painel de missões diárias/semanais (estilo Duolingo): barra de progresso + botão
 * "Resgatar" quando concluída. As missões chegam JÁ RESOLVIDAS do servidor (prop
 * `initial`, no Promise.all da home — sem fetch/waterfall pós-hidratação); o cliente
 * só cuida do resgate (POST idempotente). `initial` nulo (gamificação indisponível)
 * → placeholder gentil (a home não "encolhe" sem explicação; era sumir em silêncio).
 */
export function MissionsPanel({ initial }: { initial: MissionsMeView | null }) {
  const [data, setData] = useState<MissionsMeView | null>(initial)
  const [claiming, setClaiming] = useState<string | null>(null)

  async function claim(m: MissionView) {
    if (claiming) return
    setClaiming(m.slug)
    try {
      const res = await fetch(
        `/api/members/gamification/missions/${encodeURIComponent(m.slug)}/claim`,
        { method: 'POST' },
      )
      if (!res.ok) {
        toast.error('Não consegui resgatar agora. Tente de novo!')
        return
      }
      const body = await res.json().catch(() => null)
      if (body?.xpAwarded > 0 || body?.coinsAwarded > 0) {
        toast.success(`Recompensa! +${body.xpAwarded} XP e +${body.coinsAwarded} moedas 🎉`)
      }
      // Marca como resgatada localmente (sem refetch).
      const mark = (x: MissionView) => (x.slug === m.slug ? { ...x, claimed: true } : x)
      setData((d) =>
        d
          ? {
              daily: d.daily.map(mark),
              weekly: d.weekly.map(mark),
              monthly: d.monthly.map(mark),
            }
          : d,
      )
    } catch {
      toast.error('Não consegui resgatar agora.')
    } finally {
      setClaiming(null)
    }
  }

  if (!data) {
    return (
      <section className="space-y-3">
        <h2 className="sz-display flex items-center gap-2 text-lg">
          <Sparkles className="size-5 text-primary" /> Missões
        </h2>
        <div className="rounded-3xl border-2 border-border border-dashed px-5 py-6 text-center">
          <p className="text-muted-foreground text-sm">
            As missões estão tirando uma soneca… volte daqui a pouquinho! 💤
          </p>
        </div>
      </section>
    )
  }
  const all = [...data.daily, ...data.weekly, ...data.monthly]
  if (all.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="sz-display flex items-center gap-2 text-lg">
        <Sparkles className="size-5 text-primary" /> Missões
      </h2>
      <div className="space-y-4">
        <MissionGroup
          title="Hoje"
          missions={data.daily}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
        <MissionGroup
          title="Esta semana"
          missions={data.weekly}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
        <MissionGroup
          title="Este mês"
          missions={data.monthly}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
      </div>
    </section>
  )
}

function MissionGroup({
  title,
  missions,
  claiming,
  onClaim,
  label,
}: {
  title: string
  missions: MissionView[]
  claiming: string | null
  onClaim: (m: MissionView) => void
  label: (m: MissionView) => string
}) {
  if (missions.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="font-bold text-muted-foreground text-xs uppercase tracking-wide">{title}</p>
      <div className="grid gap-2">
        {missions.map((m) => {
          const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0
          return (
            <div
              key={m.slug}
              className={cn(
                'rounded-2xl border-2 p-3',
                m.completed && !m.claimed ? 'border-(--sz-hot)' : 'border-border',
                m.claimed && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm">{label(m)}</p>
                <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                  <ZappyCoin className="size-3.5" /> {m.rewardCoins} · {m.rewardXp} XP
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {m.claimed ? (
                  <span className="font-bold text-muted-foreground text-xs">Resgatado ✅</span>
                ) : m.completed ? (
                  <button
                    type="button"
                    onClick={() => onClaim(m)}
                    disabled={claiming === m.slug}
                    className="inline-flex items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-1 font-bold text-(--sz-hot-fg) text-xs disabled:opacity-60"
                  >
                    <Gift className="size-3.5" /> Resgatar
                  </button>
                ) : (
                  <span className="font-semibold text-muted-foreground text-xs tabular-nums">
                    {m.progress}/{m.target}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
