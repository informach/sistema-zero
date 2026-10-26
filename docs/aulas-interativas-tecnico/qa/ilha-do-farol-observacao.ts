import type {
  ExecutionStep,
  ExecutionExpectation,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
export const ILHA_CAMINHOS = [
  { minX: -11, maxX: 0.6, minZ: -5, maxZ: 5 },
  { minX: 0.6, maxX: 4, minZ: 0.4, maxZ: 1.1 },
  { minX: 4, maxX: 6.1, minZ: -0.5, maxZ: 1.7 },
]
const approach = (targetPath: string, avoidPaths?: string[]): ExecutionStep => ({
  action: 'approachObject3d',
  actorPath: 'personagem',
  targetPath,
  walkable: ILHA_CAMINHOS,
  timeoutMs: 7000,
  ...(avoidPaths ? { avoidPaths } : {}),
})
const equals = (path: string, value: boolean): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
export const ilhaCollect: SectionProjectCheck = {
  id: 'coleta-em-jogo',
  label: 'Alcance a chave no lugar escolhido e recolha apenas ao encostar.',
  rule: {
    type: 'behavior',
    steps: [{ action: 'wait', ms: 150 }, approach('chave')],
    checkpoints: [{ afterStep: 1, expect: equals('chave.visible', true) }],
    expect: equals('chave.visible', false),
  },
}
export const ilhaCollectWithMessage: SectionProjectCheck = {
  ...ilhaCollect,
  rule: {
    ...(ilhaCollect.rule as Extract<SectionProjectCheck['rule'], { type: 'behavior' }>),
    checkpoints: [
      { afterStep: 1, expect: equals('chave.visible', true) },
      { afterStep: 2, expect: { target: { kind: 'value', path: 'aviso' }, compare: 'changed' } },
    ],
  },
}
export const ilhaMemory: SectionProjectCheck = {
  id: 'memoria-em-jogo',
  label: 'Guarde a coleta e conserve a chave ao continuar andando.',
  rule: {
    type: 'behavior',
    steps: [
      approach('chave'),
      { action: 'press', key: 'ArrowDown', holdMs: 250 },
      { action: 'wait', ms: 150 },
    ],
    checkpoints: [{ afterStep: 1, expect: equals('temChave', true) }],
    expect: equals('temChave', true),
  },
}
export const ilhaMissing: SectionProjectCheck = {
  id: 'sem-chave-em-jogo',
  label: 'Em uma partida nova, o farol continua apagado e pede a chave.',
  rule: {
    type: 'behavior',
    steps: [approach('farol', ['chave'])],
    checkpoints: [
      { afterStep: 1, expect: equals('temChave', false) },
      { afterStep: 1, expect: equals('farolAceso.visible', false) },
      { afterStep: 1, expect: { target: { kind: 'value', path: 'aviso' }, compare: 'changed' } },
    ],
    expect: equals('ganhou', false),
  },
}
export const ilhaWin: SectionProjectCheck = {
  id: 'vitoria-em-jogo',
  label: 'Recolha a chave, acenda o farol e recomece uma partida.',
  rule: {
    type: 'behavior',
    steps: [
      approach('chave'),
      approach('farol'),
      { action: 'wait', ms: 500 },
      { action: 'press', key: 'r', holdMs: 80 },
      { action: 'wait', ms: 300 },
    ],
    checkpoints: [
      { afterStep: 1, expect: equals('temChave', true) },
      { afterStep: 2, expect: equals('ganhou', true) },
      { afterStep: 2, expect: equals('farolAceso.visible', true) },
      { afterStep: 2, expect: { target: { kind: 'value', path: 'aviso' }, compare: 'changed' } },
      {
        afterStep: 3,
        expect: {
          target: { kind: 'value', path: 'barco.position.x' },
          compare: 'lessThan',
          value: 8,
        },
      },
      { afterStep: 5, expect: equals('temChave', false) },
      { afterStep: 5, expect: equals('ganhou', false) },
      { afterStep: 5, expect: equals('farolAceso.visible', false) },
    ],
    expect: equals('chave.visible', true),
  },
}
