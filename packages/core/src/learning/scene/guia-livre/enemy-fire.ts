import { ENEMY_FIRE } from '../actions'
import { enemyFireOver, type SceneEnemyFire, type SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * O inimigo que atira (`enemy-fire`, Poder "Inimigo que atira" do Construtor, Nave contra
 * Asteroides, 28/11/2026) em exploração livre: só a IDEIA. Uma inimiga com tiros próprios: o tiro
 * criado num lugar fixo sai sempre dali, o criado na inimiga sai de onde a inimiga está, um relógio
 * decide o ritmo, o tiro que encosta na nave sai e tira uma vida, e começar uma partida nova limpa os
 * tiros. Nada de bloco, de Se nem de variável: a montagem fica para o Estúdio. Antes de cada teste a
 * fala pergunta e diz o que olhar; o que aconteceu só aparece na fala de DEPOIS dele. As chaves
 * começam com `enemy-fire-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/enemy-fire.tsx`): "No meio", "Na
 * inimiga", "Nave à esquerda", "Nave no meio", "Nave à direita", "Avançar meio segundo", "Avançar
 * até o próximo tiro" e "Recomeçar a partida".
 * ⚠️ São 22 falas: cabem no teto da voz do bloco (`VOZ_LIMITS.entradas`).
 */

/** As metas na ordem da aula (a do catálogo): o próximo teste é a primeira que falta. */
export const METAS_DO_INIMIGO = [
  'fixed-origin',
  'enemy-origin',
  'shot-hurts',
  'restart-clears',
] as const
type MetaDoInimigo = (typeof METAS_DO_INIMIGO)[number]

const CURTO: Record<MetaDoInimigo, string> = {
  'fixed-origin': 'fixed',
  'enemy-origin': 'enemy',
  'shot-hurts': 'hurts',
  'restart-clears': 'restart',
}

/** O que a criança acabou de ver, dito DEPOIS do teste. */
const EXPLICA: Record<MetaDoInimigo, string> = {
  'fixed-origin':
    'Com a origem No meio, os dois tiros nasceram no meio da tela, mesmo com a inimiga em lugares diferentes. O lugar fixo não muda.',
  'enemy-origin':
    'Com a origem Na inimiga, cada tiro nasceu embaixo da inimiga, no lugar onde a inimiga estava. A origem acompanha a inimiga.',
  'shot-hurts': 'O tiro encostou na nave, sumiu da tela, e a nave perdeu uma vida.',
  'restart-clears':
    'Recomeçar a partida tirou os tiros do ar, as vidas voltaram a 3, e a inimiga voltou ao começo. As suas descobertas continuam guardadas.',
}

/** O convite ao próximo teste: a pergunta e o que olhar, sem o resultado. */
const CONVIDA: Record<MetaDoInimigo | 'over', string> = {
  'fixed-origin':
    'E com a origem No meio? Escolha No meio e clique em Avançar até o próximo tiro duas vezes. Quando a inimiga muda de lugar, de onde saem os tiros?',
  'enemy-origin':
    'E com a origem Na inimiga? Escolha Na inimiga e clique em Avançar até o próximo tiro duas vezes. De onde você acha que cada tiro vai sair?',
  'shot-hurts':
    'E quando um tiro chega até a nave? Escolha Nave à esquerda, Nave no meio ou Nave à direita para ficar embaixo de um tiro que está descendo. Depois clique em Avançar meio segundo e olhe as Vidas.',
  'restart-clears':
    'E o que acontece ao recomeçar? Com tiros no ar, clique em Recomeçar a partida. Olhe os tiros e as Vidas.',
  over: 'A partida acabou. Para o próximo teste, clique em Recomeçar a partida.',
}

/** Explicação + convite: o que foi visto e o que testar depois (o convite é a primeira meta que falta). */
const DEPOIS_DO_TESTE = Object.fromEntries(
  METAS_DO_INIMIGO.flatMap((visto) =>
    [...METAS_DO_INIMIGO, 'over' as const]
      .filter((proximo) => proximo !== visto)
      // Recomeçar abre uma partida nova: logo depois dele, a partida nunca acabou.
      .filter((proximo) => !(visto === 'restart-clears' && proximo === 'over'))
      .map((proximo) => [
        `enemy-fire-${CURTO[visto]}-then-${proximo === 'over' ? 'over' : CURTO[proximo]}`,
        `${EXPLICA[visto]} ${CONVIDA[proximo]}`,
      ]),
  ),
)

const PEDIDOS = Object.fromEntries(
  METAS_DO_INIMIGO.map((meta) => [`enemy-fire-ask-${CURTO[meta]}`, CONVIDA[meta]]),
)

export const ENEMY_FIRE_SPEECH: Readonly<Record<string, string>> = {
  'enemy-fire-start':
    'A nave inimiga anda de um lado para o outro no alto da tela e atira a cada um segundo e meio. A Origem do tiro está No meio. De onde você acha que os tiros vão sair? Clique em Avançar até o próximo tiro duas vezes e olhe a inimiga e os tiros.',
  ...PEDIDOS,
  'enemy-fire-over': CONVIDA.over,
  ...DEPOIS_DO_TESTE,
  'enemy-fire-complete':
    'Você testou tudo. Com a origem No meio, todo tiro sai do mesmo lugar fixo. Com a origem Na inimiga, cada tiro sai de onde a inimiga está. Um relógio decide o ritmo: um tiro a cada um segundo e meio. O tiro que encosta na nave sai e tira uma vida, e Recomeçar a partida limpa os tiros. Pode continuar testando quando quiser.',
}

type Inimigo = Pick<
  SceneEnemyFire,
  'tick' | 'lives' | 'shots' | 'middleFrom' | 'enemyFrom' | 'last'
>

/**
 * O teste que o ÚLTIMO gesto acabou de mostrar, ou `null`. Mesma régua das metas no motor
 * (`meioSegundoDaInimiga`, `encostarNaNave`, `enemy-restart`): o tiro que saiu com a origem no meio
 * (ou na inimiga) com a inimiga já vista em dois lugares; o tiro que encostou; o recomeço que limpou.
 */
export function testeDoInimigoAgora(f: Inimigo): MetaDoInimigo | null {
  if (f.last === 'hit') return 'shot-hurts'
  if (f.last === 'restart') return 'restart-clears'
  if (f.last !== 'fire') return null
  const novo = f.shots.at(-1)
  if (novo?.origin === 'middle' && f.middleFrom.length >= 2) return 'fixed-origin'
  if (novo?.origin === 'enemy' && f.enemyFrom.length >= 2) return 'enemy-origin'
  return null
}

/** Ainda dá para fazer este teste nesta partida, sem recomeçar? */
export function testeDoInimigoCabe(meta: MetaDoInimigo, f: Inimigo): boolean {
  if (!enemyFireOver(f)) return true
  return meta === 'restart-clears' && (f.shots.length > 0 || f.lives < ENEMY_FIRE.lives)
}

/**
 * Qual fala vale agora. Logo depois de um teste, a fala explica o que a criança VIU e convida ao
 * primeiro teste que falta (ou a recomeçar, quando a partida acabou). Fora disso, a fala pede o
 * próximo teste (a tela destaca o controle que ainda falta mexer).
 */
export function enemyFireGuidance(
  state: Pick<SceneState, 'enemyFire'>,
  feita: (meta: string) => boolean,
  viu: (meta: string) => boolean = feita,
): string {
  const f = state.enemyFire
  const falta = METAS_DO_INIMIGO.find((meta) => !feita(meta))
  if (!falta) return 'enemy-fire-complete'
  const cabe = testeDoInimigoCabe(falta, f)
  const agora = testeDoInimigoAgora(f)
  if (agora && viu(agora)) return `enemy-fire-${CURTO[agora]}-then-${cabe ? CURTO[falta] : 'over'}`
  if (!cabe) return 'enemy-fire-over'
  if (falta === 'fixed-origin' && !METAS_DO_INIMIGO.some(viu)) return 'enemy-fire-start'
  return `enemy-fire-ask-${CURTO[falta]}`
}

export const guia: GuiaLivre = {
  speech: ENEMY_FIRE_SPEECH,
  guidance: (state, has, activity) =>
    enemyFireGuidance(state, metaFeita(activity, [...METAS_DO_INIMIGO], has), has),
}
