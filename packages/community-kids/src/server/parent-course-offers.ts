import 'server-only'
import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import type { CatalogCourseView } from '@/lib/types'
import { getSaleOfferReadonly } from './members'

/**
 * As ofertas de venda dos cursos para pais FECHADOS (25/11/2026), lidas do catálogo pelo
 * `salesOfferRef` de cada curso: o preço, o prazo e a garantia dos cartões e da página do curso.
 * Melhor esforço: a oferta que não vem (catálogo fora, pausada, outro público) só deixa o curso
 * sem compra, nunca derruba a página nem mostra preço inventado.
 */
export async function loadParentSaleOffers(
  courses: readonly CatalogCourseView[],
): Promise<Record<string, CommerceCatalogOffer>> {
  const wanted = courses.filter((course) => !course.hasAccess && course.salesOfferRef)
  const found = await Promise.all(
    wanted.map(async (course) => {
      const offer = await getSaleOfferReadonly(course.salesOfferRef as string).catch(() => null)
      return offer && offer.pricingMode === 'one_time'
        ? ([course.courseSlug, offer] as const)
        : null
    }),
  )
  return Object.fromEntries(found.filter((entry) => entry !== null))
}
