import type { ReactNode } from 'react'
import { PageBand, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'
import { listTeacherThreadsReadonly } from '@/server/members'
import { RecadosList } from './recados-client'

/**
 * A tela de Recados (direção de arte de 18/10/2026): a lista e a conversa lado a lado a partir do
 * `lg`. No celular é uma coisa por vez: a lista em `/recados`, a conversa em `/recados/<id>`.
 * A lista é a mesma nas duas rotas; quem muda é o painel da direita.
 */
export async function RecadosScreen({
  selectedId = null,
  children,
}: {
  selectedId?: string | null
  children: ReactNode
}) {
  const result = await listTeacherThreadsReadonly()
  const ok = result.status === 200
  const unread = ok ? (result.body?.threads ?? []).filter((thread) => thread.unread).length : 0
  return (
    <>
      <PageBand
        kicker={unread > 0 ? `${unread} ${unread === 1 ? 'novo' : 'novos'}` : undefined}
        title="Recados"
        lead="Suas conversas com a equipe: as dúvidas das aulas, as respostas às suas entregas e os avisos. Só você e a equipe veem."
      />
      <PageBody className="pt-8">
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[23rem_minmax(0,1fr)]">
          <div className={cn(selectedId !== null && 'hidden lg:block')}>
            <RecadosList
              key={selectedId ?? 'lista'}
              initialThreads={ok ? (result.body?.threads ?? []) : []}
              initialNextOffset={ok ? (result.body?.nextOffset ?? null) : null}
              selectedId={selectedId}
              loadFailed={!ok}
            />
          </div>
          <div className={cn(selectedId === null && 'hidden lg:block')}>{children}</div>
        </div>
      </PageBody>
    </>
  )
}
