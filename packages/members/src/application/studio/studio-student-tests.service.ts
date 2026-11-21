import { ValidationError } from '@sistemazero/core/errors'
import type { ExecutionObjectiveRequest } from '@sistemazero/core/learning'
import { isStudioProTemplateId } from '@sistemazero/core/studio/pro-templates'
import {
  isRunnableStudentTestRule,
  studentTestServerBatches,
} from '@sistemazero/core/studio/student-test-runnable'
import { StudioStudentTestsSchema } from '@sistemazero/core/studio/student-tests'
import { isProCheckProject } from '@sistemazero/studio/server-check'
import {
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
} from '../../domain/learning/learning.errors'
import type { ProjectExecutionChecker } from '../../domain/ports/project-execution-checker.port'
import type { FreeStudioAccessService, FreeStudioActor } from './free-studio-access.service'

export interface StudioStudentTestResult {
  id: string
  passed: boolean
  /** O que o executor viu (o teste é da própria criança: o valor esperado é dela). */
  detail?: string
}

/**
 * "Meus testes" no Pro em JavaScript (proposta aprovada em 20/11/2026): os testes que a criança
 * escreve rodam no executor do servidor, o MESMO do "Verificar projeto" das aulas
 * (`ProjectExecutionChecker`, com o limite por pessoa do executor e o resultado reaproveitado
 * para o mesmo projeto e as mesmas regras). Quem pode: quem abre um projeto Pro no Estúdio
 * Completo (`FreeStudioAccessService`, `existing-pro`). Nada é guardado: rodar não muda o projeto.
 *
 * Um pedido roda UM lote (`studentTestServerBatches`: até 8 testes e 40 s de espera somada, os
 * tetos do executor): a borda espera 160 s por pedido, e o Estúdio manda os lotes em sequência.
 */
export class StudioStudentTestsService {
  constructor(
    private readonly access: Pick<FreeStudioAccessService, 'execute'>,
    private readonly checker: ProjectExecutionChecker | null,
  ) {}

  async run(
    actor: FreeStudioActor,
    input: { project: unknown; tests: unknown },
  ): Promise<{ results: StudioStudentTestResult[] }> {
    await this.access.execute(actor, 'existing-pro', 'javascript')
    const project = input.project
    if (
      !isProCheckProject(project) ||
      (project as { programmingLanguage?: unknown }).programmingLanguage === 'python'
    )
      throw new ValidationError('Os testes do servidor valem para projetos Pro em JavaScript.')
    const templateId = (project as { proMeta?: { templateId?: unknown } }).proMeta?.templateId
    if (!isStudioProTemplateId(templateId))
      throw new ValidationError('O modelo deste projeto Pro não é conhecido.')
    const parsed = StudioStudentTestsSchema.safeParse(input.tests)
    if (!parsed.success || parsed.data.length === 0)
      throw new ValidationError('Os testes estão com uma forma que o Estúdio não conhece.')
    const objectives: ExecutionObjectiveRequest[] = []
    for (const test of parsed.data) {
      const rule = test.rule
      if (!isRunnableStudentTestRule(rule, 'javascript', 'pro'))
        throw new ValidationError(`O teste "${test.name}" passa dos limites do Pro.`)
      objectives.push({ id: test.id, rule })
    }
    if (studentTestServerBatches(parsed.data).length !== 1)
      throw new ValidationError('Mande no máximo 8 testes e 40 segundos de espera por vez.')
    if (!this.checker) throw new ProjectCheckUnavailableError()
    try {
      const output = await this.checker.check({
        requester: actor.userId,
        project,
        kind: 'pro',
        templateId,
        objectives,
      })
      return { results: output.results }
    } catch (error) {
      // A recusa do executor é do projeto (não compila, grande demais): a criança lê o motivo.
      if (error instanceof ProjectCheckRejectedError) throw new ValidationError(error.reason)
      throw error
    }
  }
}
