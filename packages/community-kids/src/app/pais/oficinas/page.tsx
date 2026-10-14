import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { ParentShell } from '../_components/parent-shell'
export default async function ParentWorkshopsPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  return (
    <ParentShell active="oficinas" parentName={session.firstName}>
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <LiveCatalog mode="parent" />
      </div>
    </ParentShell>
  )
}
