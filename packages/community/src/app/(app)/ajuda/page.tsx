import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '@sistemazero/member-shell/lib/customer-helpdesk'
import { ArrowRight, BookOpen, MessageCircleQuestion, Search } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { HelpCollectionGrid, HelpTutorialRows } from '@/components/community/help/help-presentation'
import { PageBand, PageBody, SectionHeader } from '@/components/community/page'
import { gatewayFetchReadonly } from '@/server/gateway'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Os passo a passo em destaque, na ordem (slugs do lote `docs/como-fazer-adulto`). Os que não
 * estiverem publicados saem; faltando todos, ficam os primeiros da biblioteca.
 */
const FEATURED_SLUGS = [
  'aula-pedir-ajuda',
  'estudio-enviar-ao-professor',
  'estudio-aumentar-os-blocos',
  'conta-trocar-a-senha',
]

/**
 * Ajuda (direção de arte de 18/10/2026): a busca leva ao Como fazer, que abre a página em
 * destaque (a faixa escura, as coleções com a contagem e os passo a passo em destaque); depois, o
 * recado da dúvida de aula (que vai pelo "Preciso de ajuda" da aula, para os Recados) e o
 * atendimento do titular da conta. Sem tutorial publicado, o destaque some e fica só a busca.
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
  const featured = FEATURED_SLUGS.map((slug) => helpTutorials.find((t) => t.slug === slug)).filter(
    (t) => t !== undefined,
  )
  const highlighted = featured.length ? featured : helpTutorials.slice(0, 4)

  return (
    <>
      <PageBand
        title="Ajuda"
        lead="Procure um passo a passo no Como fazer ou fale com a equipe da Sistema Zero."
      >
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
              placeholder="O que você quer fazer? Ex.: trocar a senha"
              className="min-h-[3rem] w-full min-w-0 border-0 bg-transparent text-[1.05rem] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button type="submit" className="sz-btn min-h-[3.2rem] flex-none">
            Buscar no Como fazer
          </button>
        </Form>
      </PageBand>

      <PageBody>
        {helpTutorials.length ? (
          <>
            <section
              aria-labelledby="ajuda-como-fazer"
              className="flex flex-col gap-6 rounded-[1.2rem] bg-(--topo) p-6 text-(--topo-texto) md:p-8"
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <span
                  aria-hidden="true"
                  className="inline-flex size-14 flex-none items-center justify-center rounded-2xl bg-(--topo-borda) text-(--sz-community-action-light)"
                >
                  <BookOpen className="size-7" />
                </span>
                <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1.5">
                  <h2 id="ajuda-como-fazer" className="sz-h2 text-white">
                    Como fazer
                  </h2>
                  <p className="m-0">
                    {helpTutorials.length === 1
                      ? 'Um passo a passo curto'
                      : `${helpTutorials.length} passo a passo curtos`}
                    , um para cada tarefa: das aulas e ferramentas à comunidade e à sua conta.
                  </p>
                </div>
                <Link href="/como-fazer" prefetch={false} className="sz-btn-white flex-none">
                  Abrir o Como fazer
                  <ArrowRight aria-hidden />
                </Link>
              </div>
              <nav aria-label="Coleções do Como fazer">
                <HelpCollectionGrid collections={helpCollections} />
              </nav>
            </section>

            <section aria-labelledby="ajuda-destaque" className="flex flex-col gap-5">
              <SectionHeader
                id="ajuda-destaque"
                title="Passo a passo em destaque"
                action={
                  <Link href="/como-fazer" prefetch={false} className="sz-link">
                    {helpTutorials.length === 1
                      ? 'Ver o tutorial do Como fazer'
                      : `Ver os ${helpTutorials.length} tutoriais do Como fazer`}
                  </Link>
                }
              />
              <HelpTutorialRows tutorials={highlighted} collections={helpCollections} />
            </section>
          </>
        ) : null}

        <div className="flex items-start gap-3.5 rounded-2xl bg-(--acao-tint) px-5 py-4">
          <MessageCircleQuestion
            aria-hidden="true"
            className="mt-0.5 size-6 flex-none text-(--acao-texto)"
          />
          <p className="m-0">
            <strong>Dúvida sobre uma aula?</strong> Use <strong>Preciso de ajuda</strong>, no pé da
            própria aula. A equipe responde nos{' '}
            <Link href="/recados" prefetch={false} className="sz-link">
              Recados
            </Link>
            , com a aula e a parte já identificadas.
          </p>
        </div>

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
