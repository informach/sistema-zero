import { KidsJourneyEditor } from './journey-editor'

export const dynamic = 'force-dynamic'

export default async function KidsJourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ preparacao?: string | string[] }>
}) {
  const params = await searchParams
  return <KidsJourneyEditor initialPreparation={params.preparacao} />
}
