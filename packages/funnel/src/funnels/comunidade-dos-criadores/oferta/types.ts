export type ComunidadeProfile =
  | 'tempo-de-tela'
  | 'criacao-de-jogos'
  | 'expressao-visual'
  | 'formacao-tecnologica'

/** Continuidade é uma etapa de relacionamento, não um quinto avatar. */
export type ComunidadePageId = ComunidadeProfile | 'continuar'

export interface ComunidadeAction {
  label: string
  href: string
}

export interface ComunidadeGroup {
  title: string | null
  paragraphs: string[]
  comparison?: { headers: string[]; rows: string[][] }
}

export interface ComunidadeSection {
  id: string
  title: string
  eyebrow: string
  /** `cases`: uma carta por situação (grupo com subtítulo), ligadas como etapas de um percurso. */
  layout: 'story' | 'cards' | 'band' | 'journey' | 'tools' | 'cases'
  visuals: string[]
  groups: ComunidadeGroup[]
  actions: ComunidadeAction[]
}

export interface ComunidadePage {
  id: ComunidadePageId
  label: string
  seoTitle: string
  description: string
  emphasis: string
  heroVisual: string
  heroChip: string
  hero: {
    title: string
    description: string
    benefits: string[]
    requirements: string
    primary: ComunidadeAction
    secondary: ComunidadeAction
  }
  sections: ComunidadeSection[]
  faqTitle: string
  faqGroups: { title: string; questions: string[] }[]
  faq?: Record<string, ComunidadeFaqEntry>
  faqVisuals?: Record<string, readonly string[]>
  faqLinks?: ComunidadeAction[]
  offer?: ComunidadeOffer
  showFounder?: boolean
  closing: ComunidadeSection
}

export interface ComunidadeOffer {
  title: string
  paragraphs: string[]
  monthly: { title: string; paragraphs: string[]; cta: string }
  annual: { title: string; paragraphs: string[]; cta: string }
  period?: { title: string; paragraphs: string[] }
  guarantee: { title: string; paragraphs: string[] }
  checkout: string
}

export interface ComunidadeFaqEntry {
  question: string
  paragraphs: string[]
}

/** Uma captura REAL do kids em staging (1x e @2x, mesma proporção). */
export interface ComunidadeFrame {
  file: string
  retina: string
  alt: string
  /** O nome que a própria tela mostra (área, etapa ou botão): rótulo do passo e da miniatura. */
  label: string
  width: number
  height: number
}

export interface ComunidadeVisual {
  /** Uma tela, ou as telas do mesmo projeto na ordem em que acontecem. */
  frames: ComunidadeFrame[]
  caption: string
  /** `steps`: uma tela leva à outra (numeradas). `set`: telas da mesma área, sem ordem. */
  mode?: 'steps' | 'set'
}
