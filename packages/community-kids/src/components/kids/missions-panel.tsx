'use client'

import { Gift, Sparkles } from 'lucide-react'
import { type CSSProperties, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { MissionsMeView, MissionView } from '@/lib/types'
import { ZappyCoin } from './zappy-coin'

/** Emoji da missão — identidade visual rápida por tipo de meta (decorativo). */
function missionEmoji(m: MissionView): string {
  switch (m.goalType) {
    case 'lesson_complete':
      return '📖'
    case 'quiz_passed':
      return '🧠'
    case 'unit_complete':
      return '🎁'
    case 'studio_submitted':
      return '📨'
    case 'studio_passed':
      return '🚀'
    case 'course_showcased':
    case 'studio_published':
      return '🌟'
    case 'course_rated':
      return '⭐'
    case 'room_item_buy':
      return '🏠'
    case 'avatar_part_buy':
      return '🧢'
    case 'mural_comment':
    case 'clube_thread':
      return '💬'
    case 'studio_remix':
      return '🎮'
    default:
      return '✨'
  }
}

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
    // Estúdio Completo (retenção pós-cursos): publicar standalone + remix do Mural.
    case 'studio_published':
      return n === 1 ? 'Lance um jogo seu no Mural' : `Lance ${n} jogos seus no Mural`
    case 'studio_remix':
      return n === 1 ? 'Faça sua versão de um jogo do Mural' : `Faça sua versão de ${n} jogos`
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
          unitClass="kids-unit-cyan"
          missions={data.daily}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
        <MissionGroup
          title="Esta semana"
          unitClass="kids-unit-rosa"
          missions={data.weekly}
          claiming={claiming}
          onClaim={claim}
          label={missionLabel}
        />
        <MissionGroup
          title="Este mês"
          unitClass="kids-unit-verde"
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
  unitClass,
  missions,
  claiming,
  onClaim,
  label,
}: {
  title: string
  /** Tema kids-unit-* do grupo: pinta borda/sombra dos cards e o chip do título. */
  unitClass: string
  missions: MissionView[]
  claiming: string | null
  onClaim: (m: MissionView) => void
  label: (m: MissionView) => string
}) {
  if (missions.length === 0) return null
  return (
    <div className={cn('space-y-2', unitClass)}>
      <p className="flex items-center gap-2 font-bold text-muted-foreground text-xs uppercase tracking-wide">
        <span aria-hidden className="size-2 rounded-full bg-(--unit)" />
        {title}
      </p>
      <div className="grid gap-2.5">
        {missions.map((m) => {
          const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0
          const ready = m.completed && !m.claimed
          return (
            <div
              key={m.slug}
              className={cn(
                'kids-card rounded-2xl bg-card p-3.5',
                m.claimed && 'opacity-60 saturate-50',
              )}
              // Missão pronta p/ resgatar veste o vermelho "hot" pela MESMA
              // indireção --unit do kids-card (borda + sombra acompanham).
              style={ready ? ({ '--unit': 'var(--sz-hot)' } as CSSProperties) : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-xl"
                  style={{ background: 'color-mix(in oklch, var(--unit) 14%, transparent)' }}
                >
                  {missionEmoji(m)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-sm">{label(m)}</p>
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                    <ZappyCoin className="size-3.5" /> {m.rewardCoins} · {m.rewardXp} XP
                  </span>
                </div>
                {m.claimed ? (
                  <span className="shrink-0 font-bold text-muted-foreground text-xs">
                    Resgatado ✅
                  </span>
                ) : m.completed ? (
                  <button
                    type="button"
                    onClick={() => onClaim(m)}
                    disabled={claiming === m.slug}
                    className="kid-pop inline-flex shrink-0 items-center gap-1 rounded-full bg-(--sz-hot) px-3 py-1.5 font-bold text-(--sz-hot-fg) text-xs disabled:opacity-60"
                  >
                    <Gift className="size-3.5" /> Resgatar
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-bold text-muted-foreground text-xs tabular-nums">
                    {m.progress}/{m.target}
                  </span>
                )}
              </div>
              {!m.claimed && (
                <div className="sz-progress mt-2.5">
                  <span style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
