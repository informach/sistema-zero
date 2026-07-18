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
}

export const CHALLENGE_THEMES: readonly ChallengeTheme[] = [
  {
    slug: 'espaco',
    emoji: '🚀',
    title: 'Aventura no espaço',
    description: 'Crie um jogo que se passa no espaço: naves, planetas, asteroides ou estrelas.',
  },
  {
    slug: 'corrida',
    emoji: '🏁',
    title: 'Corrida maluca',
    description: 'Crie um jogo de correr ou desviar: quanto mais longe, melhor!',
  },
  {
    slug: 'floresta',
    emoji: '🌳',
    title: 'Segredos da floresta',
    description: 'Crie um jogo numa floresta: animais, trilhas, tesouros escondidos.',
  },
  {
    slug: 'ceu',
    emoji: '🎈',
    title: 'Voando alto',
    description: 'Crie um jogo de voar: balões, pássaros, aviões ou foguetes de papel.',
  },
  {
    slug: 'oceano',
    emoji: '🌊',
    title: 'Fundo do mar',
    description: 'Crie um jogo embaixo da água: peixes, submarinos, sereias ou piratas.',
  },
  {
    slug: 'castelo',
    emoji: '🏰',
    title: 'Reino do castelo',
    description: 'Crie um jogo de reinos: cavaleiros, dragões, princesas ou torres.',
  },
  {
    slug: 'robos',
    emoji: '🤖',
    title: 'Fábrica de robôs',
    description: 'Crie um jogo com robôs: montar, desviar, consertar ou fugir deles.',
  },
  {
    slug: 'esportes',
    emoji: '⚽',
    title: 'Campeonato radical',
    description: 'Crie um jogo de esporte: futebol, skate, corrida ou um esporte inventado.',
  },
  {
    slug: 'monstros',
    emoji: '👾',
    title: 'Invasão dos monstrinhos',
    description: 'Crie um jogo com monstrinhos: fofos, engraçados ou de dar friozinho.',
  },
  {
    slug: 'culinaria',
    emoji: '🍕',
    title: 'Cozinha divertida',
    description: 'Crie um jogo de comida: montar pizzas, pegar frutas, fugir do brócolis.',
  },
  {
    slug: 'dinossauros',
    emoji: '🦕',
    title: 'Era dos dinossauros',
    description: 'Crie um jogo com dinossauros: correr, fugir do meteoro ou virar um deles.',
  },
  {
    slug: 'neve',
    emoji: '⛄',
    title: 'Mundo de gelo',
    description: 'Crie um jogo no gelo: escorregar, guerra de bola de neve, pinguins.',
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

// ── Tema gerenciável pelo admin (07/2026) ────────────────────────────────────
// O professor pode DEFINIR o tema de um mês (fixo do catálogo acima ou custom
// criado no admin); sem definição, o sorteio determinístico acima é o FALLBACK
// que garante tema todo mês. Decisão da usuária: temas custom NUNCA entram no
// pool do sorteio (o módulo % 12 fica estável); só valem quando definidos.

export type ChallengeThemeSource = 'sorteio' | 'definido'

/** Campos de tema da biblioteca custom que a resolução precisa. */
export interface ChallengeCustomThemeData {
  id: string
  emoji: string
  title: string
  description: string
}

/** Override de um mês carregado do banco (exatamente UM dos dois preenchido). */
export interface ChallengeOverrideTheme {
  builtinSlug: string | null
  customTheme: ChallengeCustomThemeData | null
}

export function builtinThemeBySlug(slug: string): ChallengeTheme | undefined {
  return CHALLENGE_THEMES.find((t) => t.slug === slug)
}

/** Slug derivado e estável do tema custom (o shape público do desafio tem slug). */
export function customChallengeSlug(id: string): string {
  return `custom-${id.slice(0, 8)}`
}

/**
 * Override → tema definido; sem override → sorteio. Um `builtinSlug` que sumiu
 * do catálogo em código cai DEFENSIVAMENTE no sorteio (o caminho do aluno
 * nunca quebra por dado velho).
 */
export function resolveChallengeTheme(
  monthKey: string,
  override: ChallengeOverrideTheme | null,
): { theme: ChallengeTheme; source: ChallengeThemeSource } {
  if (override?.customTheme) {
    const c = override.customTheme
    return {
      theme: {
        slug: customChallengeSlug(c.id),
        emoji: c.emoji,
        title: c.title,
        description: c.description,
      },
      source: 'definido',
    }
  }
  if (override?.builtinSlug) {
    const builtin = builtinThemeBySlug(override.builtinSlug)
    if (builtin) return { theme: builtin, source: 'definido' }
  }
  return { theme: challengeForMonth(monthKey), source: 'sorteio' }
}

/** `[corrente, …, corrente+count-1]` em `m:YYYY-MM` (aritmética pura sobre a chave SP). */
export function monthKeysFrom(now: Date, count: number): string[] {
  const [y, m] = localDateSaoPaulo(now).slice(0, 7).split('-').map(Number) as [number, number]
  const keys: string[] = []
  for (let i = 0; i < count; i += 1) {
    const total = y * 12 + (m - 1) + i
    const yy = Math.floor(total / 12)
    const mm = (total % 12) + 1
    keys.push(`m:${yy}-${String(mm).padStart(2, '0')}`)
  }
  return keys
}

/** `YYYY-MM` (formato das URLs do admin, sem `:`) → chave `m:YYYY-MM`. */
export function monthKeyFromMonth(month: string): string {
  return `m:${month}`
}

/** Comparação lexicográfica funciona: formato zero-padded com prefixo fixo. */
export function isPastMonthKey(monthKey: string, now: Date): boolean {
  return monthKey < currentChallengeKey(now)
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
