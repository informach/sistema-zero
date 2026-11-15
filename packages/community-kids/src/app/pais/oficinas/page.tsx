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
      {/* Sem invólucro próprio (redesenho de 14/11/2026): a mesma largura e o mesmo respiro das
          outras páginas da área dos pais. */}
      <ParentPageTitle
        title="Oficinas ao vivo"
        text="Os encontros ao vivo dos seus filhos, quem participa de cada um e como deixar tudo pronto para o dia."
      />
      <LiveCatalog mode="parent" prepareHref="/pais/familia" />
    </ParentShell>
  )
}
