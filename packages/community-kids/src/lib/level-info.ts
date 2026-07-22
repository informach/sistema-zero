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
import type { StudentLevelSlug, StudentLevelView } from '@/lib/types'

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
    blurb: 'Seis projetos Iniciante 2D no Mural. Mandou bem!',
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

/** Nome kid-friendly de cada DEGRAU de curso (dificuldade × eixo), no singular/plural. */
const TIER_HINTS: readonly {
  key: keyof NonNullable<StudentLevelView['remaining']>
  one: string
  many: string
}[] = [
  { key: 'iniciante-2d', one: 'curso Iniciante 2D', many: 'cursos Iniciante 2D' },
  { key: 'iniciante-3d', one: 'curso Iniciante 3D', many: 'cursos Iniciante 3D' },
  { key: 'intermediario-2d', one: 'curso Intermediário 2D', many: 'cursos Intermediário 2D' },
  { key: 'intermediario-3d', one: 'curso Intermediário 3D', many: 'cursos Intermediário 3D' },
  { key: 'avancado-2d', one: 'curso Avançado 2D', many: 'cursos Avançado 2D' },
  { key: 'avancado-3d', one: 'curso Avançado 3D', many: 'cursos Avançado 3D' },
]

/**
 * Frase kid-friendly do que falta p/ o PRÓXIMO nível (`null` no topo). Pega o 1º
 * DEGRAU pendente na ordem da escada — "concluído E publicado no Mural" conta
 * como um projeto.
 */
export function nextLevelHint(level: StudentLevelView | undefined): string | null {
  if (!level?.next || !level.remaining) return null
  const next = levelInfo(level.next).label
  const r = level.remaining
  for (const tier of TIER_HINTS) {
    const n = r[tier.key]
    if (typeof n === 'number' && n > 0) {
      return n === 1
        ? `Falta 1 ${tier.one} concluído e o projeto publicado no Mural para virar ${next}`
        : `Faltam ${n} ${tier.many} concluídos e com os projetos no Mural para virar ${next}`
    }
  }
  if (r.any > 0)
    return `Conclua e publique ${r.any} ${r.any === 1 ? 'projeto' : 'projetos'} no Mural para virar ${next}`
  return null
}
