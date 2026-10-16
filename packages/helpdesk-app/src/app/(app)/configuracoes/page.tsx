import { PageHeader } from '@/components/shared/page-header'
import { getSession } from '@/server/session'
import { AutomationCard } from './automation-card'
import { ConfiguracoesClient } from './configuracoes-client'

export default async function ConfiguracoesPage() {
  const session = await getSession()
  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Conexão da caixa contato@, assinatura das respostas e regras de triagem dos e-mails."
      />
      <ConfiguracoesClient />
      {session?.role === 'admin' || session?.role === 'superadmin' ? <AutomationCard /> : null}
    </div>
  )
}
