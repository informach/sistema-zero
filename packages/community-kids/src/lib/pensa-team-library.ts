import type {
  PensaJourneyTeamView,
  PensaJourneyView,
  PensaTeamArtItem,
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

/**
 * O "Trazer da equipe" do Estúdio de quem PROGRAMA um plano do Pensa em equipe (14/10/2026).
 *
 * Fala só com o BFF (`/api/pensa/v2/projects/:planId/…`, sempre por `sessionFetch`):
 * - `team-art` lista as artes ENTREGUES por outra pessoa nas missões do plano;
 * - `team` dá os nomes (best-effort: sem ele, "Colega");
 * - `team-art/:taskId/download` dá a URL assinada do arquivo da colega (gzip de UM documento).
 *
 * Trazer = baixar → descomprimir → converter (`pensa-team-art.ts`) → gravar na biblioteca
 * pessoal (`savePersonalAsset`, com a ORIGEM certa: Pinta ou Molda) → devolver ao Estúdio o
 * MESMO resultado do "Trazer do Pinta"/"Trazer do Molda". A cópia tem identidade por missão:
 * duas contas podem ter desenhos com o MESMO id (por exemplo, após importar um arquivo).
 * Trazer de novo atualiza só essa cópia, preservando as artes pessoais e de outras missões.
 * Toda falha volta como frase de criança, nunca a mensagem crua.
 */

const BASE = '/api/pensa/v2/projects'
const FALLBACK_NAME = 'Colega'

const teamCopyId = (taskId: string) => `equipe-${taskId}`

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
export function teamArtKind(item: Pick<PensaTeamArtItem, 'tool' | 'assetKind'>): StudioTeamArtKind {
  if (item.tool === 'pinta') return 'drawing'
  return item.assetKind === 'texture' || item.assetKind === 'sky' ? item.assetKind : 'model'
}

/** Os itens do servidor no idioma da janela do Estúdio. */
export function teamArtSummaries(
  items: readonly PensaTeamArtItem[],
  team: Pick<PensaJourneyTeamView, 'people'> | null,
): StudioTeamArtSummary[] {
  const names = new Map((team?.people ?? []).map((person) => [person.profileId, person.firstName]))
  return items.map((item) => ({
    id: item.taskId,
    assetId: teamCopyId(item.taskId),
    name: item.assetName?.trim() || item.title,
    kind: teamArtKind(item),
    byName: names.get(item.byProfileId)?.trim() || FALLBACK_NAME,
    missionTitle: item.title,
    thumbDataUrl: null,
  }))
}

async function getJson<T>(doFetch: FetchLike, path: string): Promise<T> {
  const response = await doFetch(path)
  if (!response.ok) {
    const failure = new Error(`GET ${path} → ${response.status}`) as Error & { status?: number }
    failure.status = response.status
    throw failure
  }
  return (await response.json()) as T
}

/**
 * O plano TEM o botão? Só para quem PROGRAMA um plano v2 COM equipe (alguém entrou) e com ao
 * menos uma arte entregue por outra pessoa. Qualquer falha = não (o botão só some; o jogo
 * abre do mesmo jeito).
 */
export async function pensaTeamArtAvailable(
  planId: string,
  doFetch: FetchLike = sessionFetch,
): Promise<boolean> {
  try {
    const view = await getJson<PensaJourneyView>(doFetch, `${BASE}/${encodeURIComponent(planId)}`)
    const team = view.team
    if (!team || team.memberCount <= 0) return false
    if (team.roles.code !== team.viewerProfileId) return false
    const art = await getJson<{ items?: PensaTeamArtItem[] }>(
      doFetch,
      `${BASE}/${encodeURIComponent(planId)}/team-art`,
    )
    return Array.isArray(art.items) && art.items.length > 0
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
    const art = await getJson<{ items?: PensaTeamArtItem[] }>(doFetch, `${plan}/team-art`)
    const items = Array.isArray(art.items) ? art.items : []
    known.clear()
    for (const item of items) known.set(item.taskId, item)
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
    taskId: string,
  ): Promise<{ json: string; revision: number } | 'gone' | 'network' | 'unreadable'> {
    let ticket: DownloadTicket
    try {
      const response = await doFetch(`${plan}/team-art/${encodeURIComponent(taskId)}/download`)
      if (response.status === 404) return 'gone'
      if (!response.ok) return 'network'
      ticket = (await response.json()) as DownloadTicket
    } catch {
      return 'network'
    }
    if (!ticket || typeof ticket.downloadUrl !== 'string') return 'network'
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
      return { json: await gunzip(bytes), revision: Number(ticket.revision) || 0 }
    } catch {
      return 'unreadable'
    }
  }

  return {
    async list() {
      const [items, team] = await Promise.all([
        fetchItems(),
        getJson<PensaJourneyTeamView>(doFetch, `${plan}/team`).catch(() => null),
      ])
      return teamArtSummaries(items, team)
    },

    async import(taskId, options): Promise<StudioTeamImportResult> {
      let item = known.get(taskId)
      if (!item) {
        try {
          item = (await fetchItems()).find((candidate) => candidate.taskId === taskId)
        } catch {
          return refusal('pinta', TEAM_ART_MESSAGES.network)
        }
      }
      if (!item) return refusal('pinta', TEAM_ART_MESSAGES.gone, 'not-found')
      const tool = item.tool
      if (!supported()) return refusal(tool, TEAM_ART_MESSAGES.unsupported)

      const downloaded = await downloadJson(taskId)
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
