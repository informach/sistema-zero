import {
  type DriveClient,
  DriveClientError,
  type DriveFile,
} from '../../../domain/ports/drive-client.port'

/**
 * Google Drive v3 com fetch nativo (importação Drive→R2). URLs constantes
 * (anti-SSRF); só o fileId (validado por regex na borda) entra no path.
 */
const FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const FILE_FIELDS = 'id,name,mimeType,size,modifiedTime'
const LIST_TIMEOUT_MS = 10_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('drive timeout', 'TimeoutError')),
    timeoutMs,
  )
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

interface RawFile {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  modifiedTime?: string
}

function toDriveFile(raw: RawFile): DriveFile {
  return {
    id: raw.id ?? '',
    name: raw.name ?? '',
    mimeType: raw.mimeType ?? 'application/octet-stream',
    // Google Docs nativos não têm `size` (exigiriam export — fora do escopo).
    sizeBytes: raw.size ? Number(raw.size) : null,
    modifiedTime: raw.modifiedTime ?? null,
  }
}

function classifyStatus(status: number): boolean {
  // 403 (sem acesso/quota de download) e 404 (apagado) são PERMANENTES; o resto
  // (429/5xx/rede) vale retry. 401 é transitório: o worker renova o token no
  // próximo claim (getFreshAccessToken).
  return status === 403 || status === 404
}

export class GoogleDriveClient implements DriveClient {
  async listFiles(
    accessToken: string,
    input: { q?: string; pageToken?: string; pageSize?: number },
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null }> {
    const url = new URL(FILES_URL)
    // Só arquivos (não pastas), não apagados; filtro por nome quando `q` vem.
    const clauses = ["mimeType != 'application/vnd.google-apps.folder'", 'trashed = false']
    if (input.q) clauses.push(`name contains '${input.q.replace(/['\\]/g, ' ')}'`)
    url.searchParams.set('q', clauses.join(' and '))
    url.searchParams.set('fields', `nextPageToken,files(${FILE_FIELDS})`)
    url.searchParams.set('pageSize', String(input.pageSize ?? 25))
    url.searchParams.set('orderBy', 'modifiedTime desc')
    url.searchParams.set('supportsAllDrives', 'true')
    url.searchParams.set('includeItemsFromAllDrives', 'true')
    url.searchParams.set('corpora', 'allDrives')
    if (input.pageToken) url.searchParams.set('pageToken', input.pageToken)
    const res = await this.request(url.toString(), accessToken, LIST_TIMEOUT_MS)
    const body = (await res.json()) as { files?: RawFile[]; nextPageToken?: string }
    return {
      files: (body.files ?? []).map(toDriveFile),
      nextPageToken: body.nextPageToken ?? null,
    }
  }

  async getFileMetadata(accessToken: string, fileId: string): Promise<DriveFile> {
    const url = new URL(`${FILES_URL}/${encodeURIComponent(fileId)}`)
    url.searchParams.set('fields', FILE_FIELDS)
    url.searchParams.set('supportsAllDrives', 'true')
    const res = await this.request(url.toString(), accessToken, LIST_TIMEOUT_MS)
    return toDriveFile((await res.json()) as RawFile)
  }

  async downloadStream(accessToken: string, fileId: string): Promise<ReadableStream<Uint8Array>> {
    const url = new URL(`${FILES_URL}/${encodeURIComponent(fileId)}`)
    url.searchParams.set('alt', 'media')
    url.searchParams.set('supportsAllDrives', 'true')
    // SEM timeout de corpo: o stream de um vídeo de 2GB leva o tempo que levar
    // (o teto fica no requestTimeout do PUT do R2, do outro lado do pipe).
    let res: Response
    try {
      res = await fetch(url.toString(), {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    } catch (error) {
      throw new DriveClientError('Falha de rede ao baixar do Drive', false, { cause: error })
    }
    if (!res.ok) {
      throw new DriveClientError(
        `Drive download falhou (${res.status})`,
        classifyStatus(res.status),
      )
    }
    if (!res.body) throw new DriveClientError('Drive não devolveu corpo', false)
    return res.body as ReadableStream<Uint8Array>
  }

  private async request(url: string, accessToken: string, timeoutMs: number): Promise<Response> {
    let res: Response
    try {
      res = await fetchWithTimeout(
        url,
        { headers: { authorization: `Bearer ${accessToken}` } },
        timeoutMs,
      )
    } catch (error) {
      throw new DriveClientError('Falha de rede ao falar com o Drive', false, { cause: error })
    }
    if (!res.ok) {
      throw new DriveClientError(`Drive respondeu ${res.status}`, classifyStatus(res.status))
    }
    return res
  }
}
