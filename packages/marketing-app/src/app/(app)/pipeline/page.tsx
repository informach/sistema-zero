import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'

export default function PipelinePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Pipeline"
        description="Kanban de produção: da ideia ao conteúdo aprovado."
      />
      <EmptyState
        title="Em construção"
        description="O kanban do pipeline chega na próxima fase da ferramenta."
      />
    </div>
  )
}
