import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'

export default function IdeiasPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ideias"
        description="Banco de ideias: capture, avalie e promova para o pipeline."
      />
      <EmptyState
        title="Em construção"
        description="O banco de ideias chega na próxima fase da ferramenta."
      />
    </div>
  )
}
