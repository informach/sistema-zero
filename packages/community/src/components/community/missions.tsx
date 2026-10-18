'use client'
import { apiGet, apiSend } from '@sistemazero/member-shell/lib/api'
import type { MissionClaimResult, MissionsMeView } from '@sistemazero/member-shell/lib/types'
import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAdultGamification } from './gamification-provider'

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
    <section className="space-y-5 rounded-3xl bg-card p-6">
      <h2 className="text-xl font-semibold">Missões</h2>
      {missions ? (
        (['daily', 'weekly', 'monthly'] as const).map((cadence) => (
          <div key={cadence} className="space-y-3">
            <h3 className="font-semibold">
              {cadence === 'daily' ? 'Diárias' : cadence === 'weekly' ? 'Semanais' : 'Mensais'}
            </h3>
            {missions[cadence].length ? (
              missions[cadence].map((mission) => (
                <div
                  key={`${mission.slug}:${mission.periodKey}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {labels[mission.goalType] ?? 'Atividade na comunidade'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {mission.progress}/{mission.target} · {mission.rewardXp} XP ·{' '}
                      {mission.rewardCoins} moedas
                    </p>
                    <progress
                      aria-label={labels[mission.goalType] ?? 'Progresso da missão'}
                      value={mission.progress}
                      max={mission.target}
                      className="mt-2 h-2 w-full accent-primary"
                    />
                  </div>
                  <Button
                    disabled={readOnly || Boolean(busy) || !mission.completed || mission.claimed}
                    onClick={() => void claim(mission.slug)}
                  >
                    {mission.claimed
                      ? 'Resgatada'
                      : busy === mission.slug
                        ? 'Resgatando...'
                        : 'Resgatar'}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma missão disponível neste período.
              </p>
            )}
          </div>
        ))
      ) : (
        <p role="status">
          Não foi possível carregar suas missões. Atualize a página para tentar novamente.
        </p>
      )}
    </section>
  )
}
