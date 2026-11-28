/**
 * Os objetivos do Poder "Escudo temporário" (o Verificar projeto de cada etapa).
 *
 * O jogo confere, no executor de verdade: o item só cai na partida; pegar o item liga o escudo (o
 * item sai e o tempo vai a 5); e o escudo conta para trás. A pedra que bate com o escudo ligado não
 * pode ser provocada no executor (os asteroides nascem em lugares sorteados), então a proteção é
 * conferida nos blocos: a batida pergunta se `tempoDoEscudo` é maior que zero e só o senão tira
 * vida (e o dano existe uma vez só). Também nos blocos: o intervalo do item e a contagem com a
 * guarda (sem ela o tempo fica negativo, o que leva mais tempo do que o executor dá a um objetivo).
 * Os objetivos de cada etapa somam os das anteriores.
 *
 * Nenhum objetivo depende do instante da partida (no 3D o relógio da criança começa quando a página
 * abre, e o executor ainda espera os modelos antes do Enter): o item nasce a cada 4 s pelo meio, vive
 * mais que o intervalo e, com a nave parada no meio, o escudo (5 s) emenda um no outro. Para ver o
 * escudo acabar, a nave sai do meio. Medido no executor de verdade
 * (`poderes-objetivos-navegador.ts escudo`, com as mutações).
 */
import type { ExecutionStep } from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  caminho,
  comecar,
  comparaVariavel,
  comportamento,
  danoNaNave,
  encontroDaNave,
  esperar,
  g,
  relogio,
  valor,
} from './construtor-poderes-criterios'
import { ESCUDO_ETAPAS, ESCUDO_REGRAS, type EscudoEtapa } from './escudo-projeto'

/** As esperas (ms) de cada dimensão. */
export const ESPERAS_ESCUDO = {
  '2d': { antes: 4500, sair: 800, item: 6000, liga: 10000, ate: 8400, acabar: 5700 },
  '3d': { antes: 4500, sair: 800, item: 6000, liga: 10000, ate: 8400, acabar: 5700 },
} as const
const sairDoMeio = (ms: number): ExecutionStep => ({
  action: 'press',
  key: 'ArrowLeft',
  holdMs: ms,
})

export function escudoChecks(
  d: PoderDimensaoConstrutor,
  etapa: EscudoEtapa,
): SectionProjectCheck[] {
  const n = ESCUDO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Escudo: ${etapa}`)
  const tem = (ate: EscudoEtapa) => n >= ESCUDO_ETAPAS.indexOf(ate)
  const r = ESCUDO_REGRAS
  const e = ESPERAS_ESCUDO[d]
  const itens = caminho.grupo(d, 'itensEscudo')
  const checks: SectionProjectCheck[] = []

  if (tem('item')) {
    checks.push(
      comportamento(
        'item-so-na-partida',
        'Antes do Enter, nenhum item de escudo cai; na partida, o relógio solta o item.',
        `Use um A cada ${r.intervaloItem} segundos que cria o item no grupo itensEscudo só quando o jogo está na partida.`,
        // a nave sai do meio para o item não ser pego: ele continua no grupo até sair da tela
        [esperar(e.antes), comecar, sairDoMeio(e.sair), esperar(e.item)],
        valor(itens, 'atLeast', 1),
        [
          { afterStep: 1, expect: valor(itens, 'equals', 0) },
          { afterStep: 1, expect: valor('tempoDoEscudo', 'equals', 0) },
        ],
      ),
    )
    checks.push({
      id: 'intervalo-do-item',
      label: `O item de escudo sai de um relógio a cada ${r.intervaloItem} segundos.`,
      hint: `Use o número ${r.intervaloItem} no bloco A cada que cria o item.`,
      rule: relogio(d, r.intervaloItem),
    })
  }

  if (tem('liga')) {
    checks.push(
      comportamento(
        'pegar-liga-o-escudo',
        'Quando a nave pega o item, o item sai e o escudo liga.',
        `No encontro da nave com o grupo itensEscudo: tire o item do grupo e ponha ${r.duracao} em tempoDoEscudo.`,
        // com a nave parada no meio, o escudo liga e não apaga mais (o item vem antes de ele acabar)
        [comecar, esperar(e.liga)],
        valor('tempoDoEscudo', 'atLeast', 1),
        [{ afterStep: 1, expect: valor('tempoDoEscudo', 'equals', 0) }],
      ),
    )
    checks.push({
      id: 'item-liga-cinco',
      label: `No encontro com o item: o item sai do grupo e tempoDoEscudo vira ${r.duracao}.`,
      hint:
        d === '3d'
          ? `Dentro do encontro com itensEscudo, com a guarda da partida: tirar o item do grupo, pôr ${r.duracao} em tempoDoEscudo e escrever o Escudo no alto à esquerda.`
          : `Dentro do encontro com itensEscudo ficam os dois: tirar o item do grupo e pôr ${r.duracao} em tempoDoEscudo.`,
      rule: encontroDaNave(d, 'itensEscudo', [
        { blockType: `sz_${g(d)}_remove_from_group`, fields: { GROUP: 'itensEscudo' } },
        {
          blockType: 'sz_js_var_assign',
          fields: { NAME: 'tempoDoEscudo' },
          inputs: { VALUE: r.duracao },
        },
        ...(d === '3d' ? [{ blockType: 'sz_g3d_hud_text', fields: { CORNER: 'top-left' } }] : []),
      ]),
    })
  }

  if (tem('protege')) {
    checks.push({
      id: 'escudo-protege',
      label:
        'Na batida de uma pedra: com o escudo ligado, a pedra só sai; sem escudo, a nave perde uma vida.',
      hint: 'Dentro da batida da nave com os asteroides, depois de tirar a pedra: Se tempoDoEscudo > 0, então um som; senão, tirar 1 vida da nave.',
      rule: encontroDaNave(d, 'asteroides', [
        {
          blockType: 'sz_js_if_else',
          inputBlocks: { COND: comparaVariavel('tempoDoEscudo', ['>'], 0) },
          inputBlocksAll: { ELSE: [danoNaNave(d)] },
        },
      ]),
    })
    checks.push({
      id: 'dano-so-no-senao',
      label: 'A nave perde vida num lugar só: no senão do escudo.',
      hint: 'Leve o bloco que tira vida da nave para dentro do senão, sem deixar uma cópia fora do Se.',
      rule: { type: 'usesBlock', ...danoNaNave(d), count: 1 },
    })
  }

  if (tem('acaba')) {
    checks.push(
      comportamento(
        'escudo-conta-para-tras',
        'Depois de pegar o item, o escudo perde 1 a cada segundo e para no zero.',
        'Use um A cada 1 segundo: se tempoDoEscudo for maior que 0, tire 1 dele. Sem o Se, o tempo passa do zero.',
        // ligado no meio; depois a nave sai, e em menos de 6 s o escudo chega a zero e para ali
        [comecar, esperar(e.ate), sairDoMeio(e.sair), esperar(e.acabar)],
        valor('tempoDoEscudo', 'equals', 0),
        [{ afterStep: 2, expect: valor('tempoDoEscudo', 'atLeast', 1) }],
      ),
    )
    checks.push({
      id: 'contagem-com-guarda',
      label: 'A cada segundo, se o escudo ainda tem tempo, ele perde 1 e a nave pisca.',
      hint: 'Dentro do A cada 1 segundo: Se tempoDoEscudo > 0, então mudar tempoDoEscudo em -1 e fazer a nave piscar. Sem o Se, o tempo fica negativo.',
      rule: relogio(d, 1, [
        {
          blockType: 'sz_js_if_else',
          inputBlocks: { COND: comparaVariavel('tempoDoEscudo', ['>'], 0) },
          inputBlocksAll: {
            THEN: [
              { blockType: 'sz_js_var_increment', fields: { NAME: 'tempoDoEscudo', DELTA: -1 } },
              d === '2d'
                ? { blockType: 'sz_g2d_blink', fields: { SPRITE: 'nave' } }
                : { blockType: 'sz_g3d_blink', fields: { OBJ: 'nave' } },
            ],
          },
        },
      ]),
    })
  }
  return checks
}
