'use client'

import { type AiCreditsView, diaCivilPorExtenso } from '@sistemazero/core/ai-credits'
import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { buttonVariants } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import {
  Award,
  BookOpenCheck,
  Flame,
  Gamepad2,
  Headphones,
  QrCode,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { GameCardDialog } from '@/components/kids/game-card-dialog'
import type {
  ChildDashboardView,
  ChildWeekGameView,
  ChildWeekStatsView,
  ParentReportPrefsView,
} from '@/lib/types'

const JSON_HEADERS = { 'content-type': 'application/json' }

/** Atendimento é uma superfície da CONTA e só é renderizado na Área dos Pais. */
export function ParentSupportCard() {
  return (
    <section className="w-full max-w-2xl">
      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="sz-display text-xl text-foreground">Atendimento</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Acompanhe pedidos da família e fale com a equipe da Sistema Zero.
              </p>
            </div>
          </div>
          <Link href="/responsavel/ajuda" className={buttonVariants({ variant: 'outline' })}>
            Abrir atendimento
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Uso familiar da IA, exibido apenas ao responsável e omitido em falhas best-effort. */
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
    <section className="w-full max-w-2xl">
      <h2 className="sz-display mb-3 text-center text-foreground text-xl">Ajuda da IA neste mês</h2>
      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <div
          className="sz-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={view.monthLimit}
          aria-valuenow={usadoMes}
          aria-label={`${usadoMes} de ${view.monthLimit} usados neste mês`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 font-bold text-foreground text-sm tabular-nums">
          {usadoMes} de {view.monthLimit}
        </p>
        <p className="text-muted-foreground text-xs">
          Renova em {diaCivilPorExtenso(view.monthRenewsOn)} · Hoje: {usadoHoje} de {view.dayLimit}
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          As crianças da família dividem o mesmo total.
        </p>
      </div>
    </section>
  )
}

/** Resumo de progresso de cada filho, atrás do portão da área dos pais. */
export function ChildrenDashboard({
  avatarPhotoByProfile,
}: {
  avatarPhotoByProfile: Record<string, string | null>
}) {
  const [children, setChildren] = useState<ChildDashboardView[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/children-stats')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { children: ChildDashboardView[] }) => {
        if (alive) setChildren(data.children)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (failed || (children !== null && children.length === 0)) return null

  return (
    <section className="w-full max-w-2xl">
      <h2 className="sz-display mb-3 text-center text-foreground text-xl">Progresso dos filhos</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {children === null
          ? [0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : children.map((child) => (
              <ChildStatsCard
                key={child.profileId}
                child={child}
                photoUrl={avatarPhotoByProfile[child.profileId] ?? null}
              />
            ))}
      </div>
      <WeeklyReportToggle />
    </section>
  )
}

function WeeklyReportToggle() {
  const [prefs, setPrefs] = useState<ParentReportPrefsView | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/report-prefs')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: ParentReportPrefsView) => {
        if (alive) setPrefs(data)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  async function toggle(receive: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/parents/report-prefs', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ disabled: !receive }),
      })
      if (!res.ok) throw new Error('save failed')
      setPrefs((await res.json()) as ParentReportPrefsView)
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  if (failed || prefs === null) return null

  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <input
        type="checkbox"
        checked={!prefs.disabled}
        disabled={saving}
        onChange={(event) => void toggle(event.target.checked)}
        className="mt-0.5 size-5 accent-[color:var(--primary)]"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-foreground text-sm">
          Receber o resumo da semana por e-mail
        </span>
        <span className="block text-muted-foreground text-xs">
          Toda sexta no fim da tarde enviamos como foi a semana das crianças.
        </span>
      </span>
    </label>
  )
}

function ChildStatsCard({
  child,
  photoUrl,
}: {
  child: ChildDashboardView
  photoUrl: string | null
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={photoUrl} firstName={child.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{child.name}</p>
          {child.rankingPosition !== null ? (
            <p className="flex items-center gap-1 text-muted-foreground text-xs">
              <Trophy className="size-3.5 text-[color:var(--sz-hot)]" />
              {child.rankingPosition}º no ranking kids
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Stat icon={<Star className="size-4 text-primary" />} label="XP" value={child.xp} />
        <Stat
          icon={<Flame className="size-4 text-[color:var(--sz-hot)]" />}
          label="dias de ofensiva"
          value={child.streak.current}
        />
        <Stat
          icon={<Award className="size-4 text-primary" />}
          label="medalhas"
          value={child.badgesCount}
        />
        <Stat
          icon={<Sparkles className="size-4 text-primary" />}
          label="entregas"
          value={child.submissionsCount ?? child.projectsCount}
        />
        <Stat
          icon={<BookOpenCheck className="size-4 text-primary" />}
          label="cursos concluídos"
          value={child.coursesCompleted}
        />
        <Stat
          icon={<BookOpenCheck className="size-4 text-muted-foreground" />}
          label="em andamento"
          value={child.coursesInProgress}
        />
      </div>
      {child.week ? <ChildWeekBlock week={child.week} games={child.games ?? null} /> : null}
    </div>
  )
}

function ChildWeekBlock({
  week,
  games,
}: {
  week: ChildWeekStatsView
  games: ChildWeekGameView[] | null
}) {
  const [cardGame, setCardGame] = useState<ChildWeekGameView | null>(null)
  const parts: string[] = []
  if (week.xpEarned > 0) parts.push(`+${week.xpEarned} XP`)
  if (week.lessonsCompleted > 0)
    parts.push(
      week.lessonsCompleted === 1
        ? '1 aula concluída'
        : `${week.lessonsCompleted} aulas concluídas`,
    )
  if (week.quizzesPassed > 0)
    parts.push(
      week.quizzesPassed === 1 ? '1 quiz aprovado' : `${week.quizzesPassed} quizzes aprovados`,
    )
  if (week.badgesUnlocked > 0)
    parts.push(
      week.badgesUnlocked === 1 ? '1 medalha nova' : `${week.badgesUnlocked} medalhas novas`,
    )
  const submissionsSubmitted = week.submissionsSubmitted ?? week.projectsSubmitted
  if (submissionsSubmitted > 0)
    parts.push(
      submissionsSubmitted === 1
        ? '1 entrega enviada'
        : `${submissionsSubmitted} entregas enviadas`,
    )

  const weekGames = games ?? []
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="mb-1 font-bold text-foreground text-xs uppercase tracking-wide">Esta semana</p>
      {parts.length > 0 ? (
        <p className="text-foreground text-sm">{parts.join(' · ')}</p>
      ) : (
        <p className="text-muted-foreground text-sm">Sem novidades por enquanto.</p>
      )}
      {weekGames.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {weekGames.map((game) => (
            <li
              key={`${game.playId ?? game.title}:${game.publishedAt}`}
              className="flex items-center gap-2"
            >
              <Gamepad2 className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-foreground text-sm">{game.title}</span>
              {game.playId ? (
                <button
                  type="button"
                  onClick={() => setCardGame(game)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border px-2.5 font-semibold text-muted-foreground text-xs"
                >
                  <QrCode className="size-3.5" /> Cartão
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {cardGame?.playId ? (
        <GameCardDialog
          title={cardGame.title}
          playUrl={`/jogar/${cardGame.playId}`}
          onClose={() => setCardGame(null)}
        />
      ) : null}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-bold text-foreground">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}
