/**
 * Os objetivos de cada etapa do Poder "O baú dos símbolos". Os de execução rodam o jogo no
 * executor (`studio-runtime`) com o teclado de verdade e observam o COMPORTAMENTO: a pedra acesa,
 * o baú e o aviso. O nome da variável e as frases do aviso podem ser outros.
 *
 * Cada objetivo leva o personagem de pedra em pedra (no máximo quatro idas) e cabe nos 15 s do
 * executor; somados, os de cada parte cabem nos 40 s.
 */
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { ILHA_CAMINHOS } from './ilha-do-farol-observacao'
import {
  SIMBOLOS_ASSETS_2D,
  SIMBOLOS_ETAPAS,
  type Simbolo,
  type SimbolosDimensao,
  type SimbolosEtapa,
} from './simbolos-projeto'

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
const fim = (name: string) => SIMBOLOS_ASSETS_2D.find((a) => a.name === name)!.dataUrl.slice(-180)
const ACESA_2D: Record<Simbolo, string> = {
  sol: fim('pedra-sol-acesa'),
  lua: fim('pedra-lua-acesa'),
  estrela: fim('pedra-estrela-acesa'),
}
const ABERTO_2D = fim('bau-aberto')
const ACESO_FAROL_2D = fim('farol-listrado-aceso')

export function simbolosChecks(d: SimbolosDimensao, etapa: SimbolosEtapa): SectionProjectCheck[] {
  const three = d === '3d'
  const n = SIMBOLOS_ETAPAS.indexOf(etapa)
  const ORDEM = ['sol', 'lua', 'estrela'] as const
  /**
   * Ir até uma pedra sem encostar em outra: evita as pedras que não são o alvo nem a de onde o
   * personagem sai (ele começa a ida em cima dela). O prazo é maior saindo do começo ou dando a
   * volta numa pedra do que indo à vizinha. No 3D, do começo o sol fica perto e a lua, longe;
   * cada prazo deixa cerca de um terço de folga sobre a ida medida sem placa de vídeo.
   */
  const ir = (s: Simbolo, de?: Simbolo): ExecutionStep => {
    const vizinha = de !== undefined && Math.abs(ORDEM.indexOf(s) - ORDEM.indexOf(de)) === 1
    const prazo3d = de === undefined ? (s === 'sol' ? 3000 : 4200) : vizinha ? 3200 : 3800
    return {
      action: three ? 'approachObject3d' : 'approachSprite',
      actorPath: 'personagem',
      targetPath: s,
      timeoutMs: three ? prazo3d : vizinha ? 1800 : 2400,
      ...(three ? { walkable: ILHA_CAMINHOS } : {}),
      avoidPaths: [...ORDEM.filter((o) => o !== s && o !== de), 'chave'],
    }
  }
  const espera = (ms: number) => ({ action: 'wait', ms }) as const satisfies ExecutionStep
  const acesa = (s: Simbolo, sim: boolean) =>
    three
      ? value(`${s}.userData.sz.animWant`, sim ? 'contains' : 'notContains', 'acender')
      : value(`${s}.image.url`, sim ? 'contains' : 'notContains', ACESA_2D[s])
  const aberto = (sim: boolean) =>
    three
      ? value('bau.userData.sz.animWant', sim ? 'contains' : 'notContains', 'abrir')
      : value('bau.image.url', sim ? 'contains' : 'notContains', ABERTO_2D)
  /** A ordem certa: sol, lua e estrela, da esquerda para a direita. */
  const ordem: ExecutionStep[] = [ir('sol'), ir('lua', 'sol'), ir('estrela', 'lua')]

  const parado = check(
    'parado',
    'Sem tocar em nada, o sol continua apagado.',
    [espera(1500)],
    acesa('sol', false),
  )
  const solComeca = check(
    'sol-comeca',
    'Ao encostar no sol, ele acende e o aviso muda.',
    [ir('sol'), espera(300)],
    acesa('sol', true),
    [{ afterStep: 2, expect: value('aviso', 'changed') }],
  )
  const luaDepois = check(
    'lua-depois',
    'Depois do sol, a lua acende.',
    [ir('sol'), ir('lua', 'sol'), espera(300)],
    acesa('lua', true),
  )
  const luaPrimeiro = check(
    'lua-primeiro',
    'Começando pela lua, ela não acende e o aviso diz para começar pelo sol.',
    [ir('lua'), espera(300)],
    acesa('lua', false),
    [{ afterStep: 2, expect: value('aviso', 'changed') }],
  )
  /** A pergunta da vez: um Se com senão dentro do encontro com a pedra. */
  const seNa = (s: Simbolo): SectionProjectCheck => ({
    id: `se-na-${s}`,
    label: `O encontro com a ${s} pergunta se é a vez dela (Se, com senão).`,
    rule: three
      ? {
          type: 'usesBlock',
          blockType: 'sz_g3d_on_touch',
          area: 'events',
          fields: { OBJ: 'personagem', OTHER: s },
          inputBlocks: { BODY: { blockType: 'sz_js_if_else' } },
        }
      : {
          type: 'usesBlock',
          blockType: 'sz_g2d_on_overlap',
          area: 'events',
          fieldAlternatives: [
            { A: 'personagem', B: s },
            { A: s, B: 'personagem' },
          ],
          inputBlocks: { BODY: { blockType: 'sz_js_if_else' } },
        },
  })
  const abre = check(
    'ordem-certa',
    'Tocando o sol, a lua e a estrela, nessa ordem, o baú abre.',
    [...ordem, espera(300)],
    aberto(true),
  )
  // Pega a estrela sem o Se (o baú abre fora da vez), a lua sem o Se e o senão que não volta o
  // passo a 0 (nos dois, a lua acende depois da estrela errada).
  const foraDaVez = check(
    'fora-da-vez',
    'Um símbolo fora da vez recomeça: depois do sol e da estrela, o baú não abre e a lua não acende.',
    [ir('sol'), ir('estrela', 'sol'), ir('lua', 'estrela'), espera(300)],
    acesa('lua', false),
    [{ afterStep: 2, expect: aberto(false) }],
  )
  // Pega o senão que trava a tentativa para sempre.
  const recomecar = check(
    'recomecar',
    'Depois de errar, começar de novo pelo sol abre o baú.',
    [ir('lua'), ir('sol', 'lua'), ir('lua', 'sol'), ir('estrela', 'lua'), espera(300)],
    aberto(true),
  )
  // Uma ida só: a partida nova refaz o jogo inteiro, e o sol aceso basta para ver o recomeço.
  const reinicio = check(
    'reinicio',
    'Uma nova partida (tecla R) começa com os símbolos apagados.',
    [ir('sol'), espera(300), { action: 'press', key: 'r', holdMs: 80 }, espera(three ? 600 : 400)],
    acesa('sol', false),
    [{ afterStep: 2, expect: acesa('sol', true) }],
  )
  const farol = three
    ? null
    : check(
        'farol',
        'O farol continua: com a chave, ele acende.',
        [
          {
            action: 'approachSprite',
            actorPath: 'personagem',
            targetPath: 'chave',
            timeoutMs: 2500,
            avoidPaths: ['sol', 'lua', 'estrela'],
          },
          {
            action: 'approachSprite',
            actorPath: 'personagem',
            targetPath: 'farol',
            timeoutMs: 3500,
          },
          espera(300),
        ],
        value('farol.image.url', 'contains', ACESO_FAROL_2D),
      )
  const lista: (SectionProjectCheck | null)[] = []
  if (n === 1) lista.push(parado, solComeca)
  if (n === 2) lista.push(luaDepois, luaPrimeiro, seNa('lua'))
  if (n >= 3) lista.push(seNa('estrela'), abre, foraDaVez, recomecar, reinicio, farol)
  return lista.filter((c): c is SectionProjectCheck => c !== null)
}
