import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'

export default function MidiaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca"
        description="Arquivos de mídia: brutos, finais e capas de cada conteúdo."
      />
      <EmptyState
        title="Em construção"
        description="A biblioteca de mídia chega na próxima fase da ferramenta."
      />
    </div>
  )
}
