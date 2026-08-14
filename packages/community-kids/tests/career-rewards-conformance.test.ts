import { describe, expect, test } from 'bun:test'
import { CREATOR_CAREER_LEVELS } from '../../core/src/career/catalog'
import { CAREER_REWARD_INFO } from '../src/lib/career-rewards'

/**
 * Conformância da COPY das recompensas × o que o core realmente entrega.
 *
 * Contexto: em 26/07 a Ponte saiu do Mestre dos Jogos e foi para o Gênio da Criação, e o kit
 * Jogo 3D Avançado entrou já no Arquiteto. A copy não acompanhou e ficou prometendo à criança
 * um recurso que o Estúdio não abria. Este teste é o freio: promessa de Ponte/Pro só pode
 * existir onde o core dá Ponte/Pro. O texto é livre; o que está travado é a PROMESSA.
 *
 * Alcança o módulo PURO do core por caminho relativo (padrão do `badge-conformance`) — o kids
 * não importa o core em runtime.
 */

/** Palavra inteira e com maiúscula: "própria"/"projetos" não podem contar como promessa. */
const PROMISES_BRIDGE = /\bPonte\b/
const PROMISES_PRO = /\bPro\b/

/**
 * As recompensas são CUMULATIVAS, mas a copy de cada posto anuncia o que é NOVO nele (a Lenda
 * tem a Ponte herdada do Gênio e anuncia o Pro, que é a novidade dela). Então a regra não é
 * "cita se e somente se tem", e sim duas:
 *   1. nunca prometer o que aquele posto não tem;
 *   2. anunciar no posto em que a coisa APARECE, senão a conquista passa em branco.
 */
const textOf = (slug: (typeof CREATOR_CAREER_LEVELS)[number]['slug']) => {
  const info = CAREER_REWARD_INFO[slug]
  return `${info.title} ${info.description}`
}
const firstWith = (pick: (r: (typeof CREATOR_CAREER_LEVELS)[number]['reward']) => boolean) =>
  CREATOR_CAREER_LEVELS.find((level) => pick(level.reward))?.slug

describe('career-rewards (kids) — a copy não promete o que o core não dá', () => {
  test('nunca promete Ponte a quem não tem Ponte', () => {
    const mentiras = CREATOR_CAREER_LEVELS.filter(
      (level) => PROMISES_BRIDGE.test(textOf(level.slug)) && !level.reward.bridge,
    ).map((level) => level.slug)
    expect(mentiras).toEqual([])
  })

  test('nunca promete Pro a quem não tem Pro', () => {
    const mentiras = CREATOR_CAREER_LEVELS.filter(
      (level) => PROMISES_PRO.test(textOf(level.slug)) && !level.reward.pro,
    ).map((level) => level.slug)
    expect(mentiras).toEqual([])
  })

  test('anuncia a Ponte no posto em que ela abre', () => {
    const slug = firstWith((reward) => reward.bridge)
    expect(slug).toBeDefined()
    expect(PROMISES_BRIDGE.test(textOf(slug!))).toBe(true)
  })

  test('anuncia o Pro no posto em que ele abre', () => {
    const slug = firstWith((reward) => reward.pro)
    expect(slug).toBeDefined()
    expect(PROMISES_PRO.test(textOf(slug!))).toBe(true)
  })

  test('todo nível da escada tem copy (nível novo no core não sai mudo)', () => {
    for (const level of CREATOR_CAREER_LEVELS) {
      const info = CAREER_REWARD_INFO[level.slug]
      expect(info?.title.length).toBeGreaterThan(0)
      expect(info?.description.length).toBeGreaterThan(0)
    }
  })
})
