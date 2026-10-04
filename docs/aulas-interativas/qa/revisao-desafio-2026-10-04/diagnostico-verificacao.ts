/**
 * Auditoria local dos critérios do Farol em 04/10/2026.
 * Não grava arquivos, não altera projetos persistidos e não acessa o Admin.
 * Imprime a resposta dos critérios atuais a quatro alterações de diagnóstico.
 * Executar da raiz: bun docs/aulas-interativas/qa/revisao-desafio-2026-10-04/diagnostico-verificacao.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningManifest } from '../../../../packages/core/src/learning'
import { evaluateStudioSectionProject } from '../../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../../packages/studio/src/ir/schema'
import { type DiaDoFarol, montarProjetoFarol } from '../desafio-farol-projeto'

function inspect(
  label: string,
  day: DiaDoFarol,
  stage: Parameters<typeof montarProjetoFarol>[0],
  mutate: (ir: SZIRV2) => void,
) {
  const manifest = JSON.parse(
    readFileSync(resolve(import.meta.dir, `../../aulas/desafio-${day}.manifesto.json`), 'utf8'),
  ) as LearningManifest
  const checks = manifest.sections.flatMap((section) => section.completion?.projectChecks ?? [])
  const project = montarProjetoFarol(stage)
  const ir = structuredClone(project.ir)
  mutate(ir)
  const result = evaluateStudioSectionProject(checks, {
    ...project,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
  })
  console.log(
    JSON.stringify({
      case: label,
      allPassed: result.length > 0 && result.every((item) => item.passed),
      checks: result.map((item) => ({ id: item.checkId, passed: item.passed })),
    }),
  )
}

inspect('Dia 1: movimento e borda fora de A cada quadro', 'dia-1', 'dia-2', (ir) => {
  const frame = ir.behavior.loops.find((item) => item.type === 'g2d:updateEachFrame')
  if (frame?.type !== 'g2d:updateEachFrame') throw new Error('A cada quadro ausente')
  const moves = frame.body.filter((item) =>
    ['g2d:topDown', 'g2d:clampToScreen'].includes(item.type),
  )
  if (moves.length !== 2) throw new Error('Movimento ou borda ausente')
  frame.body = frame.body.filter((item) => !moves.includes(item))
  ir.behavior.loops.push(...moves)
})

inspect('Dia 2: movimento anterior removido', 'dia-2', 'dia-3', (ir) => {
  const frame = ir.behavior.loops.find((item) => item.type === 'g2d:updateEachFrame')
  if (frame?.type !== 'g2d:updateEachFrame') throw new Error('A cada quadro ausente')
  if (!frame.body.some((item) => item.type === 'g2d:topDown'))
    throw new Error('Movimento ausente antes da alteração')
  frame.body = frame.body.filter((item) => item.type !== 'g2d:topDown')
})

inspect('Dia 3: temChave começa verdadeiro', 'dia-3', 'concluido', (ir) => {
  const memory = ir.behavior.start.find((item) => item.type === 'var' && item.name === 'temChave')
  if (memory?.type !== 'var') throw new Error('Declaração de temChave ausente')
  memory.value = { type: 'bool', value: true }
})

inspect('Dia 3: coleta não guarda temChave', 'dia-3', 'concluido', (ir) => {
  const event = ir.behavior.events.find(
    (item) => item.type === 'g2d:onOverlap' && item.bVar === 'chave',
  )
  if (event?.type !== 'g2d:onOverlap') throw new Error('Coleta ausente')
  if (!event.body.some((item) => item.type === 'assign' && item.name === 'temChave'))
    throw new Error('Atribuição de temChave ausente antes da alteração')
  event.body = event.body.filter((item) => !(item.type === 'assign' && item.name === 'temChave'))
})
