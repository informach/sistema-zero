'use client'
import type { StudioPlayerOriginAdapter } from '@sistemazero/studio/player'
import { sessionFetch as fetch } from '../session-fetch'

export function createLivePreviewAdapter(
  sessionId: string,
  workspaceId?: string,
): StudioPlayerOriginAdapter {
  const ids = new Map<string, string>()
  const identity: Record<string, string> = workspaceId ? { 'x-live-workspace-id': workspaceId } : {}
  return {
    async createPreviewUrl({ document, signal }) {
      const response = await fetch(`/api/live/sessions/${sessionId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/html', ...identity },
        body: document,
        signal,
      })
      const body = await response.json()
      if (!response.ok || typeof body.url !== 'string' || typeof body.id !== 'string')
        throw new Error(body.error?.message ?? 'Não foi possível preparar o jogo isolado.')
      ids.set(body.url, body.id)
      return body.url
    },
    async releasePreviewUrl(url) {
      const id = ids.get(url)
      if (!id) return
      ids.delete(url)
      await fetch(`/api/live/sessions/${sessionId}/preview?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: identity,
        keepalive: true,
      })
    },
  }
}
