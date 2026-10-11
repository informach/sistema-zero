import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { SessionBoundary } from './session-boundary'

export async function ParentSessionFrame({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  return (
    <>
      <meta name="sz-session" content={session.kids.sessionId} />
      <SessionBoundary kind="parent" />
      {children}
    </>
  )
}
