import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '@sistemazero/member-shell/lib/customer-helpdesk'
import { Search } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { HelpCollectionGrid, HelpTutorialRows } from '@/components/community/help/help-presentation'
import { PageBand, PageBody, SectionHeader } from '@/components/community/page'
import { gatewayFetchReadonly } from '@/server/gateway'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Ajuda (direção de arte de 18/10/2026): a busca nos tutoriais, as coleções do "Como fazer" com os
 * primeiros tutoriais e o atendimento do titular da conta. A dúvida de aula continua indo pelo
 * "Preciso de ajuda" da própria aula, para Recados.
 */
export default async function AjudaPage() {
  // RSC é somente-leitura: access vencido não tenta escrever cookies. O componente
  // cliente pode refazer pelo BFF, que então executa a rotação normal da sessão.
  const [response, collections, tutorials] = await Promise.all([
    gatewayFetchReadonly<CustomerTicketPage>('/helpdesk/portal/tickets', {
      query: { limit: 50 },
    }),
    shell.members.listHelpCollectionsReadonly().catch(() => null),
    shell.members.listHelpTutorialsReadonly().catch(() => null),
  ])
  const initialPage =
    response.status === 200 && response.body
      ? response.body
      : { items: [], total: 0, hasMore: false, nextCursor: null }
  const helpCollections = collections?.status === 200 ? (collections.body?.collections ?? []) : []
  const helpTutorials = tutorials?.status === 200 ? (tutorials.body?.tutorials ?? []) : []

  return (
    <>
      <PageBand title="Ajuda" lead="Procure um passo a passo ou fale com a equipe da Sistema Zero.">
        <Form
          action="/como-fazer"
          prefetch={false}
          role="search"
          className="mt-2 flex max-w-[43rem] flex-wrap gap-3"
        >
          <label className="flex min-h-[3.2rem] min-w-0 flex-[1_1_18rem] items-center gap-3 rounded-[0.6rem] border-2 border-input bg-card px-4 focus-within:outline focus-within:outline-3 focus-within:outline-(--ring) focus-within:outline-offset-2">
            <Search className="size-6 flex-none text-muted-foreground" aria-hidden />
            <span className="sr-only">Buscar um passo a passo</span>
            <input
              type="search"
              name="q"
              maxLength={120}
              placeholder="O que você quer fazer? Ex.: aumentar a letra dos blocos"
              className="min-h-[3rem] w-full min-w-0 border-0 bg-transparent text-[1.05rem] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button type="submit" className="sz-btn min-h-[3.2rem] flex-none">
            Buscar
          </button>
        </Form>
      </PageBand>

      <PageBody>
        {helpTutorials.length ? (
          <section aria-labelledby="ajuda-como-fazer" className="flex flex-col gap-5">
            <SectionHeader
              id="ajuda-como-fazer"
              title="Como fazer"
              action={
                <Link href="/como-fazer" prefetch={false} className="sz-link">
                  Ver todos os tutoriais
                </Link>
              }
            />
            <HelpCollectionGrid collections={helpCollections} />
            <HelpTutorialRows tutorials={helpTutorials.slice(0, 3)} collections={helpCollections} />
          </section>
        ) : null}

        {/* O portal de atendimento é o compartilhado com o Kids: o layout interno dele fica como
            está; aqui ele só se alinha à esquerda da página e o título vira o de seção (`h2`). */}
        <div
          id="atendimento"
          className="scroll-mt-24 [&>section]:mx-0 [&>section]:max-w-[52rem] [&_h2]:font-(family-name:--font-display) [&_h2]:text-[1.5rem]"
        >
          <CustomerHelpdeskPortal
            initialPage={initialPage}
            initialLoadFailed={response.status !== 200}
            headingLevel="h2"
          />
        </div>
      </PageBody>
    </>
  )
}
