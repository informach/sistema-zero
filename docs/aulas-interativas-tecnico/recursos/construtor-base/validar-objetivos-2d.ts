/** Executa exatamente as teclas/esperas dos critérios e usa o veredito oficial do core. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createExecutionObservationCodec } from '../../../../packages/core/src/learning/execution-observation'
import {
  type ExecutionExpectation,
  isExecutionRule,
  judgeExecutionObservation,
} from '../../../../packages/core/src/learning/project-execution'
import { config2D } from '../../qa/construtor-2d'
import { formatarJson } from '../../qa/formatar-json'
import { boot } from './runtime-2d'

const objectives = []
const codec = createExecutionObservationCodec()
for (const stage of config2D.etapas) {
  const checks = config2D.checks(stage).filter((check) => isExecutionRule(check.rule))
  if (!checks.length) continue
  const bytes = readFileSync(resolve(config2D.pasta, 'projetos', `${stage}.szproject.json`))
  const project = JSON.parse(bytes.toString('utf8'))
  assert.equal(project.files['script.js'], config2D.montarProjeto(stage).files['script.js'])
  for (const objective of checks) {
    const rule = objective.rule
    assert.equal(rule.type, 'behavior')
    if (rule.type !== 'behavior')
      throw new Error('Este adaptador observa somente objetivos de comportamento')
    const game = await boot(project, project.files)
    try {
      const observe = (expect: ExecutionExpectation) => {
        assert.equal(expect.target.kind, 'value')
        if (expect.target.kind !== 'value') throw new Error('Alvo sem adaptador')
        const value = expect.target.path
          .split('.')
          .reduce<unknown>(
            (object, key) =>
              object !== null && typeof object === 'object'
                ? (object as Record<string, unknown>)[key]
                : undefined,
            game.state(),
          )
        return {
          found: value !== undefined,
          ...(value !== undefined ? { value: codec.encode(value, 20_000) } : {}),
        }
      }
      // O executor espera 250 ms antes da primeira leitura, e usa checkpoints reais.
      game.tick(Math.ceil(250 / (1000 / 60)))
      const initial = observe(rule.expect)
      const checkpoints = (rule.checkpoints ?? []).map((point) => ({
        initial: observe(point.expect),
        final: undefined as ReturnType<typeof observe> | undefined,
      }))
      const capture = (afterStep: number) => {
        for (const [index, point] of (rule.checkpoints ?? []).entries())
          if (point.afterStep === afterStep) checkpoints[index]!.final = observe(point.expect)
      }
      capture(0)
      for (const [index, step] of rule.steps.entries()) {
        if (step.action === 'wait') game.tick(Math.ceil(step.ms / (1000 / 60)))
        else if (step.action === 'press') {
          game.key(step.key)
          game.tick(Math.ceil((step.holdMs ?? 80) / (1000 / 60)))
          game.key(step.key, false)
        } else throw new Error(`Passo sem adaptador: ${step.action}`)
        capture(index + 1)
      }
      game.tick(Math.ceil(250 / (1000 / 60)))
      const observation = {
        id: objective.id,
        type: 'behavior' as const,
        initial,
        final: observe(rule.expect),
        ...(rule.checkpoints ? { checkpoints } : {}),
        errors: game.errors,
      }
      const verdict = judgeExecutionObservation(rule, observation)
      assert.equal(
        verdict.passed,
        true,
        `${stage}/${objective.id}: ${JSON.stringify({ verdict, observation })}`,
      )
      assert.deepEqual(game.warnings, [])
      objectives.push({
        stage,
        id: objective.id,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        observation,
        verdict,
      })
    } finally {
      game.dispose()
    }
  }
}
const report = {
  scope:
    'Jogo 2D oficial e Canvas2D real, teclas/esperas adaptadas para relógio determinístico, codec escalar e judgeExecutionObservation oficiais; checkpoints e settle250ms do executor respeitados. Não é execução no Estúdio publicado nem Verificar plano da gravação.',
  objectives,
}
const target = resolve(import.meta.dir, '../../qa/relatorios/construtor-base-objetivos-2d.json')
mkdirSync(resolve(target, '..'), { recursive: true })
writeFileSync(target, formatarJson(report))
console.log(JSON.stringify({ passed: true, objectives: objectives.length }))
