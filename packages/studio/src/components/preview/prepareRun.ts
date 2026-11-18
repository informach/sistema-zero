/** Coordinates run intent with the existing save service; never cancels a write. */
export function createRunPreparation<Project extends { id: string }>(options: {
  project: () => Project | null
  flush: () => void
  save: () => Promise<void>
  pending: (value: boolean) => void
  error: (message: string) => void
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
      if (pending || !options.project()) return
      const attempt = ++generation
      const id = options.project()?.id
      pending = true
      options.pending(true)
      try {
        options.flush()
        const saved = options.project()
        if (!saved || saved.id !== id) return
        await options.save()
        if (attempt !== generation) return
        // Edits may still be in Blockly's buffer while a remote save is in flight.
        options.flush()
        if (options.project() !== saved) {
          options.error(
            'O projeto mudou enquanto era salvo. Aperte Rodar para usar a edição atual.',
          )
          return
        }
        start(saved)
      } catch (error) {
        if (attempt === generation) {
          const detail = error instanceof Error ? error.message : String(error)
          options.error(`Não consegui guardar o projeto antes de rodar. ${detail}`)
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
