import { getSession } from '@/server/session'
import { HelpEditorClient } from './help-editor-client'

export const dynamic = 'force-dynamic'

export default async function TutorialEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()])
  return <HelpEditorClient tutorialId={id} currentRole={session?.role ?? ''} />
}
