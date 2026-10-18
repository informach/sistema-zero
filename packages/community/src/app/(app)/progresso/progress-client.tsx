'use client'

import { apiSend } from '@sistemazero/member-shell/lib/api'
import { badgeInfo } from '@sistemazero/member-shell/lib/badge-info'
import type { MissionsMeView } from '@sistemazero/member-shell/lib/types'
import { Button } from '@sistemazero/ui/button'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { useAdultGamification } from '@/components/community/gamification-provider'
import { GamificationSummary } from '@/components/community/gamification-summary'
import { AdultMissions } from '@/components/community/missions'

export function ProgressClient({
  readOnly,
  missions,
}: {
  readOnly: boolean
  missions: MissionsMeView | null
}) {
  const state = useAdultGamification()
  const [busy, setBusy] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const progress = state?.progress

  async function mutate(path: string, method: 'POST' | 'PUT', body?: unknown) {
    setBusy(true)
    try {
      await apiSend(path, method, body)
      state?.refresh()
      toast.success('Preferência atualizada.')
    } catch (error) {
      toast.error(
        error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
          ? error.message
          : 'Não foi possível atualizar. Tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  function vacation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void mutate('/api/members/gamification/vacation', 'PUT', { from, to })
  }
  return (
    <div className="space-y-7">
      <header>
        <h1 className="sz-display text-3xl">Seu progresso</h1>
        <p className="mt-2 text-muted-foreground">
          Atividade, conquistas e personalização na comunidade adulta.
        </p>
      </header>
      <GamificationSummary />
      <nav className="flex flex-wrap gap-5 font-semibold text-primary">
        <Link href="/ranking" prefetch={false}>
          Ranking e liga
        </Link>
        <Link href="/criar" prefetch={false}>
          Ferramentas de criação
        </Link>
        <Link href="/meu-avatar" prefetch={false}>
          Avatar 3D
        </Link>
        <Link href="/quarto" prefetch={false}>
          Meu espaço 3D
        </Link>
      </nav>
      {progress?.journey?.configured ? (
        <section className="rounded-3xl bg-card p-6">
          <h2 className="text-xl font-semibold">Sua jornada</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {progress.journey.stages.map((stage) => (
              <li key={stage.id} className="rounded-2xl border p-4">
                <p className="font-semibold">{stage.title}</p>
                <p className="text-sm text-muted-foreground">
                  {stage.completed
                    ? 'Concluída'
                    : stage.available
                      ? 'Em andamento'
                      : 'Conclua a etapa anterior para avançar'}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <AdultMissions initial={missions} readOnly={readOnly} />
      {progress ? (
        <>
          <section className="rounded-3xl bg-card p-6">
            <h2 className="text-xl font-semibold">Conquistas</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {progress.badges.map((badge) => {
                const info = badgeInfo(badge.slug)
                if (!info) return null
                const Icon = info.icon
                return (
                  <div
                    key={badge.slug}
                    className={`rounded-2xl border p-4 ${badge.unlockedAt ? 'border-primary' : 'border-border text-muted-foreground'}`}
                  >
                    <Icon className="mb-2 size-5" aria-hidden />
                    <p className="font-semibold">{info.title}</p>
                    <p className="mt-1 text-sm">
                      {badge.unlockedAt
                        ? `Conquistada em ${new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}`
                        : 'Ainda não conquistada'}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
          <section className="rounded-3xl bg-card p-6">
            <h2 className="text-xl font-semibold">Sua sequência</h2>
            <p className="mt-2">
              Melhor sequência: {progress.streak.best} dias. Protetores disponíveis:{' '}
              {progress.streak.freezesAvailable ?? 0}.
            </p>
            <Button
              className="mt-4"
              disabled={busy || readOnly}
              onClick={() => void mutate('/api/members/gamification/streak-freeze/buy', 'POST')}
            >
              Comprar protetor com moedas
            </Button>
            <form onSubmit={vacation} className="mt-5 flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm">
                Início da pausa
                <input
                  required
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="rounded-xl border bg-background p-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Fim da pausa
                <input
                  required
                  type="date"
                  min={from}
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="rounded-xl border bg-background p-2"
                />
              </label>
              <Button disabled={busy || readOnly} type="submit">
                Programar pausa
              </Button>
              <Button
                disabled={busy || readOnly}
                type="button"
                variant="outline"
                onClick={() =>
                  void mutate('/api/members/gamification/vacation', 'PUT', { from: null, to: null })
                }
              >
                Encerrar pausa
              </Button>
            </form>
          </section>
        </>
      ) : null}
      <Link href="/cursos" prefetch={false} className="font-semibold text-primary">
        Explorar cursos
      </Link>
    </div>
  )
}
