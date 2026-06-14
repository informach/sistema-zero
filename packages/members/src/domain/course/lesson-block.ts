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
  'studio',
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

/**
 * Teto do JSON do projeto do Estúdio (autoria e entrega). Anti-DoS do jsonb:
 * `JSON.stringify(project).length` acima disso → 413. Folgado para uma atividade de
 * aula (Blockly/código pequenos) e abaixo do teto de corpo do gateway (2 MB) — a
 * entrega do aluno passa pela borda.
 */
export const MAX_STUDIO_PROJECT_CHARS = 1_500_000

/** Nível de aprendizado fixado pelo professor (espelha o BlockLevel do @sistemazero/studio). */
export type StudioLevel = 'iniciante' | 'intermediario' | 'avancado'

/** Modos do editor expostos ao aluno (espelha o IDEMode do @sistemazero/studio). */
export type StudioMode = 'blocks' | 'bridge' | 'code'

/**
 * Bloco Estúdio: renderiza uma versão LIMITADA do @sistemazero/studio pré-configurada
 * pelo admin para a atividade da aula. `initialProject` é o snapshot do Estúdio
 * (shape `Project` da lib) autorado no editor embutido da autoria — já codifica nome,
 * TIPO (extensões web/jogo-2D/jogo-3D) e o código/blocos de partida. O members NÃO importa
 * a lib (é backend): trata `initialProject` como JSON de cliente sanitizado (o Estúdio
 * sanitiza na autoria via export e DE NOVO no aluno via `sanitizeProjectForHost`); aqui só
 * vale o teto de tamanho. A ENTREGA do aluno (mesmo formato JSON) bloqueia a conclusão da
 * aula até ser enviada — espelha o gate do quiz (ver mark-lesson-complete.service).
 */
export interface StudioBlock {
  kind: 'studio'
  /** Snapshot `Project` do Estúdio autorado pelo admin (JSON opaco aqui). */
  initialProject: unknown
  /** Nível fixado (default 'avancado' = mostra tudo). */
  level?: StudioLevel
  /** Bloquinhos sempre visíveis, independente do nível (allowlist da aula). */
  allowBlocks?: string[]
  /** Categorias sempre visíveis, independente do nível. */
  allowCategories?: string[]
  /** Modos exibidos ao aluno (default: os permitidos pelo tipo do projeto). */
  allowedModes?: StudioMode[]
  /** Aluno pode revelar blocos avançados (default true). */
  allowLevelReveal?: boolean
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
  | StudioBlock
