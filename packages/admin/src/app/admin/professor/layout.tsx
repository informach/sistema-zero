import { redirect } from 'next/navigation'
import { canAccessSection } from '@/components/admin/nav'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Defesa em profundidade da Sala do Professor: o layout raiz já validou
 * papel/status, e o proxy aplica o gate por seção; este layout re-checa no
 * subtree novo (mesmo padrão de dupla checagem do resto do painel). Hoje o
 * grupo `professor` é aberto a todos os papéis do painel — o gate morde quando
 * o papel `professor` nascer e os grupos ganharem `roles`.
 */
export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user || !canAccessSection(user.role, '/admin/professor/entregas')) redirect('/admin')
  return <>{children}</>
}
