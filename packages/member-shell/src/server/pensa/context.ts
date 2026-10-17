import 'server-only'
import { createHash } from 'node:crypto'
import { classifyPintaPaletteLibraryCreation } from '@sistemazero/core/creations'
import {
  creativeToolAvailability,
  journeyLevelAtLeast,
  MOLDA_TOOL_BAND_LEVELS,
} from '@sistemazero/core/journey'
import {
  type PensaActor,
  type PensaAssetSlot,
  type PensaCapabilities,
  PensaCapabilitiesSchema,
  type PensaCreationRef,
  type PensaKnowledgeReference,
  type PensaParticipantCapabilities,
  PensaProjectViewSchema,
  pensaRuntimeDimension,
} from '@sistemazero/core/pensa'
import type { MoldaAssetKind } from '@sistemazero/molda/assets'
import { MOLDA_TOOL_FAMILIES } from '@sistemazero/molda/tools'
import type { PintaAssetKind } from '@sistemazero/pinta/assets'
import { isPrivilegedRole } from '../../lib/studio-tier'
import type { CreationIndexView, SessionUser } from '../../lib/types'
import type { MembersClient } from '../clients'
import type { r2ReadCreationJson } from '../r2'
import { earnedStudioTier } from '../studio-unlocks'
import { isStudioZappyAllowed } from '../zappy-access'
import { PENSA_CATALOG_VERSION, pensaCatalog } from './catalog'
import { PensaUnavailable } from './errors'
import { inspectPensaGame } from './inspection'
import { redactPensaText } from './privacy'

type AssetKind = PensaAssetSlot['kind']
export const PINTA_KIND_FAMILY: Record<PintaAssetKind, AssetKind> = {
  'pixel-sprite': 'sprite',
  'vector-sprite': 'sprite',
  'pixel-background': 'background',
  'vector-background': 'background',
  tileset: 'tileset',
  'vector-tileset': 'tileset',
  tilemap: 'tilemap',
}
export const MOLDA_KIND_FAMILY: Record<MoldaAssetKind, AssetKind> = {
  model: 'model',
  texture: 'texture',
  sky: 'sky',
}
export interface PensaInventoryItem {
  name: string
  kind: AssetKind
  creation: PensaCreationRef
}

export function pensaInventory(
  tool: 'pinta' | 'molda',
  profileId: string,
  items: readonly CreationIndexView[],
): PensaInventoryItem[] {
  const kinds: Record<string, AssetKind> = tool === 'pinta' ? PINTA_KIND_FAMILY : MOLDA_KIND_FAMILY
  return items.flatMap((item) => {
    if (
      !('name' in item) ||
      item.deletedAt ||
      classifyPintaPaletteLibraryCreation({ tool, itemId: item.itemId, kind: item.kind }) !==
        'regular'
    )
      return []
    const kind = Object.hasOwn(kinds, item.kind) ? kinds[item.kind] : undefined
    return kind
      ? [
          {
            name: redactPensaText(item.name).text,
            kind,
            creation: {
              tool,
              profileId,
              creationId: item.itemId,
              saveRevision: String(item.revision),
              contentFingerprint: item.contentFingerprint ?? null,
            },
          },
        ]
      : []
  })
}

export type PensaContextMembers = Pick<
  MembersClient,
  'pensaTeamCapabilities' | 'pensaProjectView' | 'zappyKnowledgeSearch' | 'getMyCourseReadonly'
>

export async function loadPensaContext(
  members: PensaContextMembers,
  user: SessionUser,
  actor: PensaActor,
  projectId: string,
  query: string,
  readGame?: typeof r2ReadCreationJson,
) {
  const response = await members.pensaTeamCapabilities(actor, projectId).catch(() => {
    throw new PensaUnavailable(
      'Não consegui conferir os recursos do projeto. Sua ideia está guardada. Tente de novo.',
    )
  })
  if (response.status !== 200 || !response.body)
    throw new PensaUnavailable(
      'Não consegui conferir os recursos do projeto. Sua ideia está guardada. Tente de novo.',
    )
  const facts = response.body
  const view = facts.base
  const inspection = facts.gameTicket
    ? await inspectPensaGame(
        facts.gameTicket,
        `pensa-${view.project.id.replaceAll('-', '')}`,
        readGame,
      )
    : null
  const authoring = inspection?.authoring ?? view.studioAuthoring
  const isPrivileged = (profileId: string) => profileId === user.id && isPrivilegedRole(user.role)
  const available = (
    tool: 'pinta' | 'molda' | 'estudio-completo',
    owned: boolean,
    rank: string,
    profileId: string,
  ) =>
    creativeToolAvailability({ tool, owned, level: rank, privileged: isPrivileged(profileId) }) ===
    'available'
  if (!facts.code.level)
    throw new PensaUnavailable('Não consegui conferir os recursos de quem programa. Tente de novo.')
  const tier = earnedStudioTier(
    facts.code.level,
    isPrivileged(facts.code.profileId) ? user.role : undefined,
    facts.code.blocks,
  )
  const catalog = pensaCatalog(tier, '3d')
  const moldaTools = (rank: string, profileId: string) =>
    MOLDA_TOOL_FAMILIES.filter(
      (tool) =>
        isPrivileged(profileId) || journeyLevelAtLeast(rank, MOLDA_TOOL_BAND_LEVELS[tool.band]),
    ).map((tool) => tool.id)
  const code: PensaParticipantCapabilities = {
    profileId: facts.code.profileId,
    rank: facts.code.level,
    studio:
      available(
        'estudio-completo',
        facts.code.access.studio,
        facts.code.level,
        facts.code.profileId,
      ) && (authoring === 'code' ? tier.pro : tier.hasPalette),
    studioAuthoring: authoring,
    pinta: available('pinta', facts.code.access.pinta, facts.code.level, facts.code.profileId),
    molda: available('molda', facts.code.access.molda, facts.code.level, facts.code.profileId),
    dimensions:
      authoring === 'code' ||
      tier.allowedExtensions.includes('game-3d') ||
      tier.allowedExtensions.includes('game-3d-advanced') ||
      tier.allowedExtensions.includes('world-3d')
        ? ['2d', '3d']
        : ['2d'],
    blockIds: catalog.blocks.map((block) => block.type).sort(),
    extensionIds: [...tier.allowedExtensions].sort(),
    moldaTools: moldaTools(facts.code.level, facts.code.profileId),
    tutor: isStudioZappyAllowed(
      facts.code.profileId === user.id ? user : { role: '' },
      facts.code.level,
    ),
  }
  const participants = new Map<string, PensaParticipantCapabilities>([[code.profileId, code]])
  for (const artist of facts.art) {
    if (artist.profileId === code.profileId) continue
    if (!artist.level)
      throw new PensaUnavailable(
        'Não consegui conferir os recursos de uma pessoa das artes. Tente de novo.',
      )
    participants.set(artist.profileId, {
      profileId: artist.profileId,
      rank: artist.level,
      studio: false,
      studioAuthoring: authoring,
      pinta: available('pinta', artist.access.pinta, artist.level, artist.profileId),
      molda: available('molda', artist.access.molda, artist.level, artist.profileId),
      dimensions: [],
      blockIds: [],
      extensionIds: [],
      moldaTools: moldaTools(artist.level, artist.profileId),
      tutor: false,
    })
  }
  const resourceFacts = {
    catalogVersion: PENSA_CATALOG_VERSION,
    programmerProfileId: code.profileId,
    participants: [...participants.values()].sort((a, b) => a.profileId.localeCompare(b.profileId)),
    observedGame: inspection
      ? {
          authoring: inspection.authoring,
          runtimeExtensionId: inspection.runtimeExtensionId,
          installedExtensionIds: [...inspection.installedExtensionIds].sort(),
        }
      : null,
  }
  const capabilities: PensaCapabilities = PensaCapabilitiesSchema.parse({
    catalogVersion: resourceFacts.catalogVersion,
    programmerProfileId: code.profileId,
    participants: resourceFacts.participants,
    fingerprint: createHash('sha256').update(JSON.stringify(resourceFacts)).digest('hex'),
    observedGame: inspection
      ? {
          creation: {
            tool: 'studio',
            profileId: code.profileId,
            creationId: inspection.creationId,
            saveRevision: inspection.saveRevision,
            contentFingerprint: inspection.contentFingerprint,
          },
          authoring: inspection.authoring,
          dimension:
            pensaRuntimeDimension(inspection.runtimeExtensionId) ??
            view.revision?.definition.dimension ??
            view.draft?.definition?.dimension ??
            '2d',
          runtimeExtensionId: inspection.runtimeExtensionId,
          installedExtensionIds: inspection.installedExtensionIds,
        }
      : null,
  })
  const inventory = [
    ...(code.pinta ? pensaInventory('pinta', code.profileId, facts.code.creations.pinta) : []),
    ...(code.molda ? pensaInventory('molda', code.profileId, facts.code.creations.molda) : []),
  ]
  const references: PensaKnowledgeReference[] = catalog.documents.map((document) => ({
    kind: 'manual',
    id: document.extension,
    title: document.title,
    href: null,
  }))
  const sources: Array<{ id: string; text: string }> = []
  const knowledge = query.trim()
    ? await members
        .zappyKnowledgeSearch(redactPensaText(query).text.slice(0, 1000), 5)
        .catch(() => null)
    : null
  if (knowledge) {
    if (knowledge.status === 200 && knowledge.body) {
      for (const hit of knowledge.body.hits) {
        if (hit.kind === 'help-tutorial') {
          references.push({
            kind: 'help',
            id: hit.slug,
            title: hit.title,
            href: `/como-fazer/${encodeURIComponent(hit.slug)}`,
          })
          sources.push({ id: hit.slug, text: hit.content })
        } else {
          const course = await members.getMyCourseReadonly(hit.courseSlug).catch(() => null)
          const lesson =
            course?.status === 200
              ? course.body?.modules
                  .flatMap((module) => module.lessons)
                  .find((item) => item.id === hit.lessonId)
              : undefined
          references.push({
            kind: 'lesson',
            id: hit.lessonId,
            title: hit.lessonTitle,
            href:
              lesson && !lesson.locked
                ? `/cursos/${encodeURIComponent(hit.courseSlug)}/aulas/${encodeURIComponent(hit.lessonId)}`
                : null,
          })
          if (lesson && !lesson.locked) sources.push({ id: hit.lessonId, text: hit.content })
        }
      }
    } else console.info('[pensa] conhecimento indisponível', { status: knowledge.status })
  }
  const resolved = await members.pensaProjectView(actor, projectId, capabilities)
  if (resolved.status !== 200 || !resolved.body)
    throw new PensaUnavailable(
      'Não consegui atualizar o caminho deste projeto. Sua ideia está guardada.',
      'RESOURCES_UNAVAILABLE',
      resolved.status === 403 || resolved.status === 404 ? resolved.status : 503,
    )
  return {
    capabilities,
    blocks: catalog.blocks,
    documents: catalog.documents,
    references,
    sources,
    inventory,
    gameTicket: facts.gameTicket,
    view: PensaProjectViewSchema.parse(resolved.body),
  }
}
export type PensaContext = Awaited<ReturnType<typeof loadPensaContext>>
