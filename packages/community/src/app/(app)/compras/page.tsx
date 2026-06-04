import { PurchasesClient } from './purchases-client'

export const dynamic = 'force-dynamic'

export default function PurchasesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="sz-display text-2xl">Minhas compras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico das suas compras nesta conta.
        </p>
      </div>
      <PurchasesClient />
    </div>
  )
}
