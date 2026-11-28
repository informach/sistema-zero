/**
 * Os objetivos do Poder "Troca de arma" (o Verificar projeto de cada etapa).
 *
 * O jogo confere, no executor de verdade: o item só cai na partida (e, na etapa do item, pegar o
 * item libera a troca); a tecla E não troca antes do plasma, troca para o plasma depois dele e volta
 * ao laser no segundo aperto; e o Espaço dispara o laser antes da troca e o plasma depois dela. Nos
 * blocos: o intervalo, o encontro com o item, a troca com a guarda, a arma no placar e o Espaço que
 * pergunta a arma. Uma nova partida volta ao laser sozinha (as variáveis nascem em Ao iniciar).
 *
 * No 3D o item vem pela esquerda e a nave espera na borda (o motivo está no Tiro triplo).
 */
import type { ExecutionStep } from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern as Pattern,
  SectionProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { ARMA_ETAPAS, ARMA_REGRAS, type ArmaEtapa } from './arma-projeto'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  caminho,
  comecar,
  comportamento,
  encontroDaNave,
  esperar,
  g,
  relogio,
  valor,
} from './construtor-poderes-criterios'

export const ESPERAS_ARMA = {
  antes: 4500,
  sair: 800,
  item: 6000,
  liga: 10000,
  tiro: { '2d': 50, '3d': 100 },
} as const

const irParaAFaixa = (d: PoderDimensaoConstrutor): ExecutionStep[] =>
  d === '3d' ? [{ action: 'press', key: 'ArrowLeft', holdMs: 800 }] : []
const sairDaFaixa = (d: PoderDimensaoConstrutor, ms: number): ExecutionStep => ({
  action: 'press',
  key: d === '3d' ? 'ArrowRight' : 'ArrowLeft',
  holdMs: ms,
})
const trocar: ExecutionStep = { action: 'press', key: 'e', holdMs: 40 }
const disparar: ExecutionStep = { action: 'press', key: 'Space', holdMs: 40 }

/** "Arma: " + arma. */
const textoDaArma: Pattern = {
  blockType: 'sz_math_arithmetic',
  inputBlocks: { B: { blockType: 'sz_val_variable', fields: { NAME: 'arma' } } },
}

export function armaChecks(d: PoderDimensaoConstrutor, etapa: ArmaEtapa): SectionProjectCheck[] {
  const n = ARMA_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida da Troca de arma: ${etapa}`)
  const tem = (ate: ArmaEtapa) => n >= ARMA_ETAPAS.indexOf(ate)
  const r = ARMA_REGRAS
  const e = ESPERAS_ARMA
  const k = d === '3d' ? 1 : 0
  const itens = caminho.grupo(d, 'itensPlasma')
  const checks: SectionProjectCheck[] = []

  if (tem('item')) {
    checks.push(
      comportamento(
        'item-so-na-partida',
        'Antes do Enter, nenhum item de plasma cai; na partida, o relógio solta o item.',
        `Use um A cada ${r.intervaloItem} segundos que cria o item no grupo itensPlasma só quando o jogo está na partida.`,
        [esperar(e.antes), comecar, sairDaFaixa(d, e.sair), esperar(e.item)],
        valor(itens, 'atLeast', 1),
        [{ afterStep: 1, expect: valor(itens, 'equals', 0) }],
      ),
    )
    // Depois da etapa do item, a troca já prova que o plasma foi liberado (e o prazo da parte,
    // 40 s, não cabe os quatro objetivos de jogo).
    if (!tem('troca'))
      checks.push(
        comportamento(
          'pegar-libera-o-plasma',
          'Quando a nave pega o item, o item sai e o plasma fica liberado.',
          'No encontro da nave com o grupo itensPlasma: tire o item do grupo e mude plasmaLiberado para verdadeiro.',
          [comecar, ...irParaAFaixa(d), esperar(e.liga)],
          valor('plasmaLiberado', 'truthy'),
        ),
      )
    checks.push(
      {
        id: 'intervalo-do-item',
        label: `O item de plasma sai de um relógio a cada ${r.intervaloItem} segundos.`,
        hint: `Use o número ${r.intervaloItem} no bloco A cada que cria o item.`,
        rule: relogio(d, r.intervaloItem),
      },
      {
        id: 'item-libera',
        label: 'No encontro com o item: o item sai do grupo e plasmaLiberado vira verdadeiro.',
        hint: 'Dentro do encontro com itensPlasma: tirar o item do grupo e mudar plasmaLiberado para verdadeiro.',
        rule: encontroDaNave(d, 'itensPlasma', [
          { blockType: `sz_${g(d)}_remove_from_group`, fields: { GROUP: 'itensPlasma' } },
          { blockType: 'sz_js_var_assign', fields: { NAME: 'plasmaLiberado' } },
        ]),
      },
    )
  }

  if (tem('troca')) {
    checks.push(
      comportamento(
        'tecla-e-troca',
        'A tecla E não troca antes do plasma; depois dele, troca para o plasma e volta ao laser.',
        'Na tecla E, com a guarda da partida: Se plasmaLiberado, então troque a arma: laser vira plasma, senão vira laser.',
        [
          comecar,
          ...irParaAFaixa(d),
          trocar,
          esperar(300),
          esperar(e.liga - 400),
          trocar,
          esperar(200),
          trocar,
          esperar(200),
        ],
        valor('arma', 'equals', 'laser'),
        [
          { afterStep: 3 + k, expect: valor('arma', 'equals', 'laser') },
          { afterStep: 6 + k, expect: valor('arma', 'equals', 'plasma') },
        ],
      ),
    )
    checks.push({
      id: 'troca-com-guarda',
      label: 'Na tecla E, a troca só acontece com o plasma liberado.',
      hint: 'Na tecla E: Se plasmaLiberado = verdadeiro, então Se arma = laser, arma vira plasma; senão, arma vira laser.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_js_if_else',
        inputBlocks: {
          COND: {
            blockType: 'sz_val_compare',
            inputBlocks: {
              LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'plasmaLiberado' } },
            },
          },
        },
        inputBlocksAll: {
          THEN: [
            {
              blockType: 'sz_js_if_else',
              inputBlocksAll: {
                THEN: [{ blockType: 'sz_js_var_assign', fields: { NAME: 'arma' } }],
                ELSE: [{ blockType: 'sz_js_var_assign', fields: { NAME: 'arma' } }],
              },
            },
          ],
        },
        area: 'events',
      },
    })
  }

  if (tem('placar'))
    checks.push({
      id: 'arma-na-tela',
      label:
        d === '2d'
          ? 'O placar mostra a arma: Arma: mais o valor de arma.'
          : 'O texto em cima, à esquerda, mostra a arma, e é escrito de novo a cada troca.',
      hint:
        d === '2d'
          ? 'No fim de A cada quadro do jogo, escreva Arma: mais o valor da variável arma.'
          : 'Logo depois da troca, escreva na tela, em cima, à esquerda, Arma: mais o valor da variável arma.',
      rule:
        d === '2d'
          ? {
              type: 'usesBlock',
              blockType: 'sz_g2d_draw_label',
              inputBlocks: { TEXT: textoDaArma },
              area: 'loops',
            }
          : {
              type: 'usesBlock',
              blockType: 'sz_g3d_hud_text',
              fields: { CORNER: 'top-left' },
              inputBlocks: { TEXT: textoDaArma },
              area: 'events',
            },
    })

  if (tem('disparo')) {
    const plasmas = caminho.grupo(d, 'tirosPlasma')
    const tiros = caminho.grupo(d, 'tiros')
    checks.push(
      comportamento(
        'espaco-pergunta-a-arma',
        'Com o laser, o Espaço dispara o laser; depois de trocar para o plasma, dispara o plasma.',
        'No Espaço: Se arma = plasma, crie o plasma no grupo tirosPlasma; senão, o laser de sempre.',
        [
          comecar,
          ...irParaAFaixa(d),
          esperar(300),
          disparar,
          esperar(e.tiro[d]),
          esperar(e.liga - 450),
          trocar,
          esperar(200),
          disparar,
          esperar(e.tiro[d]),
        ],
        valor(plasmas, 'atLeast', 1),
        [
          { afterStep: 4 + k, expect: valor(tiros, 'equals', 1) },
          { afterStep: 4 + k, expect: valor(plasmas, 'equals', 0) },
        ],
      ),
    )
    const criar = (grupo: string): Pattern =>
      d === '2d'
        ? { blockType: 'sz_g2d_spawn_image_in_group', fields: { GROUP: grupo } }
        : { blockType: 'sz_g3d_spawn_copy', fields: { GROUP: grupo } }
    checks.push({
      id: 'espaco-com-a-arma',
      label: 'No Espaço: Se arma = plasma, o plasma em tirosPlasma; senão, o laser em tiros.',
      hint: 'Dentro da guarda do Espaço: Se arma = plasma, então crie o plasma; no senão, o laser de sempre.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_js_if_else',
        inputBlocks: {
          COND: {
            blockType: 'sz_val_compare',
            inputBlocks: {
              LEFT: { blockType: 'sz_val_variable', fields: { NAME: 'arma' } },
              RIGHT: { blockType: 'sz_val_text', fields: { TEXT: 'plasma' } },
            },
          },
        },
        inputBlocksAll: { THEN: [criar('tirosPlasma')], ELSE: [criar('tiros')] },
        area: 'events',
      },
    })
  }
  return checks
}
