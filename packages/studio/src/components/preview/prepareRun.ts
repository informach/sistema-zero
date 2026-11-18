/** Quanto o Rodar espera a gravação confirmar. Passou disso, roda e a gravação segue ao fundo. */
export const RUN_SAVE_WAIT_MS = 1500

/**
 * Liga o Rodar à gravação que já existe, sem nunca cancelar uma escrita.
 *
 * - Projeto sem mudança: não grava e roda na hora, no mesmo instante do clique.
 * - Projeto com mudança: grava e espera a confirmação por no máximo `waitMs`.
 * - Gravação que falha ou demora: roda assim mesmo. O aviso de falha é o do selo de salvar;
 *   o aluno nunca fica sem poder rodar por causa do armazenamento.
 */
export function createRunPreparation<Project extends { id: string }>(options: {
  project: () => Project | null
  /** Há edição ainda não gravada? Lido depois do flush dos editores. */
  dirty: () => boolean
  flush: () => void
  save: () => Promise<void>
  pending: (value: boolean) => void
  waitMs?: number
}) {
  const waitMs = options.waitMs ?? RUN_SAVE_WAIT_MS
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
      if (!options.dirty()) {
        start(before)
        return
      }
      const attempt = ++generation
      pending = true
      options.pending(true)
      let timer: ReturnType<typeof setTimeout> | null = null
      try {
        // A falha já marca o selo de salvar dentro do serviço; aqui ela só não pode travar o Rodar.
        const saved = options.save().catch(() => {})
        const limit = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, waitMs)
        })
        await Promise.race([saved, limit])
      } finally {
        if (timer) clearTimeout(timer)
      }
      if (attempt !== generation) return
      pending = false
      options.pending(false)
      // Edições feitas durante a espera entram nesta execução; a gravação automática cuida delas.
      options.flush()
      const current = options.project()
      if (!current || current.id !== before.id) return
      start(current)
    },
  }
}
