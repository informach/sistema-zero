import {
  isSectionExecutionRule,
  type SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'

/**
 * Dia 1/andar only, before collisions and screen clamping.
 * The curriculum caller supplies its prepared actor path. This factory does not
 * discover learner names or publish criteria to an existing assignment.
 */
export function farolDirecaoObservada(
  targetPath: string,
): (SectionJavaScriptProjectCheck & { rule: SectionExecutionRule })[] {
  const directions = [
    {
      id: 'andar-cima',
      key: 'ArrowUp',
      axis: 'y',
      compare: 'decreased',
      label: 'Com a seta para cima, o personagem sobe.',
    },
    {
      id: 'andar-baixo',
      key: 'ArrowDown',
      axis: 'y',
      compare: 'increased',
      label: 'Com a seta para baixo, o personagem desce.',
    },
    {
      id: 'andar-esquerda',
      key: 'ArrowLeft',
      axis: 'x',
      compare: 'decreased',
      label: 'Com a seta para a esquerda, o personagem vai para a esquerda.',
    },
    {
      id: 'andar-direita',
      key: 'ArrowRight',
      axis: 'x',
      compare: 'increased',
      label: 'Com a seta para a direita, o personagem vai para a direita.',
    },
  ] as const
  return directions.map(({ id, key, axis, compare, label }) => {
    const rule: SectionExecutionRule = {
      type: 'behavior',
      observation: { type: 'idleBeforeAction', idleMs: 80 },
      steps: [{ action: 'press', key, holdMs: 80 }],
      expect: { target: { kind: 'spritePosition', path: targetPath, axis }, compare },
    }
    if (!isSectionExecutionRule(rule))
      throw new Error('Vincule o personagem desta parte antes de preparar os critérios de direção.')
    return { id, label, rule }
  })
}
