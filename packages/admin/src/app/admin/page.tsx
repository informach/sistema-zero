import { AdminHeader } from '@/components/admin/admin-header'
import { getSession } from '@/server/session'
import { DashboardCards } from './dashboard-cards'
import { SalesPanel } from './sales-panel'

export const dynamic = 'force-dynamic'

export default async function PainelPage() {
  const user = await getSession()
  const firstName = user?.firstName || 'admin'

  return (
    <div className="space-y-8">
      <AdminHeader
        title={`Olá, ${firstName}`}
        description="Visão geral da plataforma. Gerencie catálogo, usuários, pagamentos e membros."
      />
      <DashboardCards />
      <SalesPanel />
    </div>
  )
}
