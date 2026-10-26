import type { ExecutionStep } from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'

const approach = (targetPath: string, avoidPaths?: string[]): ExecutionStep => ({
  action: 'approachSprite',
  actorPath: 'personagem',
  targetPath,
  timeoutMs: 7500,
  ...(avoidPaths ? { avoidPaths } : {}),
})
export const memoriaFarolObservada: SectionJavaScriptProjectCheck = {
  id: 'memoria-em-execucao',
  label: 'Guarde a coleta e continue com a chave ao se afastar.',
  hint: 'Guarde verdadeiro no encontro com a chave. A informação deve continuar guardada enquanto a partida segue.',
  rule: {
    type: 'behavior',
    steps: [approach('chave'), approach('farol')],
    checkpoints: [
      {
        afterStep: 1,
        expect: { target: { kind: 'value', path: 'temChave' }, compare: 'equals', value: true },
      },
    ],
    expect: { target: { kind: 'value', path: 'temChave' }, compare: 'equals', value: true },
  },
}
export const portaSemChaveObservada: SectionJavaScriptProjectCheck = {
  id: 'porta-sem-chave-em-execucao',
  label: 'Sem chave, mantenha o farol apagado e mostre um aviso.',
  hint: 'Teste uma partida nova indo direto ao farol. Deixe um caminho em que seja possível chegar lá sem recolher a chave.',
  rule: {
    type: 'behavior',
    steps: [approach('farol', ['chave'])],
    checkpoints: [
      {
        afterStep: 1,
        expect: { target: { kind: 'value', path: 'temChave' }, compare: 'equals', value: false },
      },
      { afterStep: 1, expect: { target: { kind: 'value', path: 'aviso' }, compare: 'changed' } },
    ],
    expect: { target: { kind: 'value', path: 'ganhou' }, compare: 'equals', value: false },
  },
}
export const portaComChaveObservada: SectionJavaScriptProjectCheck = {
  id: 'porta-com-chave-em-execucao',
  label: 'Com a chave, acenda o farol e chame o barco.',
  hint: 'Teste recolher a chave antes de ir ao farol. O então deve registrar a vitória, acender o farol e mudar o aviso.',
  rule: {
    type: 'behavior',
    steps: [approach('chave'), approach('farol')],
    checkpoints: [
      {
        afterStep: 1,
        expect: { target: { kind: 'value', path: 'temChave' }, compare: 'equals', value: true },
      },
    ],
    expect: { target: { kind: 'value', path: 'ganhou' }, compare: 'equals', value: true },
  },
}
