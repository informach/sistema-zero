import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'

export default function ConexoesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Conexões"
        description="Contas sociais conectadas para publicação automática."
      />
      <EmptyState
        title="Em construção"
        description="A conexão de contas sociais chega em uma fase futura. Enquanto isso, o fluxo manual de publicação cobre o dia a dia."
      />
    </div>
  )
}
