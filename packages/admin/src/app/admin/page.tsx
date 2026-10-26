import { AdminHeader } from '@/components/admin/admin-header'
import { DashboardCards } from './dashboard-cards'
import { SalesPanel } from './sales-panel'

export const dynamic = 'force-dynamic'

export default function PainelPage() {
  return (
    <div className="space-y-8">
      <AdminHeader
        title="Visão geral"
        description="Vendas e catálogo da comunidade selecionada. A gestão de contas é compartilhada entre Kids e Adultos."
      />
      <DashboardCards />
      <SalesPanel />
    </div>
  )
}
