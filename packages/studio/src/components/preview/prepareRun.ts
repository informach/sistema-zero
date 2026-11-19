/**
 * A intenção de executar só autoriza uma revisão confirmada. Edições são imutáveis:
 * se o documento mudar durante a escrita, a nova revisão precisa de outra confirmação.
 * Cancelar invalida a intenção, nunca a mutação que já está em andamento.
 */
export function createRunPreparation<Project extends { id: string }>(options: {
  project: () => Project | null
  /** Há edição ainda não gravada? Lido depois do flush dos editores. */
  dirty: () => boolean
  flush: () => void
  save: () => Promise<void>
  pending: (value: boolean) => void
  error: (value: string | null) => void
}) {
  let generation = 0
  let pending = false
  return {
    cancel() {
      generation++
      pending = false
      options.pending(false)
    },
    async run(start: (project: Project) => void): Promise<void> {
      if (pending) return
      options.flush()
      const before = options.project()
      if (!before) return
      options.error(null)
      if (!options.dirty()) {
        start(before)
        return
      }
      const attempt = ++generation
      pending = true
      options.pending(true)
      try {
        let revision = before
        while (attempt === generation) {
          await options.save()
          if (attempt !== generation) return
          options.flush()
          const current = options.project()
          if (!current || current.id !== before.id) return
          if (current === revision) {
            if (options.dirty())
              throw new Error(
                'A gravação não confirmou esta revisão. Suas edições continuam no editor.',
              )
            start(current)
            return
          }
          revision = current
        }
      } catch (error) {
        if (attempt === generation) {
          options.error(
            error instanceof Error ? error.message : 'Não foi possível guardar o projeto.',
          )
        }
      } finally {
        if (attempt === generation) {
          pending = false
          options.pending(false)
        }
      }
    },
  }
}
