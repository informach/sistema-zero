import { BOSS_HEALTH } from '../actions'
import { bossHealthDown, type SceneBossHealth, type SceneState } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * O chefão com resistência (`boss-health`, Poder "Chefão com resistência" do Construtor, Nave
 * contra Asteroides, 28/11/2026) em exploração livre: só a IDEIA. O chefão tem uma vida própria:
 * cada laser tira 1, um laser só não basta, no 0 o chefão cai e o placar ganha o prêmio, e a guarda
 * faz o prêmio valer uma vez só. Nada de bloco, de Se nem de variável: a montagem fica para o
 * Estúdio. Antes de cada teste a fala pergunta e diz o que olhar; o que aconteceu só aparece na fala
 * de DEPOIS dele. As chaves começam com `boss-health-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/boss-health.tsx`): "Disparar", "Guarda
 * do prêmio" (com "Ligada" e "Desligada"), "Avançar um quadro" e "Recomeçar a partida".
 * ⚠️ As metas caem em ordem numa partida (o terceiro acerto vem depois do primeiro, e a queda
 * depois dos dois; a comparação do prêmio pede a queda), e as descobertas atravessam os recomeços:
 * depois de um teste, o próximo que falta vem sempre DEPOIS dele. São 13 falas.
 */

/** As metas na ordem da aula (a do catálogo): o próximo teste é a primeira que falta. */
export const METAS_DO_CHEFAO = [
  'one-not-enough',
  'count-down',
  'falls-at-zero',
  'falls-once',
] as const
type MetaDoChefao = (typeof METAS_DO_CHEFAO)[number]

const CURTO: Record<MetaDoChefao, string> = {
  'one-not-enough': 'one',
  'count-down': 'count',
  'falls-at-zero': 'falls',
  'falls-once': 'once',
}

/** O que a criança acabou de ver, dito DEPOIS do teste. */
const EXPLICA: Record<MetaDoChefao, string> = {
  'one-not-enough':
    'Com um laser, a vida do chefão foi de 5 para 4, e o chefão continuou lá. Um laser só não derrota o chefão.',
  'count-down':
    'A cada laser, a vida do chefão desceu 1, e a barra encolheu junto. O chefão aguenta vários lasers.',
  'falls-at-zero': 'Quando a vida chegou a 0, o chefão caiu da tela, e o placar ganhou 10 pontos.',
  'falls-once':
    'Com a Guarda do prêmio Desligada, a cada quadro com a vida em 0 o placar ganhou 10 de novo e não parou de subir. Com a guarda Ligada, o placar ficou em 10: o prêmio valeu uma vez só.',
}

/** O convite ao próximo teste: a pergunta e o que olhar, sem o resultado. */
const CONVIDA: Record<MetaDoChefao | 'over', string> = {
  'one-not-enough':
    'Um laser derruba o chefão? Com a vida do chefão em 5, clique em Disparar uma vez. Olhe a vida, a barra e o chefão.',
  'count-down':
    'E com mais lasers? Na mesma partida, clique em Disparar mais duas vezes. Olhe a vida a cada laser.',
  'falls-at-zero':
    'E quando a vida acabar? Clique em Disparar até a vida chegar a 0. Olhe o chefão e o placar.',
  'falls-once':
    'E depois que o chefão cai? Na Guarda do prêmio, escolha Ligada, derrote o chefão e clique em Avançar um quadro algumas vezes. Depois escolha Desligada e faça o mesmo. Olhe o placar a cada quadro.',
  over: 'Para o próximo teste, clique em Recomeçar a partida.',
}

/** Explicação + convite: o que foi visto e o que testar depois (o convite é a primeira meta que falta). */
const DEPOIS_DO_TESTE = Object.fromEntries(
  METAS_DO_CHEFAO.flatMap((visto, i) =>
    METAS_DO_CHEFAO.slice(i + 1).map((proximo) => [
      `boss-health-${CURTO[visto]}-then-${CURTO[proximo]}`,
      `${EXPLICA[visto]} ${CONVIDA[proximo]}`,
    ]),
  ),
)

const PEDIDOS = Object.fromEntries(
  METAS_DO_CHEFAO.map((meta) => [`boss-health-ask-${CURTO[meta]}`, CONVIDA[meta]]),
)

export const BOSS_HEALTH_SPEECH: Readonly<Record<string, string>> = {
  'boss-health-start':
    'O chefão espera no alto da tela, com 5 de vida, e a nave está embaixo. Quantos lasers você acha que o chefão aguenta? Clique em Disparar uma vez e olhe a vida, a barra e o chefão.',
  ...PEDIDOS,
  'boss-health-over': CONVIDA.over,
  ...DEPOIS_DO_TESTE,
  'boss-health-complete':
    'Você testou tudo. O chefão tem uma vida própria: cada laser tira 1, e um laser só não basta. Quando a vida chega a 0, o chefão cai e o placar ganha 10. Sem a guarda, o prêmio soma de novo a cada quadro; com a Guarda do prêmio Ligada, o prêmio vale uma vez só. Pode continuar testando quando quiser.',
}

type Chefao = Pick<SceneBossHealth, 'life' | 'last' | 'seenGuarded' | 'seenUnguarded'>

/**
 * O teste que o ÚLTIMO gesto acabou de mostrar, ou `null`. Mesma régua das metas no motor
 * (`boss-fire`, `boss-frame`): o primeiro acerto (a vida em 4), o terceiro (a vida em 2), a queda e
 * o quadro depois da queda que completa a comparação das duas guardas.
 */
export function testeDoChefaoAgora(b: Chefao): MetaDoChefao | null {
  if (b.last === 'hit' && b.life === BOSS_HEALTH.life - 1) return 'one-not-enough'
  if (b.last === 'hit' && b.life === BOSS_HEALTH.life - 3) return 'count-down'
  if (b.last === 'defeat') return 'falls-at-zero'
  if (b.last === 'frame' && bossHealthDown(b) && b.seenGuarded && b.seenUnguarded)
    return 'falls-once'
  return null
}

/** Ainda dá para fazer este teste nesta partida, sem recomeçar? */
export function testeDoChefaoCabe(meta: MetaDoChefao, b: Pick<SceneBossHealth, 'life'>): boolean {
  if (meta === 'one-not-enough') return b.life === BOSS_HEALTH.life
  if (meta === 'falls-once') return true
  return !bossHealthDown(b)
}

/**
 * Qual fala vale agora. Logo depois de um teste, a fala explica o que a criança VIU e convida ao
 * primeiro teste que falta. Fora disso, a fala pede o próximo teste (a tela destaca o controle que
 * ainda falta mexer), ou o recomeço quando o teste não cabe mais nesta partida.
 */
export function bossHealthGuidance(
  state: Pick<SceneState, 'bossHealth'>,
  feita: (meta: string) => boolean,
  viu: (meta: string) => boolean = feita,
): string {
  const b = state.bossHealth
  const falta = METAS_DO_CHEFAO.find((meta) => !feita(meta))
  if (!falta) return 'boss-health-complete'
  const agora = testeDoChefaoAgora(b)
  if (
    agora &&
    viu(agora) &&
    METAS_DO_CHEFAO.indexOf(agora) < METAS_DO_CHEFAO.indexOf(falta) &&
    testeDoChefaoCabe(falta, b)
  )
    return `boss-health-${CURTO[agora]}-then-${CURTO[falta]}`
  if (!testeDoChefaoCabe(falta, b)) return 'boss-health-over'
  if (falta === 'one-not-enough' && !METAS_DO_CHEFAO.some(viu)) return 'boss-health-start'
  return `boss-health-ask-${CURTO[falta]}`
}

export const guia: GuiaLivre = {
  speech: BOSS_HEALTH_SPEECH,
  guidance: (state, has, activity) =>
    bossHealthGuidance(state, metaFeita(activity, [...METAS_DO_CHEFAO], has), has),
}
