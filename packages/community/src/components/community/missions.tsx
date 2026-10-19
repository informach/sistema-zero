'use client'
import { apiGet, apiSend } from '@sistemazero/member-shell/lib/api'
import type {
  MissionClaimResult,
  MissionsMeView,
  MissionView,
} from '@sistemazero/member-shell/lib/types'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { useAdultGamification } from './gamification-provider'
import { Meter } from './profile/meter'

const labels: Record<string, string> = {
  lesson_complete: 'Concluir aulas',
  quiz_passed: 'Passar nos quizzes',
  unit_complete: 'Concluir módulos',
  studio_submitted: 'Enviar projetos ao professor',
  course_showcased: 'Publicar projetos dos cursos',
  course_rated: 'Avaliar cursos',
  room_item_buy: 'Personalizar seu espaço',
  avatar_part_buy: 'Personalizar seu avatar',
  mural_comment: 'Comentar projetos',
  clube_thread: 'Participar da comunidade',
  studio_published: 'Publicar seus jogos',
  studio_remix: 'Criar versões de outros jogos',
  live_encounter: 'Participar de oficinas ao vivo',
}

const CADENCES = [
  { key: 'daily', title: 'Diárias' },
  { key: 'weekly', title: 'Semanais' },
  { key: 'monthly', title: 'Mensais' },
] as const

/** As missões em três colunas (direção de arte de 18/10/2026): Diárias, Semanais e Mensais. */
export function AdultMissions({
  initial,
  readOnly,
}: {
  initial: MissionsMeView | null
  readOnly: boolean
}) {
  const [missions, setMissions] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const state = useAdultGamification()
  async function claim(slug: string) {
    setBusy(slug)
    try {
      const result = await apiSend<MissionClaimResult>(
        `/api/members/gamification/missions/${encodeURIComponent(slug)}/claim`,
        'POST',
      )
      state?.refresh()
      toast.success(
        result.claimed
          ? `Missão concluída! +${result.xpAwarded} XP e +${result.coinsAwarded} moedas.`
          : 'Recompensa já registrada.',
      )
      setMissions(await apiGet<MissionsMeView>('/api/members/gamification/missions/me'))
    } catch {
      toast.error('Não foi possível atualizar a missão. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }
  return (
    <section aria-labelledby="missoes-titulo" className="flex flex-col gap-5">
      <h2 id="missoes-titulo" className="sz-h2">
        Missões
      </h2>
      {missions ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {CADENCES.map(({ key, title }) => (
            <div key={key} className="sz-card flex flex-col gap-4 p-6">
              <h3 className="sz-h4">{title}</h3>
              {missions[key].length ? (
                <ul className="flex flex-col">
                  {missions[key].map((mission, index) => (
                    <MissionItem
                      key={`${mission.slug}:${mission.periodKey}`}
                      mission={mission}
                      first={index === 0}
                      busy={busy}
                      readOnly={readOnly}
                      onClaim={claim}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-[0.9rem] text-muted-foreground">
                  Nenhuma missão disponível neste período.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p role="status" className="sz-card p-6 text-muted-foreground">
          Não foi possível carregar suas missões. Atualize a página para tentar novamente.
        </p>
      )}
    </section>
  )
}

function MissionItem({
  mission,
  first,
  busy,
  readOnly,
  onClaim,
}: {
  mission: MissionView
  first: boolean
  busy: string | null
  readOnly: boolean
  onClaim: (slug: string) => Promise<void>
}) {
  const label = labels[mission.goalType] ?? 'Atividade na comunidade'
  const done = Math.min(mission.progress, mission.target)
  return (
    <li className={cn('flex flex-col gap-2', !first && 'mt-3.5 border-border border-t pt-3.5')}>
      <div className="flex items-start justify-between gap-3">
        <strong>{label}</strong>
        <span className="whitespace-nowrap text-[0.9rem] text-muted-foreground">
          {done} de {mission.target}
        </span>
      </div>
      <Meter
        value={done}
        max={mission.target}
        label={label}
        tone={mission.completed ? 'ok' : 'acao'}
        className="h-[0.5rem]"
      />
      <div className="flex min-h-[2.2rem] flex-wrap items-center justify-between gap-2">
        <span className="text-[0.9rem] text-muted-foreground">
          +{mission.rewardXp} XP · {mission.rewardCoins} moedas
        </span>
        {mission.claimed ? (
          <span className="sz-chip sz-chip-ok">
            <Check aria-hidden />
            Resgatada
          </span>
        ) : mission.completed ? (
          <button
            type="button"
            className="sz-btn sz-btn-sm"
            disabled={readOnly || Boolean(busy)}
            onClick={() => void onClaim(mission.slug)}
          >
            {busy === mission.slug ? 'Resgatando...' : 'Resgatar'}
          </button>
        ) : null}
      </div>
    </li>
  )
}
