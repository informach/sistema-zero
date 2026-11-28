/**
 * Os objetivos do Poder "Chefão com resistência" (o Verificar projeto de cada etapa).
 *
 * O chefão fica parado no meio, onde a nave começa: com a nave parada, todo laser acerta, e o
 * executor conta os acertos apertando Espaço. O jogo confere: a vida começa em 5; um laser tira 1 (e
 * não derrota); a quantidade certa derrota e o chefão sai; e o prêmio vale uma vez só (sem a guarda,
 * o placar dispara até a meta). Nos blocos: a variável, a barra ou o texto, o encontro com o laser
 * saindo, o que acontece no zero e a guarda. São oito disparos para cinco acertos: uma pedra pode
 * passar na frente de um laser. Os objetivos de cada etapa somam os das anteriores.
 */
import type { ExecutionStep } from '../../../packages/core/src/learning/project-execution'
import type {
  ProjectBlockPattern as Pattern,
  SectionProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { CHEFAO_ETAPAS, CHEFAO_REGRAS, type ChefaoEtapa } from './chefao-projeto'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  comecar,
  comparaVariavel,
  comportamento,
  esperar,
  valor,
} from './construtor-poderes-criterios'

const disparar: ExecutionStep = { action: 'press', key: 'Space', holdMs: 40 }
/**
 * Oito disparos, um a cada 600 ms (um laser leva 0,5 s no 2D e 0,9 s no 3D até o chefão): uma pedra
 * que cruza a faixa do meio pode engolir alguns lasers, e cinco precisam chegar.
 */
const rajada = (): ExecutionStep[] =>
  Array.from({ length: 8 }, () => [disparar, esperar(560)]).flat()

const decremento: Pattern = {
  blockType: 'sz_js_var_increment',
  fields: { NAME: 'vidaDoChefao', DELTA: -1 },
}

export function chefaoChecks(
  d: PoderDimensaoConstrutor,
  etapa: ChefaoEtapa,
): SectionProjectCheck[] {
  const n = CHEFAO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Chefão: ${etapa}`)
  const tem = (ate: ChefaoEtapa) => n >= CHEFAO_ETAPAS.indexOf(ate)
  const r = CHEFAO_REGRAS
  const posicaoDoChefao = d === '2d' ? 'chefao.y' : 'chefao.position.z'
  const checks: SectionProjectCheck[] = []

  if (tem('vida')) {
    checks.push(
      comportamento(
        'chefao-comeca-com-cinco',
        `O chefão começa a partida com ${r.vida} de vida.`,
        `Em Ao iniciar, crie a variável vidaDoChefao com ${r.vida}.`,
        [comecar, esperar(400)],
        valor('vidaDoChefao', 'equals', r.vida),
      ),
    )
    checks.push({
      id: 'vida-na-tela',
      label:
        d === '2d'
          ? 'A barra embaixo do chefão mostra a vidaDoChefao.'
          : 'O texto Chefão, em cima, à esquerda, mostra a vidaDoChefao.',
      hint:
        d === '2d'
          ? `No fim de A cada quadro do jogo, desenhe a Barra com o valor da variável vidaDoChefao e o máximo ${r.vida}.`
          : 'Em Ao iniciar, escreva na tela, em cima, à esquerda, Chefão: mais o valor da variável vidaDoChefao.',
      rule:
        d === '2d'
          ? {
              type: 'usesBlock',
              blockType: 'sz_g2d_draw_bar',
              inputBlocks: {
                VALUE: { blockType: 'sz_val_variable', fields: { NAME: 'vidaDoChefao' } },
              },
              area: 'loops',
            }
          : {
              type: 'usesBlock',
              blockType: 'sz_g3d_hud_text',
              fields: { CORNER: 'top-left' },
              area: 'start',
            },
    })
  }

  if (tem('acerto')) {
    checks.push(
      comportamento(
        'um-laser-tira-um',
        'Cada laser que acerta o chefão tira 1 da vida dele: um laser só não derrota.',
        'No encontro do chefão com o grupo tiros: tire o laser do grupo e mude vidaDoChefao em -1.',
        [comecar, esperar(300), disparar, esperar(1100), disparar, esperar(1100)],
        valor('vidaDoChefao', 'atMost', r.vida - 1),
        // sem tirar o laser, ele continua encostando e a vida despenca num tiro só
        [{ afterStep: 4, expect: valor('vidaDoChefao', 'atLeast', r.vida - 1) }],
      ),
    )
    checks.push({
      id: 'encontro-do-laser',
      label: 'No encontro de um laser com o chefão: o laser sai do grupo e a vida perde 1.',
      hint:
        d === '2d'
          ? 'Use Para cada sprite do grupo tiros que colidir com o sprite chefao: tirar o laser do grupo e mudar vidaDoChefao em -1.'
          : 'Use Quando chefao encostar em algum do grupo tiros: tirar o laser do grupo e mudar vidaDoChefao em -1.',
      rule:
        d === '2d'
          ? {
              type: 'usesBlock',
              blockType: 'sz_g2d_on_sprite_group_overlap',
              fields: { SPRITE: 'chefao', GROUP: 'tiros' },
              inputBlocksAll: {
                BODY: [
                  { blockType: 'sz_g2d_remove_from_group', fields: { GROUP: 'tiros' } },
                  decremento,
                ],
              },
              area: 'loops',
            }
          : {
              type: 'usesBlock',
              blockType: 'sz_g3d_on_touch_group',
              fields: { OBJ: 'chefao', GROUP: 'tiros' },
              inputBlocksAll: {
                BODY: [
                  { blockType: 'sz_g3d_remove_from_group', fields: { GROUP: 'tiros' } },
                  decremento,
                ],
              },
            },
    })
  }

  if (tem('fim')) {
    checks.push(
      comportamento(
        'chefao-sai-no-zero',
        `Com ${r.vida} acertos, o chefão sai da tela.`,
        'A cada quadro, Se vidaDoChefao for menor ou igual a 0: leve o chefão para longe e some o prêmio.',
        [comecar, esperar(300), ...rajada(), esperar(800)],
        valor(posicaoDoChefao, 'atMost', -100),
      ),
    )
    const zera: Pattern = {
      blockType: 'sz_js_if_else',
      inputBlocks: { COND: comparaVariavel('vidaDoChefao', ['<=', '<', '==', '==='], 0) },
    }
    checks.push({
      id: 'o-que-acontece-no-zero',
      label: `Quando a vida chega a 0, o chefão vai para longe e o placar ganha ${r.premio} pontos.`,
      hint: `No quadro, Se vidaDoChefao ≤ 0: Colocar o chefão longe e Somar ${r.premio} em pontos.`,
      rule: { type: 'usesBlock', ...zera, area: 'loops' },
    })
  }

  if (tem('uma-vez')) {
    checks.push(
      comportamento(
        'premio-uma-vez',
        `Derrotar o chefão dá ${r.premio} pontos uma vez só: o placar não dispara.`,
        'Dentro do Se vidaDoChefao ≤ 0, pergunte também se chefaoDerrotado é falso e, logo no então, mude chefaoDerrotado para verdadeiro.',
        [comecar, esperar(300), ...rajada(), esperar(800)],
        // o prêmio, mais as pedras que os lasers acertarem depois do chefão
        valor('pontos', 'atMost', r.premio + 8),
        [{ afterStep: 18, expect: valor('chefaoDerrotado', 'truthy') }],
      ),
    )
    checks.push({
      id: 'guarda-do-premio',
      label: 'O prêmio fica dentro de uma guarda: chefaoDerrotado vira verdadeiro na primeira vez.',
      hint: 'Dentro do Se vidaDoChefao ≤ 0: Se chefaoDerrotado = falso, então Alterar chefaoDerrotado para verdadeiro e o prêmio.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_js_var_assign',
        fields: { NAME: 'chefaoDerrotado' },
        area: 'loops',
      },
    })
  }
  return checks
}
