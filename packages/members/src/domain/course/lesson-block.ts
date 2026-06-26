import type { LessonActivity } from './studio-activity'

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
  'certificate',
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
  /**
   * Atividade com auto-correção (fase 2). Ausente = bloco só de entrega (gate =
   * enviou). Com `passingScore` = gate por nota (ver mark-lesson-complete). As
   * definições vão ao aluno (feedback instantâneo); só `structure` é recalculado
   * no servidor (correção híbrida). Ver `studio-activity.ts`.
   */
  activity?: LessonActivity
  /**
   * Nome do PROJETO CONTÍNUO (cadeia). Aulas com o MESMO `chain` no mesmo curso
   * formam uma sequência que constrói um único projeto (ex.: um jogo ao longo de N
   * aulas): ao abrir, o Estúdio carrega a última entrega do aluno no bloco contínuo
   * da aula anterior da cadeia (ver get-studio-carryover). Vazio/ausente = aula
   * independente (começa do `initialProject`). Várias cadeias por curso não se
   * misturam (resolução por nome).
   */
  chain?: string
  /**
   * VITRINE (Mural dos Criadores): o admin marca `enabled` no bloco da ÚLTIMA aula do
   * projeto. Ao concluí-la, o aluno ganha o botão "Publicar no Mural" (a conclusão
   * devolve o `showcase` no `LessonCompleteView`) e o post é montado com este `title`/
   * `summary` (autorados pelo admin — a criança NÃO escreve) + a capa (print do jogo
   * capturado no cliente, ou `defaultCoverUrl` para projetos web/fallback). Ausente/
   * `enabled:false` = a aula não publica nada.
   */
  showcase?: {
    enabled: boolean
    /** Título do post (default: título da aula). */
    title?: string
    /** Resumo do projeto (Markdown). */
    summary?: string
    /** Capa padrão (URL pública http(s)) p/ projetos web e fallback do print. */
    defaultCoverUrl?: string
  }
}

/**
 * Bloco CERTIFICADO: colocado na ÚLTIMA aula do curso (o "diploma"). Ao concluir todas
 * as OUTRAS aulas publicadas (o que, pelos gates de quiz/estúdio, já implica passar nos
 * quizzes e enviar os projetos), o aluno libera o botão de EMITIR — a 1ª emissão congela
 * um registro imutável (nº de série + nome + título do curso) e gera o PDF; reemissões só
 * rebaixam o MESMO PDF. A config aqui é só metadado de AUTORIA (não-secreta, vai ao front
 * pro renderizador montar o PDF da marca) — espelha o `StudioBlock.showcase`. O members NÃO
 * gera o PDF (é backend); o community/BFF monta com pdf-lib a partir do registro + desta config.
 */
export interface CertificateBlock {
  kind: 'certificate'
  /** Título exibido no PDF (default: "Certificado de Conclusão"). */
  title?: string
  /** Nome do emissor/assinante (ex.: "Equipe Sistema Zero" ou o professor). */
  issuerName?: string
  /** Imagem da assinatura (URL http(s)). */
  signatureImageUrl?: string
  /** Override do logo no PDF (URL http(s); default = logo da marca). */
  logoUrl?: string
  /** Cor de destaque (hex, ex.: `#C4F042`). */
  accentColor?: string
  /** Texto/menção adicional no corpo do certificado (plano, sem imagem). */
  message?: string
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
  | CertificateBlock

/**
 * O bloco TRAVA a conclusão da aula? Estúdio SEMPRE trava (exige envio —
 * `STUDIO_GATE_NOT_SUBMITTED`, ver mark-lesson-complete); quiz só trava COM nota de
 * corte (`passingScore`). Os demais (texto/vídeo/imagem/áudio/embed/ebook/quiz de
 * fixação) são conteúdo livre. Usado pela autoria para manter a aula do certificado
 * SEM gates: a emissão conclui essa aula DIRETO (sem passar pelos gates), então um
 * bloco travante ali seria PULADO — o aluno emitiria o diploma sem fazê-lo.
 */
export function isCompletionGatingBlock(content: LessonBlockContent): boolean {
  if (content.kind === 'studio') return true
  if (content.kind === 'quiz') return content.passingScore !== undefined
  return false
}
