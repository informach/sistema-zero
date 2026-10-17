import type { PensaTeamArtItem, PensaTeamView } from '@sistemazero/core/pensa'
import {
  PensaProjectViewSchema,
  PensaTeamArtListSchema,
  PensaTeamViewSchema,
} from '@sistemazero/core/pensa'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import type {
  StudioTeamArtKind,
  StudioTeamArtSummary,
  StudioTeamImportResult,
  StudioTeamLibraryAdapter,
} from '@sistemazero/studio'
import { gunzipToText, gzipSupported } from './creations-cloud'
import {
  convertTeamMoldaArt,
  convertTeamPintaArt,
  TEAM_ART_MESSAGES,
  type TeamMoldaConversion,
  type TeamPintaConversion,
} from './pensa-team-art'

/** Saved team deliveries are identified by mission and slot. Import keeps each
 * copy in the programmer's personal library and never modifies the artist's work. */

const BASE = '/api/pensa/projects'
const FALLBACK_NAME = 'Colega'

export const pensaTeamArtId = (item: PensaTeamArtItem) => `${item.missionId}:${item.slot.id}`
const teamCopyId = (itemId: string) => `equipe-${itemId.replace(':', '-')}`

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** O que a biblioteca pessoal do Estúdio responde (espelho do `SavePersonalAssetResult`). */
interface SaveResult {
  ok: boolean
  name?: string
  updatedAt?: number
  error?: string
}

type SavePersonalAsset = (
  asset: {
    id: string
    name: string
    dataUrl: string
    kind?: 'image' | 'model3d' | 'environment3d'
    origin: 'pinta' | 'molda'
    originalFileName?: string
    width?: number
    height?: number
    sprite?: unknown
    tileset?: unknown
    tilemap?: unknown
  },
  options: { namespace: string },
) => Promise<SaveResult>

export interface PensaTeamLibraryDeps {
  fetch?: FetchLike
  convertPinta?: (json: string) => Promise<TeamPintaConversion>
  convertMolda?: typeof convertTeamMoldaArt
  savePersonalAsset?: SavePersonalAsset
  gunzip?: (bytes: ArrayBuffer) => Promise<string>
  /** Sem `CompressionStream`/`DecompressionStream` o navegador não abre o arquivo. */
  supported?: () => boolean
}

interface DownloadTicket {
  downloadUrl: string
  revision: number
}

const defaultSave: SavePersonalAsset = async (asset, options) => {
  const bridge = await import('@sistemazero/studio/personal-assets')
  return bridge.savePersonalAsset(asset, options)
}

/** O tipo na janela: desenho do Pinta, ou o que o Molda guardou (sem saber, modelo). */
export function teamArtKind(item: PensaTeamArtItem): StudioTeamArtKind {
  if (item.creation.tool === 'pinta') return 'drawing'
  return item.slot.kind === 'texture' || item.slot.kind === 'sky' ? item.slot.kind : 'model'
}

/** Os itens do servidor no idioma da janela do Estúdio. */
export function teamArtSummaries(
  items: readonly PensaTeamArtItem[],
  team: Pick<PensaTeamView, 'people'> | null,
): StudioTeamArtSummary[] {
  const names = new Map((team?.people ?? []).map((person) => [person.profileId, person.firstName]))
  return items.map((item) => ({
    id: pensaTeamArtId(item),
    assetId: teamCopyId(pensaTeamArtId(item)),
    name: item.slot.name,
    kind: teamArtKind(item),
    byName: names.get(item.completedByProfileId)?.trim() || FALLBACK_NAME,
    missionTitle: item.slot.description,
    thumbDataUrl: null,
  }))
}

async function getJson(
  doFetch: FetchLike,
  path: string,
  viewerId: string | null,
): Promise<unknown> {
  const response = await doFetch(path, { headers: viewerId ? { 'x-sz-viewer': viewerId } : {} })
  if (!response.ok) {
    throw Object.assign(new Error(`GET ${path} → ${response.status}`), { status: response.status })
  }
  return response.json()
}

/** Show the team library only for a programmer with other people's deliveries. */
export async function pensaTeamArtAvailable(
  planId: string,
  viewerId: string | null,
  doFetch: FetchLike = sessionFetch,
): Promise<boolean> {
  if (!viewerId) return false
  try {
    const view = PensaProjectViewSchema.parse(
      await getJson(doFetch, `${BASE}/${encodeURIComponent(planId)}`, viewerId),
    )
    const team = view.team
    if (team.viewerProfileId !== viewerId || team.memberCount <= 0) return false
    if (team.programmerProfileId !== team.viewerProfileId) return false
    const art = PensaTeamArtListSchema.parse(
      await getJson(doFetch, `${BASE}/${encodeURIComponent(planId)}/team-art`, viewerId),
    )
    return art.items.some((item) => item.completedByProfileId !== team.viewerProfileId)
  } catch {
    return false
  }
}

export function createPensaTeamLibrary(input: {
  planId: string
  viewerId: string | null
  deps?: PensaTeamLibraryDeps
}): StudioTeamLibraryAdapter {
  const { planId, viewerId } = input
  const deps = input.deps ?? {}
  const doFetch = deps.fetch ?? sessionFetch
  const convertPinta = deps.convertPinta ?? convertTeamPintaArt
  const convertMolda = deps.convertMolda ?? convertTeamMoldaArt
  const save = deps.savePersonalAsset ?? defaultSave
  const gunzip = deps.gunzip ?? gunzipToText
  const supported = deps.supported ?? gzipSupported
  const plan = `${BASE}/${encodeURIComponent(planId)}`
  const namespace = viewerId ?? ''
  /** O último `list()`: o `import` precisa saber a ferramenta e a revisão de cada missão. */
  const known = new Map<string, PensaTeamArtItem>()

  async function fetchItems(): Promise<PensaTeamArtItem[]> {
    const art = PensaTeamArtListSchema.parse(await getJson(doFetch, `${plan}/team-art`, viewerId))
    const items = art.items
    known.clear()
    for (const item of items) known.set(pensaTeamArtId(item), item)
    return items
  }

  function refusal(
    tool: 'pinta' | 'molda',
    error: string,
    code?: 'not-found',
  ): StudioTeamImportResult {
    const result = { ok: false as const, error, ...(code ? { code } : {}) }
    return tool === 'pinta' ? { tool, result } : { tool, result }
  }

  /** O arquivo da colega, já descomprimido (o JSON de UM documento). */
  async function downloadJson(
    item: PensaTeamArtItem,
  ): Promise<{ json: string; revision: number } | 'gone' | 'network' | 'unreadable'> {
    let ticket: DownloadTicket
    try {
      const response = await doFetch(
        `${plan}/team-art/${encodeURIComponent(item.missionId)}/${encodeURIComponent(item.slot.id)}/download`,
        { headers: viewerId ? { 'x-sz-viewer': viewerId } : {} },
      )
      if (response.status === 404) return 'gone'
      if (!response.ok) return 'network'
      const body: unknown = await response.json()
      if (
        !body ||
        typeof body !== 'object' ||
        !('downloadUrl' in body) ||
        typeof body.downloadUrl !== 'string' ||
        !('revision' in body) ||
        typeof body.revision !== 'number' ||
        !Number.isSafeInteger(body.revision) ||
        body.revision <= 0
      )
        return 'network'
      ticket = { downloadUrl: body.downloadUrl, revision: body.revision }
    } catch {
      return 'network'
    }
    if (String(ticket.revision) !== item.creation.saveRevision) return 'gone'
    let bytes: ArrayBuffer
    try {
      const blob = await doFetch(ticket.downloadUrl)
      if (blob.status === 404) return 'gone'
      if (!blob.ok) return 'network'
      bytes = await blob.arrayBuffer()
    } catch {
      return 'network'
    }
    try {
      return { json: await gunzip(bytes), revision: ticket.revision }
    } catch {
      return 'unreadable'
    }
  }

  return {
    async list() {
      const [items, team] = await Promise.all([
        fetchItems(),
        getJson(doFetch, `${plan}/members`, viewerId)
          .then((value) => PensaTeamViewSchema.parse(value))
          .catch(() => null),
      ])
      return teamArtSummaries(items, team)
    },

    async import(taskId, options): Promise<StudioTeamImportResult> {
      let item = known.get(taskId)
      if (!item) {
        try {
          item = (await fetchItems()).find((candidate) => pensaTeamArtId(candidate) === taskId)
        } catch {
          return refusal('pinta', TEAM_ART_MESSAGES.network)
        }
      }
      if (!item) return refusal('pinta', TEAM_ART_MESSAGES.gone, 'not-found')
      const tool = item.creation.tool
      if (tool === 'studio') return refusal('pinta', TEAM_ART_MESSAGES.unreadable)
      if (!supported()) return refusal(tool, TEAM_ART_MESSAGES.unsupported)

      const downloaded = await downloadJson(item)
      if (downloaded === 'gone') {
        known.delete(taskId)
        return refusal(tool, TEAM_ART_MESSAGES.gone, 'not-found')
      }
      if (downloaded === 'network') return refusal(tool, TEAM_ART_MESSAGES.network)
      if (downloaded === 'unreadable') return refusal(tool, TEAM_ART_MESSAGES.unreadable)

      try {
        if (tool === 'pinta') {
          const converted = await convertPinta(downloaded.json)
          if (!converted.ok) {
            return {
              tool,
              result: {
                ok: false,
                error: converted.error,
                ...(converted.code ? { code: converted.code } : {}),
              },
            }
          }
          const saved = await save(
            // A ORIGEM vai junto: é o Pinta quem fez (o "Editar" e a sincronia leem daqui).
            { ...converted.asset, id: teamCopyId(taskId), origin: 'pinta' },
            { namespace },
          )
          if (!saved.ok) return refusal(tool, saved.error ?? TEAM_ART_MESSAGES.saveFailed)
          return {
            tool,
            result: {
              ok: true,
              asset: {
                ...converted.asset,
                id: teamCopyId(taskId),
                // O upsert pode sufixar o nome (colisão com OUTRO desenho): vale o salvo.
                name: saved.name ?? converted.asset.name,
                ...(saved.updatedAt !== undefined ? { libRevision: saved.updatedAt } : {}),
              },
            },
          }
        }

        const converted = await convertMolda(downloaded.json, {
          viewerId,
          taskId,
          revision: downloaded.revision,
          ...(options?.acceptedReview ? { acceptedReview: options.acceptedReview } : {}),
        })
        if (!converted.ok) return { tool, result: moldaRefusal(converted) }
        const asset = converted.asset
        const saved = await save(
          {
            id: teamCopyId(taskId),
            name: asset.name,
            kind: asset.kind,
            // A textura é imagem, mas NÃO é desenho do Pinta: sem a origem o painel abriria
            // o Pinta num id do Molda.
            origin: 'molda',
            dataUrl: asset.dataUrl,
            originalFileName: asset.originalFileName,
            ...(asset.width !== undefined ? { width: asset.width } : {}),
            ...(asset.height !== undefined ? { height: asset.height } : {}),
          },
          { namespace },
        )
        if (!saved.ok) return refusal(tool, saved.error ?? TEAM_ART_MESSAGES.saveFailed)
        return {
          tool,
          result: {
            ok: true,
            asset: {
              ...asset,
              id: teamCopyId(taskId),
              name: saved.name ?? asset.name,
              ...(saved.updatedAt !== undefined ? { libRevision: saved.updatedAt } : {}),
            },
          },
        }
      } catch {
        return refusal(
          tool,
          tool === 'pinta' ? TEAM_ART_MESSAGES.drawingFailed : TEAM_ART_MESSAGES.creationFailed,
        )
      }
    },
  }
}

function moldaRefusal(converted: Extract<TeamMoldaConversion, { ok: false }>) {
  return {
    ok: false as const,
    error: converted.error,
    ...(converted.code ? { code: converted.code } : {}),
    ...(converted.review ? { review: converted.review } : {}),
  }
}
