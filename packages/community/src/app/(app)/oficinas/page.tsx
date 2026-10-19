import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'
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
        lead="Os encontros com a professora e a turma, as gravações e o prazo para rever cada um."
      />
      <PageBody>
        <LiveCatalog skin="adult" />
      </PageBody>
    </>
  )
}
