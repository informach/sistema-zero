import { HelpTutorialView } from '@sistemazero/member-shell/components/help-tutorial-view'
import { resolveHelpReturn } from '@sistemazero/member-shell/lib/help-return'
import { ArrowLeft, BookOpen, Info } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageBand, PageBody } from '@/components/community/page'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Um tutorial do Como fazer (direção de arte de 18/10/2026). Aberto de dentro de uma aula
 * (`?voltar=`, só caminhos de aula), ganha o aviso "Você veio da aula …" com "Voltar para a aula",
 * e os links de "Veja também" levam a volta junto.
 */
export default async function AdultHelpTutorialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ voltar?: string }>
}) {
  const [{ slug }, { voltar }] = await Promise.all([params, searchParams])
  const volta = resolveHelpReturn(voltar, 'Voltar para a aula')
  const [response, session, published, state, course] = await Promise.all([
    shell.members.getHelpTutorialReadonly(slug).catch(() => null),
    getSession(),
    shell.members.listHelpTutorialsReadonly().catch(() => null),
    getCreativeToolsState(),
    // Só para dizer o NOME da aula; sem ele, o aviso fala "de uma aula".
    volta ? shell.members.getMyCourseReadonly(volta.courseSlug).catch(() => null) : null,
  ])
  const lessonTitle =
    volta && course?.status === 200
      ? (course.body?.modules
          .flatMap((module) => module.lessons)
          .find((lesson) => lesson.id === volta.lessonId)?.title ?? null)
      : null
  const keepReturn = volta ? `?voltar=${encodeURIComponent(volta.href)}` : ''
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
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex min-w-0 max-w-[48rem] flex-col gap-6">
            {volta ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--primary)_25%,white)] bg-(--acao-tint) px-5 py-4">
                <p className="m-0 flex min-w-0 flex-[1_1_18rem] items-center gap-3">
                  <BookOpen aria-hidden="true" className="size-6 flex-none text-(--acao-texto)" />
                  <span>
                    {lessonTitle ? (
                      <>
                        Você veio da aula <strong>{lessonTitle}</strong>.
                      </>
                    ) : (
                      'Você veio de uma aula.'
                    )}
                  </span>
                </p>
                <Link href={volta.href} prefetch={false} className="sz-btn">
                  <ArrowLeft aria-hidden />
                  {volta.label}
                </Link>
              </div>
            ) : null}
            {tutorial.toolRef && !unlocked ? (
              <p className="sz-card-sm m-0 flex items-start gap-3 p-4">
                <Info className="mt-0.5 size-5 flex-none" aria-hidden />
                <span>
                  Você pode consultar este tutorial. A ferramenta depende das liberações e dos
                  acessos da sua conta.
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
                    href: `/como-fazer/${encodeURIComponent(id)}${keepReturn}`,
                  }))}
              />
            </article>
          </div>
          <aside className="sz-card flex flex-col gap-3 p-6">
            <h2 className="sz-h4">Ainda com dúvida?</h2>
            <p className="m-0 text-xs">
              Dentro da aula, use <strong>Preciso de ajuda</strong>. A equipe responde nos Recados.
            </p>
            <Link href="/ajuda#atendimento" prefetch={false} className="sz-btn-quiet">
              Falar com a equipe
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  )
}
