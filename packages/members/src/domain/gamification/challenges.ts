import { createHash } from 'node:crypto'
import { localDateSaoPaulo } from './gamification'

// ── Desafio MENSAL (game jam kids, 07/2026) ──────────────────────────────────
// Catálogo EM CÓDIGO (regra das badges/missões: muda junto com o código que o
// usa, sem seed). O tema do mês é DETERMINÍSTICO e GLOBAL por `monthKey`
// (`m:YYYY-MM`, mês civil de São Paulo — mesma convenção do freeze_granted_month)
// — todo mundo vê o MESMO desafio. Decisão da usuária: MENSAL (uma semana é
// pouco pra uma criança criar um jogo) e SÓ p/ quem tem Clube dos Criadores +
// Estúdio Completo (o hub valida a posse no publish; o members revalida o mês).

export interface ChallengeTheme {
  slug: string
  emoji: string
  title: string
  description: string
  /** Kit do Estúdio que combina com o tema (sugestão de partida, não trava nada). */
  suggestedKit: string
}

export const CHALLENGE_THEMES: readonly ChallengeTheme[] = [
  {
    slug: 'espaco',
    emoji: '🚀',
    title: 'Aventura no espaço',
    description: 'Crie um jogo que se passa no espaço: naves, planetas, asteroides ou estrelas.',
    suggestedKit: 'Nave clássica',
  },
  {
    slug: 'corrida',
    emoji: '🏁',
    title: 'Corrida maluca',
    description: 'Crie um jogo de correr ou desviar: quanto mais longe, melhor!',
    suggestedKit: 'Dino Run',
  },
  {
    slug: 'floresta',
    emoji: '🌳',
    title: 'Segredos da floresta',
    description: 'Crie um jogo numa floresta: animais, trilhas, tesouros escondidos.',
    suggestedKit: 'Travessia',
  },
  {
    slug: 'ceu',
    emoji: '🎈',
    title: 'Voando alto',
    description: 'Crie um jogo de voar: balões, pássaros, aviões ou foguetes de papel.',
    suggestedKit: 'Balão',
  },
  {
    slug: 'oceano',
    emoji: '🌊',
    title: 'Fundo do mar',
    description: 'Crie um jogo embaixo da água: peixes, submarinos, sereias ou piratas.',
    suggestedKit: 'Jogo 2D',
  },
  {
    slug: 'castelo',
    emoji: '🏰',
    title: 'Reino do castelo',
    description: 'Crie um jogo de reinos: cavaleiros, dragões, princesas ou torres.',
    suggestedKit: 'Gorilas',
  },
  {
    slug: 'robos',
    emoji: '🤖',
    title: 'Fábrica de robôs',
    description: 'Crie um jogo com robôs: montar, desviar, consertar ou fugir deles.',
    suggestedKit: 'Empilhar',
  },
  {
    slug: 'esportes',
    emoji: '⚽',
    title: 'Campeonato radical',
    description: 'Crie um jogo de esporte: futebol, skate, corrida ou um esporte inventado.',
    suggestedKit: 'Stick Hero',
  },
  {
    slug: 'monstros',
    emoji: '👾',
    title: 'Invasão dos monstrinhos',
    description: 'Crie um jogo com monstrinhos: fofos, engraçados ou de dar friozinho.',
    suggestedKit: 'Nave × Asteroides',
  },
  {
    slug: 'culinaria',
    emoji: '🍕',
    title: 'Cozinha divertida',
    description: 'Crie um jogo de comida: montar pizzas, pegar frutas, fugir do brócolis.',
    suggestedKit: 'Jogo 2D',
  },
  {
    slug: 'dinossauros',
    emoji: '🦕',
    title: 'Era dos dinossauros',
    description: 'Crie um jogo com dinossauros: correr, fugir do meteoro ou virar um deles.',
    suggestedKit: 'Dino Run',
  },
  {
    slug: 'neve',
    emoji: '⛄',
    title: 'Mundo de gelo',
    description: 'Crie um jogo no gelo: escorregar, guerra de bola de neve, pinguins.',
    suggestedKit: 'Desvie',
  },
]

/** XP do marco `challenge_entry` (1× por mês, dedupado pelo ledger). */
export const CHALLENGE_ENTRY_XP = 50

const CHALLENGE_KEY_RE = /^m:\d{4}-\d{2}$/

export function isValidChallengeKey(key: string): boolean {
  return CHALLENGE_KEY_RE.test(key)
}

/** `m:YYYY-MM` do mês civil de São Paulo — a MESMA régua em members e hub. */
export function currentChallengeKey(now: Date): string {
  return `m:${localDateSaoPaulo(now).slice(0, 7)}`
}

/** FNV-1a 32 bits (mesma família do sorteio de missões) — determinístico. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Tema do mês — determinístico e global (todo mundo vê o mesmo desafio). */
export function challengeForMonth(monthKey: string): ChallengeTheme {
  const index = fnv1a(monthKey) % CHALLENGE_THEMES.length
  return CHALLENGE_THEMES[index] as ChallengeTheme
}

/**
 * Namespace FIXO (uuid sorteado uma vez, NUNCA mudar) do source_id do marco
 * `challenge_entry` — `xp_events.source_id` é coluna uuid, então o mês vira um
 * uuid DETERMINÍSTICO (molde do `pensaStageSourceId`); o UNIQUE do ledger dá o
 * dedupe de 1 marco/mês mesmo publicando 2 jogos no desafio.
 */
export const CHALLENGE_SOURCE_NAMESPACE = '3d7a91c4-52e8-4b0f-9a16-c8e4f2b7d509'

export function challengeSourceId(monthKey: string): string {
  const hex = createHash('sha1').update(CHALLENGE_SOURCE_NAMESPACE).update(monthKey).digest('hex')
  const variantNibble = ((Number.parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16)
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-` +
    `${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  )
}
