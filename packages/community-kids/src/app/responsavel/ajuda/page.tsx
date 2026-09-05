import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '@sistemazero/member-shell/lib/customer-helpdesk'
import { redirect } from 'next/navigation'
import { PARENT_AREA_HREF, ParentAreaBack } from '@/components/kids/parent-area-back'
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 md:px-6">
      {/* A seta vive FORA do portal (que é compartilhado com o adulto, dono de um topo
          próprio): `/responsavel/*` não tem layout, sidebar nem topo, e sem ela o pai
          entra no Atendimento e não tem como voltar. Alinhada à largura do portal. */}
      <div className="mx-auto w-full max-w-3xl">
        <ParentAreaBack />
      </div>
      <CustomerHelpdeskPortal
        initialPage={initialPage}
        initialLoadFailed={response.status !== 200}
        parentAreaHref={PARENT_AREA_HREF}
      />
    </main>
  )
}
