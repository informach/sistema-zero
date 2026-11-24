import type { ExecutionObservation } from '@sistemazero/core/learning'

/**
 * O resultado de um teste da aba "Meus testes", o mesmo nos dois executores: o palco escondido do
 * JavaScript (`runner.ts`) e a execução escondida do Python (`pythonRunner.ts`). Módulo à parte
 * porque cada executor traz o que só ele usa (o do JavaScript, o analisador do instrumentador).
 */
export type StudentTestOutcome =
  | { status: 'passed'; observation: ExecutionObservation }
  | {
      status: 'failed'
      detail: string
      observation: ExecutionObservation
      /** "Ver como o jogo terminou": a foto do palco escondido no fim (ou `null` sem foto). */
      ending: string | null
    }
  /** O jogo não respondeu a tempo (abriu travado, ou um passo nunca terminou). */
  | { status: 'timeout' }
  /** O teste não segue o contrato inteiro (um passo ou uma conferência fora dos limites). */
  | { status: 'invalid' }
  /** Um passo que este executor ainda não sabe fazer. */
  | { status: 'unsupported' }
  /** A prévia não tem como montar o jogo agora (os materiais ou os motores chegando). */
  | { status: 'unavailable' }
  /** O projeto não pôde ser gravado antes (o teste, como o Rodar, só roda o que está gravado). */
  | { status: 'unsaved' }
  | { status: 'cancelled' }
  /**
   * O resultado do executor do servidor (o Pro): passou ou não, e o que ele viu (o teste é da
   * própria criança, o valor esperado é dela). Sem a observação nem a foto do fim.
   */
  | { status: 'remote'; passed: boolean; detail: string | null }

/** O tamanho do palco do teste: o mesmo do executor do servidor (`CHECK_VIEWPORT`). */
export const STUDENT_TEST_VIEWPORT = { width: 1024, height: 640 } as const

/** O teste passou (no navegador ou no servidor). */
export function outcomePassed(outcome: StudentTestOutcome | undefined): boolean {
  return outcome?.status === 'passed' || (outcome?.status === 'remote' && outcome.passed)
}
