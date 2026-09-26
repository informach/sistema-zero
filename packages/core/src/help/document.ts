import type { CreativeToolId } from '../journey'
import type { HelpCollectionTone } from './collection'

/**
 * O tutorial do "Como fazer": UMA tarefa concreta ("Como ver meu jogo na Pré-visualização"),
 * em passos curtos. Não é aula: não tem progresso, conclusão, XP nem quiz, e o conteúdo é
 * neutro (mostra o que a plataforma faz, nunca pede para comprar ou desbloquear).
 *
 * O documento inteiro é um JSON: o admin edita o `draft`, e "Publicar" tira uma cópia para
 * `published`. A criança lê SÓ o publicado.
 */

export const HELP_TOOL_REFS = ['pinta', 'estudio-completo', 'pensa', 'molda'] as const
export type HelpToolRef = (typeof HELP_TOOL_REFS)[number] & CreativeToolId

export const HELP_VIDEO_PROVIDERS = ['vimeo', 'youtube'] as const
export type HelpVideoProvider = (typeof HELP_VIDEO_PROVIDERS)[number]

export interface HelpTutorialVideo {
  provider: HelpVideoProvider
  /** URL do vídeo (Vimeo com hash de privacidade, se houver; YouTube). Nunca um id solto. */
  src: string
  posterUrl?: string
}

export interface HelpTutorialStep {
  /** Estável dentro do tutorial (o editor reordena por ele). */
  id: string
  title: string
  /** Markdown do renderizador controlado do member-shell (`renderMarkdown`). */
  body: string
  imageUrl?: string
  /** Obrigatório quando há imagem: o leitor de tela é o único olho de algumas crianças. */
  imageAlt?: string
}

export interface HelpTutorialDocument {
  title: string
  /** Uma ou duas frases: o que a criança consegue fazer depois de ler. */
  summary: string
  /** Palavras que a CRIANÇA usaria ("prévia", "ver o jogo", "olhinho"), sem acento ou com. */
  keywords: string[]
  /**
   * A ferramenta de que o tutorial fala. A página avisa, de forma factual, quando ela não
   * está liberada para o perfil, e oferece o atalho quando está. Ausente = plataforma.
   */
  toolRef?: HelpToolRef
  video?: HelpTutorialVideo
  steps: HelpTutorialStep[]
  /** Slugs de outros tutoriais ("Veja também"). */
  related?: string[]
}

export const HELP_TUTORIAL_STATUSES = ['draft', 'published', 'archived'] as const
export type HelpTutorialStatus = (typeof HELP_TUTORIAL_STATUSES)[number]

/** Uma linha da lista PUBLICADA que o kids recebe (busca no cliente). */
export interface HelpTutorialEntry {
  id: string
  slug: string
  collectionId: string
  collectionSlug: string
  title: string
  summary: string
  keywords: string[]
  toolRef: HelpToolRef | null
  /** Texto achatado (título + resumo + keywords + passos), já normalizado, para a busca. */
  searchText: string
  position: number
  updatedAt: string
}

/** O tutorial PUBLICADO como a criança o lê. */
export interface HelpTutorialView extends HelpTutorialDocument {
  id: string
  slug: string
  collectionId: string
  collectionSlug: string
  collectionTitle: string
  collectionTone: HelpCollectionTone
  updatedAt: string
  publishedAt: string
}

export function isHelpToolRef(value: unknown): value is HelpToolRef {
  return typeof value === 'string' && (HELP_TOOL_REFS as readonly string[]).includes(value)
}

export function isHelpVideoProvider(value: unknown): value is HelpVideoProvider {
  return typeof value === 'string' && (HELP_VIDEO_PROVIDERS as readonly string[]).includes(value)
}

/** Um documento vazio para o admin começar (um passo em branco, para o editor ter onde escrever). */
export function emptyHelpTutorialDocument(title = ''): HelpTutorialDocument {
  return {
    title,
    summary: '',
    keywords: [],
    steps: [{ id: 'passo-1', title: '', body: '' }],
  }
}
