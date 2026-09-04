import { PageHeader } from '@/components/shared/page-header'
import { ConfiguracoesClient } from './configuracoes-client'

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Conexão da caixa contato@ e assinatura das respostas da equipe."
      />
      <ConfiguracoesClient />
    </div>
  )
}
