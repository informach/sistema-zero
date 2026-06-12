import { Badge } from '@sistemazero/ui/badge'
import { invoiceStatusLabel, invoiceStatusVariant } from '@/lib/nfse'

/** Badge de status da nota fiscal (mapeamento puro em `@/lib/nfse` — testado). */
export function InvoiceStatusBadge({ status }: { status: string }) {
  return <Badge variant={invoiceStatusVariant(status)}>{invoiceStatusLabel(status)}</Badge>
}
