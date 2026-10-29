/**
 * Os objetivos de cada etapa do Poder "Moedas no caminho". Os de execução rodam o jogo no
 * executor (`studio-runtime`) com o teclado de verdade; o do número na tela confere o bloco.
 *
 * No 2D cada moeda tem nome (`moeda1`…`moeda6`), então o robô vai a cada uma. No 3D as moedas são
 * cópias sem nome: o robô vai ao farol, e o caminho até lá passa pelas cinco da trilha.
 */
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { ILHA_CAMINHOS } from './ilha-do-farol-observacao'
import { MOEDAS_ASSETS_2D, type MoedasDimensao, type MoedasEtapa } from './moedas-projeto'

const value = (
  path: string,
  compare: ExecutionExpectation['compare'],
  v?: string | number | boolean,
): ExecutionExpectation =>
  ({
    target: { kind: 'value', path },
    compare,
    ...(v === undefined ? {} : { value: v }),
  }) as ExecutionExpectation
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
const ABERTO_2D = MOEDAS_ASSETS_2D.find((a) => a.name === 'bau-aberto')!.dataUrl.slice(-180)
const ACESO_2D = MOEDAS_ASSETS_2D.find((a) => a.name === 'farol-listrado-aceso')!.dataUrl.slice(
  -180,
)

export function moedasChecks(d: MoedasDimensao, etapa: MoedasEtapa): SectionProjectCheck[] {
  const three = d === '3d'
  const n = ['inicio', 'contador', 'coleta', 'placar', 'bau'].indexOf(etapa)
  const approach = (
    targetPath: string,
    timeoutMs: number,
    avoidPaths?: string[],
  ): ExecutionStep => ({
    action: three ? 'approachObject3d' : 'approachSprite',
    actorPath: 'personagem',
    targetPath,
    timeoutMs,
    ...(three ? { walkable: ILHA_CAMINHOS } : {}),
    ...(avoidPaths ? { avoidPaths } : {}),
  })
  const moedas = (v: number) => value('moedas', 'equals', v)
  const noChao = (v: number) =>
    value(three ? 'moedasDoCaminho.length' : 'moedasDoCaminho.items.length', 'equals', v)
  const bauAberto = (sim: boolean) =>
    three
      ? value('bau.userData.sz.animWant', sim ? 'contains' : 'notContains', 'abrir')
      : value('bau.image.url', sim ? 'contains' : 'notContains', ABERTO_2D)

  const zero = check(
    'zero',
    'Crie a variável moedas começando em 0: sem encostar em nada, ela continua 0.',
    [{ action: 'wait', ms: 1200 }],
    moedas(0),
  )
  const contar = three
    ? check(
        'contar',
        'Conte cada moeda: no caminho até o farol há cinco, e o número chega a 5.',
        [approach('farol', 7000)],
        moedas(5),
        [{ afterStep: 1, expect: noChao(1) }],
      )
    : check(
        'contar',
        'Conte cada moeda: depois de três moedas, o número é 3 e as três sumiram.',
        [approach('moeda3', 2000)],
        moedas(3),
        [{ afterStep: 1, expect: noChao(3) }],
      )
  const umaVez = three
    ? null
    : check(
        'uma-vez',
        'A mesma moeda não conta duas vezes: voltar ao lugar dela não soma de novo.',
        [
          approach('moeda1', 1500),
          { action: 'press', key: 'ArrowLeft', holdMs: 250 },
          { action: 'wait', ms: 100 },
          approach('moeda1', 1500),
          { action: 'wait', ms: 300 },
        ],
        moedas(1),
        [{ afterStep: 1, expect: moedas(1) }],
      )
  const placar: SectionProjectCheck = {
    id: 'placar',
    label: 'Mostre o número de moedas na tela.',
    rule: three
      ? {
          type: 'usesBlock',
          blockType: 'sz_g3d_hud_text',
          inputBlocks: { TEXT: { blockType: 'sz_val_variable', fields: { NAME: 'moedas' } } },
        }
      : {
          type: 'usesBlock',
          area: 'loops',
          blockType: 'sz_g2d_draw_score',
          inputBlocks: { VALUE: { blockType: 'sz_val_variable', fields: { NAME: 'moedas' } } },
        },
  }
  const meta = three
    ? check(
        'meta',
        'Com menos de 5 moedas, o baú fica fechado e o aviso diz o que falta.',
        [approach('bau', 4000), { action: 'wait', ms: 400 }],
        bauAberto(false),
        [
          { afterStep: 2, expect: moedas(0) },
          { afterStep: 2, expect: value('aviso', 'changed') },
        ],
      )
    : check(
        'meta',
        'Com menos de 5 moedas, o baú fica fechado e o aviso diz o que falta.',
        [approach('moeda2', 2000), approach('bau', 2500), { action: 'wait', ms: 300 }],
        bauAberto(false),
        [
          { afterStep: 2, expect: moedas(2) },
          { afterStep: 2, expect: value('aviso', 'changed') },
        ],
      )
  const cinco = three
    ? check(
        'cinco',
        'Com 5 moedas o baú abre (pelo menos 5), e voltar pelo caminho não conta de novo.',
        [approach('farol', 7000), approach('bau', 7500), { action: 'wait', ms: 400 }],
        bauAberto(true),
        [{ afterStep: 2, expect: moedas(5) }],
      )
    : check(
        'cinco',
        'Com exatamente 5 moedas o baú já abre ("pelo menos 5"), e voltar pelo caminho não conta de novo.',
        [approach('moeda5', 3000), approach('bau', 3500), { action: 'wait', ms: 300 }],
        bauAberto(true),
        [
          { afterStep: 1, expect: moedas(5) },
          { afterStep: 2, expect: moedas(5) },
        ],
      )
  const seis = three
    ? null
    : check(
        'seis',
        'Com as 6 moedas o baú também abre.',
        [
          approach('moeda5', 3000),
          approach('moeda6', 3500),
          approach('bau', 3500),
          { action: 'wait', ms: 300 },
        ],
        bauAberto(true),
        [{ afterStep: 2, expect: moedas(6) }],
      )
  const reinicio = check(
    'reinicio',
    'Uma nova partida (tecla R) recomeça o contador em 0, com as seis moedas de volta.',
    [
      approach(three ? 'farol' : 'moeda3', three ? 7000 : 2000),
      { action: 'press', key: 'r', holdMs: 80 },
      { action: 'wait', ms: three ? 600 : 400 },
    ],
    moedas(0),
    [{ afterStep: 3, expect: noChao(6) }],
  )
  const farol = three
    ? null
    : check(
        'farol',
        'O farol continua: com a chave, ele acende.',
        [approach('chave', 2500), approach('farol', 3500), { action: 'wait', ms: 300 }],
        value('farol.image.url', 'contains', ACESO_2D),
      )
  const lista: (SectionProjectCheck | null)[] = []
  if (n >= 1) lista.push(zero)
  if (n >= 2) lista.push(contar, umaVez)
  if (n >= 3) lista.push(placar)
  if (n >= 4) {
    // A última etapa confere o jogo inteiro; o "zero" e o "contar" já ficaram nas anteriores
    // e estouravam o prazo da parte no 3D.
    if (three) lista.splice(0, lista.length, placar)
    lista.push(meta, cinco, seis, reinicio, farol)
  }
  return lista.filter((c): c is SectionProjectCheck => c !== null)
}
