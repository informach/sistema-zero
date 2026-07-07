import { PageHeader } from '@/components/shared/page-header'
import { getSession } from '@/server/session'
import { ConexoesClient } from './conexoes-client'

/**
 * Server shell: o gate real de sessão/role é do layout do grupo `(app)` — aqui
 * só derivamos o papel p/ decidir o que a tela mostra (staff vê o estado das
 * contas; conectar/desconectar é admin+, espelhando o RBAC do gateway).
 */
export default async function ConexoesPage() {
  const user = await getSession()
  const isAdmin = user !== null && (user.role === 'admin' || user.role === 'superadmin')

  return (
    <div className="space-y-8">
      <PageHeader
        title="Conexões"
        description="Contas sociais conectadas para publicação automática."
      />
      <ConexoesClient isAdmin={isAdmin} />
    </div>
  )
}
