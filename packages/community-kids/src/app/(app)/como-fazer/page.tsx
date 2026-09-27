import { CircleHelp, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { HelpCollectionCard } from '@/components/kids/help/help-collection-card'
import { HelpSearch } from '@/components/kids/help/help-search'
import { HelpUnavailable } from '@/components/kids/help/help-unavailable'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsClosingCard } from '@/components/kids/kids-closing-card'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
import { listHelpCollectionsReadonly, listHelpTutorialsReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * O "Como fazer": a biblioteca de ajuda da criança. Separada da Jornada e dos cursos de
 * propósito: sem progresso, sem XP, sem conclusão. De todo perfil (o gate é só "logado").
 * A busca abre o TUTORIAL exato; as coleções são a porta de quem prefere passear.
 * Sem oferta nenhuma aqui: se uma ferramenta não está liberada, a página do tutorial diz
 * isso de forma factual, e só.
 */
export default async function ComoFazerPage() {
  const [colecoesRes, tutoriaisRes] = await Promise.all([
    listHelpCollectionsReadonly(),
    listHelpTutorialsReadonly(),
  ])
  const indisponivel = colecoesRes.status !== 200 || tutoriaisRes.status !== 200
  const collections = colecoesRes.status === 200 ? (colecoesRes.body?.collections ?? []) : []
  const tutorials = tutoriaisRes.status === 200 ? (tutoriaisRes.body?.tutorials ?? []) : []
  const comTutorial = collections.filter((c) => c.publishedCount > 0)

  if (indisponivel) {
    return (
      <KidsBand tone="creme">
        <HelpUnavailable />
      </KidsBand>
    )
  }

  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Biblioteca de ajuda"
          eyebrowIcon={CircleHelp}
          title="Como fazer"
          subtitle="Passo a passo curto para usar a plataforma e as ferramentas. Procure pelo que você quer fazer."
        />
        <div className="mt-6">
          <HelpSearch tutorials={tutorials} collections={collections} />
        </div>
      </KidsBand>

      <KidsBand tone="menta">
        <section aria-labelledby="colecoes-heading">
          <KidsSectionHeader
            id="colecoes-heading"
            title="Ou escolha por assunto"
            subtitle="Cada coleção junta os tutoriais de uma parte da plataforma."
          />
          {comTutorial.length === 0 ? (
            <KidsEmptyState
              icon={CircleHelp}
              title="Os primeiros tutoriais estão a caminho"
              description="Enquanto isso, o botão Preciso de ajuda dentro da aula fala com o professor."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {comTutorial.map((collection) => (
                <HelpCollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
        </section>
      </KidsBand>

      <KidsBand tone="lilas">
        <KidsClosingCard
          icon={MessageCircle}
          title="Não achou o que precisava?"
          description="Dentro de qualquer aula, o botão Preciso de ajuda manda a sua dúvida para o professor. A resposta chega nos Recados."
          action={
            <Link
              href="/recados"
              prefetch={false}
              className="sz-btn-gradient inline-flex h-12 items-center gap-2 px-6 text-base"
            >
              <Mail className="size-[1.125rem]" aria-hidden />
              Ver os recados
            </Link>
          }
        />
      </KidsBand>
    </>
  )
}
