import { type SceneSpreadShot, type SceneState, spreadShotArrived, spreadShotHits } from '../state'
import { metaFeita } from './atelie-metas'
import type { GuiaLivre } from './tipos'

/**
 * O tiro triplo (`spread-shot`, Poder "Tiro triplo" do Construtor, Nave contra Asteroides,
 * 28/11/2026) em exploração livre: só a IDEIA. Um disparo cria três lasers, e a velocidade para o
 * lado de cada laser escolhe o caminho: com desvio 0 os três seguem juntos, com desvio 2 cada laser
 * vai para uma pedra, e com desvio 1 os lasers dos lados passam entre as pedras. Nada de bloco, de Se
 * nem de variável: a montagem fica para o Estúdio. Antes de cada teste a fala pergunta e diz o que
 * olhar; o que aconteceu só aparece na fala de DEPOIS dele. As chaves começam com `spread-shot-`.
 *
 * ⚠️ Os rótulos citados são os da tela livre (`scene-livre/spread-shot.tsx`): "Tiro triplo",
 * "Desvio 0", "Desvio 1", "Desvio 2", "Disparar", "Ver os lasers chegarem" e "Voltar ao começo".
 * ⚠️ São 18 falas: cabem com folga no teto da voz do bloco (`VOZ_LIMITS.entradas`).
 */

/** As metas na ordem da aula (a do catálogo): o próximo teste é a primeira que falta. */
export const METAS_DO_TIRO_TRIPLO = [
  'single-one',
  'triple-stacked',
  'triple-spread',
  'deviation-matters',
] as const
type MetaDoTiro = (typeof METAS_DO_TIRO_TRIPLO)[number]

const CURTO: Record<MetaDoTiro, string> = {
  'single-one': 'single',
  'triple-stacked': 'stacked',
  'triple-spread': 'spread',
  'deviation-matters': 'matters',
}

/** O que a criança acabou de ver, dito DEPOIS do teste. */
const EXPLICA: Record<MetaDoTiro, string> = {
  'single-one':
    'Com o Tiro triplo desligado, saiu um laser só, que subiu reto até a pedra do meio.',
  'triple-stacked':
    'Com o Desvio 0, os três lasers saíram juntos e seguiram o mesmo caminho. Pareciam um laser só, e só a pedra do meio saiu.',
  'triple-spread':
    'Com o Desvio 2, os lasers se abriram em leque: o do meio subiu reto, e os dos lados andaram para o lado até as pedras dos lados. Cada laser seguiu o seu caminho.',
  'deviation-matters':
    'Com o Desvio 1, os lasers dos lados andaram menos para o lado e passaram entre as pedras. O desvio escolhe onde cada laser chega.',
}

/** O convite ao próximo teste: a pergunta e o que olhar, sem o resultado. */
const CONVIDA: Record<MetaDoTiro, string> = {
  'single-one':
    'E com o tiro simples? Com o Tiro triplo desligado, clique em Disparar e depois em Ver os lasers chegarem. Quantos lasers saem da nave?',
  'triple-stacked':
    'E com o Tiro triplo ligado e o Desvio 0? Clique em Tiro triplo para ligar, escolha Desvio 0 e clique em Disparar. Depois clique em Ver os lasers chegarem. Quantos caminhos você vê?',
  'triple-spread':
    'E com o Desvio 2? Com o Tiro triplo ligado, escolha Desvio 2 e clique em Disparar. Depois clique em Ver os lasers chegarem. Onde você acha que cada laser chega?',
  'deviation-matters':
    'E com o Desvio 1? Com o Tiro triplo ligado, escolha Desvio 1 e clique em Disparar de novo. Depois clique em Ver os lasers chegarem. Os lasers dos lados chegam às pedras?',
}

/** Explicação + convite: o que foi visto e o que testar depois (o convite é a primeira meta que falta). */
const DEPOIS_DO_TESTE = Object.fromEntries(
  METAS_DO_TIRO_TRIPLO.flatMap((visto) =>
    METAS_DO_TIRO_TRIPLO.filter((proximo) => proximo !== visto)
      // O desvio 1 só conta depois do desvio 2: com ele visto, o leque já foi visto.
      .filter((proximo) => !(visto === 'deviation-matters' && proximo === 'triple-spread'))
      .map((proximo) => [
        `spread-shot-${CURTO[visto]}-then-${CURTO[proximo]}`,
        `${EXPLICA[visto]} ${CONVIDA[proximo]}`,
      ]),
  ),
)

const PEDIDOS = Object.fromEntries(
  METAS_DO_TIRO_TRIPLO.map((meta) => [`spread-shot-ask-${CURTO[meta]}`, CONVIDA[meta]]),
)

export const SPREAD_SHOT_SPEECH: Readonly<Record<string, string>> = {
  'spread-shot-start':
    'A nave está embaixo, e três pedras esperam no alto da tela. Com o Tiro triplo desligado, quantos lasers você acha que saem a cada disparo? Clique em Disparar e depois em Ver os lasers chegarem.',
  ...PEDIDOS,
  'spread-shot-in-air':
    'Os lasers saíram da nave. Onde você acha que cada laser vai chegar? Clique em Ver os lasers chegarem e olhe as pedras.',
  ...DEPOIS_DO_TESTE,
  'spread-shot-complete':
    'Você testou tudo. Com o tiro simples sai um laser só. Com o tiro triplo, um disparo cria três lasers de uma vez, e o quanto cada laser anda para o lado escolhe o caminho: com o Desvio 0 os três seguem juntos, com o Desvio 2 cada laser vai para uma pedra, e com o Desvio 1 os lasers dos lados passam entre as pedras. Pode continuar testando quando quiser.',
}

type Tiro = Pick<SceneSpreadShot, 'triple' | 'deviation' | 'lasers' | 'volley'>

/**
 * O teste que a rajada que ACABOU de chegar mostrou, ou `null` (lasers no ar, nenhum disparo, ou as
 * escolhas já trocadas depois dela: a criança já foi para o próximo teste). Mesma régua das metas no
 * motor (`chegaremOsLasers`): o tiro simples; o triplo com desvio 0; o triplo com desvio 2 que
 * acertou as duas pedras dos lados; o triplo com desvio 1.
 */
export function testeDoTiroAgora(sp: Tiro): MetaDoTiro | null {
  if (!spreadShotArrived(sp) || !sp.volley) return null
  const { triple, deviation } = sp.volley
  if (sp.triple !== triple || (triple && sp.deviation !== deviation)) return null
  if (!triple) return 'single-one'
  if (deviation === 0) return 'triple-stacked'
  if (deviation === 1) return 'deviation-matters'
  const acertos = spreadShotHits(sp)
  return acertos.includes(0) && acertos.includes(2) ? 'triple-spread' : null
}

/**
 * Qual fala vale agora. Com lasers no ar, a fala pede para vê-los chegar. Logo depois de uma rajada
 * que mostrou um teste já visto, a fala explica o que a criança VIU e convida ao primeiro teste que
 * falta. Fora disso, a fala pede o próximo teste (a tela destaca o controle que ainda falta mexer).
 */
export function spreadShotGuidance(
  state: Pick<SceneState, 'spreadShot'>,
  feita: (meta: string) => boolean,
  viu: (meta: string) => boolean = feita,
): string {
  const sp = state.spreadShot
  const falta = METAS_DO_TIRO_TRIPLO.find((meta) => !feita(meta))
  if (!falta) return 'spread-shot-complete'
  if (sp.lasers.length > 0) return 'spread-shot-in-air'
  const agora = testeDoTiroAgora(sp)
  if (agora && viu(agora)) return `spread-shot-${CURTO[agora]}-then-${CURTO[falta]}`
  if (falta === 'single-one' && !METAS_DO_TIRO_TRIPLO.some(viu)) return 'spread-shot-start'
  return `spread-shot-ask-${CURTO[falta]}`
}

export const guia: GuiaLivre = {
  speech: SPREAD_SHOT_SPEECH,
  guidance: (state, has, activity) =>
    spreadShotGuidance(state, metaFeita(activity, [...METAS_DO_TIRO_TRIPLO], has), has),
}
