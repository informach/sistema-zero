import { notFound, redirect } from 'next/navigation'
import { getMyCourse, listParentCatalog } from '@/server/members'
import { loadParentSaleOffers } from '@/server/parent-course-offers'
import { getSession } from '@/server/session'
import { ParentCourseClosed, ParentCourseView } from './parent-course-view'

export const dynamic = 'force-dynamic'

/**
 * A página de um curso para pais (14/11/2026), no formato da página de curso do adulto: capa,
 * progresso, módulos e aulas. Sem acesso (403), o curso aparece fechado com o caminho para
 * liberar; curso da criança ou inexistente, 404.
 */
export default async function ParentCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const { slug } = await params
  const courseRes = await getMyCourse(slug)
  if (courseRes.status === 200 && courseRes.body)
    return <ParentCourseView parentName={session.firstName} course={courseRes.body} />
  if (courseRes.status === 403) {
    const catalog = await listParentCatalog().catch(() => null)
    const course =
      catalog?.status === 200
        ? catalog.body?.courses.find((item) => item.courseSlug === slug)
        : undefined
    if (course) {
      // A compra pelo mini checkout usa a oferta de venda do curso (o preço vem do catálogo).
      const offers = await loadParentSaleOffers([course])
      return (
        <ParentCourseClosed
          parentName={session.firstName}
          course={course}
          offer={offers[course.courseSlug] ?? null}
        />
      )
    }
  }
  if (courseRes.status === 403 || courseRes.status === 404 || courseRes.status === 423) notFound()
  throw new Error('Falha ao carregar o curso')
}
