import { NextResponse } from 'next/server'
import { listPending, listReports } from '@/server/hub'
import { listAllStudioSubmissions, resolveSubmissionIdentities } from '@/server/studio-submissions'
import { getTeacherThreadsUnreadCount, listTeacherThreads } from '@/server/teacher-threads'

/**
 * Visão consolidada da Sala do Professor (Home + badges da sidebar): contagens de
 * pendências + os últimos itens recebidos, numa IDA só (fan-out em paralelo pelo
 * gateway). Cada fonte é BEST-EFFORT — upstream fora → `null` naquele count (a UI
 * mostra "—"), nunca 502 no todo. Sem cache no servidor: o count de recados é POR
 * STAFF (cache por processo vazaria entre operadores); o TTL vive no client
 * (`professor-counts-store`, 60s).
 */
export async function GET() {
  const [submissions, threads, threadsUnread, moderation, reports] = await Promise.all([
    // `total` da fila com status=pending = entregas pendentes; os 5 itens = recentes.
    listAllStudioSubmissions({ status: 'pending', limit: 5 }),
    listTeacherThreads({ unread: true, limit: 5 }),
    getTeacherThreadsUnreadCount(),
    listPending({ limit: 1 }),
    listReports({ status: 'open', limit: 1 }),
  ])

  const counts = {
    pendingSubmissions:
      submissions.status === 200 && submissions.body ? submissions.body.total : null,
    unreadThreads:
      threadsUnread.status === 200 && threadsUnread.body ? threadsUnread.body.count : null,
    moderationPending: moderation.status === 200 && moderation.body ? moderation.body.total : null,
    openReports: reports.status === 200 && reports.body ? reports.body.total : null,
  }

  // Últimos recebidos (5 entregas pendentes + 5 recados não-lidos), com identidade
  // hidratada do auth — o mesmo helper das filas (lote único, sem N+1).
  const rawSubmissions =
    submissions.status === 200 && Array.isArray(submissions.body?.items)
      ? submissions.body.items
      : []
  const rawThreads =
    threads.status === 200 && Array.isArray(threads.body?.threads) ? threads.body.threads : []
  const identityOf = await resolveSubmissionIdentities([...rawSubmissions, ...rawThreads])

  return NextResponse.json(
    {
      counts,
      recent: {
        submissions: rawSubmissions.map((s) => ({ ...s, ...identityOf(s) })),
        threads: rawThreads.map((t) => ({ ...t, ...identityOf(t) })),
      },
    },
    { status: 200 },
  )
}
