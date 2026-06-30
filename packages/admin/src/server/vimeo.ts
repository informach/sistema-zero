import 'server-only'
import { getEnv } from '@/lib/env'
import { parseWhitelistDomains } from '@/lib/vimeo-helpers'
import { MediaNotConfiguredError } from './r2'

const VIMEO_API_BASE = 'https://api.vimeo.com'
const VIMEO_ACCEPT = 'application/vnd.vimeo.*+json;version=3.4'
// Tetos das chamadas externas: API JSON é rápida; downloads/uploads de bytes
// (VTT, capa) ganham folga. Sem isso, Vimeo pendurado = handler pendurado.
const VIMEO_API_TIMEOUT_MS = 30_000
const VIMEO_BYTES_TIMEOUT_MS = 60_000

function requireAccessToken(): string {
  const token = getEnv().VIMEO_ACCESS_TOKEN
  if (!token) {
    throw new MediaNotConfiguredError('Upload de vídeo indisponível: configure VIMEO_ACCESS_TOKEN.')
  }
  return token
}

/** Domínios autorizados a embedar (privacy whitelist) — CSV da env, normalizado. */
export function getWhitelistDomains(): string[] {
  return parseWhitelistDomains(getEnv().VIMEO_WHITELIST_DOMAINS ?? '')
}

async function vimeoFetch<T>(
  path: string,
  init: RequestInit = {},
  options: { skipJsonParse?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${requireAccessToken()}`)
  headers.set('Accept', VIMEO_ACCEPT)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${VIMEO_API_BASE}${path}`, {
    signal: AbortSignal.timeout(VIMEO_API_TIMEOUT_MS),
    ...init,
    headers,
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Vimeo API ${init.method ?? 'GET'} ${path} falhou (${response.status}): ${body.slice(0, 300)}`,
    )
  }
  if (options.skipJsonParse || response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function parseVimeoIdFromUri(uri: string): string {
  const match = uri.match(/\/videos\/(\d+)/)
  if (!match) throw new Error(`URI de vídeo Vimeo inválida: ${uri}`)
  return match[1] as string
}

function parsePlaybackHash(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).searchParams.get('h')
  } catch {
    return null
  }
}

function buildEmbedUrl(videoId: string, hash: string | null): string {
  return hash
    ? `https://player.vimeo.com/video/${videoId}?h=${hash}`
    : `https://player.vimeo.com/video/${videoId}`
}

export interface VimeoUploadTicket {
  vimeoVideoId: string
  uri: string
  uploadLink: string
  /** URL de embed (com `?h=` quando privado) — é o `src` salvo no bloco de vídeo. */
  embedUrl: string
}

interface VimeoCreateVideoResponse {
  uri: string
  player_embed_url?: string
  upload?: { upload_link: string }
}

export interface VimeoTextTrack {
  uri: string
  active: boolean
  type: string
  language: string
  name?: string
  link: string
}

interface VimeoVideoGetResponse {
  uri: string
  status: string
  duration: number | null
  player_embed_url?: string
}

/**
 * Cria o "ticket" de upload TUS (o browser sobe o arquivo DIRETO p/ o Vimeo).
 * Privacidade: view=disable + embed=whitelist + sem download — o vídeo só toca
 * embedado nos domínios autorizados.
 */
export async function createUploadTicket(input: {
  sizeBytes: number
  name: string
}): Promise<VimeoUploadTicket> {
  const response = await vimeoFetch<VimeoCreateVideoResponse>('/me/videos', {
    method: 'POST',
    body: JSON.stringify({
      upload: { approach: 'tus', size: String(input.sizeBytes) },
      name: input.name,
      privacy: { view: 'disable', embed: 'whitelist', download: false },
    }),
  })
  if (!response?.uri || !response.upload?.upload_link) {
    throw new Error('Resposta do Vimeo sem uri/upload_link')
  }
  const vimeoVideoId = parseVimeoIdFromUri(response.uri)
  const hash = parsePlaybackHash(response.player_embed_url)
  return {
    vimeoVideoId,
    uri: response.uri,
    uploadLink: response.upload.upload_link,
    embedUrl: response.player_embed_url ?? buildEmbedUrl(vimeoVideoId, hash),
  }
}

/** Garante a whitelist de domínios de embed do vídeo. */
export async function applyPrivacy(vimeoVideoId: string, domains: string[]): Promise<void> {
  await vimeoFetch(`/videos/${vimeoVideoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ privacy: { view: 'disable', embed: 'whitelist', download: false } }),
  })
  for (const domain of domains) {
    await vimeoFetch(
      `/videos/${vimeoVideoId}/privacy/domains/${encodeURIComponent(domain)}`,
      { method: 'PUT' },
      { skipJsonParse: true },
    )
  }
}

/** Move o vídeo p/ a pasta (project) do Vimeo — PUT /me/projects/{id}/videos/{id} (204). */
export async function addVideoToFolder(vimeoVideoId: string, folderId: string): Promise<void> {
  await vimeoFetch(
    `/me/projects/${encodeURIComponent(folderId)}/videos/${vimeoVideoId}`,
    { method: 'PUT' },
    { skipJsonParse: true },
  )
}

/** Estado de transcode + metadados do vídeo (status Vimeo cru: available/transcoding/…). */
export async function getVideo(vimeoVideoId: string): Promise<{
  status: string
  duration: number | null
  embedUrl: string
}> {
  const response = await vimeoFetch<VimeoVideoGetResponse>(
    `/videos/${vimeoVideoId}?fields=uri,status,duration,player_embed_url`,
  )
  const hash = parsePlaybackHash(response.player_embed_url)
  return {
    status: response.status,
    duration: response.duration ?? null,
    embedUrl: response.player_embed_url ?? buildEmbedUrl(vimeoVideoId, hash),
  }
}

export async function listTextTracks(vimeoVideoId: string): Promise<VimeoTextTrack[]> {
  const response = await vimeoFetch<{ data: VimeoTextTrack[] }>(
    `/videos/${vimeoVideoId}/texttracks`,
  )
  return response.data ?? []
}

/** Hosts de onde aceitamos baixar o VTT (o `link` vem de um campo da API Vimeo). */
const VTT_ALLOWED_HOST_SUFFIXES = ['.vimeo.com', '.vimeocdn.com']
const MAX_VTT_BYTES = 5 * 1024 * 1024 // legendas são pequenas; teto generoso

/**
 * Baixa o VTT do track (o `link` do Vimeo é assinado/temporário — re-hospede!).
 * O destino sai de um campo JSON da API do Vimeo: validamos esquema+host ANTES do
 * fetch (defesa anti-SSRF — um fetch no servidor não pode seguir URL arbitrária na
 * rede privada do Railway) e limitamos o corpo (achado do review).
 */
export async function getTextTrackVtt(link: string): Promise<string> {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    throw new Error('Link de legenda inválido')
  }
  const host = url.hostname.toLowerCase()
  const hostOk = VTT_ALLOWED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))
  if (url.protocol !== 'https:' || !hostOk) throw new Error('Host de legenda não permitido')

  const response = await fetch(link, { signal: AbortSignal.timeout(VIMEO_BYTES_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Falha ao baixar o VTT (${response.status})`)
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_VTT_BYTES) {
    throw new Error('VTT excede o tamanho máximo')
  }
  const text = await response.text()
  if (text.length > MAX_VTT_BYTES) throw new Error('VTT excede o tamanho máximo')
  return text
}

/**
 * Sobe a capa custom do vídeo. Fluxo de 3 passos do Vimeo (pictures):
 *  1) POST /pictures cria o slot e devolve `uri` + `link`;
 *  2) PUT envia os bytes da imagem para o `link`;
 *  3) PATCH `uri` com `{active:true}` ATIVA a capa (sem este passo a imagem sobe
 *     mas nunca vira a thumbnail do vídeo — `active:true` no POST é ignorado porque
 *     ainda não há imagem). Ver https://developer.vimeo.com/api/upload/thumbnails.
 */
export async function uploadVideoThumbnail(
  vimeoVideoId: string,
  imageBytes: ArrayBuffer,
  mimeType: 'image/jpeg' | 'image/png',
): Promise<void> {
  const picture = await vimeoFetch<{ uri: string; link: string }>(
    `/videos/${vimeoVideoId}/pictures`,
    { method: 'POST' },
  )
  if (!picture?.link) throw new Error('Resposta do Vimeo sem o link de upload da capa')
  if (!picture?.uri) throw new Error('Resposta do Vimeo sem a URI da capa')

  const uploadResponse = await fetch(picture.link, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: imageBytes,
    signal: AbortSignal.timeout(VIMEO_BYTES_TIMEOUT_MS),
  })
  if (!uploadResponse.ok) {
    const body = await uploadResponse.text().catch(() => '')
    throw new Error(`PUT da capa no Vimeo falhou (${uploadResponse.status}): ${body.slice(0, 300)}`)
  }

  // Ativa a capa recém-enviada (passo 3). `picture.uri` = `/videos/<id>/pictures/<pid>`.
  await vimeoFetch(
    picture.uri,
    { method: 'PATCH', body: JSON.stringify({ active: true }) },
    { skipJsonParse: true },
  )
}
