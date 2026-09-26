import { HelpTutorialView } from '@sistemazero/member-shell/components/help-tutorial-view'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HelpToolNotice } from '@/components/kids/help/help-tool-notice'
import { KidsAccessUnavailable } from '@/components/kids/kids-access-unavailable'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { backToSection, HELP_NAV } from '@/components/kids/nav'
import { HELP_COLLECTION_ICON } from '@/lib/help-collections'
import { resolveHelpReturn } from '@/lib/help-return'
import { getCreativeTools } from '@/server/creator-journey'
import { getHelpTutorialReadonly, listHelpCollectionsReadonly } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Um tutorial do "Como fazer". Link ESTÁVEL (`/como-fazer/<slug>`), abrível de dentro de uma
 * aula (`?voltar=` allowlistado por `resolveHelpReturn`). Ler não marca progresso nenhum e
 * não libera ferramenta: o aviso da ferramenta é factual (`HelpToolNotice`), sem oferta.
 * O vídeo leva a marca d'água do perfil, como na aula (decisão da dona).
 */
export default async function TutorialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ voltar?: string }>
}) {
  const [{ slug }, { voltar }] = await Promise.all([params, searchParams])
  const [tutorialRes, session] = await Promise.all([getHelpTutorialReadonly(slug), getSession()])
  const volta = resolveHelpReturn(voltar)
  const back = volta ?? backToSection(`${HELP_NAV.href}/${slug}`)

  if (tutorialRes.status === 404) notFound()
  if (tutorialRes.status !== 200 || !tutorialRes.body) {
    return (
      <KidsBand tone="creme">
        <KidsPageHeader back={back} title="Como fazer" />
        <div className="mt-6">
          <KidsAccessUnavailable title="Como fazer" />
        </div>
      </KidsBand>
    )
  }
  const tutorial = tutorialRes.body

  // A ferramenta do tutorial: a MESMA régua do menu, resolvida no servidor. Best-effort: sem
  // resposta, o aviso simplesmente não aparece. As coleções servem só para o "Veja também".
  const [tools, colecoesRes] = await Promise.all([
    tutorial.toolRef ? getCreativeTools().catch(() => null) : Promise.resolve(null),
    listHelpCollectionsReadonly().catch(() => null),
  ])
  const toolState = tutorial.toolRef
    ? (tools?.tools.find((t) => t.id === tutorial.toolRef)?.state ?? null)
    : null
  const colecao = (colecoesRes?.body?.collections ?? []).find((c) => c.id === tutorial.collectionId)
  const Icon = HELP_COLLECTION_ICON[colecao?.icon ?? 'book'] ?? HELP_COLLECTION_ICON.book
  const watermark = session?.id ? `Perfil ${session.id.slice(0, 8)}` : null

  return (
    <>
      <KidsBand tone="creme">
        <KidsPageHeader
          back={back}
          eyebrow={tutorial.collectionTitle}
          eyebrowIcon={Icon}
          title={tutorial.title}
        />
        {tutorial.toolRef ? (
          <div className="mt-5">
            <HelpToolNotice tool={tutorial.toolRef} state={toolState} />
          </div>
        ) : null}
      </KidsBand>
      <KidsBand tone="branco">
        <article className="kids-card mx-auto max-w-3xl rounded-[1.75rem] bg-card px-5 py-6 md:px-8 md:py-8">
          <HelpTutorialView
            tutorial={tutorial}
            watermark={watermark}
            headingLevel={2}
            renderRelated={(relatedSlug) => (
              <Link
                href={`/como-fazer/${encodeURIComponent(relatedSlug)}`}
                prefetch={false}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-(--band-creme) px-4 font-bold text-foreground text-sm hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                {relatedSlug.replaceAll('-', ' ')}
              </Link>
            )}
          />
        </article>
        {volta ? (
          <p className="mt-6 flex justify-center">
            <Link
              href={volta.href}
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground text-sm shadow-[0_3px_0_color-mix(in_oklch,var(--primary)_55%,black)] transition-[transform,filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:translate-y-[2px]"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {volta.label}
            </Link>
          </p>
        ) : null}
      </KidsBand>
    </>
  )
}
