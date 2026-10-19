import { HelpTutorialView } from '@sistemazero/member-shell/components/help-tutorial-view'
import { Info } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageBand, PageBody } from '@/components/community/page'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export default async function AdultHelpTutorialPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [response, session, published, state] = await Promise.all([
    shell.members.getHelpTutorialReadonly(slug).catch(() => null),
    getSession(),
    shell.members.listHelpTutorialsReadonly().catch(() => null),
    getCreativeToolsState(),
  ])
  if (response?.status === 404) notFound()
  const tutorial = response?.status === 200 ? response.body : null
  const known = new Map((published?.body?.tutorials ?? []).map((item) => [item.slug, item.title]))
  const capability = tutorial?.toolRef === 'estudio-completo' ? 'studio' : tutorial?.toolRef
  const unlocked =
    capability &&
    state.kind === 'ready' &&
    state.journey.capabilities.includes(capability) &&
    state.access[tutorial?.toolRef ?? ''] === true

  if (!tutorial)
    return (
      <>
        <PageBand back={{ href: '/como-fazer', label: 'Como fazer' }} title="Tutorial" compact />
        <PageBody>
          <div role="alert" className="sz-card flex flex-col items-start gap-4 p-6">
            <p className="m-0 font-bold">
              Não foi possível carregar o tutorial. Atualize a página para tentar novamente.
            </p>
            <Link href="/como-fazer" prefetch={false} className="sz-link">
              Ver todos os tutoriais
            </Link>
          </div>
        </PageBody>
      </>
    )

  return (
    <>
      <PageBand
        back={{ href: '/como-fazer', label: 'Como fazer' }}
        kicker={tutorial.collectionTitle}
        title={tutorial.title}
      />
      <PageBody>
        <div className="flex max-w-[48rem] flex-col gap-6">
          {tutorial.toolRef && !unlocked ? (
            <p className="sz-card-sm m-0 flex items-start gap-3 p-4">
              <Info className="mt-0.5 size-5 flex-none" aria-hidden />
              <span>
                Você pode consultar este tutorial. A ferramenta depende das liberações e dos acessos
                da sua conta.
              </span>
            </p>
          ) : null}
          <article className="sz-card p-6 md:p-8">
            <HelpTutorialView
              tutorial={tutorial}
              watermark={session ? `Aluno ${session.id.slice(0, 8)}` : null}
              relatedItems={(tutorial.related ?? [])
                .filter((id) => id !== slug && known.has(id))
                .map((id) => ({
                  slug: id,
                  label: known.get(id) ?? id,
                  href: `/como-fazer/${encodeURIComponent(id)}`,
                }))}
            />
          </article>
        </div>
      </PageBody>
    </>
  )
}
