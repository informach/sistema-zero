import { Mail } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { plainPreview } from '@/lib/plain-preview'
import type { TeacherThreadContext, TeacherThreadSummaryView } from '@/lib/types'

const CONTEXT_LABELS: Record<TeacherThreadContext, string> = {
  lesson_section: 'Dúvida na aula',
  studio_submission: 'Entrega',
  mural_publication: 'Comunidade',
  general: 'Recado',
}

/**
 * Os recados mais recentes no Início (direção de arte de 18/10/2026): o contexto, o título e a
 * última mensagem de cada conversa com a equipe, com o total de novos. Sem conversa, o cartão sai.
 */
export function RecadosCard({
  threads,
  unread,
}: {
  threads: TeacherThreadSummaryView[]
  unread: number
}) {
  if (threads.length === 0) return null
  return (
    <article className="sz-card flex flex-col gap-3.5 p-5 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="sz-h3">Recados</h2>
        {unread > 0 ? (
          <span className="sz-chip sz-chip-novo">
            {unread} {unread === 1 ? 'novo' : 'novos'}
          </span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-1">
        {threads.map((thread) => {
          const preview = thread.lastMessagePreview?.trim()
          return (
            <li key={thread.id}>
              <Link
                href={`/recados/${encodeURIComponent(thread.id)}`}
                prefetch={false}
                className={cn(
                  '-mx-3.5 flex gap-3.5 rounded-[0.8rem] p-3.5 text-foreground transition-colors hover:bg-muted',
                  thread.unread && 'bg-background',
                )}
              >
                <span
                  aria-hidden
                  className="inline-flex size-[2.4rem] shrink-0 items-center justify-center rounded-full bg-(--topo) text-white"
                >
                  <Mail className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-bold text-(--acao-texto) text-[0.85rem]">
                    {CONTEXT_LABELS[thread.contextType] ?? 'Recado'}
                    {thread.unread ? <span className="sr-only"> (novo)</span> : null}
                  </span>
                  <strong className="line-clamp-2">
                    {thread.title?.trim() || 'Conversa com a equipe'}
                  </strong>
                  {preview ? (
                    <span className="line-clamp-2 text-[0.85rem] text-muted-foreground">
                      {thread.lastMessageRole === 'student'
                        ? `Você: ${preview}`
                        : `${thread.lastMessageRole === 'teacher' ? 'Equipe: ' : ''}${plainPreview(preview)}`}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        href="/recados"
        prefetch={false}
        className="sz-link -my-1.5 inline-flex min-h-[2.4rem] items-center self-start"
      >
        Ver todos os recados
      </Link>
    </article>
  )
}
