'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import type { TeacherThreadContext, TeacherThreadSummaryView } from '@/lib/types'

const CONTEXT_LABEL: Record<TeacherThreadContext, string> = {
  studio_submission: 'Sua entrega',
  mural_publication: 'Seu jogo no Mural',
  general: 'Recado',
}

/** Lista das conversas com o professor (mais recente primeiro; "NOVO" no não-lido). */
export function RecadosClient({ initialThreads }: { initialThreads: TeacherThreadSummaryView[] }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 font-bold text-2xl [font-family:var(--font-display)]">
        Recados do professor
      </h1>
      <p className="mb-6 text-muted-foreground text-sm">
        Aqui chegam as respostas e correções do seu professor. Você pode responder de volta! 💬
      </p>

      {initialThreads.length === 0 ? (
        <div className="rounded-2xl border-2 border-border border-dashed bg-card p-8 text-center">
          <Mail className="mx-auto mb-3 size-10 text-muted-foreground" />
          <p className="font-bold">Nenhum recado ainda</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Quando o professor responder uma entrega ou um jogo seu, aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {initialThreads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/recados/${t.id}`}
                className="block rounded-2xl border-2 border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-primary text-xs uppercase tracking-wide">
                    {CONTEXT_LABEL[t.contextType]}
                  </span>
                  {t.unread ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-[10px] text-primary-foreground">
                      NOVO
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate font-bold [font-family:var(--font-display)]">
                  {t.title ?? 'Conversa com o professor'}
                </p>
                {t.lastMessagePreview ? (
                  <p className="mt-0.5 truncate text-muted-foreground text-sm">
                    {t.lastMessageRole === 'student' ? 'Você: ' : ''}
                    {t.lastMessagePreview}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
