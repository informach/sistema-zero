import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { ParentShell } from '../_components/parent-shell'
import { ParentPageTitle } from '../_components/parent-ui'

export default async function ParentWorkshopsPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  return (
    <ParentShell active="oficinas" parentName={session.firstName}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8">
        <ParentPageTitle
          title="Oficinas ao vivo"
          text="Os encontros das crianças da família, quem participa e como deixar tudo pronto para o dia."
        />
        <LiveCatalog mode="parent" prepareHref="/pais" />
      </div>
    </ParentShell>
  )
}
