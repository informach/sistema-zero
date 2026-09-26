/**
 * Coleções do "Como fazer" (a biblioteca de ajuda do Kids).
 *
 * A coleção mora no BANCO (decisão da dona, 26/09/2026): o admin cria, renomeia,
 * reordena e arquiva. O que fica em código são as duas ALLOWLISTS que a tela precisa
 * conhecer para desenhar a coleção: o ícone (um nome que o kids mapeia para o lucide) e
 * o tom (uma das cores de oficina que o CSS do kids já tem). Uma coleção nova escolhe
 * entre eles; não inventa cor nem ícone.
 */
export const HELP_COLLECTION_ICONS = [
  'compass',
  'palette',
  'blocks',
  'lightbulb',
  'box',
  'gamepad',
  'sparkles',
  'book',
] as const
export type HelpCollectionIcon = (typeof HELP_COLLECTION_ICONS)[number]

/** `marca` = a cor da casa; as demais são as cores de oficina (`--tool-<tom>` no kids). */
export const HELP_COLLECTION_TONES = ['marca', 'estudio', 'pinta', 'pensa', 'molda'] as const
export type HelpCollectionTone = (typeof HELP_COLLECTION_TONES)[number]

export const HELP_COLLECTION_STATUSES = ['active', 'archived'] as const
export type HelpCollectionStatus = (typeof HELP_COLLECTION_STATUSES)[number]

/**
 * Slugs que a rota do kids reserva para si (`/como-fazer/colecao/<slug>`): um tutorial com
 * esse slug ficaria inalcançável, porque o segmento estático vence o dinâmico.
 */
export const HELP_RESERVED_SLUGS = ['colecao', 'buscar'] as const

export const HELP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const HELP_SLUG_MAX = 80

/** O que o admin escreve numa coleção (o resto, id/posição/status, é do sistema). */
export interface HelpCollectionDocument {
  slug: string
  title: string
  description: string
  icon: HelpCollectionIcon
  tone: HelpCollectionTone
}

/** A coleção como o kids e o admin a leem. */
export interface HelpCollectionView extends HelpCollectionDocument {
  id: string
  position: number
  status: HelpCollectionStatus
  /** Quantos tutoriais PUBLICADOS ela tem (a criança vê só esses). */
  publishedCount: number
}

export function isHelpCollectionIcon(value: unknown): value is HelpCollectionIcon {
  return typeof value === 'string' && (HELP_COLLECTION_ICONS as readonly string[]).includes(value)
}

export function isHelpCollectionTone(value: unknown): value is HelpCollectionTone {
  return typeof value === 'string' && (HELP_COLLECTION_TONES as readonly string[]).includes(value)
}

export function isHelpSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= HELP_SLUG_MAX &&
    HELP_SLUG_PATTERN.test(value) &&
    !(HELP_RESERVED_SLUGS as readonly string[]).includes(value)
  )
}
