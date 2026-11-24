import { PintaCausalGalleryPageSchema } from '@sistemazero/core/creations/pinta-causal'
import { GALLERY_DRAWING_KINDS, type GallerySelection } from '@sistemazero/core/learning'
import type { ApiError } from './api'
import type { CreationIndexView, CreationSummaryView } from './types'

/** Um trabalho no seletor da galeria da aula. */
export interface GalleryChoice {
  itemId: string
  revision: number
  name: string
  thumb: string | null
  itemUpdatedAt: string
  /** Perfil com o Pinta causal: o hash da cabeça confirmada; o envio leva exatamente este hash. */
  causalSha256?: string
  /** Desenho que o protocolo causal ainda não conferiu: aparece, mas só vai depois de aberto no Pinta. */
  needsPinta?: true
}

/** Onde a próxima página continua: a listagem antiga ou o inventário causal (preso à época). */
export type GalleryCursor =
  | { mode: 'legacy'; cursor: string }
  | { mode: 'causal'; epoch: string; cursor: string }

export interface GalleryLoad {
  mode: 'legacy' | 'causal'
  items: GalleryChoice[]
  next: GalleryCursor | null
  /** A página não continua a lista anterior (o perfil virou causal ou a época mudou): troque tudo. */
  restarted: boolean
}

type Get = <T>(path: string, headers: Record<string, string>) => Promise<T>

/** A leitura causal não existe para este perfil: a linguagem das aulas traduz o código. */
const UNSUPPORTED: ApiError = {
  status: 409,
  code: 'GALLERY_PINTA_CAUSAL_UNSUPPORTED',
  message: 'Os desenhos deste perfil não podem ser enviados pela galeria.',
}

function statusOf(error: unknown): number | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
    ? error.status
    : undefined
}

/** A listagem antiga cercada num perfil adotado pelo protocolo causal do Pinta. */
function protocolRequired(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'PINTA_CAUSAL_CONFLICT' &&
    'message' in error &&
    error.message === 'protocol-required'
  )
}

/**
 * Uma página do seletor. Num perfil antigo, a listagem de sempre. Num perfil adotado pelo Pinta
 * causal, a listagem antiga é cercada e o seletor lista pela cabeça CONFIRMADA de cada desenho
 * (`/api/pinta/causal/gallery`, a mesma autorização das rotas causais): nome, miniatura e hash.
 */
export async function loadGalleryChoices(options: {
  tool: 'studio' | 'pinta'
  viewerId: string
  get: Get
  /** O perfil já se mostrou causal nesta janela (a adoção não volta atrás). */
  mode?: GalleryLoad['mode']
  cursor?: GalleryCursor
}): Promise<GalleryLoad> {
  const { tool, get, cursor } = options
  const headers = { 'x-sz-viewer': options.viewerId }

  async function causal(
    from: Extract<GalleryCursor, { mode: 'causal' }> | undefined,
    restarted: boolean,
  ): Promise<GalleryLoad> {
    const query = from
      ? `?epoch=${encodeURIComponent(from.epoch)}&cursor=${encodeURIComponent(from.cursor)}`
      : ''
    let body: unknown
    try {
      body = await get<unknown>(`/api/pinta/causal/gallery${query}`, headers)
    } catch (error) {
      // Protocolo desligado neste servidor ou perfil fora da lista: nada a conferir, nada a enviar.
      if (statusOf(error) === 404) throw UNSUPPORTED
      // Outro desenho foi guardado entre as páginas (a época mudou): a lista recomeça.
      if (from && statusOf(error) === 409) return causal(undefined, true)
      throw error
    }
    const page = PintaCausalGalleryPageSchema.safeParse(body)
    if (!page.success) throw new Error('A galeria respondeu num formato inesperado.')
    const { epoch, entries, nextCursor } = page.data.gallery
    return {
      mode: 'causal',
      items: entries
        .filter((entry) => GALLERY_DRAWING_KINDS.includes(entry.kind))
        .map((entry) => ({
          itemId: entry.itemId,
          revision: entry.revision,
          name: entry.name,
          thumb: entry.thumb,
          itemUpdatedAt: entry.itemUpdatedAt,
          ...(entry.coverage === 'certified' && entry.sha256
            ? { causalSha256: entry.sha256 }
            : { needsPinta: true as const }),
        })),
      next: nextCursor ? { mode: 'causal', epoch, cursor: nextCursor } : null,
      restarted,
    }
  }

  if (tool === 'pinta' && (options.mode === 'causal' || cursor?.mode === 'causal'))
    return causal(cursor?.mode === 'causal' ? cursor : undefined, false)
  const after = cursor?.mode === 'legacy' ? `&cursor=${encodeURIComponent(cursor.cursor)}` : ''
  try {
    const result = await get<{ items: CreationIndexView[]; nextCursor: string | null }>(
      `/api/members/creations/${tool}?limit=100${after}`,
      headers,
    )
    return {
      mode: 'legacy',
      items: result.items
        .filter(
          (item): item is CreationSummaryView =>
            'name' in item &&
            !item.deletedAt &&
            (tool !== 'pinta' || GALLERY_DRAWING_KINDS.includes(item.kind)),
        )
        .map(({ itemId, revision, name, thumb, itemUpdatedAt }) => ({
          itemId,
          revision,
          name,
          thumb,
          itemUpdatedAt,
        })),
      next: result.nextCursor ? { mode: 'legacy', cursor: result.nextCursor } : null,
      restarted: false,
    }
  } catch (error) {
    if (tool === 'pinta' && protocolRequired(error)) return causal(undefined, !!cursor)
    throw error
  }
}

/**
 * Junta uma página à lista do seletor. As duas listagens já vêm da mais nova para a mais antiga
 * ATRAVÉS das páginas (a causal confere essa ordem em `PintaCausalGalleryPageSchema`): a página
 * seguinte só continua a lista.
 */
export function mergeGalleryChoices(
  previous: readonly GalleryChoice[],
  loaded: GalleryLoad,
  append: boolean,
): GalleryChoice[] {
  const kept = append && !loaded.restarted ? previous : []
  return [...new Map([...kept, ...loaded.items].map((item) => [item.itemId, item])).values()]
}

/** O que o envio leva de um trabalho escolhido: no perfil causal, o hash que o seletor mostrou. */
export function gallerySelectionOf(choice: GalleryChoice): GallerySelection {
  return {
    itemId: choice.itemId,
    revision: choice.revision,
    ...(choice.causalSha256 ? { causalSha256: choice.causalSha256 } : {}),
  }
}
