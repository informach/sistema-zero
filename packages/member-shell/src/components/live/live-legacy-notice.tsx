'use client'

/** A turma do roteiro antigo (antes dos cursos ao vivo): a sala nova não monta mais as etapas. */
export function LegacyCohortNotice() {
  return (
    <section role="status" className="space-y-2 rounded-2xl border bg-card p-6">
      <h2 className="sz-display text-xl">Esta turma é de um formato antigo</h2>
      <p className="text-muted-foreground">
        As oficinas mudaram de formato. Fale com a equipe para receber a turma nova.
      </p>
    </section>
  )
}
