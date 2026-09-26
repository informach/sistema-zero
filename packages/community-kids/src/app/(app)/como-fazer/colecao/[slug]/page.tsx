import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsEmptyState } from '@/components/kids/kids-empty-state'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { backToSection, HELP_NAV } from '@/components/kids/nav'
import { HELP_COLLECTION_ICON } from '@/lib/help-collections'
import { listHelpCollectionsReadonly, listHelpTutorialsReadonly } from '@/server/members'

export const dynamic = 'force-dynamic'

/** Os tutoriais de UMA coleção do "Como fazer", na ordem que o admin deu. */
export default async function ColecaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [colecoesRes, tutoriaisRes] = await Promise.all([
    listHelpCollectionsReadonly(),
    listHelpTutorialsReadonly(),
  ])
  if (colecoesRes.status !== 200 || tutoriaisRes.status !== 200) {
    return (
      <KidsBand tone="creme">
        <KidsPageHeader
          back={backToSection(`${HELP_NAV.href}/colecao/${slug}`)}
          title="Como fazer"
        />
        <div className="mt-6">
          <KidsAccessUnavailable title="Como fazer" />
        </div>
      </KidsBand>
    )
  }
  const collection = (colecoesRes.body?.collections ?? []).find((c) => c.slug === slug)
  if (!collection) notFound()
  const tutorials = (tutoriaisRes.body?.tutorials ?? []).filter(
    (t) => t.collectionId === collection.id,
  )
  const Icon = HELP_COLLECTION_ICON[collection.icon] ?? HELP_COLLECTION_ICON.book

  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          back={backToSection(`${HELP_NAV.href}/colecao/${slug}`)}
          eyebrow="Como fazer"
          eyebrowIcon={Icon}
          title={collection.title}
          subtitle={collection.description || 'Escolha o que você quer fazer.'}
        />
      </KidsBand>
      <KidsBand tone="ceu">
        {tutorials.length === 0 ? (
          <KidsEmptyState
            icon={Icon}
            title="Ainda não tem tutorial aqui"
            description="Volte ao Como fazer e procure em outra coleção."
          />
        ) : (
          <ol className="flex flex-col gap-3" aria-label={`Tutoriais de ${collection.title}`}>
            {tutorials.map((tutorial, index) => (
              <li key={tutorial.id}>
                <Link
                  href={`/como-fazer/${encodeURIComponent(tutorial.slug)}`}
                  prefetch={false}
                  className="kids-card flex min-h-11 items-center gap-4 rounded-2xl bg-card px-4 py-3 transition-[transform,filter] hover:brightness-[1.02] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:translate-y-[2px]"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-(--band-creme) font-extrabold text-foreground text-sm"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-base text-foreground">
                      {tutorial.title}
                    </span>
                    {tutorial.summary ? (
                      <span className="block text-muted-foreground text-sm">
                        {tutorial.summary}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </KidsBand>
    </>
  )
}
