'use client'

import { Card } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Flag, Inbox, Mail, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin/admin-header'
import { useProfessorOverview } from '@/components/admin/professor-counts-store'
import { formatDate } from '@/lib/format'
import type { StudioSubmissionQueueRow, TeacherThreadRow } from '@/lib/types'

/**
 * Home da Sala do Professor: o dia começa aqui — cards com as pendências
 * consolidadas (cada card navega pra fila correspondente) + os últimos itens
 * recebidos. Os dados vêm do MESMO store dos badges da sidebar (1 fetch, TTL 60s).
 */
export function ProfessorHomeClient() {
  const overview = useProfessorOverview()

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Sala do Professor"
        description="Suas pendências de hoje, num lugar só — clique num card para abrir a fila."
      />

      {overview === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CountCard
            href="/admin/professor/entregas"
            icon={<Inbox className="size-5" />}
            label="Entregas pendentes"
            count={overview.counts.pendingSubmissions}
          />
          <CountCard
            href="/admin/professor/recados"
            icon={<Mail className="size-5" />}
            label="Recados não lidos"
            count={overview.counts.unreadThreads}
          />
          <CountCard
            href="/admin/comunidade/moderacao"
            icon={<ShieldCheck className="size-5" />}
            label="Aguardando aprovação"
            count={overview.counts.moderationPending}
          />
          <CountCard
            href="/admin/comunidade/moderacao"
            icon={<Flag className="size-5" />}
            label="Denúncias abertas"
            count={overview.counts.openReports}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSubmissions items={overview?.recent.submissions ?? []} loading={overview === null} />
        <RecentThreads items={overview?.recent.threads ?? []} loading={overview === null} />
      </div>
    </div>
  )
}

function CountCard({
  href,
  icon,
  label,
  count,
}: {
  href: string
  icon: React.ReactNode
  label: string
  count: number | null
}) {
  return (
    <Link href={href}>
      <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:bg-muted/50">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
        <span className="min-w-0">
          {/* `—` = fonte indisponível agora (best-effort); 0 = tudo em dia. */}
          <span className="block text-2xl font-bold leading-tight">{count ?? '—'}</span>
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
        </span>
      </Card>
    </Link>
  )
}

function studentNameOf(s: { childName: string | null; accountName: string | null }): string {
  return s.childName || s.accountName || 'Aluno'
}

function RecentSubmissions({
  items,
  loading,
}: {
  items: StudioSubmissionQueueRow[]
  loading: boolean
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Últimas entregas pendentes</h2>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma entrega pendente. Tudo em dia! 🎉
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={`${s.userId}:${s.blockId}`}>
              <Link
                href="/admin/professor/entregas"
                className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{studentNameOf(s)}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDate(s.submittedAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {s.courseTitle} · {s.lessonTitle}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RecentThreads({ items, loading }: { items: TeacherThreadRow[]; loading: boolean }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Últimos recados não lidos</h2>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum recado esperando resposta.
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                href="/admin/professor/recados"
                className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{studentNameOf(t)}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDate(t.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {t.title ?? 'Recado'}
                  {t.lastMessagePreview ? ` — ${t.lastMessagePreview}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
