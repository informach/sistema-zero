import 'server-only'
import { createHash } from 'node:crypto'
import { classifyPintaPaletteLibraryCreation } from '@sistemazero/core/creations'
import { KIDS_MOLDA_BAND_CAPABILITIES } from '@sistemazero/core/journey'
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
import {
  hasKidsCapability,
  isKidsStaffPreview,
  type KidsJourneyAccess,
  kidsJourneyAccess,
} from '../../lib/kids-journey-access'
import { isPrivilegedRole } from '../../lib/studio-tier'
import type { CreationIndexView, SessionUser } from '../../lib/types'
import type { MembersClient } from '../clients'
import type { r2ReadCreationJson } from '../r2'
import { adultStudioTier, kidsStudioTier } from '../studio-unlocks'
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
  inputUser: SessionUser,
  inputActor: PensaActor,
  projectId: string,
  query: string,
  readGame?: typeof r2ReadCreationJson,
) {
  const actor = { ...inputActor }
  const user = {
    id: inputUser.id,
    role: inputUser.role,
    status: inputUser.status,
    hasProfile: Boolean(inputUser.activeProfile),
    profileAccountId: inputUser.activeProfile?.accountId,
    impersonating: Boolean(inputUser.act),
    kidsKind: inputUser.kids?.kind,
  }
  // Team preview, same rule as Members' `resolveKidsStaffPreviewActor`: an active privileged
  // role, never in a support session, either on the account itself or in a profile of its OWN
  // account (the Kids app makes staff pick a profile before Pensa). The role in a profile
  // session is the account's (Auth signs it from `pfl.accountId` after checking ownership).
  const staffSessionBase =
    actor.audience !== 'adult' &&
    actor.privileged &&
    actor.profileId === user.id &&
    user.status === 'active' &&
    !user.impersonating &&
    isPrivilegedRole(user.role)
  const ownAccountPreview =
    staffSessionBase &&
    actor.profileId === actor.accountId &&
    !user.hasProfile &&
    user.kidsKind !== 'student'
  const ownProfilePreview =
    staffSessionBase &&
    user.hasProfile &&
    user.profileAccountId === actor.accountId &&
    user.kidsKind !== 'parent'
  const response = await members
    .pensaTeamCapabilities(
      actor,
      projectId,
      ownProfilePreview ? { staffSession: 'own-account' } : undefined,
    )
    .catch(() => {
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
  const adult = actor.audience === 'adult'
  if (adult && view.project.audience !== 'adult')
    throw new PensaUnavailable('A plataforma está sendo atualizada. Tente novamente.')
  const participantJourney = (profileId: string) =>
    facts.code.profileId === profileId
      ? facts.code.journey
      : facts.art.find((p) => p.profileId === profileId)?.journey
  const inspection = facts.gameTicket
    ? await inspectPensaGame(
        facts.gameTicket,
        `pensa-${view.project.id.replaceAll('-', '')}`,
        readGame,
      )
    : null
  const authoring = inspection?.authoring ?? view.studioAuthoring
  const isPrivileged = (profileId: string) => profileId === user.id && isPrivilegedRole(user.role)
  const ownTeamPreview = ownAccountPreview || ownProfilePreview
  const kidsByProfile = new Map<string, KidsJourneyAccess>()
  if (!adult) {
    for (const person of [facts.code, ...facts.art]) {
      if (kidsByProfile.has(person.profileId)) continue
      const journey = kidsJourneyAccess(person)
      if (
        !journey ||
        (isKidsStaffPreview(journey)
          ? !ownTeamPreview || person.profileId !== actor.profileId || person.level !== null
          : person.level !== journey.earned.level)
      )
        throw new PensaUnavailable(
          'Não consegui conferir a jornada de uma pessoa da equipe. Tente de novo.',
        )
      kidsByProfile.set(person.profileId, journey)
    }
  }
  const participantKids = (profileId: string) => {
    const journey = kidsByProfile.get(profileId)
    if (!journey) throw new PensaUnavailable('A jornada deste participante está indisponível.')
    return journey
  }
  const available = (
    tool: 'pinta' | 'molda' | 'estudio-completo',
    owned: boolean,
    profileId: string,
  ) => {
    const capability = tool === 'estudio-completo' ? 'studio' : tool
    if (adult)
      return Boolean(owned && participantJourney(profileId)?.capabilities.includes(capability))
    const journey = participantKids(profileId)
    return (owned || isKidsStaffPreview(journey)) && hasKidsCapability(journey, capability)
  }
  if (adult && (!facts.code.level || !facts.code.journey))
    throw new PensaUnavailable('A jornada adulta está indisponível.')
  const tier =
    adult && facts.code.journey
      ? adultStudioTier(
          facts.code.journey,
          isPrivileged(facts.code.profileId) ? user.role : undefined,
          facts.code.blocks,
        )
      : kidsStudioTier(participantKids(facts.code.profileId), facts.code.blocks)
  const catalog = pensaCatalog(tier, '3d')
  const moldaTools = (profileId: string) => {
    return MOLDA_TOOL_FAMILIES.filter((tool) =>
      adult
        ? participantJourney(profileId)?.capabilities.includes('molda')
        : hasKidsCapability(participantKids(profileId), KIDS_MOLDA_BAND_CAPABILITIES[tool.band]),
    ).map((tool) => tool.id)
  }
  const code: PensaParticipantCapabilities = {
    profileId: facts.code.profileId,
    rank: facts.code.level,
    studio:
      available('estudio-completo', facts.code.access.studio, facts.code.profileId) &&
      (authoring === 'code' ? tier.pro : tier.hasPalette),
    studioAuthoring: authoring,
    pinta: available('pinta', facts.code.access.pinta, facts.code.profileId),
    molda: available('molda', facts.code.access.molda, facts.code.profileId),
    dimensions:
      authoring === 'code' ||
      tier.allowedExtensions.includes('game-3d') ||
      tier.allowedExtensions.includes('game-3d-advanced') ||
      tier.allowedExtensions.includes('world-3d')
        ? ['2d', '3d']
        : ['2d'],
    blockIds: catalog.blocks.map((block) => block.type).sort(),
    extensionIds: [...tier.allowedExtensions].sort(),
    moldaTools: moldaTools(facts.code.profileId),
    tutor: adult
      ? facts.code.journey?.capabilities.includes('ai') === true
      : hasKidsCapability(participantKids(facts.code.profileId), 'ai'),
  }
  const participants = new Map<string, PensaParticipantCapabilities>([[code.profileId, code]])
  for (const artist of facts.art) {
    if (artist.profileId === code.profileId) continue
    if (adult && !artist.level)
      throw new PensaUnavailable(
        'Não consegui conferir os recursos de uma pessoa das artes. Tente de novo.',
      )
    participants.set(artist.profileId, {
      profileId: artist.profileId,
      rank: artist.level,
      studio: false,
      studioAuthoring: authoring,
      pinta: available('pinta', artist.access.pinta, artist.profileId),
      molda: available('molda', artist.access.molda, artist.profileId),
      dimensions: [],
      blockIds: [],
      extensionIds: [],
      moldaTools: moldaTools(artist.profileId),
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
