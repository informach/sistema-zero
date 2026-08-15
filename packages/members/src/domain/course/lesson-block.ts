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
  'pinta',
  'certificate',
  'coming_soon',
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
  /** Inclui o PDF na base didática do Zappy; opt-in explícito do professor. */
  zappyStudentNotebook?: boolean
}

/**
 * Teto do JSON do projeto do Estúdio (autoria e entrega). Anti-DoS do jsonb:
 * `JSON.stringify(project).length` acima disso → 413. Folgado para uma atividade de
 * aula (Blockly/código pequenos) e abaixo do teto de corpo do gateway (2 MB) — a
 * entrega do aluno passa pela borda.
 */
export const MAX_STUDIO_PROJECT_CHARS = 1_500_000

/**
 * Nível de aprendizado fixado pelo professor (espelha o BlockLevel do
 * @sistemazero/studio — escada de 6 degraus 2D/3D). Os 3 valores legados
 * seguem tolerados: vivem em jsonb de aulas antigas e o studio os normaliza.
 */
export type StudioLevel =
  | 'iniciante-2d'
  | 'iniciante-3d'
  | 'intermediario-2d'
  | 'intermediario-3d'
  | 'avancado-2d'
  | 'avancado-3d'
  | 'iniciante'
  | 'intermediario'
  | 'avancado'

/** Modos do editor expostos ao aluno (espelha o IDEMode do @sistemazero/studio). */
export type StudioMode = 'blocks' | 'bridge' | 'code'

/**
 * Bloco Estúdio: renderiza uma versão LIMITADA do @sistemazero/studio pré-configurada
 * pelo admin para a atividade da aula. `initialProject` é o snapshot do Estúdio
 * (shape `Project` da lib) autorado no editor embutido da autoria — já codifica nome,
 * TIPO (extensões web/jogo-2D/jogo-3D) e o código/blocos de partida. O members NÃO importa
 * a lib (é backend): trata `initialProject` como JSON defensivo. O service valida o tipo e
 * o template dos projetos Pro, além do teto de tamanho; o Estúdio sanitiza o snapshot na
 * autoria e de novo no aluno. A ENTREGA do aluno (mesmo formato JSON) bloqueia a conclusão da
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
 * Tipos de desenho do Pinta (ESTILO × PAPEL). Espelha o `PintaAssetKind` de
 * `@sistemazero/pinta` — o members não importa a lib (é backend, e o subpath com React não
 * resolveria aqui), então o union é copiado e travado por teste de conformidade.
 */
export type PintaAssetKindName =
  | 'pixel-sprite'
  | 'pixel-background'
  | 'tileset'
  | 'tilemap'
  | 'vector-sprite'
  | 'vector-background'
  | 'vector-tileset'

/**
 * Teto do JSON do desenho (autoria e entrega). MEDIDO contra o codec real do Pinta (15/08),
 * não estimado:
 *
 * | caso                                                | chars |
 * |-----------------------------------------------------|-------|
 * | personagem 128x128 com ruído                          |  42 k |
 * | mapa 128x128 com TODAS as células preenchidas         | 246 k |
 * | cenário 512x512, 4 camadas, manchas (desenho denso)   | 1,5 M |
 * | cenário 512x512, 4 camadas, ruído por PIXEL           | 2,6 M |
 *
 * ⚠️⚠️ **Quem manda no número é o GATEWAY, não esta linha.** O teto global de corpo da borda é
 * 2 MB e rota nenhuma pode subir acima dele (o boot falha se tentar), então de nada adiantaria
 * aceitar aqui um desenho que morre com 413 antes de chegar. 1,8 M deixa folga para o envelope
 * (`{"asset":…,"message":…}`) dentro dos 2 MB.
 *
 * ⚠️ **O que NÃO cabe, medido:** um cenário 512x512 com as 4 camadas cheias — 1,5 M num desenho
 * denso passa, mas o ruído por pixel (2,6 M) não. Não é hipótese remota: é o teto físico de uma
 * tela que a professora consegue configurar. Duas saídas, as duas fora deste arquivo — subir o
 * teto global do gateway, ou limitar o tamanho de tela oferecido na autoria do bloco.
 *
 * ⚠️ O VETOR não tem máximo físico comparável: uma FIGURA inserida carrega um data URL de até
 * 300 k chars e cabem centenas de formas. Ali o teto é POLÍTICA, não física — um desenho de aula
 * não é um álbum de fotos —, e a recusa é explícita.
 */
export const MAX_PINTA_ASSET_CHARS = 1_800_000

/**
 * Bloco PINTA: o ateliê de desenho embarcado na aula, com o desenho JÁ CRIADO pelo professor
 * (tipo e tamanho decididos por ele). A criança desenha dentro da aula e ENVIA ao professor;
 * como no Estúdio, isso BLOQUEIA a conclusão da aula até o envio.
 *
 * `initialAsset` é o snapshot do desenho (shape `PintaAsset` da lib) — JSON defensivo aqui. Quem
 * sanea é o Pinta, nas duas pontas (autoria e aluno).
 *
 * ⭐ **O TIPO do desenho não é um campo à parte, de propósito.** O plano previa um `assetKind`
 * espelhando o snapshot, mas dois lugares dizendo a mesma coisa drifam: bastaria o professor
 * trocar o desenho sem o admin reescrever o campo. Ele é LIDO do snapshot por
 * `pintaAssetKindOf` — uma leitura de string, que não obriga o members a conhecer o formato.
 */
export interface PintaBlock {
  kind: 'pinta'
  /** Snapshot `PintaAsset` autorado pelo admin (JSON opaco aqui). */
  initialAsset: unknown
  /**
   * Curadoria da CAIXA DE FERRAMENTAS, RESTRITIVA como o `allowBlocks` do Estúdio: lista
   * não-vazia = a criança vê só essas; ausente/vazia = a caixa inteira. Os ids e os presets
   * vivem em `@sistemazero/pinta/assets` (`PINTA_TOOL_PRESETS`); aqui é lista de string, porque
   * ferramenta nova no editor não pode exigir deploy do backend.
   */
  allowTools?: string[]
  /**
   * Nome do PROJETO CONTÍNUO (cadeia). Aulas com o MESMO `chain` no mesmo curso constroem um
   * único desenho. ⚠️ Diferente do Estúdio, aqui o TIPO é load-bearing: dois blocos da mesma
   * cadeia com desenhos de tipos diferentes não encaixam (ver a validação da autoria).
   */
  chain?: string
}

/**
 * O tipo do desenho inicial, lido do snapshot. `null` = snapshot ausente/ilegível ou tipo
 * desconhecido — quem chama decide (a autoria recusa; a leitura degrada).
 */
export function pintaAssetKindOf(block: PintaBlock): PintaAssetKindName | null {
  const kind = (block.initialAsset as { kind?: unknown } | null | undefined)?.kind
  return typeof kind === 'string' && (PINTA_ASSET_KINDS as readonly string[]).includes(kind)
    ? (kind as PintaAssetKindName)
    : null
}

export const PINTA_ASSET_KINDS = [
  'pixel-sprite',
  'pixel-background',
  'tileset',
  'tilemap',
  'vector-sprite',
  'vector-background',
  'vector-tileset',
] as const

/**
 * Rótulo em português de cada tipo, só para a MENSAGEM de erro da autoria — "a aula X já usa
 * esta cadeia com Personagem (pixel art)" é acionável; `pixel-sprite` não é. A UI tem os rótulos
 * dela (o admin monta o select); estes não são contrato.
 */
export const PINTA_ASSET_KIND_LABELS: Record<PintaAssetKindName, string> = {
  'pixel-sprite': 'Personagem (pixel art)',
  'pixel-background': 'Cenário (pixel art)',
  tileset: 'Peças de mapa (pixel art)',
  tilemap: 'Mapa (pixel art)',
  'vector-sprite': 'Personagem (formas)',
  'vector-background': 'Cenário (formas)',
  'vector-tileset': 'Peças de mapa (formas)',
}

/** Uma assinatura no certificado: imagem (URL http(s)) + nome de quem assina. */
export interface CertificateSignature {
  imageUrl?: string
  name?: string
}

/**
 * Bloco CERTIFICADO: o "diploma" do curso. Pode ficar em QUALQUER aula — o botão de EMITIR
 * libera quando TODAS as aulas publicadas ANTES dela estão concluídas (aulas depois não
 * contam; ver `eligibleForCertificate`). A 1ª emissão congela um registro imutável (nº de
 * série + nome + título do curso) e gera o PDF; reemissões só rebaixam o MESMO PDF.
 *
 * **Layout por IMAGEM BASE (26/06):** cada curso sobe a sua `baseImageUrl` (fundo A4
 * paisagem com o logo/título/decoração já desenhados) e o renderizador do BFF desenha
 * POR CIMA o conteúdo dinâmico (linha de abertura, NOME do aluno, frase do curso,
 * parágrafo, data, assinaturas, QR). A config aqui é só metadado de AUTORIA (não-secreta,
 * vai ao front) — o members NÃO gera o PDF; o community/BFF monta com pdf-lib a partir do
 * registro imutável + desta config.
 */
export interface CertificateBlock {
  kind: 'certificate'
  /** Imagem base do certificado (fundo A4 paisagem, por curso) — URL http(s). */
  baseImageUrl?: string
  /** Linha fixa antes do nome (default "Certificamos que o aluno"). */
  introLine?: string
  /** Frase curta específica do curso (o que o aluno concluiu), abaixo do nome. */
  coursePhrase?: string
  /** Parágrafo explicando o que o aluno fez (abaixo da frase do curso). */
  bodyText?: string
  /** Assinaturas (até 2): imagem + nome. Ex.: Helena, Julio. */
  signatures?: CertificateSignature[]
  /** Cor do texto desenhado sobre a imagem (hex; default escuro). */
  accentColor?: string
  /** @deprecated layout antigo (sem imagem base) — tolerado p/ blocos legados. */
  title?: string
  /** @deprecated ver `signatures`. */
  issuerName?: string
  /** @deprecated ver `signatures`. */
  signatureImageUrl?: string
  /** @deprecated a imagem base já traz o logo. */
  logoUrl?: string
  /** @deprecated ver `bodyText`/`coursePhrase`. */
  message?: string
}

/**
 * "Em breve": a aula está EM PRODUÇÃO. Enquanto este bloco existir, a projeção do
 * aluno devolve só ele (os demais blocos e os anexos NÃO saem do servidor — ver
 * `toLessonDetailView`) e a conclusão é barrada (`LESSON_COMING_SOON`). Tirar o
 * bloco devolve a aula ao normal. `message` sobrescreve o recado padrão, que vive
 * em cada renderizador (o tom do kids ≠ o do adulto).
 */
export interface ComingSoonBlock {
  kind: 'coming_soon'
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
  | PintaBlock
  | CertificateBlock
  | ComingSoonBlock

/**
 * O bloco TRAVA a conclusão da aula? Estúdio e Pinta SEMPRE travam (exigem envio —
 * `STUDIO_GATE_NOT_SUBMITTED` / `PINTA_GATE_NOT_SUBMITTED`, ver mark-lesson-complete);
 * "em breve" SEMPRE trava (a
 * aula ainda está sendo montada); quiz só trava COM nota de corte (`passingScore`). Os
 * demais (texto/vídeo/imagem/áudio/embed/ebook/quiz de fixação) são conteúdo livre.
 * Usado pela autoria para manter a aula do certificado SEM gates: a emissão conclui
 * essa aula DIRETO (sem passar pelos gates), então um bloco travante ali seria PULADO —
 * o aluno emitiria o diploma sem fazê-lo.
 */
export function isCompletionGatingBlock(content: LessonBlockContent): boolean {
  if (content.kind === 'studio') return true
  if (content.kind === 'pinta') return true
  if (content.kind === 'coming_soon') return true
  if (content.kind === 'quiz') return content.passingScore !== undefined
  return false
}

/**
 * A aula está EM PRODUÇÃO (tem bloco "em breve")? Portão do conteúdo e da conclusão.
 *
 * O portão NÃO pode viver só na projeção da aula (`toLessonDetailView`): um id de
 * bloco/anexo visto ANTES de o bloco entrar sobrevive na aba aberta, no histórico e
 * num HAR, e as rotas laterais resolvem o conteúdo direto de `lesson.blocks`. Por
 * isso ele é aplicado nas CINCO portas que carregam a aula pelo id, além do
 * `mark-lesson-complete`:
 *  - `get-attachment-download` e `get-ebook-download` → 404;
 *  - `submit-quiz-attempt` → 404 (a resposta ainda devolveria o GABARITO e daria XP);
 *  - `submit-studio-project` → 404 (o upsert último-vence sobrescreveria a entrega boa);
 *  - `get-showcase-payload` → `eligible:false` (mantém o contrato do consumidor). É a
 *    única com efeito PÚBLICO: o HUB revalida por ela no publish, então sem o portão
 *    uma aba velha publicaria no Mural um projeto de aula não-servida.
 *
 * FORA de propósito: `get-studio-carryover` e `get-own-studio-submission` devolvem o
 * projeto do PRÓPRIO aluno, não conteúdo autoral — barrá-los só tiraria dele o
 * trabalho que já é dele.
 */
export function hasComingSoonBlock(blocks: readonly { content: LessonBlockContent }[]): boolean {
  return blocks.some((b) => b.content.kind === 'coming_soon')
}
