import { AdminHeader } from '@/components/admin/admin-header'
import { DashboardCards } from './dashboard-cards'
import { SalesPanel } from './sales-panel'

export const dynamic = 'force-dynamic'

export default function PainelPage() {
  return (
    <div className="space-y-8">
      <AdminHeader
        title="Visão geral"
        description="Como as vendas estão indo. Cada número abre a lista que ele resume."
      />
      <DashboardCards />
      <SalesPanel />
    </div>
  )
}
