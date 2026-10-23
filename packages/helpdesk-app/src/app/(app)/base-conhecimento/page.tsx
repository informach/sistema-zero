import { PageHeader } from '@/components/shared/page-header'
import { getSession } from '@/server/session'
import { KbClient } from './kb-client'

export default async function BaseConhecimentoPage() {
  const session = await getSession()
  return (
    <div className="space-y-8">
      <PageHeader
        title="Base de conhecimento"
        description="Artigos que alimentam as respostas da IA. Só os publicados entram no prompt."
      />
      <KbClient canPublish={session?.role === 'admin' || session?.role === 'superadmin'} />
    </div>
  )
}
