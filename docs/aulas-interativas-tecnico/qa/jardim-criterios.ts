import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { JARDIM_ASSETS_2D, type JardimDimensao, type JardimEtapa } from './jardim-projeto'

const equal = (path: string, value: string | number | boolean): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
const changed = (path: string): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'changed',
})
const check = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  points: { afterStep: number; expect: ExecutionExpectation }[] = [],
): SectionProjectCheck => ({
  id,
  label,
  rule: { type: 'behavior', steps, expect, ...(points.length ? { checkpoints: points } : {}) },
})
export function jardimChecks(d: JardimDimensao, part: JardimEtapa): SectionProjectCheck[] {
  const three = d === '3d'
  const approach = (
    targetPath: string,
    avoidPaths?: string[],
    timeoutMs = 5500,
  ): ExecutionStep => ({
    action: three ? 'approachObject3d' : 'approachSprite',
    actorPath: 'personagem',
    targetPath,
    timeoutMs,
    ...(three ? { walkable: [{ minX: -9, maxX: 9, minZ: -4, maxZ: 4 }] } : {}),
    ...(avoidPaths ? { avoidPaths } : {}),
  })
  const present = (yes: boolean): ExecutionExpectation =>
    three
      ? equal('regador.visible', yes)
      : {
          target: { kind: 'value', path: 'regador._paintEpoch' },
          compare: yes ? 'notEquals' : 'equals',
          value: -1,
        }
  const flower = (open: boolean): ExecutionExpectation =>
    three
      ? {
          target: { kind: 'value', path: 'flor.userData.sz.animDone' },
          compare: open ? 'equals' : 'notEquals',
          value: true,
        }
      : {
          target: { kind: 'value', path: 'flor.image.url' },
          compare: open ? 'contains' : 'notContains',
          value: JARDIM_ASSETS_2D.find((a) => a.name === 'flor-aberta')!.dataUrl.slice(-180),
        }
  const movements: ExecutionStep[] = []
  const checkpoints: { afterStep: number; expect: ExecutionExpectation }[] = []
  for (const [i, key] of (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'] as const).entries()) {
    movements.push(
      { action: 'press', key, holdMs: i % 2 === 0 ? 300 : 500 },
      { action: 'wait', ms: 70 },
    )
    checkpoints.push({
      afterStep: movements.length,
      expect: {
        target: {
          kind: 'value',
          path: three
            ? `personagem.position.${i < 2 ? 'x' : 'z'}`
            : `personagem.${i < 2 ? 'x' : 'y'}`,
        },
        compare:
          i % 2 === 0 ? (i < 2 ? 'greaterThan' : 'lessThan') : i < 2 ? 'lessThan' : 'greaterThan',
        value: three ? (i < 2 ? -7 : 1) : i < 2 ? 130 : 310,
      },
    })
  }
  checkpoints.push({
    afterStep: movements.length,
    expect: equal(three ? 'personagem.userData.sz.vz' : 'personagem.vy', 0),
  })
  const movement = check(
    'andar',
    'Faça o personagem andar nas quatro direções e parar ao soltar a tecla.',
    movements,
    equal(three ? 'personagem.userData.sz.vx' : 'personagem.vx', 0),
    checkpoints,
  )
  const boundary = check(
    'limite',
    'Mantenha o personagem na tela e permita voltar depois de chegar à borda.',
    [
      { action: 'press', key: 'ArrowLeft', holdMs: 1200 },
      { action: 'press', key: 'ArrowUp', holdMs: 1800 },
      { action: 'press', key: 'ArrowRight', holdMs: 3500 },
      { action: 'press', key: 'ArrowDown', holdMs: 2500 },
      { action: 'press', key: 'ArrowLeft', holdMs: 200 },
      { action: 'press', key: 'ArrowUp', holdMs: 200 },
    ],
    { target: { kind: 'value', path: 'personagem.y' }, compare: 'lessThan', value: 528 },
    [
      { afterStep: 1, expect: changed('personagem.x') },
      { afterStep: 2, expect: changed('personagem.y') },
      {
        afterStep: 1,
        expect: { target: { kind: 'value', path: 'personagem.x' }, compare: 'atLeast', value: 0 },
      },
      {
        afterStep: 2,
        expect: { target: { kind: 'value', path: 'personagem.y' }, compare: 'atLeast', value: 0 },
      },
      {
        afterStep: 3,
        expect: { target: { kind: 'value', path: 'personagem.x' }, compare: 'atMost', value: 888 },
      },
      {
        afterStep: 4,
        expect: { target: { kind: 'value', path: 'personagem.y' }, compare: 'atMost', value: 528 },
      },
      {
        afterStep: 5,
        expect: {
          target: { kind: 'value', path: 'personagem.x' },
          compare: 'lessThan',
          value: 888,
        },
      },
    ],
  )
  const collection = check(
    'coletar',
    'Recolha o regador no encontro e mostre um aviso da coleta.',
    [{ action: 'wait', ms: 120 }, approach('regador')],
    present(false),
    [
      { afterStep: 1, expect: present(true) },
      { afterStep: 2, expect: changed('aviso') },
    ],
  )
  const memory: SectionProjectCheck = {
    id: 'lembrar',
    label:
      'Faça o jogo lembrar se o personagem já pegou o regador. No começo, ele ainda não pegou.',
    rule: {
      type: 'collectionMemory',
      dimension: d,
      actor: 'personagem',
      item: 'regador',
      destination: 'flor',
    },
  }
  const missing = check(
    'sem-regador',
    'Antes da coleta, mantenha a flor fechada e avise o que falta.',
    [approach('flor', ['regador']), { action: 'wait', ms: 1500 }],
    flower(false),
    [
      { afterStep: 2, expect: present(true) },
      { afterStep: 2, expect: changed('aviso') },
      ...(three
        ? [
            {
              afterStep: 2,
              expect: {
                target: { kind: 'value' as const, path: 'flor.userData.sz.animWant' },
                compare: 'notContains' as const,
                value: 'florescer',
              },
            },
          ]
        : []),
    ],
  )
  const success = check(
    'com-regador',
    'Depois da coleta, faça a flor abrir e mostrar o sucesso; uma nova partida recomeça sem a coleta.',
    [
      approach('regador'),
      { action: 'wait', ms: 120 },
      approach('flor'),
      { action: 'wait', ms: 1500 },
      { action: 'press', key: 'r', holdMs: 80 },
      { action: 'wait', ms: 500 },
    ],
    present(true),
    [
      { afterStep: 2, expect: present(false) },
      { afterStep: 2, expect: flower(false) },
      { afterStep: 4, expect: changed('aviso') },
      { afterStep: 4, expect: flower(true) },
      ...(three
        ? [
            {
              afterStep: 4,
              expect: {
                target: { kind: 'value' as const, path: 'flor.userData.sz.animWant' },
                compare: 'contains' as const,
                value: 'florescer',
              },
            },
          ]
        : []),
      { afterStep: 6, expect: flower(false) },
    ],
  )
  // A flor abre uma vez só (3D): com o regador, abrir a flor, sair dela pela esquerda e voltar.
  // O encontro só conta quando começa, por isso a saída e a volta. Sem a guarda (Se não ganhou),
  // a volta pede florescer de novo e a animação recomeça do botão fechado (animDone volta a
  // falso); com ela, a flor segue aberta. As idas têm prazos menores que as outras (3,5 s e 5 s)
  // para a parte caber nos 40 s do executor; a ida medida do começo até a flor leva cerca de 3 s.
  const once = check(
    'uma-vez',
    'Com o regador, faça a flor abrir, saia dela e volte: ela continua aberta, sem florescer de novo.',
    [
      approach('regador', undefined, 3500),
      { action: 'wait', ms: 120 },
      approach('flor', undefined, 5000),
      { action: 'wait', ms: 1500 },
      { action: 'press', key: 'ArrowLeft', holdMs: 600 },
      { action: 'press', key: 'ArrowRight', holdMs: 700 },
      { action: 'wait', ms: 100 },
    ],
    flower(true),
    [
      { afterStep: 1, expect: present(false) },
      { afterStep: 4, expect: flower(true) },
    ],
  )
  const position: SectionProjectCheck = {
    id: 'posicao',
    label: 'Escolha outro lugar alcançável para o regador e confira as regras.',
    rule: {
      type: 'changedGamePosition',
      dimension: d,
      object: 'regador',
      initial: three ? [-4, -2] : [300, 190],
    },
  }
  const levels = { inicio: 0, movimento: 1, limite: 2, coleta: 3, decisao: 4, posicao: 5 }
  const n = levels[part]
  return [
    ...(n >= 1 ? [movement] : []),
    ...(n >= 2 && !three ? [boundary] : []),
    ...(n >= 3 ? [collection] : []),
    ...(n >= 4 ? [memory, missing, success, ...(three ? [once] : [])] : []),
    ...(n >= 5 ? [position] : []),
  ]
}
