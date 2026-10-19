import { notFound } from 'next/navigation'
import { HelpLibrary } from '@/components/community/help-library'
import { PageBand, PageBody } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export default async function AdultHelpCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, collections, tutorials] = await Promise.all([
    params,
    shell.members.listHelpCollectionsReadonly().catch(() => null),
    shell.members.listHelpTutorialsReadonly().catch(() => null),
  ])
  const collection = collections?.body?.collections.find((item) => item.slug === slug)
  if (collections?.status === 200 && !collection) notFound()
  return (
    <>
      <PageBand
        back={{ href: '/como-fazer', label: 'Como fazer' }}
        kicker="Coleção"
        title={collection?.title ?? 'Como fazer'}
        lead={collection?.description || undefined}
      />
      <PageBody>
        <HelpLibrary
          showCollections={false}
          unavailable={collections?.status !== 200 || tutorials?.status !== 200}
          collections={collection ? [collection] : []}
          tutorials={(tutorials?.body?.tutorials ?? []).filter(
            (item) => item.collectionId === collection?.id,
          )}
        />
      </PageBody>
    </>
  )
}
