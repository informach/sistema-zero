import { PageHeader } from '@/components/shared/page-header'
import { KbClient } from './kb-client'

export default function BaseConhecimentoPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Base de conhecimento"
        description="Artigos que alimentam as respostas da IA. Só os publicados entram no prompt."
      />
      <KbClient />
    </div>
  )
}
