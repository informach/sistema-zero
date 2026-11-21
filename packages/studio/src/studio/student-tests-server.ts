import type { StudioStudentTest } from '@sistemazero/core/studio/student-tests'

/**
 * "Meus testes" no Pro (proposta aprovada em 20/11/2026): no Pro não há palco escondido no
 * navegador; os testes rodam no executor do servidor, o mesmo do "Verificar projeto", com limite
 * por pessoa. O host (o Estúdio Completo) entrega este adaptador; sem ele, a aba Meus testes não
 * aparece no Pro. Só tipos: o pacote de abertura do Estúdio não paga por ele.
 */
export interface StudioStudentTestsServerResult {
  id: string
  passed: boolean
  /** O que o executor viu (o teste é da própria criança: o valor esperado é dela). */
  detail?: string
}

export interface StudioStudentTestsServer {
  /**
   * Roda UM lote no servidor (até 8 testes e 40 s de espera somada, `studentTestServerBatches`),
   * com o projeto inteiro como está gravado. Recusa com um erro de frase pronta para a criança.
   */
  run(input: {
    project: unknown
    tests: readonly StudioStudentTest[]
    signal?: AbortSignal
  }): Promise<{ results: StudioStudentTestsServerResult[] }>
}
