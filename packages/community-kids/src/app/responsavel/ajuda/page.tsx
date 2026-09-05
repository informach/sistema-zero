import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '@sistemazero/member-shell/lib/customer-helpdesk'
import { redirect } from 'next/navigation'
import { isParentVerifiedFor } from '@/server/parent-gate'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Rota fora do layout infantil. O perfil da criança nunca alcança os tickets da
 * conta, nem quando conhece a URL: o BFF abaixo repete a mesma fronteira.
 */
export default async function AjudaDoResponsavelPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.activeProfile || !(await isParentVerifiedFor(session.id))) redirect('/perfis')

  const response = await shell.gateway.gatewayFetchReadonly<CustomerTicketPage>(
    '/helpdesk/portal/tickets',
    {
      query: { limit: 50 },
    },
  )
  const initialPage =
    response.status === 200 && response.body
      ? response.body
      : { items: [], total: 0, hasMore: false, nextCursor: null }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <CustomerHelpdeskPortal
        initialPage={initialPage}
        initialLoadFailed={response.status !== 200}
        parentAreaHref="/perfis?manage=1"
      />
    </main>
  )
}
