import { HelpLibrary } from '@/components/community/help-library'
import { shell } from '@/server/shell'
export const dynamic = 'force-dynamic'
export default async function AdultHelpPage() {
  const [collections, tutorials] = await Promise.all([
    shell.members.listHelpCollectionsReadonly().catch(() => null),
    shell.members.listHelpTutorialsReadonly().catch(() => null),
  ])
  return (
    <HelpLibrary
      unavailable={collections?.status !== 200 || tutorials?.status !== 200}
      collections={collections?.body?.collections ?? []}
      tutorials={tutorials?.body?.tutorials ?? []}
    />
  )
}
