import { describe, expect, test } from 'bun:test'
import { CREATOR_CAREER_LEVELS } from '../../core/src/career/catalog'
import { AI_APPS_MIN_LEVEL, FREE_CREATION_MIN_LEVEL } from '../../member-shell/src/lib/studio-tier'
import { CAREER_REWARD_INFO } from '../src/lib/career-rewards'

/**
 * Conformância da COPY das recompensas × o que a regra realmente entrega.
 *
 * Contexto: a copy já ficou para trás DUAS vezes. Em 26/07 a Ponte saiu do Mestre dos Jogos e
 * foi para o Gênio, e a copy seguiu prometendo. Em 08/2026 a paleta passou a vir do CURRÍCULO
 * (os cursos concluídos e publicados) e a copy seguiu anunciando kits por nível — a criança
 * subia de posto e a caixa de ferramentas não mudava. Este teste é o freio dos dois casos.
 *
 * O texto é livre; o que está travado é a PROMESSA. Alcança os módulos PUROS do core e do
 * member-shell por caminho relativo (padrão do `badge-conformance`) — o kids não os importa
 * em runtime aqui.
 */

/** Palavra inteira e com maiúscula: "própria"/"projetos" não podem contar como promessa. */
const PROMISES_BRIDGE = /\bPonte\b/
const PROMISES_PRO = /\bPro\b/
const PROMISES_PINTA = /\bPinta\b/
const PROMISES_PENSA = /\bPensa\b/
const PROMISES_ZAPPY = /\bZappy\b/

/**
 * Nomes de PERFIL DE BLOCOS (kits por nível). Nenhum posto pode mais prometê-los: quem entrega
 * bloco é o curso, não o degrau. Deixar um destes aqui é reintroduzir a mentira de 08/2026.
 */
const PROMISES_BLOCK_KIT = /\b(Jogo 2D|Jogo 3D|Mundo 3D|Essencial|Kit)\b/

const textOf = (slug: (typeof CREATOR_CAREER_LEVELS)[number]['slug']) => {
  const info = CAREER_REWARD_INFO[slug]
  return `${info.title} ${info.description}`
}
const firstWith = (pick: (r: (typeof CREATOR_CAREER_LEVELS)[number]['reward']) => boolean) =>
  CREATOR_CAREER_LEVELS.find((level) => pick(level.reward))?.slug

/** O posto exato em que um portão abre, lido da constante que o código usa de verdade. */
const levelOf = (slug: string) => CREATOR_CAREER_LEVELS.find((level) => level.slug === slug)?.slug

/**
 * As recompensas são CUMULATIVAS, mas a copy de cada posto anuncia o que é NOVO nele (a Lenda
 * tem a Ponte herdada do Gênio e anuncia o Pro, que é a novidade dela). Então a regra não é
 * "cita se e somente se tem", e sim duas:
 *   1. nunca prometer o que aquele posto não tem;
 *   2. anunciar no posto em que a coisa APARECE, senão a conquista passa em branco.
 */
describe('career-rewards (kids) — a copy não promete o que a regra não dá', () => {
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

  test('nenhum posto promete kit de blocos — quem entrega bloco é o CURSO', () => {
    const mentiras = CREATOR_CAREER_LEVELS.filter((level) =>
      PROMISES_BLOCK_KIT.test(textOf(level.slug)),
    ).map((level) => level.slug)
    expect(mentiras).toEqual([])
  })

  test('o Estúdio livre é anunciado no posto em que o core o abre', () => {
    const slug = firstWith((reward) => reward.freeStudio)
    expect(slug).toBe(FREE_CREATION_MIN_LEVEL)
    expect(textOf(slug!)).toContain('Estúdio livre')
  })

  test('o Pinta é anunciado no posto de criação livre, e em nenhum outro', () => {
    const anunciam = CREATOR_CAREER_LEVELS.filter((level) =>
      PROMISES_PINTA.test(textOf(level.slug)),
    ).map((level) => level.slug)
    expect(anunciam).toEqual([levelOf(FREE_CREATION_MIN_LEVEL)!])
  })

  test('Pensa e Zappy são anunciados no posto da IA, e em nenhum outro', () => {
    for (const promessa of [PROMISES_PENSA, PROMISES_ZAPPY]) {
      const anunciam = CREATOR_CAREER_LEVELS.filter((level) =>
        promessa.test(textOf(level.slug)),
      ).map((level) => level.slug)
      expect(anunciam).toEqual([levelOf(AI_APPS_MIN_LEVEL)!])
    }
  })

  test('todo nível da escada tem copy (nível novo no core não sai mudo)', () => {
    for (const level of CREATOR_CAREER_LEVELS) {
      const info = CAREER_REWARD_INFO[level.slug]
      expect(info?.title.length).toBeGreaterThan(0)
      expect(info?.description.length).toBeGreaterThan(0)
    }
  })
})
