import { PageHeader } from '@/components/shared/page-header'
import { IdeiasClient } from './ideias-client'

export default function IdeiasPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ideias"
        description="Banco de ideias: capture, avalie e promova para o pipeline."
      />
      <IdeiasClient />
    </div>
  )
}
