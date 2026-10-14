import 'server-only'
import { createHash } from 'node:crypto'
import { classifyPintaPaletteLibraryCreation } from '@sistemazero/core/creations'
import { journeyLevelAtLeast, MOLDA_TOOL_BAND_LEVELS } from '@sistemazero/core/journey'
import type {
  PensaAssetNeed,
  PensaCapabilitySnapshot,
  PensaKnowledgeReference,
} from '@sistemazero/core/pensa'
import type { MoldaAssetKind } from '@sistemazero/molda/assets'
import { MOLDA_TOOL_FAMILIES } from '@sistemazero/molda/tools'
import type { PintaAssetKind } from '@sistemazero/pinta/assets'
import { isPrivilegedRole } from '../../lib/studio-tier'
import type { CreationIndexView, SessionUser } from '../../lib/types'
import type { MembersClient } from '../clients'
import { availablePlannerCatalog } from '../pensa-agents/planner-contract'
import { getPensaCapabilities } from '../pensa-capabilities'
import { isStudioZappyAllowed } from '../zappy-access'
import { JourneyChildError } from './errors'
import { redactPensaText } from './privacy'

type ArtFamily = PensaAssetNeed['kind']

/**
 * O tipo GUARDADO na conta → a família de arte da proposta (full review de 14/10/2026). O Pinta
 * guarda o kind do desenho (`pixel-sprite`, `vector-background`…) e a proposta fala em `sprite`,
 * `background`…: comparar os dois crus reprovava TODO desenho que já existia ("O tipo da criação
 * guardada não corresponde ao planejado"). `Record` completo: um tipo novo no Pinta é erro de
 * tipo aqui, nunca uma criação que some do inventário em silêncio.
 */
export const PINTA_KIND_FAMILY: Record<PintaAssetKind, ArtFamily> = {
  'pixel-sprite': 'sprite',
  'vector-sprite': 'sprite',
  'pixel-background': 'background',
  'vector-background': 'background',
  tileset: 'tileset',
  'vector-tileset': 'tileset',
  tilemap: 'tilemap',
}
/** No Molda o kind guardado já é a família. */
export const MOLDA_KIND_FAMILY: Record<MoldaAssetKind, ArtFamily> = {
  model: 'model',
  texture: 'texture',
  sky: 'sky',
}

export interface JourneyCreation {
  id: string
  name: string
  kind: ArtFamily
  tool: 'pinta' | 'molda'
}

/**
 * O inventário que o planejador pode citar: só criações vivas, com tipo conhecido e traduzido.
 * A biblioteca "Minhas paletas" (`sz-pinta-palettes`, kind `palette-library`) viaja no MESMO
 * canal do Pinta e não é desenho; a identidade parcial dela também fica de fora.
 */
export function journeyInventory(
  tool: 'pinta' | 'molda',
  items: readonly CreationIndexView[],
): JourneyCreation[] {
  return items.flatMap((item) => {
    if (!('name' in item) || item.deletedAt) return []
    if (
      classifyPintaPaletteLibraryCreation({ tool, itemId: item.itemId, kind: item.kind }) !==
      'regular'
    )
      return []
    const table: Record<string, ArtFamily> =
      tool === 'pinta' ? PINTA_KIND_FAMILY : MOLDA_KIND_FAMILY
    const kind = Object.hasOwn(table, item.kind) ? table[item.kind] : undefined
    return kind ? [{ id: item.itemId, name: item.name, kind, tool }] : []
  })
}

/**
 * Recursos, conhecimento e inventário autorizados do perfil. É DADO, não prompt: quem escolhe o
 * que vai ao modelo, e dentro de qual teto, é o `prompt-context.ts`.
 */
export async function loadJourneyContext(members: MembersClient, user: SessionUser, query: string) {
  query = redactPensaText(query).text
  const gam = await members.getGamificationReadonly()
  if (gam.status !== 200 || !gam.body)
    throw new JourneyChildError('Não consegui conferir seus recursos. Tente de novo.')
  const rank = gam.body.level?.slug
  if (!rank) throw new JourneyChildError('Não consegui conferir seu posto. Tente de novo.')
  const access = await getPensaCapabilities(members, rank, user.role)
  if (!access) throw new JourneyChildError('Não consegui conferir suas ferramentas. Tente de novo.')
  const dimensions: ('2d' | '3d')[] = ['2d']
  if (access.tier.allowedExtensions.includes('game-3d')) dimensions.push('3d')
  const catalogs = dimensions.map((dimension) => ({
    dimension,
    ...availablePlannerCatalog(access.tier, dimension),
  }))
  const blocks = [...new Map(catalogs.flatMap((c) => c.blocks).map((b) => [b.type, b])).values()]
  const documents = [
    ...new Map(catalogs.flatMap((c) => c.documents).map((d) => [d.extension, d])).values(),
  ]
  const moldaTools = access.moldaAvailable
    ? MOLDA_TOOL_FAMILIES.filter(
        (tool) =>
          isPrivilegedRole(user.role) ||
          journeyLevelAtLeast(rank, MOLDA_TOOL_BAND_LEVELS[tool.band]),
      ).map((t) => t.id)
    : []
  const data = {
    // ⚠️ O snapshot guarda o perfil (o members confere o dono), mas ele NUNCA vai ao modelo:
    // quem monta o pedido é o `prompt-context.ts`, que só copia os campos de recurso.
    profileId: user.id,
    rank,
    studio: access.studioAvailable,
    pinta: access.pintaAvailable,
    molda: access.moldaAvailable,
    dimensions,
    blockIds: blocks.map((b) => b.type).sort(),
    extensionIds: [...access.tier.allowedExtensions].sort(),
    moldaTools,
    tutor: isStudioZappyAllowed(user, rank),
  }
  const capabilities: PensaCapabilitySnapshot = {
    ...data,
    fingerprint: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
  }
  // Busca oficial com o mesmo cliente e as mesmas regras de acesso do tutor do Estúdio. Falhar
  // aqui não impede o plano (os manuais seguem), mas fica no log.
  const knowledge = await members
    .zappyKnowledgeSearch(query.slice(0, 1000), 5)
    .catch((cause: unknown) => {
      console.error('[pensa-v2] busca de conhecimento falhou', {
        name: cause instanceof Error ? cause.name : typeof cause,
      })
      return null
    })
  const inventoryRead = (tool: 'pinta' | 'molda') =>
    members.listCreationsReadonly(tool).catch((cause: unknown) => {
      console.error('[pensa-v2] inventário indisponível', {
        tool,
        name: cause instanceof Error ? cause.name : typeof cause,
      })
      return null
    })
  const inventories = await Promise.all([
    access.pintaAvailable ? inventoryRead('pinta') : null,
    access.moldaAvailable ? inventoryRead('molda') : null,
  ])
  const existingCreations = (['pinta', 'molda'] as const).flatMap((tool, index) => {
    const response = inventories[index]
    return response?.status === 200 ? journeyInventory(tool, response.body?.items ?? []) : []
  })
  const references: PensaKnowledgeReference[] = documents.map((d) => ({
    kind: 'manual',
    id: d.extension,
    title: d.title,
    href: null,
  }))
  const sources: { id: string; text: string }[] = []
  const courseSlugs = [
    ...new Set(
      (knowledge?.body?.hits ?? []).flatMap((hit) =>
        hit.kind === 'help-tutorial' ? [] : [hit.courseSlug],
      ),
    ),
  ].slice(0, 5)
  const outlines = await Promise.all(
    courseSlugs.map(async (slug) => ({
      slug,
      response: await members.getMyCourseReadonly(slug).catch((cause: unknown) => {
        console.error('[pensa-v2] progresso indisponível', {
          name: cause instanceof Error ? cause.name : typeof cause,
        })
        return null
      }),
    })),
  )
  const learningProgress = (knowledge?.body?.hits ?? []).flatMap((hit) => {
    if (hit.kind === 'help-tutorial') return []
    const outline = outlines.find((entry) => entry.slug === hit.courseSlug)?.response
    const lesson = outline?.body?.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === hit.lessonId)
    return [
      {
        lessonId: hit.lessonId,
        canOpen: outline?.status === 200 && lesson ? !lesson.locked : null,
        completed: lesson?.completed ?? null,
        mastery: 'unknown' as const,
      },
    ]
  })
  for (const hit of knowledge?.body?.hits ?? []) {
    if (hit.kind === 'help-tutorial') {
      references.push({
        kind: 'help',
        id: hit.slug,
        title: hit.title,
        href: `/como-fazer/${encodeURIComponent(hit.slug)}`,
      })
      sources.push({ id: hit.slug, text: hit.content })
    } else {
      references.push({
        kind: 'lesson',
        id: hit.lessonId,
        title: hit.lessonTitle,
        href:
          learningProgress.find((item) => item.lessonId === hit.lessonId)?.canOpen === true
            ? `/cursos/${encodeURIComponent(hit.courseSlug)}/aulas/${encodeURIComponent(hit.lessonId)}`
            : null,
      })
      sources.push({ id: hit.lessonId, text: hit.content })
    }
  }
  return {
    capabilities,
    blocks,
    documents,
    references,
    existingCreationIds: existingCreations.map((item) => item.id),
    existingCreations,
    sources,
    knowledgeAvailable: knowledge?.status === 200,
    // Uma fonte recuperada não prova que a criança fez, pode abrir ou domina a fase.
    learningProgress,
    moldaToolFamilies: MOLDA_TOOL_FAMILIES.filter((t) => moldaTools.includes(t.id)),
  }
}
export type JourneyContext = Awaited<ReturnType<typeof loadJourneyContext>>
