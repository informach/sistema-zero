import 'server-only'
import { createHash } from 'node:crypto'
import { classifyPintaPaletteLibraryCreation } from '@sistemazero/core/creations'
import {
  type CreativeToolId,
  creativeToolAvailability,
  journeyLevelAtLeast,
  MOLDA_TOOL_BAND_LEVELS,
} from '@sistemazero/core/journey'
import type {
  PensaAssetNeed,
  PensaCapabilitySnapshot,
  PensaJourneyView,
  PensaKnowledgeReference,
} from '@sistemazero/core/pensa'
import type { MoldaAssetKind } from '@sistemazero/molda/assets'
import { MOLDA_TOOL_FAMILIES } from '@sistemazero/molda/tools'
import type { PintaAssetKind } from '@sistemazero/pinta/assets'
import { isPrivilegedRole, type StudioTier } from '../../lib/studio-tier'
import type { CreationIndexView, PensaTeamCapabilitiesView, SessionUser } from '../../lib/types'
import type { MembersClient } from '../clients'
import { availablePlannerCatalog } from '../pensa-agents/planner-contract'
import { getPensaCapabilities } from '../pensa-capabilities'
import { earnedStudioTier } from '../studio-unlocks'
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

/** O nome do erro, nunca a mensagem (pode carregar o que não deve sair daqui). */
const errorName = (cause: unknown) => (cause instanceof Error ? cause.name : typeof cause)

/** O que o snapshot diz dos recursos: os de quem pede (plano solo) ou os da equipe. */
interface JourneyResources {
  rank: string
  tier: StudioTier
  studio: boolean
  pinta: boolean
  molda: boolean
  moldaTools: string[]
  tutor: boolean
  /** O inventário que o plano pode citar (lido depois da busca de conhecimento). */
  inventory: () => Promise<JourneyCreation[]>
}

const TEAM_UNAVAILABLE = 'Não consegui conferir os recursos da equipe. Tente de novo.'
/** Outra pessoa da equipe: o papel de equipe dela (o passe livre do `role`) não viaja. */
const OTHER_PERSON = { role: '' }

/** As ferramentas do Molda que o posto alcança (a equipe ignora a faixa). */
function moldaToolsFor(level: string | null, privileged: boolean): string[] {
  return MOLDA_TOOL_FAMILIES.filter(
    (tool) => privileged || journeyLevelAtLeast(level, MOLDA_TOOL_BAND_LEVELS[tool.band]),
  ).map((tool) => tool.id)
}

/** Plano solo: o posto, a paleta, a posse e o inventário de quem pede. */
async function ownResources(members: MembersClient, user: SessionUser): Promise<JourneyResources> {
  const gam = await members.getGamificationReadonly()
  if (gam.status !== 200 || !gam.body)
    throw new JourneyChildError('Não consegui conferir seus recursos. Tente de novo.')
  const rank = gam.body.level?.slug
  if (!rank) throw new JourneyChildError('Não consegui conferir seu posto. Tente de novo.')
  const access = await getPensaCapabilities(members, rank, user.role)
  if (!access) throw new JourneyChildError('Não consegui conferir suas ferramentas. Tente de novo.')
  const inventoryRead = (tool: 'pinta' | 'molda') =>
    members.listCreationsReadonly(tool).catch((cause: unknown) => {
      console.error('[pensa-v2] inventário indisponível', { tool, name: errorName(cause) })
      return null
    })
  return {
    rank,
    tier: access.tier,
    studio: access.studioAvailable,
    pinta: access.pintaAvailable,
    molda: access.moldaAvailable,
    moldaTools: access.moldaAvailable ? moldaToolsFor(rank, isPrivilegedRole(user.role)) : [],
    tutor: isStudioZappyAllowed(user, rank),
    inventory: async () => {
      const inventories = await Promise.all([
        access.pintaAvailable ? inventoryRead('pinta') : null,
        access.moldaAvailable ? inventoryRead('molda') : null,
      ])
      return (['pinta', 'molda'] as const).flatMap((tool, index) => {
        const response = inventories[index]
        return response?.status === 200 ? journeyInventory(tool, response.body?.items ?? []) : []
      })
    },
  }
}

/**
 * Plano EM EQUIPE (14/10/2026). O jogo mora no Estúdio de quem PROGRAMA: posto, paleta,
 * extensões, dimensões, Estúdio e tutor são dela (`earnedStudioTier` com os blocos DELA). Pinta e
 * Molda valem quando ALGUÉM das artes os tem (posse da conta + posto de cada uma), e as ferramentas
 * do Molda são a união das faixas dos postos dessas artistas. O inventário é o de quem programa (é
 * no Estúdio dela que a arte guardada entra), com a mesma régua de posse do plano solo. ⚠️ O
 * papel de equipe (o passe livre do `role`) só vale para a PRÓPRIA sessão.
 */
function teamResources(team: PensaTeamCapabilitiesView, user: SessionUser): JourneyResources {
  const { code, art } = team
  // Sem o posto de quem programa não há paleta para conferir: é falha de leitura, não "sem Estúdio".
  if (!code.level) throw new JourneyChildError(TEAM_UNAVAILABLE)
  const level = code.level
  const isSession = (profileId: string) => profileId === user.id
  const privileged = (profileId: string) => isSession(profileId) && isPrivilegedRole(user.role)
  const available = (
    tool: CreativeToolId,
    owned: boolean,
    personLevel: string | null,
    profileId: string,
  ) =>
    creativeToolAvailability({
      tool,
      owned,
      level: personLevel,
      privileged: privileged(profileId),
    }) === 'available'
  const tier = earnedStudioTier(
    level,
    isSession(code.profileId) ? user.role : undefined,
    code.blocks,
  )
  const moldaArtists = art.filter((person) =>
    available('molda', person.access.molda, person.level, person.profileId),
  )
  const codeOwns = (tool: 'pinta' | 'molda') =>
    available(tool, code.access[tool], level, code.profileId)
  const existing = [
    ...(codeOwns('pinta') ? journeyInventory('pinta', code.creations.pinta) : []),
    ...(codeOwns('molda') ? journeyInventory('molda', code.creations.molda) : []),
  ]
  return {
    rank: level,
    tier,
    studio:
      available('estudio-completo', code.access.studio, level, code.profileId) && tier.hasPalette,
    pinta: art.some((person) =>
      available('pinta', person.access.pinta, person.level, person.profileId),
    ),
    molda: moldaArtists.length > 0,
    moldaTools: [
      ...new Set(
        moldaArtists.flatMap((person) => moldaToolsFor(person.level, privileged(person.profileId))),
      ),
    ],
    tutor: isStudioZappyAllowed(isSession(code.profileId) ? user : OTHER_PERSON, level),
    inventory: async () => existing,
  }
}

/** A equipe do plano, ou `null` quando ele é solo (ninguém entrou, ou servidor anterior à equipe). */
async function teamFor(
  members: MembersClient,
  user: SessionUser,
  projectId: string,
  view: Pick<PensaJourneyView, 'team'> | undefined,
): Promise<JourneyResources | null> {
  const unavailable = (cause?: unknown) => {
    if (cause !== undefined)
      console.error('[pensa-v2] recursos da equipe indisponíveis', {
        projectId,
        name: errorName(cause),
      })
    return new JourneyChildError(TEAM_UNAVAILABLE)
  }
  let team = view?.team
  if (!view) {
    const read = await members.pensaJourneyGet(projectId).catch((cause: unknown) => {
      throw unavailable(cause)
    })
    if (read.status !== 200 || !read.body) throw unavailable()
    team = read.body.team
  }
  if (!team || team.memberCount <= 0) return null
  const caps = await members.pensaJourneyTeamCapabilities(projectId).catch((cause: unknown) => {
    throw unavailable(cause)
  })
  if (caps.status !== 200 || !caps.body) throw unavailable()
  return teamResources(caps.body, user)
}

export interface JourneyContextOptions {
  /** O plano do v2. Com ele, um plano EM EQUIPE monta os recursos da equipe (`team-capabilities`). */
  projectId?: string
  /** A view que quem chama ACABOU de ler (poupa uma ida ao members). Sem ela, o contexto relê. */
  view?: Pick<PensaJourneyView, 'team'>
}

/**
 * Recursos, conhecimento e inventário autorizados do perfil (ou da equipe, num plano em equipe).
 * É DADO, não prompt: quem escolhe o que vai ao modelo, e dentro de qual teto, é o
 * `prompt-context.ts`.
 */
export async function loadJourneyContext(
  members: MembersClient,
  user: SessionUser,
  query: string,
  options: JourneyContextOptions = {},
) {
  query = redactPensaText(query).text
  const team = options.projectId
    ? await teamFor(members, user, options.projectId, options.view)
    : null
  const resources = team ?? (await ownResources(members, user))
  const dimensions: ('2d' | '3d')[] = ['2d']
  if (resources.tier.allowedExtensions.includes('game-3d')) dimensions.push('3d')
  const catalogs = dimensions.map((dimension) => ({
    dimension,
    ...availablePlannerCatalog(resources.tier, dimension),
  }))
  const blocks = [...new Map(catalogs.flatMap((c) => c.blocks).map((b) => [b.type, b])).values()]
  const documents = [
    ...new Map(catalogs.flatMap((c) => c.documents).map((d) => [d.extension, d])).values(),
  ]
  const moldaTools = resources.moldaTools
  const data = {
    // ⚠️ O snapshot guarda o perfil DA SESSÃO, também em equipe (o members confere com o ator),
    // mas ele NUNCA vai ao modelo: quem monta o pedido é o `prompt-context.ts`, que só copia os
    // campos de recurso.
    profileId: user.id,
    rank: resources.rank,
    studio: resources.studio,
    pinta: resources.pinta,
    molda: resources.molda,
    dimensions,
    blockIds: blocks.map((b) => b.type).sort(),
    extensionIds: [...resources.tier.allowedExtensions].sort(),
    moldaTools,
    tutor: resources.tutor,
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
      console.error('[pensa-v2] busca de conhecimento falhou', { name: errorName(cause) })
      return null
    })
  const existingCreations = await resources.inventory()
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
        console.error('[pensa-v2] progresso indisponível', { name: errorName(cause) })
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
    /** Plano em equipe: os recursos são os da equipe (a frase de "sem Estúdio" fala de quem programa). */
    team: team !== null,
  }
}
export type JourneyContext = Awaited<ReturnType<typeof loadJourneyContext>>
