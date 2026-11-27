/**
 * Os objetivos da missão A Estação de Reciclagem (o Verificar projeto de cada etapa).
 *
 * Como no Jardim Secreto, o Verificar confere pelo que o JOGO FAZ onde o executor consegue mostrar
 * dentro dos limites dele (oito objetivos que rodam o jogo por parte, até 10 s por espera, 15 s por
 * objetivo e 40 s somados): nada nasce antes do Enter, os relógios criam as peças na partida, a
 * reciclável dá ponto sem disparar o placar e a proibida tira vida. O que leva mais tempo do que
 * isso, ou depende do instante exato, é conferido nos blocos, sem pedir nomes novos (os nomes são
 * os do projeto pronto): os dois intervalos do pedido, a vida que sai uma só vez, a derrota pelas
 * vidas, a vitória pela variável `meta` (maior ou igual, ou igual) e a meta nova. O reinício que
 * limpa placar, vidas e peças vem pronto (`SZGame2D.restart`, a tela final do 3D) e não é cobrado.
 * Os objetivos de cada etapa somam os das etapas anteriores.
 *
 * Os números saem de `ESTACAO_REGRAS` (o enunciado diz os mesmos); as esperas foram medidas no
 * executor de verdade (`estacao-objetivos-navegador.ts`, que também roda as mutações).
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
import {
  ESTACAO_ETAPAS,
  ESTACAO_REGRAS,
  type EstacaoDimensao,
  type EstacaoEtapa,
} from './estacao-projeto'

type Ponto = { afterStep: number; expect: ExecutionExpectation }

const valor = (
  path: string,
  compare: ExecutionCompare,
  value?: string | number,
): ExecutionExpectation => ({
  target: { kind: 'value', path },
  compare,
  ...(value === undefined ? {} : { value }),
})
const comportamento = (
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
const comecar: ExecutionStep = { action: 'press', key: 'Enter', holdMs: 40 }
const esperar = (ms: number): ExecutionStep => ({ action: 'wait', ms })

/** Os nomes que o executor lê em cada dimensão (os do projeto pronto). */
function caminhos(d: EstacaoDimensao) {
  return d === '2d'
    ? {
        reciclaveis: 'reciclaveis.items.length',
        proibidos: 'proibidos.items.length',
        vidas: 'coletor.hp',
      }
    : {
        reciclaveis: 'reciclaveis.length',
        proibidos: 'proibidos.length',
        vidas: 'coletor._szLife.hp',
      }
}

/**
 * As esperas dos objetivos que rodam o jogo (ms). O relógio da criança começa a contar quando o
 * jogo abre, não no Enter: por isso cada objetivo espera um pouco ANTES do Enter (mais que os dois
 * intervalos), como a Patrulha Espacial faz, e aí a primeira rodada chega no máximo um intervalo
 * depois do Enter. Depois, cada um só pede o que acontece cedo ou tarde ("pelo menos uma peça
 * chegou"), nunca um instante exato: o executor roda mais devagar quando está carregado. O fim por
 * vidas e a vitória levam mais tempo do que o executor dá a um objetivo, e são conferidos nos blocos.
 */
export const ESPERAS = {
  '2d': { antes: 2400, relogio: 4000, segurar: 1500, ponto: 8000, vida: 8500 },
  '3d': { antes: 2400, relogio: 4000, segurar: 1500, ponto: 8500, vida: 9000 },
} as const

export function estacaoChecks(d: EstacaoDimensao, etapa: EstacaoEtapa): SectionProjectCheck[] {
  const n = ESTACAO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida da Estação: ${etapa}`)
  const tem = (ate: EstacaoEtapa) => n >= ESTACAO_ETAPAS.indexOf(ate)
  const r = ESTACAO_REGRAS[d]
  const c = caminhos(d)
  const e = ESPERAS[d]
  const meta = tem('meta-nova') ? r.metaNova : r.meta
  const tresD = d === '3d'
  const g = tresD ? 'g3d' : 'g2d'
  const checks: SectionProjectCheck[] = []
  const segundos = (x: number) => String(x).replace('.', ',')

  if (tem('esteira')) {
    checks.push(
      comportamento(
        'relogios-so-na-partida',
        tem('meta-nova')
          ? `Antes do Enter, nada nasce (o jogo abre com zero peças, ${r.vidas} vidas e meta ${meta}); na partida, os relógios criam as peças.`
          : 'Antes do Enter, nenhuma peça nasce; depois do Enter, os relógios criam recicláveis e proibidas.',
        'Cada A cada cria as peças só quando o jogo está na partida, no grupo certo: as recicláveis em reciclaveis, as pilhas e lâmpadas em proibidos.',
        [esperar(e.antes), comecar, esperar(e.relogio)],
        valor(c.reciclaveis, 'atLeast', 2),
        [
          // `afterStep` conta os passos já feitos: 1 = depois da espera, antes do Enter
          { afterStep: 1, expect: valor(c.reciclaveis, 'equals', 0) },
          { afterStep: 1, expect: valor(c.proibidos, 'equals', 0) },
          { afterStep: 1, expect: valor('pontos', 'equals', 0) },
          { afterStep: 1, expect: valor(c.vidas, 'equals', r.vidas) },
          { afterStep: 1, expect: valor('meta', 'equals', meta) },
          { afterStep: 3, expect: valor(c.proibidos, 'atLeast', 1) },
        ],
      ),
    )
    const relogio = `sz_${g}_every_seconds`
    checks.push({
      id: 'intervalos-do-pedido',
      label: `Um relógio a cada ${segundos(r.intervaloReciclavel)} s para as recicláveis e outro a cada ${segundos(r.intervaloProibido)} s para as proibidas.`,
      hint: 'Use os dois números do pedido nos dois blocos A cada.',
      rule: {
        type: 'usesBlock',
        blockType: relogio,
        inputs: { SECS: r.intervaloReciclavel },
        beforePattern: { blockType: relogio, inputs: { SECS: r.intervaloProibido } },
      },
    })
  }

  if (tem('coleta')) {
    checks.push(
      comportamento(
        'ponto-uma-vez',
        'Ao recolher recicláveis na partida, o placar sobe de um em um.',
        'No encontro do coletor com o grupo reciclaveis: tire a peça do grupo e some 1 ponto. Sem tirar a peça, ela continua encostando e o placar dispara.',
        [
          esperar(e.antes),
          comecar,
          { action: 'press', key: 'ArrowLeft', holdMs: e.segurar },
          esperar(e.ponto),
        ],
        valor('pontos', 'atLeast', 1),
        // sem tirar a peça, o placar sobe a cada quadro em que ela encosta (dezenas por peça)
        [{ afterStep: 4, expect: valor('pontos', 'atMost', 8) }],
      ),
    )
    checks.push(
      comportamento(
        'proibida-tira-vida',
        'Na partida, a pilha ou lâmpada que chega ao coletor tira vida.',
        'No encontro do coletor com o grupo proibidos, tire 1 vida do coletor.',
        [esperar(e.antes), comecar, esperar(e.vida)],
        valor(c.vidas, 'atMost', r.vidas - 1),
        [{ afterStep: 3, expect: valor('pontos', 'equals', 0) }],
      ),
    )
    // "Uma vez": no mesmo encontro a peça sai do grupo (não encosta de novo) e a conta muda uma
    // vez só: um ponto pela reciclável, uma vida pela proibida.
    checks.push({
      id: 'um-ponto-por-peca',
      label: tresD
        ? 'No encontro com uma peça reciclável: a peça sai do grupo, o placar soma um e o texto Peças mostra a conta.'
        : 'No encontro com uma peça reciclável: a peça sai do grupo e o placar sobe um ponto.',
      hint: tresD
        ? 'Dentro do encontro com reciclaveis, com a guarda da partida: tirar a peça do grupo, somar 1 em pontos e escrever o placar no alto à direita.'
        : 'Dentro do encontro com reciclaveis ficam os dois: tirar a peça do grupo e somar 1 em pontos.',
      rule: encontro(d, 'reciclaveis', [
        { blockType: `sz_${g}_remove_from_group`, fields: { GROUP: 'reciclaveis' } },
        { blockType: 'sz_js_var_increment', fields: { NAME: 'pontos', DELTA: 1 } },
        // no 3D o placar é um texto: ele também muda no encontro (no 2D, o placar já vem desenhado)
        ...(tresD ? [{ blockType: 'sz_g3d_hud_text', fields: { CORNER: 'top-right' } }] : []),
      ]),
    })
    checks.push({
      id: 'uma-vida-por-erro',
      label:
        'No encontro com uma pilha ou lâmpada: a peça sai do grupo e o coletor perde uma só vida.',
      hint: 'Dentro do encontro com proibidos ficam os dois: tirar a peça do grupo e tirar 1 vida.',
      rule: encontro(d, 'proibidos', [
        { blockType: `sz_${g}_remove_from_group`, fields: { GROUP: 'proibidos' } },
        tresD
          ? { blockType: 'sz_g3d_hurt', fields: { OBJ: 'coletor' }, inputs: { VALUE: 1 } }
          : {
              blockType: 'sz_g2d_damage_sprite',
              fields: { SPRITE: 'coletor' },
              inputs: { AMOUNT: 1 },
            },
      ]),
    })
  }

  if (tem('resultado')) {
    checks.push({
      id: 'derrota-pelas-vidas',
      label: 'Quando as vidas do coletor acabam, a partida termina em derrota.',
      hint: tresD
        ? 'A cada quadro, pergunte se a vida do coletor chegou a zero; aí o jogo termina com perdeu.'
        : 'A cada quadro, pergunte se as vidas do coletor acabaram; aí a tela vai para a derrota.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_js_if_else',
        inputBlocks: {
          COND: tresD
            ? {
                blockType: 'sz_val_compare',
                fieldOptions: { OP: ['<=', '<', '==', '==='] },
                inputBlocks: { LEFT: { blockType: 'sz_g3d_life_of', fields: { OBJ: 'coletor' } } },
              }
            : { blockType: 'sz_g2d_health_depleted', fields: { SPRITE: 'coletor' } },
        },
        inputBlocksAll: {
          THEN: [
            tresD
              ? { blockType: 'sz_g3d_end_game', fields: { RESULT: 'perdeu' } }
              : { blockType: 'sz_g2d_set_scene', fields: { SCENE: 'derrota' } },
          ],
        },
        area: 'loops',
      },
    })
    checks.push(vitoria(d))
  }
  if (tem('meta-nova'))
    checks.push({
      id: 'meta-nova',
      label: `A equipe pediu meta ${meta}: o jogo começa com a meta nova, e a vitória acompanha.`,
      hint: `Troque o número da meta no começo do jogo para ${meta}. Se a vitória compara o placar com a variável meta, ela acompanha a troca.`,
      rule: {
        type: 'usesBlock',
        blockType: 'sz_js_var_create',
        fields: { NAME: 'meta' },
        inputs: { VALUE: meta },
        area: 'start',
      },
    })
  return checks
}

/**
 * O encontro do coletor com um grupo e o que acontece nele. No 2D ele fica no quadro do jogo,
 * dentro do "Se jogando" pronto; no 3D é um evento, e a criança põe a guarda da partida nele.
 */
function encontro(
  d: EstacaoDimensao,
  grupo: string,
  corpo: Pattern[],
): SectionProjectCheck['rule'] {
  return d === '3d'
    ? {
        type: 'usesBlock',
        blockType: 'sz_g3d_on_touch_group',
        fields: { OBJ: 'coletor', GROUP: grupo },
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
        fields: { SPRITE: 'coletor', GROUP: grupo },
        inputBlocksAll: { BODY: corpo },
        area: 'loops',
      }
}

/** A guarda da partida no 3D: `estado === "jogando"`. */
function guarda3D(): Pattern {
  return {
    blockType: 'sz_val_compare',
    fieldOptions: { OP: ['==', '==='] },
    inputBlocks: {
      LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'estado' } },
      RIGHT: { blockType: 'sz_val_text', fields: { TEXT: 'jogando' } },
    },
  }
}

/** A vitória pela meta, conferida nos blocos: placar maior ou igual (ou igual) à variável meta. */
function vitoria(d: EstacaoDimensao): SectionProjectCheck {
  const comparacao: Pattern = {
    blockType: 'sz_val_compare',
    fieldOptions: { OP: ['>=', '==', '==='] },
    inputBlocks: {
      LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'pontos' } },
      RIGHT: { blockType: 'sz_val_variable', fields: { NAME: 'meta' } },
    },
  }
  const resultado: Pattern =
    d === '2d'
      ? { blockType: 'sz_g2d_set_scene', fields: { SCENE: 'vitoria' } }
      : { blockType: 'sz_g3d_end_game', fields: { RESULT: 'ganhou' } }
  return {
    id: 'vitoria-pela-meta',
    label: 'Quando o placar chega à meta, a partida termina com vitória.',
    hint: 'A cada quadro, compare a variável pontos com a variável meta e, quando chegar, vá para a vitória.',
    rule: {
      type: 'usesBlock',
      blockType: 'sz_js_if_else',
      inputBlocks: { COND: comparacao },
      inputBlocksAll: { THEN: [resultado] },
      area: 'loops',
    },
  }
}
