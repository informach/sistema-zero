import { PageHeader } from '@/components/shared/page-header'
import { PainelCards } from './painel-cards'

export const dynamic = 'force-dynamic'

export default function PainelPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel"
        description="Visão geral do atendimento. Acompanhe os tickets do contato@."
      />
      <PainelCards />
    </div>
  )
}
