import { CourseCatalogClient } from '@/components/kids/course-catalog-client'
import { KidsMascot } from '@/components/kids/mascot'
import { listCatalog } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * "Todos os cursos": catálogo completo da plataforma. Com acesso → entra no
 * curso; sem acesso → cadeado e clique leva à página de vendas do curso
 * (`metadata.salesPageUrl`). Kids NÃO tem funil (v1): sem `salesPageUrl` o card
 * fica não-clicável — por isso nenhum fallback de `FUNNEL_URL` aqui.
 */
export default async function CatalogPage() {
  const { status, body } = await listCatalog()
  if (status !== 200) throw new Error('Falha ao carregar o catálogo')
  const courses = body?.courses ?? []

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="sz-display text-2xl md:text-3xl">Todos os cursos</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Suas aventuras de aprender: as que já são suas e as que você ainda pode ganhar.
        </p>
      </div>

      {courses.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border border-dashed px-6 py-16 text-center">
          <KidsMascot expression="thinking" className="size-16" />
          <p className="text-muted-foreground text-sm">
            Os cursos estão a caminho! Volte daqui a pouquinho. 🚀
          </p>
        </section>
      ) : (
        // Busca/filtros client-side persistidos na URL (?q=&acesso=&ordem=).
        <CourseCatalogClient courses={courses} />
      )}
    </div>
  )
}
