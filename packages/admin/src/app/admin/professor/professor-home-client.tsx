'use client'

import { Badge } from '@sistemazero/ui/badge'
import { buttonVariants } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Flag, Inbox, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import {
  type ProfessorCounts,
  type ProfessorOverview,
  refreshProfessorCounts,
  useProfessorOverview,
  useProfessorOverviewFailed,
} from '@/components/admin/professor-counts-store'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import {
  AGENDA_STATE_LABEL,
  type AgendaItem,
  agendaActionLabel,
  agendaTime,
  agendaZoneNote,
  roomHref,
} from '@/lib/live-agenda'
import type { Platform } from '@/lib/platform'
import { threadSubject } from '@/lib/teacher-thread-subject'
import { STATE_BADGE } from './ao-vivo/agenda-client'
import { useLiveAgenda } from './ao-vivo/use-live-agenda'

/** "Bom dia" até meio-dia, "Boa tarde" até as 18h, "Boa noite" depois, pela hora de quem olha. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Hoje (Turma): o dia começa aqui. Em cima, os encontros de hoje das turmas que a pessoa
 * conduz (a MESMA leitura da página Encontros); embaixo, UMA lista com o que espera pela equipe
 * (projetos, recados, aprovações e denúncias), em que cada item abre direto onde se age.
 * Os números e os itens vêm do MESMO store dos badges da sidebar (1 fetch, TTL 60s).
 */
export function ProfessorHomeClient({ firstName }: { firstName: string }) {
  // A hora é a do navegador: no servidor ainda não se sabe, então o primeiro quadro diz "Olá".
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => setHour(new Date().getHours()), [])
  const greeting = hour === null ? 'Olá' : greetingFor(hour)
  return (
    <div className="space-y-8">
      <AdminHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description="O que espera por você hoje. Cada item abre direto onde você precisa agir."
      />
      <TodayMeetings />
      <WaitingForYou />
    </div>
  )
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-xl font-bold">
      {children}
    </h2>
  )
}

function TodayMeetings() {
  const { groups, error, retry } = useLiveAgenda()
  return (
    <section aria-labelledby="hoje-encontros" className="space-y-3">
      <div className="space-y-0.5">
        <SectionTitle id="hoje-encontros">Encontros de hoje</SectionTitle>
        <p className="text-sm text-muted-foreground">Das duas comunidades.</p>
      </div>
      {error ? (
        <div className="flex flex-wrap items-center gap-3 text-[15px] text-muted-foreground">
          <p>A agenda não carregou.</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-11 items-center font-bold text-primary"
          >
            Tentar de novo
          </button>
        </div>
      ) : !groups ? (
        <div className="grid gap-3 md:grid-cols-2" role="status" aria-label="Carregando a agenda">
          <Skeleton className="h-36 w-full rounded-[18px]" />
          <Skeleton className="h-36 w-full rounded-[18px]" />
        </div>
      ) : groups.today.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">
          Nenhum encontro hoje.{' '}
          <Link href="/admin/professor/ao-vivo" className="font-bold text-primary">
            Ver agenda
          </Link>
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {groups.today.map((item) => (
            <TodayMeetingCard key={item.session.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TodayMeetingCard({ item }: { item: AgendaItem }) {
  const badge = STATE_BADGE[item.state]
  const Icon = badge.icon
  const timeZone = item.cohort?.timeZone ?? 'America/Sao_Paulo'
  const open = item.state === 'live' || item.state === 'lobby'
  const zone = agendaZoneNote(item.cohort?.timeZone)
  return (
    <li
      data-session={item.session.id}
      className={cn(
        'flex flex-col gap-4 rounded-[18px] border bg-card p-5',
        open ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[32px] font-bold leading-none tabular-nums">
          {agendaTime(item.startsAt, timeZone)}
        </p>
        <Badge variant={badge.variant}>
          <Icon className="size-3.5" aria-hidden />
          {AGENDA_STATE_LABEL[item.state]}
        </Badge>
      </div>
      <div className="min-w-0 space-y-0.5">
        <h3 className="truncate font-bold">{item.session.title}</h3>
        <p className="truncate text-sm text-muted-foreground">{item.cohort?.title ?? 'Turma'}</p>
        {zone ? <p className="text-xs text-muted-foreground">{zone}</p> : null}
      </div>
      {/* ⚠️ `<a href>`, não `<Link>`: a sala precisa de navegação completa (ver `roomHref`). */}
      <a
        href={roomHref(item.session.id)}
        className={`${buttonVariants({ variant: open ? 'default' : 'outline' })} min-h-11 px-4`}
      >
        {agendaActionLabel(item, 'today')}
      </a>
    </li>
  )
}

type WaitKind = 'projetos' | 'recados' | 'aprovar' | 'denuncias'
type Filter = 'tudo' | WaitKind

interface WaitItem {
  key: string
  kind: WaitKind
  href: string
  name: string
  line: string
  chip: string
  at: string | null
}

const FILTERS: { value: Filter; label: string; count: keyof ProfessorCounts | null }[] = [
  { value: 'tudo', label: 'Tudo', count: null },
  { value: 'projetos', label: 'Projetos', count: 'pendingSubmissions' },
  { value: 'recados', label: 'Recados', count: 'unreadThreads' },
  { value: 'aprovar', label: 'Aprovar', count: 'moderationPending' },
  { value: 'denuncias', label: 'Denúncias', count: 'openReports' },
]

const KIND_ICON: Record<WaitKind, typeof Inbox> = {
  projetos: Inbox,
  recados: Mail,
  aprovar: ShieldCheck,
  denuncias: Flag,
}

/** Onde cada fila mora inteira, para o "ver todos" da lista filtrada. */
const FULL_LIST: Record<WaitKind, { href: string; label: string }> = {
  projetos: { href: '/admin/professor/entregas', label: 'Ver todos os projetos' },
  recados: { href: '/admin/professor/recados', label: 'Ver todos os recados' },
  aprovar: { href: '/admin/comunidade/moderacao?aba=aprovar', label: 'Abrir a moderação' },
  denuncias: { href: '/admin/comunidade/moderacao?aba=denuncias', label: 'Abrir a moderação' },
}

/** O nome que a equipe lê: a criança (perfil) no Kids, o titular no Adultos. */
function learnerName(
  s: { childName: string | null; accountName: string | null },
  platform: Platform,
): string {
  return s.childName || s.accountName || (platform === 'kids' ? 'Criança' : 'Aluno')
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function waitingItems(overview: ProfessorOverview, platform: Platform): WaitItem[] {
  const { counts, recent } = overview
  const moderation: WaitItem[] = []
  if (counts.openReports)
    moderation.push({
      key: 'denuncias',
      kind: 'denuncias',
      href: '/admin/comunidade/moderacao?aba=denuncias',
      name: plural(counts.openReports, 'denúncia aberta', 'denúncias abertas'),
      line: 'Alguém da comunidade pediu para a equipe olhar uma publicação.',
      chip: 'Denúncia',
      at: null,
    })
  if (counts.moderationPending)
    moderation.push({
      key: 'aprovar',
      kind: 'aprovar',
      href: '/admin/comunidade/moderacao?aba=aprovar',
      name: plural(counts.moderationPending, 'publicação para aprovar', 'publicações para aprovar'),
      line: 'Só aparecem para a comunidade depois que a equipe aprova.',
      chip: 'Aprovar',
      at: null,
    })
  const projects: WaitItem[] = recent.submissions.map((s) => ({
    key: `projeto:${s.userId}:${s.blockId}`,
    kind: 'projetos',
    href: `/admin/professor/entregas?abrir=${encodeURIComponent(`${s.userId}:${s.blockId}`)}`,
    name: learnerName(s, platform),
    line: `${s.courseTitle} · ${s.lessonTitle}`,
    chip: 'Projeto',
    at: s.submittedAt,
  }))
  const threads: WaitItem[] = recent.threads.map((t) => {
    const name = learnerName(t, platform)
    const subject = threadSubject(t) ?? 'Recado'
    return {
      key: `recado:${t.id}`,
      kind: 'recados',
      // Só o id do recado: o nome da criança ou do aluno nunca vai para o endereço.
      href: `/admin/professor/recados?abrir=${encodeURIComponent(t.id)}`,
      name,
      line: t.lastMessagePreview ? `${subject}: ${t.lastMessagePreview}` : subject,
      chip: 'Recado',
      at: t.lastMessageAt,
    }
  })
  const dated = [...projects, ...threads].sort(
    (a, b) => Date.parse(b.at ?? '') - Date.parse(a.at ?? ''),
  )
  return [...moderation, ...dated]
}

function WaitingForYou() {
  const overview = useProfessorOverview()
  const failed = useProfessorOverviewFailed()
  const platform = usePlatform()
  const [filter, setFilter] = useState<Filter>('tudo')
  if (!overview)
    return (
      <section aria-labelledby="hoje-espera" className="space-y-3">
        <SectionTitle id="hoje-espera">O que espera por você</SectionTitle>
        {failed ? (
          <div className="rounded-[18px] border border-border bg-card">
            <LoadError what="o que espera por você" onRetry={refreshProfessorCounts} />
          </div>
        ) : (
          <div className="space-y-2" role="status" aria-label="Carregando o que espera por você">
            <Skeleton className="h-16 w-full rounded-[18px]" />
            <Skeleton className="h-16 w-full rounded-[18px]" />
            <Skeleton className="h-16 w-full rounded-[18px]" />
          </div>
        )}
      </section>
    )
  const { counts } = overview
  const all = waitingItems(overview, platform)
  const shown = filter === 'tudo' ? all : all.filter((item) => item.kind === filter)
  const known = Object.values(counts).every((value) => value !== null)
  const totalKnown = Object.values(counts).reduce<number>((sum, value) => sum + (value ?? 0), 0)
  const countOf = (f: (typeof FILTERS)[number]): number | null =>
    f.count === null ? (known ? totalKnown : null) : counts[f.count]
  const selected = FILTERS.find((f) => f.value === filter) ?? FILTERS[0]!
  const selectedCount = countOf(selected)
  const missing = selected.count !== null && selectedCount === null
  const allClear = known && totalKnown === 0 && all.length === 0
  return (
    <section aria-labelledby="hoje-espera" className="space-y-3">
      <SectionTitle id="hoje-espera">O que espera por você</SectionTitle>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Mostrar</legend>
        {FILTERS.map((f) => {
          const value = countOf(f)
          const active = f.value === filter
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-bold transition-colors',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              {f.label}
              {value === null ? (
                f.count === null ? null : (
                  <span className="text-xs font-medium opacity-80">não carregou</span>
                )
              ) : (
                <span className="font-mono text-sm tabular-nums">{value}</span>
              )}
            </button>
          )
        })}
      </fieldset>
      {!known && filter === 'tudo' ? (
        <p className="text-sm text-muted-foreground">
          Parte da lista não carregou agora. O que aparece aqui pode não ser tudo.
        </p>
      ) : null}
      {missing ? (
        <p className="rounded-[18px] border border-border bg-card p-5 text-[15px] text-muted-foreground">
          Esta lista não carregou agora. Tente de novo em instantes.
        </p>
      ) : allClear ? (
        <div className="rounded-[18px] border border-border bg-card">
          <EmptyState
            zappy="celebrating"
            title="Tudo visto por hoje."
            description="Quando chegar um projeto, um recado ou algo para moderar, aparece aqui."
          />
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-[18px] border border-border bg-card p-5 text-[15px] text-muted-foreground">
          Nada esperando aqui agora.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">
          {shown.map((item) => (
            <WaitRow key={item.key} item={item} />
          ))}
        </ul>
      )}
      {filter !== 'tudo' && !missing ? (
        <Link
          href={FULL_LIST[filter].href}
          className="inline-flex min-h-11 items-center font-bold text-primary"
        >
          {FULL_LIST[filter].label}
          {selectedCount !== null && selectedCount > shown.length ? ` (${selectedCount})` : ''}
        </Link>
      ) : null}
    </section>
  )
}

function WaitRow({ item }: { item: WaitItem }) {
  const Icon = KIND_ICON[item.kind]
  const urgent = item.kind === 'denuncias'
  return (
    <li>
      <Link
        href={item.href}
        className="flex min-h-16 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full font-bold',
            urgent ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          {item.at ? item.name.trim().charAt(0).toUpperCase() || '?' : <Icon className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{item.name}</span>
          <span className="block truncate text-sm text-muted-foreground">{item.line}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={urgent ? 'destructive' : 'warning'}>{item.chip}</Badge>
          {item.at ? (
            <span className="text-xs text-muted-foreground">{formatDate(item.at)}</span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}
