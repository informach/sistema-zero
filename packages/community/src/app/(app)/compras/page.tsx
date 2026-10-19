import { PageBand, PageBody } from '@/components/community/page'
import { PurchasesClient, SubscriptionsSection } from './purchases-client'

export const dynamic = 'force-dynamic'

export default function PurchasesPage() {
  return (
    <>
      <PageBand
        title="Compras e assinatura"
        lead="O que você comprou, como pagou e a sua assinatura."
      />
      <PageBody className="gap-10">
        <SubscriptionsSection />
        <PurchasesClient />
      </PageBody>
    </>
  )
}
