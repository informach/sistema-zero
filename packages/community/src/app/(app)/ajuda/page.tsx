import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '@sistemazero/member-shell/lib/customer-helpdesk'
import { gatewayFetchReadonly } from '@/server/gateway'

export const dynamic = 'force-dynamic'

/** Central de atendimento do titular da conta, dentro da área adulta autenticada. */
export default async function AjudaPage() {
  // RSC é somente-leitura: access vencido não tenta escrever cookies. O componente
  // cliente pode refazer pelo BFF, que então executa a rotação normal da sessão.
  const response = await gatewayFetchReadonly<CustomerTicketPage>('/helpdesk/portal/tickets', {
    query: { limit: 50 },
  })
  const initialPage =
    response.status === 200 && response.body
      ? response.body
      : { items: [], total: 0, hasMore: false, nextCursor: null }

  return (
    <CustomerHelpdeskPortal initialPage={initialPage} initialLoadFailed={response.status !== 200} />
  )
}
