import { Crown, Gamepad2, Hammer, Lightbulb, type LucideIcon, Sparkles } from 'lucide-react'
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

// Rótulos kid-friendly (07/2026): slugs internos (noob…god) NÃO mudam — só a apresentação.
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
    blurb: 'Seis projetos iniciantes no Mural. Mandou bem!',
    colorVar: 'var(--level-hacker)',
    icon: Lightbulb,
  },
  elite: {
    label: 'Mestre dos Jogos',
    blurb: 'Projetos intermediários dominados. Você é Mestre dos Jogos!',
    colorVar: 'var(--level-elite)',
    icon: Gamepad2,
  },
  god: {
    label: 'Lenda',
    blurb: 'O topo. Você é uma Lenda do Sistema Zero!',
    colorVar: 'var(--level-god)',
    icon: Crown,
  },
}

/** Ordem da escada (do mais baixo ao mais alto) — base da detecção de "subiu de nível". */
export const LEVEL_ORDER: StudentLevelSlug[] = ['noob', 'coder', 'hacker', 'elite', 'god']

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
 * Frase kid-friendly do que falta p/ o PRÓXIMO nível (`null` no topo). Pega a 1ª
 * dimensão pendente — "concluído E publicado no Mural" conta como um projeto.
 */
export function nextLevelHint(level: StudentLevelView | undefined): string | null {
  if (!level?.next || !level.remaining) return null
  const next = levelInfo(level.next).label
  const r = level.remaining
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
  if (r.iniciante > 0)
    return `Faltam ${r.iniciante} ${plural(r.iniciante, 'projeto iniciante', 'projetos iniciantes')} (concluído + no Mural) para virar ${next}`
  if (r.intermediario > 0)
    return `Faltam ${r.intermediario} ${plural(r.intermediario, 'projeto intermediário', 'projetos intermediários')} para virar ${next}`
  if (r.avancado > 0)
    return `Faltam ${r.avancado} ${plural(r.avancado, 'projeto avançado', 'projetos avançados')} para virar ${next}`
  if (r.any > 0)
    return `Conclua e publique ${r.any} ${plural(r.any, 'projeto', 'projetos')} no Mural para virar ${next}`
  return null
}
