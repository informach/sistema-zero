import { LiveCatalog } from '@sistemazero/member-shell/components/live/live-catalog'

/**
 * As oficinas ao vivo da comunidade adulta (cursos ao vivo, 14/10/2026): as turmas em que a pessoa
 * tem vaga. Nenhuma outra tela divulga os cursos ao vivo.
 */
export default function WorkshopsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-8">
      <header className="space-y-2">
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">Ao vivo</p>
        <h1 className="sz-display text-3xl font-bold md:text-4xl">Oficinas ao vivo</h1>
        <p className="text-muted-foreground">
          Os encontros com a professora e a turma, as gravações e o prazo de cada um.
        </p>
      </header>
      <LiveCatalog skin="adult" />
    </div>
  )
}
