import {
  Castle,
  Compass,
  Crown,
  Gamepad2,
  Hammer,
  Lightbulb,
  type LucideIcon,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { StudentLevelSlug } from '@/lib/types'

/**
 * Apresentação do NÍVEL do aluno (rótulo kids + cor + ícone). O catálogo/regra
 * (slugs, requisitos) vive no members (`domain/gamification/levels.ts`); aqui é só
 * como exibir. `colorVar` é uma CSS var do globals.css (`--level-<slug>`) — usada
 * inline na aura/insígnia (cor dinâmica não casa com classe Tailwind estática).
 */
export interface LevelInfo {
  /** Rótulo exibido (o nome do rank). */
  label: string
  /** Frase curta de orgulho (perfil). */
  blurb: string
  /** `var(--level-<slug>)` — cor da aura e da insígnia. */
  colorVar: string
  icon: LucideIcon
}

// Escada de 8 (reforma 2D/3D 07/2026): rótulos kid-friendly — os slugs internos NÃO mudam.
export const LEVEL_INFO: Record<StudentLevelSlug, LevelInfo> = {
  noob: {
    label: 'Faísca',
    blurb: 'Todo mundo começa com uma faísca. Bora acender!',
    colorVar: 'var(--level-noob)',
    icon: Sparkles,
  },
  coder: {
    label: 'Construtor(a)',
    blurb: 'Você já fez e publicou o seu primeiro projeto!',
    colorVar: 'var(--level-coder)',
    icon: Hammer,
  },
  hacker: {
    label: 'Inventor(a)',
    // Sem número E sem nome de degrau, de propósito: a régua já foi 5, virou 6 e hoje é 8 por
    // degrau, e a frase ficou para trás em todas as vezes; "Iniciante 2D" é vocabulário de quem
    // MONTA o curso. O que não muda é o feito.
    blurb: 'Você já domina os jogos em 2D. Mandou bem!',
    colorVar: 'var(--level-hacker)',
    icon: Lightbulb,
  },
  explorer: {
    label: 'Explorador(a) de Mundos',
    blurb: 'Você entrou na terceira dimensão. Que aventura!',
    colorVar: 'var(--level-explorer)',
    icon: Compass,
  },
  elite: {
    label: 'Mestre dos Jogos',
    blurb: 'Projetos intermediários dominados. Você é Mestre dos Jogos!',
    colorVar: 'var(--level-elite)',
    icon: Gamepad2,
  },
  architect: {
    label: 'Arquiteto(a) de Mundos',
    blurb: 'Mundos 3D completos saem das suas mãos!',
    colorVar: 'var(--level-architect)',
    icon: Castle,
  },
  champion: {
    label: 'Gênio da Criação',
    blurb: 'Projetos avançados de verdade. Falta um passo para a Lenda!',
    colorVar: 'var(--level-champion)',
    icon: Wand2,
  },
  god: {
    label: 'Lenda',
    blurb: 'O topo. Você é uma Lenda do Sistema Zero!',
    colorVar: 'var(--level-god)',
    icon: Crown,
  },
}

/** Ordem da escada (do mais baixo ao mais alto) — base da detecção de "subiu de nível". */
export const LEVEL_ORDER: StudentLevelSlug[] = [
  'noob',
  'coder',
  'hacker',
  'explorer',
  'elite',
  'architect',
  'champion',
  'god',
]

/** Slug desconhecido (nível novo no backend antes do deploy daqui) → cai em Noob. */
export function levelInfo(slug: string | undefined): LevelInfo {
  return (LEVEL_INFO as Record<string, LevelInfo | undefined>)[slug ?? 'noob'] ?? LEVEL_INFO.noob
}

/** `next` é um nível MAIS ALTO que `prev`? (slug desconhecido = -1, nunca dispara). */
export function isLevelUp(prev: string | null | undefined, next: string | undefined): boolean {
  const pi = prev ? LEVEL_ORDER.indexOf(prev as StudentLevelSlug) : -1
  const ni = next ? LEVEL_ORDER.indexOf(next as StudentLevelSlug) : -1
  return ni > -1 && pi > -1 && ni > pi
}

/**
 * ⚠️ A frase "falta N curso…" vive em **`lib/career-horizon.ts`** (`nextLevelHintWithin`),
 * porque ela precisa do CATÁLOGO para não prometer curso que ninguém gravou. O
 * `nextLevelHint` que morava aqui era a mesma frase sem esse limite e virou duplicata
 * assim que todas as telas migraram — `nextLevelHintWithin(level, null)` devolve
 * exatamente o texto antigo. Duas cópias da mesma frase já drifaram neste arquivo antes;
 * uma só, não.
 */
