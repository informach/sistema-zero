import { HelpTutorialView } from '@sistemazero/member-shell/components/help-tutorial-view'
import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  return (
    <div className="space-y-6">
      <Link href="/como-fazer" className="text-primary underline">
        Voltar à biblioteca
      </Link>
      {tutorial ? (
        <>
          <header>
            <p className="text-muted-foreground">{tutorial.collectionTitle}</p>
            <h1 className="sz-display text-3xl">{tutorial.title}</h1>
          </header>
          {tutorial.toolRef && !unlocked ? (
            <p className="rounded-xl bg-muted p-4 text-sm">
              Você pode consultar este tutorial. A ferramenta depende das liberações e dos acessos
              da sua conta.
            </p>
          ) : null}
          <article className="rounded-2xl bg-card p-6">
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
        </>
      ) : (
        <p role="alert">
          Não foi possível carregar o tutorial. Atualize a página para tentar novamente.
        </p>
      )}
    </div>
  )
}
