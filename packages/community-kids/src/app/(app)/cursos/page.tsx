import { BookOpen } from 'lucide-react'
import { CourseCatalogClient } from '@/components/kids/course-catalog-client'
import { getEnv } from '@/lib/env'
import { listCatalog } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * "Todos os cursos": catálogo completo da plataforma. Com acesso → entra no
 * curso; sem acesso → cadeado e clique leva à página de vendas (funil) —
 * `metadata.salesPageUrl` do curso, com fallback na env `FUNNEL_URL`.
 */
export default async function CatalogPage() {
  const { status, body } = await listCatalog()
  const courses = status === 200 ? (body?.courses ?? []) : []
  const fallbackSalesUrl = getEnv().FUNNEL_URL ?? null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="sz-display text-2xl">Todos os cursos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo o que está disponível na plataforma — o que você já tem liberado e o que ainda pode
          destravar.
        </p>
      </div>

      {courses.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-border border-dashed px-6 py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum curso publicado ainda.</p>
        </section>
      ) : (
        // Busca/filtros client-side persistidos na URL (?q=&acesso=&ordem=).
        <CourseCatalogClient courses={courses} fallbackSalesUrl={fallbackSalesUrl} />
      )}
    </div>
  )
}
