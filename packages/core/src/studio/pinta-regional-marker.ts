import { z } from 'zod'
import { PINTA_IMAGE_ID_PATTERN } from './pinta-image'

/**
 * O marcador privado de um material regional do Pinta (PNG 5) num asset do Estúdio.
 *
 * Mora no core porque o `projectAssets` do Estúdio o carrega por tabela, e com ele entram o
 * carregador de cenas 3D, o player e a lista inicial. Um `zod` importado pelo Estúdio resolve
 * outra versão que a do core e levava uma segunda cópia inteira para esses pacotes
 * (`check:scene3d-runtime`, 23/11/2026).
 */
export const PintaRegionalSourceIdSchema = z.string().min(1).max(200).regex(PINTA_IMAGE_ID_PATTERN)

export const PintaRegionalMarkerSchema = z.strictObject({
  dataVersion: z.union([z.literal(5), z.literal(6)]),
  sourceId: PintaRegionalSourceIdSchema,
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
})

export type PintaRegionalMarker = Readonly<z.infer<typeof PintaRegionalMarkerSchema>>
