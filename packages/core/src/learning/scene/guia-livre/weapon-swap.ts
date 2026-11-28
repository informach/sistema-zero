import type { SceneState, SceneWeaponSwap } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * A troca de arma (`weapon-swap`, Poder "Troca de arma" do Construtor, Nave contra Asteroides,
 * 28/11/2026) em exploração livre: só a IDEIA. A arma de agora fica guardada e muda o tiro: o laser
 * é fino e rápido, o plasma é grande e lento; o E só troca a arma depois de pegar o item de plasma, e
 * a partida nova volta ao laser. Nada de bloco, de Se nem de variável: a montagem fica para o
 * Estúdio. Antes de cada teste a fala pergunta e diz o que olhar; o que aconteceu só aparece na fala
 * de DEPOIS dele. As chaves começam com `weapon-swap-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/weapon-swap.tsx`): "Pegar o item de
 * plasma", "Apertar E", "Apertar Espaço" e "Nova partida".
 * ⚠️ O teste do E sem o item só cabe com o plasma trancado: depois do item, a fala manda começar
 * uma Nova partida antes (`relock`). São 21 falas.
 */

/** As metas na ordem da aula (a do catálogo): o próximo teste é a primeira que falta. */
export const METAS_DA_ARMA = ['locked', 'unlocked-swap', 'shot-follows', 'new-match-laser'] as const
type MetaDaArma = (typeof METAS_DA_ARMA)[number]
type Convite = MetaDaArma | 'relock'

const CURTO: Record<Convite, string> = {
  locked: 'locked',
  'unlocked-swap': 'swap',
  'shot-follows': 'shots',
  'new-match-laser': 'newmatch',
  relock: 'relock',
}

/** O que a criança acabou de ver, dito DEPOIS do teste. */
const EXPLICA: Record<MetaDaArma, string> = {
  locked: 'Sem o item de plasma, o E não trocou nada: a Arma continuou laser.',
  'unlocked-swap': 'Depois de pegar o item, o E trocou a Arma de laser para plasma.',
  'shot-follows':
    'Cada Espaço disparou a arma de agora: o laser saiu fino e chegou rápido à pedra, e o plasma saiu grande e demorou mais para chegar. O tiro segue a arma escolhida.',
  'new-match-laser':
    'Na Nova partida, a Arma voltou para laser, e o plasma ficou trancado de novo.',
}

/** O convite ao próximo teste: a pergunta e o que olhar, sem o resultado. */
const CONVIDA: Record<Convite, string> = {
  locked: 'E sem o item? Clique em Apertar E, sem pegar o item de plasma, e olhe a Arma.',
  relock:
    'E sem o item? Clique em Nova partida e depois em Apertar E, sem pegar o item de plasma. Olhe a Arma.',
  'unlocked-swap':
    'E depois de pegar o item? Clique em Pegar o item de plasma e depois em Apertar E. Olhe a Arma.',
  'shot-follows':
    'E o tiro de cada arma? Clique em Apertar Espaço com o laser e com o plasma, trocando a arma no Apertar E. Compare os dois tiros.',
  'new-match-laser':
    'E numa partida nova? Com o plasma escolhido, clique em Nova partida e olhe a Arma.',
}

/** Explicação + convite: o que foi visto e o que testar depois (o convite é a primeira meta que falta). */
const DEPOIS_DO_TESTE = Object.fromEntries(
  METAS_DA_ARMA.flatMap((visto) =>
    ([...METAS_DA_ARMA, 'relock'] as const)
      .filter((proximo) => proximo !== visto)
      // Logo depois do E sem o item, ou de uma Nova partida, o plasma está trancado: o teste do E sem
      // o item cabe sem recomeçar.
      .filter(
        (proximo) => !(proximo === 'relock' && (visto === 'locked' || visto === 'new-match-laser')),
      )
      .map((proximo) => [
        `weapon-swap-${CURTO[visto]}-then-${CURTO[proximo]}`,
        `${EXPLICA[visto]} ${CONVIDA[proximo]}`,
      ]),
  ),
)

const PEDIDOS = Object.fromEntries(
  ([...METAS_DA_ARMA, 'relock'] as const).map((meta) => [
    `weapon-swap-ask-${CURTO[meta]}`,
    CONVIDA[meta],
  ]),
)

export const WEAPON_SWAP_SPEECH: Readonly<Record<string, string>> = {
  'weapon-swap-start':
    'A nave começa com o laser, e uma pedra espera no alto da tela. O plasma ainda está trancado. O que você acha que o E faz agora? Clique em Apertar E e olhe a Arma.',
  ...PEDIDOS,
  ...DEPOIS_DO_TESTE,
  'weapon-swap-complete':
    'Você testou tudo. A arma de agora fica guardada, e o Espaço dispara o tiro dessa arma: o laser é fino e rápido, o plasma é grande e lento. O E só troca a arma depois de pegar o item de plasma, e uma Nova partida volta ao laser. Pode continuar testando quando quiser.',
}

type Arma = Pick<SceneWeaponSwap, 'weapon' | 'unlocked' | 'fired' | 'last'>

/**
 * O teste que o ÚLTIMO gesto acabou de mostrar, ou `null`. Mesma régua das metas no motor
 * (`weapon-key-e`, `weapon-fire`, `weapon-new-match`): o E sem o item, o E que levou ao plasma, o
 * disparo com as duas armas já vistas e a Nova partida que saiu do plasma.
 */
export function testeDaArmaAgora(w: Arma): MetaDaArma | null {
  if (w.last === 'locked') return 'locked'
  if (w.last === 'swap' && w.weapon === 'plasma') return 'unlocked-swap'
  if (w.last === 'fire' && w.fired.includes('laser') && w.fired.includes('plasma'))
    return 'shot-follows'
  if (w.last === 'back-to-laser') return 'new-match-laser'
  return null
}

/** O convite do teste que falta: o E sem o item precisa do plasma trancado. */
function convite(meta: MetaDaArma, w: Pick<SceneWeaponSwap, 'unlocked'>): Convite {
  return meta === 'locked' && w.unlocked ? 'relock' : meta
}

/**
 * Qual fala vale agora. Logo depois de um teste, a fala explica o que a criança VIU e convida ao
 * primeiro teste que falta. Fora disso, a fala pede o próximo teste (a tela destaca o controle que
 * ainda falta mexer).
 */
export function weaponSwapGuidance(
  state: Pick<SceneState, 'weaponSwap'>,
  feita: (meta: string) => boolean,
  viu: (meta: string) => boolean = feita,
): string {
  const w = state.weaponSwap
  const falta = METAS_DA_ARMA.find((meta) => !feita(meta))
  if (!falta) return 'weapon-swap-complete'
  const proximo = CURTO[convite(falta, w)]
  const agora = testeDaArmaAgora(w)
  if (agora && viu(agora)) return `weapon-swap-${CURTO[agora]}-then-${proximo}`
  if (falta === 'locked' && !w.unlocked && !METAS_DA_ARMA.some(viu)) return 'weapon-swap-start'
  return `weapon-swap-ask-${proximo}`
}

export const guia: GuiaLivre = {
  speech: WEAPON_SWAP_SPEECH,
  guidance: (state, has, activity) =>
    weaponSwapGuidance(state, metaFeita(activity, [...METAS_DA_ARMA], has), has),
}
