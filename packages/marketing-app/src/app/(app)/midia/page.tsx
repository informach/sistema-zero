import { PageHeader } from '@/components/shared/page-header'
import { MidiaClient } from './midia-client'

export default function MidiaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca"
        description="Arquivos de mídia: brutos, finais e capas de cada conteúdo."
      />
      <MidiaClient />
    </div>
  )
}
