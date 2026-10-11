import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '@sistemazero/member-shell/lib/customer-helpdesk'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { ParentShell } from '../../_components/parent-shell'

export const dynamic = 'force-dynamic'

/**
 * O Atendimento da família, dentro da área dos pais. O perfil da criança nunca alcança os
 * chamados da conta, nem quando conhece a URL: os BFFs `/api/helpdesk/portal/*` repetem a mesma
 * fronteira (`requireParentGateAccountOnly`).
 */
export default async function AtendimentoPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const response = await shell.gateway.gatewayFetchReadonly<CustomerTicketPage>(
    '/helpdesk/portal/tickets',
    { query: { limit: 50 } },
  )
  const initialPage =
    response.status === 200 && response.body
      ? response.body
      : { items: [], total: 0, hasMore: false, nextCursor: null }
  return (
    <ParentShell active="ajuda" parentName={session.firstName}>
      <Link
        href="/pais/ajuda"
        className="-mb-6 inline-flex min-h-11 items-center gap-2 self-start font-bold text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Ajuda
      </Link>
      <CustomerHelpdeskPortal
        initialPage={initialPage}
        initialLoadFailed={response.status !== 200}
        parentAreaHref="/pais"
      />
    </ParentShell>
  )
}
