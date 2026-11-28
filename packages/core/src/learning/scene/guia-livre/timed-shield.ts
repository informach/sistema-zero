import { TIMED_SHIELD } from '../actions'
import {
  type SceneState,
  type SceneTimedShield,
  timedShieldNextRock,
  timedShieldOver,
  timedShieldRock,
} from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * O escudo temporário (`timed-shield`, Poder "Escudo temporário" do Construtor, Nave contra
 * Asteroides, 28/11/2026) em exploração livre: só a IDEIA. Pegar o item liga o Escudo em 5, ele desce
 * 1 por segundo, a pedra só tira vida com o Escudo em 0, e pegar de novo volta o Escudo a 5. Nada de
 * bloco, de Se nem de variável: a montagem fica para o Estúdio. Antes de cada teste a fala pergunta e
 * diz o que olhar; o que aconteceu só aparece na fala de DEPOIS dele. As chaves começam com
 * `timed-shield-`.
 *
 * ⚠️ Os rótulos citados são os botões da tela livre (`scene-livre/timed-shield.tsx`): "Pegar o item
 * do escudo", "Avançar 1 segundo", "Avançar até a próxima pedra" e "Voltar ao começo".
 */

/** As metas na ordem da aula (a do catálogo): o próximo teste é a primeira que falta. */
export const METAS_DO_ESCUDO = [
  'hit-costs',
  'shield-protects',
  'shield-ends',
  'shield-renews',
] as const
type MetaDoEscudo = (typeof METAS_DO_ESCUDO)[number]

const CURTO: Record<MetaDoEscudo, string> = {
  'hit-costs': 'hit',
  'shield-protects': 'protects',
  'shield-ends': 'ends',
  'shield-renews': 'renews',
}

/** O que a criança acabou de ver, dito DEPOIS do teste. */
const EXPLICA: Record<MetaDoEscudo, string> = {
  'hit-costs': 'Sem escudo, a pedra bateu e a nave perdeu uma vida.',
  'shield-protects': 'Com o Escudo maior que 0, a pedra bateu e só saiu: as vidas ficaram iguais.',
  'shield-ends': 'O Escudo contou para trás até 0, e aí a pedra voltou a tirar uma vida.',
  'shield-renews': 'Pegar o item de novo voltou o Escudo a 5, e a contagem recomeçou dali.',
}

/** O convite ao próximo teste: a pergunta e o que olhar, sem o resultado. */
const CONVIDA: Record<MetaDoEscudo | 'restart', string> = {
  'hit-costs':
    'E sem escudo nenhum? Clique em Voltar ao começo e, sem pegar o item, clique em Avançar até a próxima pedra. Olhe as Vidas.',
  'shield-protects':
    'E com o escudo ligado? Clique em Pegar o item do escudo e depois em Avançar até a próxima pedra. O que acontece com as Vidas?',
  'shield-ends':
    'E quando o Escudo chegar a 0? Pegue o item, se precisar, e clique em Avançar 1 segundo até o Escudo chegar a 0. Depois clique em Avançar até a próxima pedra. O que acontece com as Vidas?',
  'shield-renews':
    'E se a nave pegar o item de novo antes de o Escudo acabar? Com o Escudo entre 1 e 4, clique em Pegar o item do escudo e olhe o número. Com o Escudo em 0, pegue o item e clique em Avançar 1 segundo antes.',
  restart: 'Para o próximo teste, clique em Voltar ao começo.',
}

/** Explicação + convite: o que foi visto e o que testar depois (o convite é a primeira meta que falta). */
const DEPOIS_DO_TESTE = Object.fromEntries(
  METAS_DO_ESCUDO.flatMap((visto) =>
    [...METAS_DO_ESCUDO, 'restart' as const]
      .filter((proximo) => proximo !== visto)
      // O fim do escudo só cai depois da proteção (toda pegada protege a primeira pedra que vem).
      .filter((proximo) => !(visto === 'shield-ends' && proximo === 'shield-protects'))
      .map((proximo) => [
        `timed-shield-${CURTO[visto]}-then-${proximo === 'restart' ? 'restart' : CURTO[proximo]}`,
        `${EXPLICA[visto]} ${CONVIDA[proximo]}`,
      ]),
  ),
)

export const TIMED_SHIELD_SPEECH: Readonly<Record<string, string>> = {
  'timed-shield-start':
    'Pedras vão bater na nave nos segundos 2, 5, 8 e 11. A nave ainda não pegou o escudo. O que você acha que acontece com as vidas quando uma pedra bater? Clique em Avançar até a próxima pedra e olhe as Vidas.',
  'timed-shield-ask-hit':
    'E sem escudo nenhum? O que acontece com as vidas quando uma pedra bater? Sem pegar o item, clique em Avançar até a próxima pedra e olhe as Vidas.',
  'timed-shield-ask-hit-restart':
    'Nesta partida a nave já pegou o item. E sem escudo nenhum, o que acontece quando uma pedra bate? Clique em Voltar ao começo e, sem pegar o item, clique em Avançar até a próxima pedra. Olhe as Vidas.',
  'timed-shield-ask-protects':
    'E com o escudo ligado? Clique em Pegar o item do escudo e olhe o número do Escudo. Depois clique em Avançar até a próxima pedra. O que acontece com as Vidas quando a pedra bater?',
  'timed-shield-shield-on':
    'O Escudo está ligado e conta para trás, um segundo de cada vez. O que você acha que acontece se uma pedra bater agora? Clique em Avançar até a próxima pedra e olhe as Vidas.',
  'timed-shield-ask-ends':
    'E quando o Escudo chegar a 0? Clique em Pegar o item do escudo. Depois clique em Avançar 1 segundo até o Escudo chegar a 0. O que você acha que acontece com as Vidas na próxima pedra?',
  'timed-shield-ends-wait':
    'O Escudo ainda está ligado. Clique em Avançar 1 segundo até o Escudo chegar a 0. Depois disso, o que você acha que acontece com as Vidas na próxima pedra?',
  'timed-shield-zero':
    'O Escudo chegou a 0. O que você acha que acontece com as Vidas na próxima pedra? Clique em Avançar até a próxima pedra e olhe.',
  'timed-shield-ask-renew':
    'E se a nave pegar o item de novo antes de o Escudo acabar? Clique em Pegar o item do escudo e em Avançar 1 segundo. Com o Escudo entre 1 e 4, clique em Pegar o item do escudo de novo e olhe o número.',
  'timed-shield-renew-ready':
    'O Escudo está descendo e ainda não chegou a 0. O que você acha que acontece com o número se a nave pegar o item agora? Clique em Pegar o item do escudo e olhe o Escudo.',
  'timed-shield-restart':
    'Para o próximo teste, a partida precisa recomeçar. Clique em Voltar ao começo. As suas descobertas continuam guardadas.',
  ...DEPOIS_DO_TESTE,
  'timed-shield-complete':
    'Você testou tudo. Pegar o item liga o Escudo em 5, e o Escudo desce 1 a cada segundo. Com o Escudo maior que 0, a pedra só sai; quando o Escudo chega a 0, a batida volta a tirar vida. E pegar o item de novo volta o Escudo a 5. É um escudo com prazo. Pode continuar testando quando quiser.',
}

type Escudo = Pick<
  SceneTimedShield,
  'second' | 'lives' | 'shield' | 'shieldBefore' | 'damaged' | 'last'
>

/**
 * O teste que o ÚLTIMO gesto acabou de mostrar, ou `null`: a pedra que bateu neste segundo (com o
 * Escudo maior que 0, ou com 0 sem nunca ter pegado o item, ou com 0 depois de pegar) e a pegada com
 * o Escudo entre 1 e 4. Mesma régua das metas no motor (`passarUmSegundoDoEscudo`, `pick-shield`).
 */
export function testeDoEscudoAgora(t: Escudo): MetaDoEscudo | null {
  if (t.last === 'tick' && timedShieldRock(t.second)) {
    if (!t.damaged.includes(t.second)) return 'shield-protects'
    return t.shieldBefore === null ? 'hit-costs' : 'shield-ends'
  }
  if (
    t.last === 'pick' &&
    t.shieldBefore !== null &&
    t.shieldBefore > 0 &&
    t.shieldBefore < TIMED_SHIELD.shield
  )
    return 'shield-renews'
  return null
}

/** Ainda dá para fazer este teste nesta partida, sem voltar ao começo? */
export function testeDoEscudoCabe(meta: MetaDoEscudo, t: Escudo): boolean {
  if (timedShieldOver(t)) return false
  const pegou = t.shieldBefore !== null
  switch (meta) {
    case 'hit-costs':
      return !pegou && timedShieldNextRock(t.second) !== null
    case 'shield-protects':
      return timedShieldNextRock(t.second) !== null
    case 'shield-ends': {
      // Uma pedra que chegue com o Escudo já em 0: o de agora, ou um novo de 5 pego agora.
      const falta = pegou ? t.shield : TIMED_SHIELD.shield
      return TIMED_SHIELD.rocks.some((rock) => rock > t.second && rock >= t.second + falta)
    }
    case 'shield-renews':
      // Com o Escudo entre 1 e 4, basta pegar o item. Senão o convite pede pegar (se precisar),
      // Avançar 1 segundo e pegar de novo: o segundo a mais precisa cair ANTES do fim da partida,
      // porque no último segundo o item não é mais pego.
      if (t.shield > 0 && t.shield < TIMED_SHIELD.shield) return true
      return t.second + 1 < TIMED_SHIELD.lastSecond
  }
}

/**
 * Qual fala vale agora. Logo depois de um teste, a fala explica o que a criança VIU e convida ao
 * primeiro teste que falta (ou a voltar ao começo, quando não cabe mais nesta partida). Fora disso,
 * a fala acompanha o próximo teste pelo que está na tela: o Escudo ligado, chegando a 0, entre 1 e 4.
 */
export function timedShieldGuidance(
  state: Pick<SceneState, 'timedShield'>,
  feita: (meta: string) => boolean,
  viu: (meta: string) => boolean = feita,
): string {
  const t = state.timedShield
  const falta = METAS_DO_ESCUDO.find((meta) => !feita(meta))
  if (!falta) return 'timed-shield-complete'
  const pegou = t.shieldBefore !== null
  const agora = testeDoEscudoAgora(t)
  // ⚠️ O convite sem escudo já manda voltar ao começo: ele vale mesmo com o item pego nesta partida.
  if (agora && viu(agora))
    return `timed-shield-${CURTO[agora]}-then-${falta === 'hit-costs' || testeDoEscudoCabe(falta, t) ? CURTO[falta] : 'restart'}`
  if (falta === 'hit-costs' && pegou && !timedShieldOver(t)) return 'timed-shield-ask-hit-restart'
  if (!testeDoEscudoCabe(falta, t)) return 'timed-shield-restart'
  switch (falta) {
    case 'hit-costs':
      return METAS_DO_ESCUDO.some(viu) ? 'timed-shield-ask-hit' : 'timed-shield-start'
    case 'shield-protects':
      return t.shield > 0 ? 'timed-shield-shield-on' : 'timed-shield-ask-protects'
    case 'shield-ends':
      if (t.shield > 0) return 'timed-shield-ends-wait'
      return pegou ? 'timed-shield-zero' : 'timed-shield-ask-ends'
    case 'shield-renews':
      return t.shield > 0 && t.shield < TIMED_SHIELD.shield
        ? 'timed-shield-renew-ready'
        : 'timed-shield-ask-renew'
  }
}

export const guia: GuiaLivre = {
  speech: TIMED_SHIELD_SPEECH,
  guidance: (state, has, activity) =>
    timedShieldGuidance(state, metaFeita(activity, [...METAS_DO_ESCUDO], has), has),
}
