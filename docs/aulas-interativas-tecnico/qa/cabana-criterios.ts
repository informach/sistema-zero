/**
 * Os objetivos de cada etapa do Poder "O segredo da cabana". Os de execução rodam o jogo no
 * executor (`studio-runtime`) com o teclado de verdade e observam o COMPORTAMENTO: o nome da
 * variável do emblema pode ser outro, e um Se dentro do outro também passa.
 *
 * Cada caso vai às peças pedidas desviando das outras e da cabana, e só então encosta nela.
 */
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { CABANA_ASSETS_2D, type CabanaDimensao, type CabanaEtapa } from './cabana-projeto'
import { ILHA_CAMINHOS } from './ilha-do-farol-observacao'

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
const ABERTA_2D = CABANA_ASSETS_2D.find((a) => a.name === 'cabana-aberta')!.dataUrl.slice(-180)
const ACESO_2D = CABANA_ASSETS_2D.find((a) => a.name === 'farol-listrado-aceso')!.dataUrl.slice(
  -180,
)

export function cabanaChecks(d: CabanaDimensao, etapa: CabanaEtapa): SectionProjectCheck[] {
  const three = d === '3d'
  const n = ['inicio', 'emblema', 'porta'].indexOf(etapa)
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
  const espera = { action: 'wait', ms: 300 } as const satisfies ExecutionStep
  const aberta = (sim: boolean) =>
    three
      ? value('cabana.userData.sz.animWant', sim ? 'contains' : 'notContains', 'abrir')
      : value('cabana.image.url', sim ? 'contains' : 'notContains', ABERTA_2D)
  // Os prazos do robô: no 3D a ilha é maior, mas as três paradas ficam a poucos passos.
  const t = three ? { peca: 3800, cabana: 5500 } : { peca: 2500, cabana: 3000 }

  const guardar = check(
    'guardar',
    three
      ? 'Guarde o emblema: ao encostar nele, ele some e o aviso conta.'
      : 'Guarde o emblema: ao encostar nele, o aviso conta que você pegou.',
    [approach('emblema', t.peca, ['cabana', 'chave']), espera],
    three ? value('emblema.visible', 'equals', false) : value('aviso', 'changed'),
    three ? [{ afterStep: 2, expect: value('aviso', 'changed') }] : [],
  )
  const recolher: SectionProjectCheck = {
    id: 'recolher',
    label: three
      ? 'Esconda o emblema dentro do encontro entre personagem e emblema.'
      : 'Retire o emblema dentro do encontro entre personagem e emblema.',
    rule: three
      ? {
          type: 'usesBlock',
          blockType: 'sz_g3d_on_touch',
          area: 'events',
          fields: { OBJ: 'personagem', OTHER: 'emblema' },
          inputBlocks: {
            BODY: { blockType: 'sz_g3d_set_visible', fields: { OBJ: 'emblema', MODE: 'hide' } },
          },
        }
      : {
          type: 'usesBlock',
          blockType: 'sz_g2d_on_overlap',
          area: 'events',
          fieldAlternatives: [
            { A: 'personagem', B: 'emblema' },
            { A: 'emblema', B: 'personagem' },
          ],
          inputBlocks: {
            BODY: { blockType: 'sz_g2d_destroy_sprite', fields: { SPRITE: 'emblema' } },
          },
        },
  }
  const semPecas = check(
    'sem-pecas',
    'Sem nenhuma peça, a cabana fica fechada e o aviso diz o que ela pede.',
    [approach('cabana', t.cabana, ['chave', 'emblema']), espera],
    aberta(false),
    [{ afterStep: 2, expect: value('aviso', 'changed') }],
  )
  const soChave = check(
    'so-chave',
    'Só com a chave, a cabana continua fechada.',
    [
      approach('chave', t.peca, ['cabana', 'emblema']),
      approach('cabana', t.cabana, ['emblema']),
      espera,
    ],
    aberta(false),
    [{ afterStep: 1, expect: value('temChave', 'equals', true) }],
  )
  const soEmblema = check(
    'so-emblema',
    'Só com o emblema, a cabana continua fechada.',
    [
      approach('emblema', t.peca, ['cabana', 'chave']),
      approach('cabana', t.cabana, ['chave']),
      espera,
    ],
    aberta(false),
    [{ afterStep: 2, expect: value('temChave', 'equals', false) }],
  )
  const duas = check(
    'duas',
    'Com a chave e o emblema, a cabana abre.',
    [
      approach('chave', t.peca, ['cabana', 'emblema']),
      approach('emblema', t.peca + 500, ['cabana']),
      approach('cabana', t.cabana),
      espera,
    ],
    aberta(true),
  )
  // Pegar primeiro o emblema também abre (a ordem não importa); a nova partida fecha de novo.
  const reinicio = check(
    'reinicio',
    'Pegando o emblema antes da chave a cabana também abre, e uma nova partida (tecla R) a fecha.',
    [
      approach('emblema', t.peca, ['cabana', 'chave']),
      approach('chave', t.peca + 500, ['cabana']),
      approach('cabana', t.cabana),
      espera,
      { action: 'press', key: 'r', holdMs: 80 },
      { action: 'wait', ms: three ? 600 : 400 },
    ],
    aberta(false),
    [
      { afterStep: 4, expect: aberta(true) },
      { afterStep: 6, expect: value('temChave', 'equals', false) },
    ],
  )
  const farol = three
    ? null
    : check(
        'farol',
        'O farol continua: com a chave, ele acende.',
        [approach('chave', t.peca, ['emblema', 'cabana']), approach('farol', 3500), espera],
        value('farol.image.url', 'contains', ACESO_2D),
      )
  const lista: (SectionProjectCheck | null)[] = []
  if (n === 1) lista.push(guardar, recolher)
  // A última etapa confere o jogo inteiro; o "guardar" já ficou na anterior (e o "duas" o cobre).
  // No 3D o robô anda mais devagar e as cinco viagens não cabem no prazo da parte: o
  // "reinicio" já abre a cabana com as duas peças (na outra ordem), então o "duas" fica no 2D.
  if (n >= 2)
    lista.push(recolher, semPecas, soChave, soEmblema, three ? null : duas, reinicio, farol)
  return lista.filter((c): c is SectionProjectCheck => c !== null)
}
