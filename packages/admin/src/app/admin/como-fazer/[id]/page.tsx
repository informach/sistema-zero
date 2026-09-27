import { notFound } from 'next/navigation'
import { getSession } from '@/server/session'
import { HelpEditorClient } from './help-editor-client'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TutorialEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()])
  // O BFF só aceita uuid; sem isto, `/admin/como-fazer/abc` ficava no spinner para sempre.
  if (!UUID.test(id)) notFound()
  return <HelpEditorClient tutorialId={id} currentRole={session?.role ?? ''} />
}
