import { HelpLibrary } from '@/components/community/help-library'
import { PageBand, PageBody } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export default async function AdultHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const [collections, tutorials, query] = await Promise.all([
    shell.members.listHelpCollectionsReadonly().catch(() => null),
    shell.members.listHelpTutorialsReadonly().catch(() => null),
    searchParams,
  ])
  const q = typeof query.q === 'string' ? query.q.slice(0, 120) : ''
  return (
    <>
      <PageBand
        back={{ href: '/ajuda', label: 'Ajuda' }}
        title="Como fazer"
        lead="Passo a passo da plataforma e das ferramentas, com busca por palavra."
      />
      <PageBody>
        <HelpLibrary
          key={q}
          initialQuery={q}
          unavailable={collections?.status !== 200 || tutorials?.status !== 200}
          collections={collections?.body?.collections ?? []}
          tutorials={tutorials?.body?.tutorials ?? []}
        />
      </PageBody>
    </>
  )
}
