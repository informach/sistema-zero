import { PageBand, PageBody } from '@/components/community/page'
import { PurchasesClient, SubscriptionsSection } from './purchases-client'

export const dynamic = 'force-dynamic'

export default function PurchasesPage() {
  return (
    <>
      <PageBand
        back={{ href: '/perfil', label: 'Meu perfil' }}
        title="Compras e assinatura"
        lead="O que você comprou, como pagou e a sua assinatura."
      >
        {/* A assinatura no palco, o histórico na bancada (Estúdio à noite). */}
        <div className="mt-6">
          <SubscriptionsSection />
        </div>
      </PageBand>
      <PageBody className="gap-10">
        <PurchasesClient />
      </PageBody>
    </>
  )
}
