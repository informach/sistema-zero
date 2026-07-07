import { PageHeader } from '@/components/shared/page-header'
import { PipelineClient } from './pipeline-client'

export default function PipelinePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Pipeline"
        description="Kanban de produção: da ideia ao conteúdo aprovado."
      />
      <PipelineClient />
    </div>
  )
}
