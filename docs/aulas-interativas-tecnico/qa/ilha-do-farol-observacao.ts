import {
  EXECUTION_LIMITS,
  type ExecutionExpectation,
  type ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
export interface Retangulo {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}
/** Os mesmos retângulos dos `walkArea` do jogo (`ilha-do-farol-projeto.ts`). */
export const ILHA_AREAS: Retangulo[] = [
  { minX: -11, maxX: 1, minZ: -5, maxZ: 5 },
  { minX: 0.6, maxX: 4.1, minZ: 0.4, maxZ: 1.1 },
  { minX: 4, maxX: 6.1, minZ: -0.5, maxZ: 1.7 },
]
/**
 * Os obstáculos sólidos da Ilha (o jogo marca o cenário e a pedra com "marcar … como sólido"), no
 * chão do jogo: os quatro blocos da pedra e os troncos dos dois coqueiros da praia tropical. São
 * os pedaços dos modelos do Blender (`ilha-obstaculos.test.ts` confere contra os arquivos).
 */
export const ILHA_OBSTACULOS: Retangulo[] = [
  { minX: -3, maxX: -0.3, minZ: -2.2, maxZ: 0.6 },
  { minX: -1.4, maxX: -0.1, minZ: -0.4, maxZ: 0.9 },
  { minX: -3.8, maxX: -2.7, minZ: -1.2, maxZ: -0.2 },
  { minX: -4.3, maxX: -3.3, minZ: -1.1, maxZ: 0 },
  { minX: -7.1, maxX: -6.8, minZ: -4.4, maxZ: -4.1 },
  { minX: -6.7, maxX: -6.4, minZ: 4.4, maxZ: 4.6 },
]
/**
 * A metade da pegada do personagem (x, z): o Jogo 3D usa 60% da caixa dele (0,5 por 0,6) para
 * bater nos sólidos, e o centro dele não chega mais perto que isso.
 */
const PERSONAGEM = { x: 0.3, z: 0.36 }
/**
 * Tira de cada área os lugares em que o CENTRO do personagem bateria num obstáculo: o robô do
 * executor planeja o caminho pelo que sobra e contorna a pedra e os troncos, como a criança.
 */
export function recortarObstaculos(areas: Retangulo[], obstaculos: Retangulo[]): Retangulo[] {
  let pedacos = areas
  for (const o of obstaculos) {
    const h = {
      minX: o.minX - PERSONAGEM.x,
      maxX: o.maxX + PERSONAGEM.x,
      minZ: o.minZ - PERSONAGEM.z,
      maxZ: o.maxZ + PERSONAGEM.z,
    }
    pedacos = pedacos.flatMap((r) => {
      if (h.minX >= r.maxX || h.maxX <= r.minX || h.minZ >= r.maxZ || h.maxZ <= r.minZ) return [r]
      const sobra: Retangulo[] = []
      if (h.minX > r.minX) sobra.push({ ...r, maxX: h.minX })
      if (h.maxX < r.maxX) sobra.push({ ...r, minX: h.maxX })
      const meio = { minX: Math.max(r.minX, h.minX), maxX: Math.min(r.maxX, h.maxX) }
      if (h.minZ > r.minZ) sobra.push({ ...meio, minZ: r.minZ, maxZ: h.minZ })
      if (h.maxZ < r.maxZ) sobra.push({ ...meio, minZ: h.maxZ, maxZ: r.maxZ })
      return sobra
    })
  }
  return pedacos.map((r) => ({
    minX: +r.minX.toFixed(3),
    maxX: +r.maxX.toFixed(3),
    minZ: +r.minZ.toFixed(3),
    maxZ: +r.maxZ.toFixed(3),
  }))
}
/** Por onde o robô pode andar na Ilha: as áreas do jogo, sem a pedra e os troncos. */
export const ILHA_CAMINHOS = recortarObstaculos(ILHA_AREAS, ILHA_OBSTACULOS)
/**
 * O prazo é do ROBÔ que aperta as setas no lugar da criança, não do jogo: no jogo a chave fica
 * guardada em `temChave` pelo tempo que for. Sem a chave, o caminho vai direto do começo ao
 * farol (11 unidades, o trecho mais longo do curso), por isso ele leva o prazo máximo.
 */
const approach = (targetPath: string, avoidPaths?: string[], timeoutMs = 7000): ExecutionStep => ({
  action: 'approachObject3d',
  actorPath: 'personagem',
  targetPath,
  walkable: ILHA_CAMINHOS,
  timeoutMs,
  ...(avoidPaths ? { avoidPaths } : {}),
})
const equals = (path: string, value: boolean): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare: 'equals',
  value,
})
/**
 * O farol aceso: o pedido de animação do objeto (`animWant`) é "acender" e, quando ele acaba, o
 * laço pede "aceso". Os dois nomes começam com "ace"; apagado não há pedido nenhum.
 */
const lit = (on: boolean): ExecutionExpectation => ({
  target: { kind: 'value', path: 'farol.userData.sz.animWant' },
  compare: on ? 'contains' : 'notContains',
  value: 'ace',
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
    steps: [approach('farol', ['chave'], EXECUTION_LIMITS.maxApproachMs)],
    checkpoints: [
      { afterStep: 1, expect: equals('temChave', false) },
      { afterStep: 1, expect: lit(false) },
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
      { afterStep: 2, expect: lit(true) },
      { afterStep: 2, expect: { target: { kind: 'value', path: 'aviso' }, compare: 'changed' } },
      {
        afterStep: 3,
        expect: {
          target: { kind: 'value', path: 'barco.position.x' },
          compare: 'lessThan',
          // O barco sai de x 13, na beira da vista, e vem até 6,6: meio segundo depois do
          // farol acender ele já saiu do lugar.
          value: 12.5,
        },
      },
      { afterStep: 5, expect: equals('temChave', false) },
      { afterStep: 5, expect: equals('ganhou', false) },
      { afterStep: 5, expect: lit(false) },
    ],
    expect: equals('chave.visible', true),
  },
}
