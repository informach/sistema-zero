import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'
import { CalendarDays } from 'lucide-react'
import { PageBand, PageBody } from '@/components/community/page'

/**
 * As oficinas ao vivo da comunidade adulta (cursos ao vivo, 14/10/2026): as turmas em que a pessoa
 * tem vaga. Nenhuma outra tela divulga os cursos ao vivo.
 */
export default function WorkshopsPage() {
  return (
    <>
      <PageBand
        kicker="Ao vivo"
        title="Oficinas ao vivo"
        lead="Seus encontros com a turma, as gravações para rever e até quando cada um fica aberto."
      />
      <PageBody>
        <LiveCatalog
          skin="adult"
          empty={
            <section className="sz-card-sm flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <h2 className="font-bold text-lg">Nenhum encontro marcado por aqui</h2>
                <p className="text-muted-foreground">
                  Quando você tiver vaga numa turma, a data do primeiro encontro aparece nesta
                  página.
                </p>
              </div>
            </section>
          }
        />
      </PageBody>
    </>
  )
}
