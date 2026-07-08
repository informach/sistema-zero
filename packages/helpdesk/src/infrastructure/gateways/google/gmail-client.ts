import {
  GmailApiError,
  type GmailClient,
  type GmailHistoryPage,
  type GmailMessageIdsPage,
  type GmailProfile,
  type ParsedEmail,
  type SentMessage,
} from '../../../domain/ports/gmail-client.port'
import { type GmailRawMessage, parseGmailMessage } from './mime'

/**
 * Cliente da Gmail REST API v1 (fetch nativo, sem SDK). URLs CONSTANTES
 * hardcoded (anti-SSRF). O accessToken chega por chamada (o worker refaz o token
 * fresco a cada tick). Erros inesperados lançam GmailApiError; 404 do history
 * vira `expired`, 404 do get vira null.
 */
const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const DEFAULT_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('gmail timeout', 'TimeoutError')),
    timeoutMs,
  )
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export class GoogleGmailClient implements GmailClient {
  private async get(
    accessToken: string,
    path: string,
    params?: URLSearchParams,
  ): Promise<Response> {
    const url = params ? `${BASE}${path}?${params.toString()}` : `${BASE}${path}`
    try {
      return await fetchWithTimeout(url, {
        headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
      })
    } catch (error) {
      throw new GmailApiError('Falha de rede na Gmail API', 0, false, { cause: error })
    }
  }

  /** 401/403 (token/permissão) = permanente (reauth); 429/5xx/rede = transitório. */
  private async errorFrom(res: Response, context: string): Promise<GmailApiError> {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; status?: string }
    }
    const message = body.error?.message ?? res.statusText
    const permanent = res.status === 401 || res.status === 403
    return new GmailApiError(`Gmail ${context}: ${res.status} ${message}`, res.status, permanent)
  }

  async getProfile(accessToken: string): Promise<GmailProfile> {
    const res = await this.get(accessToken, '/profile')
    if (!res.ok) throw await this.errorFrom(res, 'getProfile')
    const data = (await res.json()) as { emailAddress?: string; historyId?: string }
    if (!data.emailAddress || !data.historyId) {
      throw new GmailApiError('getProfile sem emailAddress/historyId', res.status, false)
    }
    return { emailAddress: data.emailAddress, historyId: data.historyId }
  }

  async listMessages(
    accessToken: string,
    input: { q?: string; pageToken?: string; maxResults?: number },
  ): Promise<GmailMessageIdsPage> {
    const params = new URLSearchParams()
    if (input.q) params.set('q', input.q)
    if (input.pageToken) params.set('pageToken', input.pageToken)
    params.set('maxResults', String(input.maxResults ?? 100))
    const res = await this.get(accessToken, '/messages', params)
    if (!res.ok) throw await this.errorFrom(res, 'listMessages')
    const data = (await res.json()) as {
      messages?: Array<{ id: string }>
      nextPageToken?: string
    }
    return {
      ids: (data.messages ?? []).map((m) => m.id),
      nextPageToken: data.nextPageToken ?? null,
    }
  }

  async listHistory(
    accessToken: string,
    input: { startHistoryId: string; pageToken?: string; maxResults?: number },
  ): Promise<GmailHistoryPage> {
    const params = new URLSearchParams()
    params.set('startHistoryId', input.startHistoryId)
    params.set('historyTypes', 'messageAdded')
    if (input.pageToken) params.set('pageToken', input.pageToken)
    params.set('maxResults', String(input.maxResults ?? 100))
    const res = await this.get(accessToken, '/history', params)
    // 404 = startHistoryId fora da janela (~1 semana) → full-resync no próximo tick.
    if (res.status === 404) {
      return { messageIds: [], historyId: null, nextPageToken: null, expired: true }
    }
    if (!res.ok) throw await this.errorFrom(res, 'listHistory')
    const data = (await res.json()) as {
      history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }>
      historyId?: string
      nextPageToken?: string
    }
    const messageIds: string[] = []
    for (const entry of data.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        if (added.message?.id) messageIds.push(added.message.id)
      }
    }
    return {
      messageIds,
      historyId: data.historyId ?? null,
      nextPageToken: data.nextPageToken ?? null,
      expired: false,
    }
  }

  async getMessage(accessToken: string, id: string): Promise<ParsedEmail | null> {
    const params = new URLSearchParams({ format: 'full' })
    const res = await this.get(accessToken, `/messages/${encodeURIComponent(id)}`, params)
    // 404 = mensagem apagada entre o history e o get — ignora.
    if (res.status === 404) return null
    if (!res.ok) throw await this.errorFrom(res, 'getMessage')
    const raw = (await res.json()) as GmailRawMessage
    return parseGmailMessage(raw)
  }

  async sendMessage(
    accessToken: string,
    input: { raw: string; threadId: string },
  ): Promise<SentMessage> {
    let res: Response
    try {
      res = await fetchWithTimeout(`${BASE}/messages/send`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ raw: input.raw, threadId: input.threadId }),
      })
    } catch (error) {
      throw new GmailApiError('Falha de rede na Gmail API', 0, false, { cause: error })
    }
    if (!res.ok) throw await this.errorFrom(res, 'sendMessage')
    const data = (await res.json()) as { id?: string; threadId?: string }
    if (!data.id) throw new GmailApiError('sendMessage sem id', res.status, false)
    return { id: data.id, threadId: data.threadId ?? input.threadId }
  }
}
