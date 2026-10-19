import {
  Castle,
  CircleHelp,
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
 * (requisitos e gates) vive na política Kids publicada pelo members; aqui é só
 * como exibir. `colorVar` é uma CSS var do globals.css (`--level-<slug>`) — usada
 * inline na aura/insígnia (cor dinâmica não casa com classe Tailwind estática).
 */
export interface LevelInfo {
  /** Rótulo exibido (o nome do rank). */
  label: string
  /** `var(--level-<slug>)` — cor da aura e da insígnia. */
  colorVar: string
  icon: LucideIcon
}

// Escada de 8 (reforma 2D/3D 07/2026): rótulos kid-friendly — os slugs internos NÃO mudam.
export const LEVEL_INFO: Record<StudentLevelSlug, LevelInfo> = {
  noob: {
    label: 'Faísca',
    colorVar: 'var(--level-noob)',
    icon: Sparkles,
  },
  coder: {
    label: 'Construtor(a)',
    colorVar: 'var(--level-coder)',
    icon: Hammer,
  },
  hacker: {
    label: 'Inventor(a)',
    colorVar: 'var(--level-hacker)',
    icon: Lightbulb,
  },
  explorer: {
    label: 'Explorador(a) de Mundos',
    colorVar: 'var(--level-explorer)',
    icon: Compass,
  },
  elite: {
    label: 'Mestre dos Jogos',
    colorVar: 'var(--level-elite)',
    icon: Gamepad2,
  },
  architect: {
    label: 'Arquiteto(a) de Mundos',
    colorVar: 'var(--level-architect)',
    icon: Castle,
  },
  champion: {
    label: 'Gênio da Criação',
    colorVar: 'var(--level-champion)',
    icon: Wand2,
  },
  god: {
    label: 'Lenda',
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

const UNAVAILABLE_LEVEL_INFO: LevelInfo = {
  label: 'Posto indisponível',
  colorVar: 'var(--muted-foreground)',
  icon: CircleHelp,
}

/** Missing identity is an unavailable presentation state, never a first-rank award. */
export function levelInfo(slug: string | undefined): LevelInfo {
  return slug && Object.hasOwn(LEVEL_INFO, slug)
    ? LEVEL_INFO[slug as StudentLevelSlug]
    : UNAVAILABLE_LEVEL_INFO
}

/** `next` é um nível MAIS ALTO que `prev`? (slug desconhecido = -1, nunca dispara). */
export function isLevelUp(prev: string | null | undefined, next: string | undefined): boolean {
  const pi = prev ? LEVEL_ORDER.indexOf(prev as StudentLevelSlug) : -1
  const ni = next ? LEVEL_ORDER.indexOf(next as StudentLevelSlug) : -1
  return ni > -1 && pi > -1 && ni > pi
}

/** Progress copy reads the canonical requirement states in journey-presentation.ts. */
