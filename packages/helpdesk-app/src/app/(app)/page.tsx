import { PageHeader } from '@/components/shared/page-header'
import { PainelClient } from './painel-client'

export const dynamic = 'force-dynamic'

export default function PainelPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel"
        description="Visão geral do atendimento. Priorize primeiro o que precisa de uma resposta da equipe."
      />
      <PainelClient />
    </div>
  )
}
