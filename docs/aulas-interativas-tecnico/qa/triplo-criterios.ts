/**
 * Os objetivos do Poder "Tiro triplo" (o Verificar projeto de cada etapa).
 *
 * O jogo confere, no executor de verdade: o item só cai na partida e pegar o item liga o triplo;
 * com o triplo ligado, um aperto de Espaço cria três lasers (e, antes de pegar o item, um só); e,
 * no 2D, o triplo acaba, parando no zero, e o Espaço volta a criar um laser. As direções diferentes são
 * conferidas nos blocos (2D: os três lasers com vx −2, 0 e 2; 3D: os três grupos), assim como o
 * intervalo do item e a contagem com a guarda. Os objetivos de cada etapa somam os das anteriores.
 *
 * As esperas são as do Escudo (o item a cada 4 s, que dura mais que o intervalo), medidas no executor de verdade (`poderes-objetivos-navegador.ts triplo`, com as mutações).
 */
import type { ExecutionStep } from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern as Pattern,
  SectionProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  caminho,
  comecar,
  comparaVariavel,
  comportamento,
  encontroDaNave,
  esperar,
  g,
  relogio,
  valor,
} from './construtor-poderes-criterios'
import { TRIPLO_ETAPAS, TRIPLO_REGRAS, type TriploEtapa } from './triplo-projeto'

export const ESPERAS_TRIPLO = {
  antes: 4500,
  sair: 800,
  item: 6000,
  liga: 10000,
  ate: 8400,
  acabar: 5500,
  sairDaFaixa: 800,
  /** A leitura logo depois do Espaço (no 3D um quadro demora mais). */
  tiro: { '2d': 50, '3d': 100 },
} as const
/**
 * No 2D o item cai pelo meio, onde a nave começa; no 3D ele vem pela esquerda (x −4), e a nave vai
 * para a borda esquerda antes de esperar (parada no meio, ela levava três batidas antes do item).
 * "Sair da faixa" é ir para o outro lado.
 */
const irParaAFaixa = (d: PoderDimensaoConstrutor): ExecutionStep[] =>
  d === '3d' ? [{ action: 'press', key: 'ArrowLeft', holdMs: 800 }] : []
const sairDaFaixa = (d: PoderDimensaoConstrutor, ms: number): ExecutionStep => ({
  action: 'press',
  key: d === '3d' ? 'ArrowRight' : 'ArrowLeft',
  holdMs: ms,
})
const disparar: ExecutionStep = { action: 'press', key: 'Space', holdMs: 40 }

/** O Se do Espaço: `tempoTriplo > 0`, com o tiro de antes no senão. */
function seDoTriplo(entao: Pattern[], senao: Pattern[]): Pattern {
  return {
    blockType: 'sz_js_if_else',
    inputBlocks: { COND: comparaVariavel('tempoTriplo', ['>'], 0) },
    inputBlocksAll: { THEN: entao, ...(senao.length ? { ELSE: senao } : {}) },
  }
}

/** O Espaço com a guarda da partida (o 2D usa a pergunta pronta; o 3D, `estado === "jogando"`). */
function espaco(d: PoderDimensaoConstrutor, corpo: Pattern[]): SectionProjectCheck['rule'] {
  const guarda: Pattern =
    d === '2d'
      ? { blockType: 'sz_g2d_scene_is', fields: { SCENE: 'jogando' } }
      : {
          blockType: 'sz_val_compare',
          fieldOptions: { OP: ['==', '==='] },
          inputBlocks: {
            LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'estado' } },
            RIGHT: { blockType: 'sz_val_text', fields: { TEXT: 'jogando' } },
          },
        }
  return {
    type: 'usesBlock',
    blockType: `sz_${g(d)}_on_key`,
    fields: { KEY: 'Space' },
    inputBlocks: {
      BODY: {
        blockType: 'sz_js_if_else',
        inputBlocks: { COND: guarda },
        inputBlocksAll: { THEN: corpo },
      },
    },
  }
}

const laser2D = (vx?: number): Pattern => ({
  blockType: 'sz_g2d_spawn_image_in_group',
  fields: { GROUP: 'tiros' },
  ...(vx === undefined ? {} : { inputs: { VX: vx } }),
})
const copia3D = (grupo: string): Pattern => ({
  blockType: 'sz_g3d_spawn_copy',
  fields: { GROUP: grupo },
})

export function triploChecks(
  d: PoderDimensaoConstrutor,
  etapa: TriploEtapa,
): SectionProjectCheck[] {
  const n = TRIPLO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Tiro triplo: ${etapa}`)
  const tem = (ate: TriploEtapa) => n >= TRIPLO_ETAPAS.indexOf(ate)
  const r = TRIPLO_REGRAS
  const e = ESPERAS_TRIPLO
  const itens = caminho.grupo(d, 'itensTriplo')
  const tiros = caminho.grupo(d, 'tiros')
  const checks: SectionProjectCheck[] = []

  if (tem('item')) {
    checks.push(
      comportamento(
        'item-so-na-partida',
        'Antes do Enter, nenhum item de tiro triplo cai; na partida, o relógio solta o item.',
        `Use um A cada ${r.intervaloItem} segundos que cria o item no grupo itensTriplo só quando o jogo está na partida.`,
        [esperar(e.antes), comecar, sairDaFaixa(d, e.sair), esperar(e.item)],
        valor(itens, 'atLeast', 1),
        [
          { afterStep: 1, expect: valor(itens, 'equals', 0) },
          { afterStep: 1, expect: valor('tempoTriplo', 'equals', 0) },
        ],
      ),
    )
    // Depois da etapa do item, os três lasers já provam que o triplo liga (e o prazo da parte, 40 s,
    // não cabe os quatro objetivos de jogo).
    if (!tem('tres'))
      checks.push(
        comportamento(
          'pegar-liga-o-triplo',
          'Quando a nave pega o item, o item sai e o tiro triplo liga.',
          `No encontro da nave com o grupo itensTriplo: tire o item do grupo e ponha ${r.duracao} em tempoTriplo.`,
          [comecar, ...irParaAFaixa(d), esperar(e.liga)],
          valor('tempoTriplo', 'atLeast', 1),
          [{ afterStep: 1, expect: valor('tempoTriplo', 'equals', 0) }],
        ),
      )
    checks.push(
      {
        id: 'intervalo-do-item',
        label: `O item de tiro triplo sai de um relógio a cada ${r.intervaloItem} segundos.`,
        hint: `Use o número ${r.intervaloItem} no bloco A cada que cria o item.`,
        rule: relogio(d, r.intervaloItem),
      },
      {
        id: 'item-liga-cinco',
        label: `No encontro com o item: o item sai do grupo e tempoTriplo vira ${r.duracao}.`,
        hint: `Dentro do encontro com itensTriplo: tirar o item do grupo e pôr ${r.duracao} em tempoTriplo.`,
        rule: encontroDaNave(d, 'itensTriplo', [
          { blockType: `sz_${g(d)}_remove_from_group`, fields: { GROUP: 'itensTriplo' } },
          {
            blockType: 'sz_js_var_assign',
            fields: { NAME: 'tempoTriplo' },
            inputs: { VALUE: r.duracao },
          },
          ...(d === '3d' ? [{ blockType: 'sz_g3d_hud_text', fields: { CORNER: 'top-left' } }] : []),
        ]),
      },
    )
  }

  if (tem('tres')) {
    checks.push(
      comportamento(
        'tres-lasers-de-uma-vez',
        'Antes do item, um aperto de Espaço cria um laser; com o tiro triplo ligado, cria três.',
        'No Espaço: Se tempoTriplo for maior que 0, crie três lasers; senão, o laser de sempre.',
        [
          comecar,
          esperar(300),
          disparar,
          esperar(e.tiro[d]),
          ...irParaAFaixa(d),
          esperar(e.liga - (d === '3d' ? 1250 : 450)),
          disparar,
          esperar(e.tiro[d]),
        ],
        // 2D: os três no grupo tiros; 3D: um em cada grupo (o do meio fica em tiros)
        valor(tiros, 'atLeast', d === '2d' ? 3 : 1),
        [
          { afterStep: 4, expect: valor(tiros, 'equals', 1) },
          ...(d === '3d'
            ? [
                { afterStep: 4, expect: valor('tirosEsquerda.length', 'equals', 0) },
                {
                  afterStep: 8,
                  expect: valor(tem('direcoes') ? 'tirosEsquerda.length' : tiros, 'atLeast', 1),
                },
                {
                  afterStep: 8,
                  expect: valor(
                    tem('direcoes') ? 'tirosDireita.length' : tiros,
                    'atLeast',
                    tem('direcoes') ? 1 : 3,
                  ),
                },
              ]
            : []),
        ],
      ),
    )
    checks.push({
      id: 'triplo-no-espaco',
      label: 'No Espaço: Se tempoTriplo > 0, três lasers; senão, o laser de antes.',
      hint: 'Dentro da guarda do Espaço: Se tempoTriplo > 0, então três lasers; no senão, o laser simples.',
      rule: espaco(d, [
        seDoTriplo(
          d === '2d'
            ? [laser2D(), laser2D(), laser2D()]
            : [copia3D(tem('direcoes') ? 'tirosEsquerda' : 'tiros')],
          d === '2d' ? [laser2D()] : [copia3D('tiros')],
        ),
      ]),
    })
  }

  if (tem('direcoes')) {
    const lados =
      d === '2d'
        ? [laser2D(-r['2d'].vxLados), laser2D(0), laser2D(r['2d'].vxLados)]
        : [copia3D('tirosEsquerda'), copia3D('tiros'), copia3D('tirosDireita')]
    checks.push({
      id: 'tres-direcoes',
      label:
        d === '2d'
          ? `Os três lasers seguem direções diferentes: vx −${r['2d'].vxLados}, 0 e ${r['2d'].vxLados}.`
          : 'Os três lasers vão para três grupos: tirosEsquerda, tiros e tirosDireita.',
      hint:
        d === '2d'
          ? `No então do Se tempoTriplo, troque o vx de um laser por −${r['2d'].vxLados} e o de outro por ${r['2d'].vxLados}.`
          : 'No então do Se tempoTriplo, ponha uma cópia em tirosEsquerda e outra em tirosDireita.',
      rule: espaco(d, [seDoTriplo(lados, [])]),
    })
  }

  if (tem('volta')) {
    // No 3D, quase 15 s de partida sem escudo terminam em derrota muitas vezes (no meio do 3D,
    // quase metade das pedras passa pela nave), e o fim de jogo para o relógio: lá o fim do triplo
    // fica com o objetivo dos blocos (o relógio de 1 s com a guarda).
    if (d === '2d')
      checks.push(
        comportamento(
          'triplo-acaba',
          'Depois de pegar o item, o tiro triplo acaba, para no zero, e o Espaço volta a criar um laser.',
          'Use um A cada 1 segundo: se tempoTriplo for maior que 0, tire 1 dele.',
          [
            comecar,
            esperar(e.ate),
            sairDaFaixa(d, e.sairDaFaixa),
            esperar(e.acabar),
            disparar,
            esperar(e.tiro[d]),
          ],
          valor(tiros, 'equals', 1),
          [
            { afterStep: 2, expect: valor('tempoTriplo', 'atLeast', 1) },
            { afterStep: 4, expect: valor('tempoTriplo', 'equals', 0) },
          ],
        ),
      )
    checks.push({
      id: 'contagem-com-guarda',
      label: 'A cada segundo, se o tiro triplo ainda tem tempo, ele perde 1.',
      hint: 'Dentro do A cada 1 segundo: Se tempoTriplo > 0, então Somar -1 em tempoTriplo. Sem o Se, o tempo passa do zero.',
      rule: relogio(d, 1, [
        {
          blockType: 'sz_js_if_else',
          inputBlocks: { COND: comparaVariavel('tempoTriplo', ['>'], 0) },
          inputBlocksAll: {
            THEN: [
              { blockType: 'sz_js_var_increment', fields: { NAME: 'tempoTriplo', DELTA: -1 } },
            ],
          },
        },
      ]),
    })
  }
  return checks
}
