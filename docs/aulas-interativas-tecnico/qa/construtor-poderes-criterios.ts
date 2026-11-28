/**
 * Ajudantes dos objetivos dos Poderes do Construtor (o Verificar projeto de cada etapa).
 *
 * Como na Estação de Reciclagem: o jogo confere o que o executor consegue mostrar dentro dos limites
 * dele (oito objetivos que rodam o jogo por parte, até 10 s por espera, 15 s por objetivo e 40 s
 * somados), e os blocos conferem o resto, sempre com os nomes do projeto pronto. O relógio da
 * criança começa a contar quando o jogo abre, não no Enter.
 */
import type {
  ExecutionCompare,
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern as Pattern,
  SectionProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'

export type Ponto = { afterStep: number; expect: ExecutionExpectation }

export const valor = (
  path: string,
  compare: ExecutionCompare,
  value?: string | number,
): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare,
  ...(value === undefined ? {} : { value }),
})

export const comportamento = (
  id: string,
  label: string,
  hint: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: Ponto[] = [],
): SectionProjectCheck => ({
  id,
  label,
  hint,
  rule: { type: 'behavior', steps, expect, ...(checkpoints.length ? { checkpoints } : {}) },
})

export const comecar: ExecutionStep = { action: 'press', key: 'Enter', holdMs: 40 }
export const esperar = (ms: number): ExecutionStep => ({ action: 'wait', ms })

/** Os caminhos que o executor lê nas duas dimensões. */
export const caminho = {
  grupo: (d: PoderDimensaoConstrutor, nome: string) =>
    d === '2d' ? `${nome}.items.length` : `${nome}.length`,
  vidas: (d: PoderDimensaoConstrutor, nome = 'nave') =>
    d === '2d' ? `${nome}.hp` : `${nome}._szLife.hp`,
}

/** O prefixo dos blocos de cada dimensão. */
export const g = (d: PoderDimensaoConstrutor) => (d === '2d' ? 'g2d' : 'g3d')

/** `variavel OP número` (o número é a sombra do bloco de comparação). */
export function comparaVariavel(nome: string, ops: string[], numero: number): Pattern {
  return {
    blockType: 'sz_val_compare',
    fieldOptions: { OP: ops },
    inputBlocks: { LEFT: { blockType: 'sz_val_variable', fields: { NAME: nome } } },
    inputs: { RIGHT: numero },
  }
}

/** A guarda da partida no 3D: `estado === "jogando"`. */
export function guarda3D(): Pattern {
  return {
    blockType: 'sz_val_compare',
    fieldOptions: { OP: ['==', '==='] },
    inputBlocks: {
      LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'estado' } },
      RIGHT: { blockType: 'sz_val_text', fields: { TEXT: 'jogando' } },
    },
  }
}

/** A guarda da partida nas duas dimensões (2D: a pergunta pronta; 3D: `estado === "jogando"`). */
export function guardaDaPartida(d: PoderDimensaoConstrutor): Pattern {
  return d === '2d' ? { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'jogando' } } : guarda3D()
}

/** O que roda só na partida: o Se com a guarda e, no então, os blocos pedidos. */
export function soNaPartida(d: PoderDimensaoConstrutor, corpo: Pattern[]): Pattern {
  return {
    blockType: 'sz_js_if_else',
    inputBlocks: { COND: guardaDaPartida(d) },
    inputBlocksAll: { THEN: corpo },
  }
}

/**
 * O encontro da nave com um grupo e o que acontece nele. No 2D ele fica no quadro do jogo, dentro do
 * "Se jogando" pronto; no 3D é um evento com a guarda da partida.
 */
export function encontroDaNave(
  d: PoderDimensaoConstrutor,
  grupo: string,
  corpo: Pattern[],
): SectionProjectCheck['rule'] {
  return d === '3d'
    ? {
        type: 'usesBlock',
        blockType: 'sz_g3d_on_touch_group',
        fields: { OBJ: 'nave', GROUP: grupo },
        inputBlocks: {
          BODY: {
            blockType: 'sz_js_if_else',
            inputBlocks: { COND: guarda3D() },
            inputBlocksAll: { THEN: corpo },
          },
        },
      }
    : {
        type: 'usesBlock',
        blockType: 'sz_g2d_on_sprite_group_overlap',
        fields: { SPRITE: 'nave', GROUP: grupo },
        inputBlocksAll: { BODY: corpo },
        area: 'loops',
      }
}

/** O dano na nave (2D: tirar vida do sprite; 3D: machucar o objeto). */
export function danoNaNave(d: PoderDimensaoConstrutor): Pattern {
  return d === '2d'
    ? { blockType: 'sz_g2d_damage_sprite', fields: { SPRITE: 'nave' }, inputs: { AMOUNT: 1 } }
    : { blockType: 'sz_g3d_hurt', fields: { OBJ: 'nave' }, inputs: { VALUE: 1 } }
}

/** Um relógio "A cada N segundos" com o que roda dentro dele. */
export function relogio(
  d: PoderDimensaoConstrutor,
  segundos: number,
  corpo?: Pattern[],
): SectionProjectCheck['rule'] {
  return {
    type: 'usesBlock',
    blockType: `sz_${g(d)}_every_seconds`,
    inputs: { SECS: segundos },
    ...(corpo ? { inputBlocksAll: { BODY: corpo } } : {}),
  }
}
