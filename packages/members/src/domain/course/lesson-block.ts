/**
 * Conteúdo de uma aula é uma lista ORDENADA de blocos tipados. Uma aula "composta"
 * (ex.: vídeo + interativo + texto) é simplesmente uma aula com vários blocos. Cada
 * bloco é uma união discriminada por `kind` — tipável e validável individualmente.
 * O modelo de blocos é o que viabiliza conteúdo composto (impossível com 1 payload).
 */
export const LESSON_BLOCK_KINDS = [
  'rich_text',
  'video',
  'image',
  'audio',
  'quiz',
  'embed',
  'ebook',
] as const

export type LessonBlockKind = (typeof LESSON_BLOCK_KINDS)[number]

export function isLessonBlockKind(value: unknown): value is LessonBlockKind {
  return typeof value === 'string' && (LESSON_BLOCK_KINDS as readonly string[]).includes(value)
}

/** Texto rico (com highlight de código no front; guardamos a fonte + dicas de linguagem). */
export interface RichTextBlock {
  kind: 'rich_text'
  html?: string
  markdown?: string
  codeLanguageHints?: string[]
}

export type VideoProvider = 'mux' | 'youtube' | 'vimeo' | 'file'

export interface VideoCaption {
  lang: string
  url: string
}

export interface VideoBlock {
  kind: 'video'
  provider: VideoProvider
  src: string
  posterUrl?: string
  durationSeconds?: number
  captions?: VideoCaption[]
}

export interface ImageBlock {
  kind: 'image'
  url: string
  alt?: string
  caption?: string
}

export interface AudioBlock {
  kind: 'audio'
  url: string
  durationSeconds?: number
}

export interface QuizChoice {
  id: string
  label: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  choices: QuizChoice[]
  correctChoiceIds: string[]
  explanation?: string
}

export interface QuizBlock {
  kind: 'quiz'
  questions: QuizQuestion[]
  passingScore?: number
}

/**
 * Conteúdo interativo: HTML que roda SEMPRE em iframe sandbox no front do aluno.
 * A autoria v3 grava só `{html, sandbox?}`; `embedType`/`src`/`height` são legado
 * (blocos antigos podem tê-los — o renderer ignora).
 */
export interface EmbedBlock {
  kind: 'embed'
  html?: string
  sandbox?: string
  /** @deprecated legado da autoria v2 */
  embedType?: string
  /** @deprecated legado da autoria v2 */
  src?: string
  /** @deprecated legado da autoria v2 */
  height?: number
}

/**
 * E-book (PDF) renderizado como livro 3D interativo no front do aluno.
 * `url` é `r2priv:<key>` (bucket privado) — a view member-facing NÃO a expõe;
 * o community resolve via rota própria e serve com marca d'água.
 */
export interface EbookBlock {
  kind: 'ebook'
  url: string
  title?: string
}

/** União discriminada por `kind` — o conteúdo guardado na coluna `lesson_blocks.content`. */
export type LessonBlockContent =
  | RichTextBlock
  | VideoBlock
  | ImageBlock
  | AudioBlock
  | QuizBlock
  | EmbedBlock
  | EbookBlock
