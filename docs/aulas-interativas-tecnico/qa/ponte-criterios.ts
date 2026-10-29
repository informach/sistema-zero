/**
 * Os objetivos de cada etapa do Poder "A ponte apressada". Os de execução rodam o jogo no
 * executor (`studio-runtime`) com o teclado de verdade e observam o COMPORTAMENTO: o nome da
 * variável e as frases do aviso podem ser outros, e o tempo pode ser outro entre 2 e 5 segundos.
 *
 * As esperas medem o relógio de verdade: depois de puxar, "ainda aberta" espera 1,5 s e "subiu
 * sozinha" espera 5,8 s. Para puxar de novo, o personagem sai de cima da alavanca e volta (o
 * encontro só conta quando começa).
 */
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import {
  PONTE_ASSETS_2D,
  PONTE_CAMINHOS_3D,
  type PonteDimensao,
  type PonteEtapa,
} from './ponte-projeto'

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
const fim = (name: string) => PONTE_ASSETS_2D.find((a) => a.name === name)!.dataUrl.slice(-180)
const BAIXADA_2D = fim('ponte-baixada')
const TOCANDO_2D = fim('pedra-do-sino-tocando')
const ACESO_2D = fim('farol-listrado-aceso')
/**
 * Quanto esperar depois de puxar: ainda aberta (1,5 s) e já levantada. O "depois de segundos" é
 * um relógio de verdade (não anda com os quadros), então no 3D, onde as idas do robô comem o
 * prazo da parte, 4,8 s bastam; no 2D sobra tempo e a espera fica em 5,8 s.
 */
export const PONTE_ESPERA = { aberta: 1500, subiu: { '2d': 5800, '3d': 4800 } } as const

export function ponteChecks(d: PonteDimensao, etapa: PonteEtapa): SectionProjectCheck[] {
  const three = d === '3d'
  const n = ['inicio', 'alavanca', 'sobe', 'atravessar'].indexOf(etapa)
  const approach = (
    targetPath: string,
    timeoutMs: number,
    avoidPaths?: string[],
  ): ExecutionStep => ({
    action: three ? 'approachObject3d' : 'approachSprite',
    actorPath: 'personagem',
    targetPath,
    timeoutMs,
    ...(three ? { walkable: PONTE_CAMINHOS_3D } : {}),
    ...(avoidPaths ? { avoidPaths } : {}),
  })
  const espera = (ms: number) => ({ action: 'wait', ms }) as const satisfies ExecutionStep
  const baixada = (sim: boolean) =>
    three
      ? value('ponte.userData.sz.animWant', sim ? 'contains' : 'notContains', 'baixar')
      : value('ponte.image.url', sim ? 'contains' : 'notContains', BAIXADA_2D)
  const tocou = (sim: boolean) =>
    three
      ? value('sino.userData.sz.animWant', sim ? 'contains' : 'notContains', 'tocar')
      : value('sino.image.url', sim ? 'contains' : 'notContains', TOCANDO_2D)
  // Os prazos do robô: no 3D a ilha é maior e ele contorna o laguinho (do começo à ponte, até
  // 4,9 s medidos num executor sem placa de vídeo).
  const t = three ? { alavanca: 5500, ponte: 6200 } : { alavanca: 3500, ponte: 3000 }
  const subiu = PONTE_ESPERA.subiu[d]
  const seta = (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown', holdMs: number) =>
    ({ action: 'press', key, holdMs }) as const satisfies ExecutionStep
  /**
   * Puxar e atravessar. A travessia é sempre um passo de seta para a esquerda, a partir da
   * alavanca, que fica ao lado da entrada: indo até a ponte com o robô, o personagem vai à pedra
   * no meio do caminho e o robô se perde. No 2D o robô vai direto à alavanca. No 3D, não: ele
   * termina a ida à alavanca em pulsos curtos (até alguns segundos depois de o jogo ver o
   * encontro, que comeriam o tempo da ponte), então vai primeiro à entrada da ponte (levantada) e
   * dá um passo de seta para a direita até a alavanca. Do puxão à travessia passam menos de 3
   * segundos, sempre.
   *
   * No 3D, cada passo de seta termina na BEIRA do chão (a alavanca fica no fim da faixa da direita,
   * a ponte no começo, e a faixa acaba em z 5): sem placa de vídeo os quadros demoram e o
   * personagem anda menos no mesmo aperto, então o aperto sobra e a beira o segura.
   */
  const chegarNaPonte = approach('ponte', t.ponte, ['alavanca'])
  const puxarSteps: ExecutionStep[] = three
    ? [chegarNaPonte, seta('ArrowRight', 1000)]
    : [approach('alavanca', t.alavanca, ['ponte', 'chave'])]
  const atravessar: ExecutionStep[] = [seta('ArrowLeft', three ? 1800 : 600)]
  /**
   * Sair de cima da alavanca e encostar nela de novo (o encontro só conta quando começa). No 3D,
   * para a frente até a beira e de volta: indo para a esquerda, o personagem chegaria à ponte.
   */
  const puxarDeNovo: ExecutionStep[] = three
    ? [seta('ArrowDown', 1000), seta('ArrowUp', 1000)]
    : [seta('ArrowUp', 500), approach('alavanca', 2000, ['ponte'])]
  /** O passo (contando de 1) em que a alavanca acabou de ser puxada. */
  const puxou = puxarSteps.length
  /**
   * Antes de puxar, os objetivos de tempo deixam passar os 4 segundos do começo do jogo: um
   * "depois de" posto fora da alavanca (solto no começo) já disparou, e o teste não depende de
   * quanto o robô levou para chegar. No 3D a ida até a ponte já leva alguns segundos.
   */
  const comecoPassou = espera(three ? 2500 : 4200)

  const parada = check(
    'parada',
    'Sem ninguém puxar a alavanca, a ponte continua levantada.',
    [espera(1500)],
    baixada(false),
  )
  const puxa = check(
    'puxar',
    'Ao encostar na alavanca, a ponte baixa e o aviso conta.',
    [approach('alavanca', t.alavanca, ['ponte', 'chave']), espera(300)],
    baixada(true),
    [{ afterStep: 2, expect: value('aviso', 'changed') }],
  )
  const abertaAntes = check(
    'aberta-antes',
    'Logo depois de puxar, a ponte ainda está baixada.',
    [comecoPassou, ...puxarSteps, espera(PONTE_ESPERA.aberta)],
    baixada(true),
  )
  const sobe = check(
    'sobe-sozinha',
    'Depois de alguns segundos, a ponte sobe sozinha e o aviso muda.',
    [comecoPassou, ...puxarSteps, espera(subiu)],
    baixada(false),
    [{ afterStep: puxou + 1, expect: baixada(true) }],
  )
  const deNovo = check(
    'de-novo',
    'Depois que a ponte sobe, puxar a alavanca de novo baixa a ponte outra vez.',
    [...puxarSteps, espera(subiu), ...puxarDeNovo, espera(300)],
    baixada(true),
    [{ afterStep: puxou + 1, expect: baixada(false) }],
  )
  const dentro: SectionProjectCheck = {
    id: 'depois-dentro',
    label: 'O "depois de segundos" fica dentro do encontro com a alavanca.',
    rule: three
      ? {
          type: 'usesBlock',
          blockType: 'sz_g3d_on_touch',
          area: 'events',
          fields: { OBJ: 'personagem', OTHER: 'alavanca' },
          inputBlocks: { BODY: { blockType: 'sz_js_set_timeout_seconds' } },
        }
      : {
          type: 'usesBlock',
          blockType: 'sz_g2d_on_overlap',
          area: 'events',
          fieldAlternatives: [
            { A: 'personagem', B: 'alavanca' },
            { A: 'alavanca', B: 'personagem' },
          ],
          inputBlocks: { BODY: { blockType: 'sz_js_set_timeout_seconds' } },
        },
  }
  const aTempo = check(
    'a-tempo',
    'Puxando a alavanca e indo direto à ponte, o personagem atravessa e o sino toca.',
    [...puxarSteps, ...atravessar, espera(300)],
    tocou(true),
  )
  const atrasado = check(
    'atrasado',
    'Chegando depois que a ponte subiu, o personagem não atravessa.',
    [...puxarSteps, espera(subiu), ...atravessar, espera(300)],
    tocou(false),
    [{ afterStep: puxou + 1, expect: baixada(false) }],
  )
  const fechada = check(
    'fechada',
    'Sem puxar a alavanca, a ponte não deixa atravessar e o aviso diz o que fazer.',
    [chegarNaPonte, espera(300)],
    tocou(false),
    [{ afterStep: 2, expect: value('aviso', 'changed') }],
  )
  const reinicio = check(
    'reinicio',
    'Uma nova partida (tecla R) começa com a ponte levantada.',
    [
      ...puxarSteps,
      espera(300),
      { action: 'press', key: 'r', holdMs: 80 },
      espera(three ? 600 : 400),
    ],
    baixada(false),
    [{ afterStep: puxou + 1, expect: baixada(true) }],
  )
  const farol = three
    ? null
    : check(
        'farol',
        'O farol continua: com a chave, ele acende.',
        [approach('chave', 2500, ['alavanca', 'ponte']), approach('farol', 3500), espera(300)],
        value('farol.image.url', 'contains', ACESO_2D),
      )
  const lista: (SectionProjectCheck | null)[] = []
  if (n === 1) lista.push(parada, puxa)
  // "Puxar" já ficou na etapa anterior; aqui o "ainda baixada" mostra que a alavanca baixa.
  if (n === 2) lista.push(abertaAntes, sobe, deNovo, dentro)
  // A última etapa confere o jogo inteiro; "puxar de novo" ficou na anterior (não cabe no prazo).
  if (n >= 3) lista.push(dentro, aTempo, atrasado, fechada, reinicio, farol)
  return lista.filter((c): c is SectionProjectCheck => c !== null)
}
