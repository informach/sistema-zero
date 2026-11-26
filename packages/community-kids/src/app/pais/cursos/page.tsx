import { redirect } from 'next/navigation'
import { listParentCatalog, listParentCourses } from '@/server/members'
import { loadParentSaleOffers } from '@/server/parent-course-offers'
import { getSession } from '@/server/session'
import { ParentCoursesView } from './parent-courses-view'

export const dynamic = 'force-dynamic'

/**
 * Cursos para pais (14/11/2026): o catálogo dos cursos com "Para quem: pais" e o progresso da
 * conta. Quem assina a Comunidade tem todos liberados; quem não assina vê os fechados com o
 * caminho para liberar. Falha na leitura vira lista vazia com recado, nunca erro da página.
 */
export default async function ParentCoursesPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const [catalogRes, mineRes] = await Promise.all([
    listParentCatalog().catch(() => null),
    listParentCourses().catch(() => null),
  ])
  const catalog = catalogRes?.status === 200 ? (catalogRes.body?.courses ?? []) : []
  // O preço de cada curso fechado vem da oferta de venda dele no catálogo.
  const offers = await loadParentSaleOffers(catalog)
  return (
    <ParentCoursesView
      parentName={session.firstName}
      catalog={catalog}
      offers={offers}
      mine={mineRes?.status === 200 ? (mineRes.body?.courses ?? []) : []}
      failed={catalogRes?.status !== 200}
    />
  )
}
