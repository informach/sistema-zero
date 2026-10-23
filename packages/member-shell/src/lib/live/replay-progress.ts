import { sessionFetch } from '../session-fetch'
import { liveRequest } from './client'

export function readReplayProgress(sessionId: string, version: number, signal?: AbortSignal) {
  return liveRequest<{ positionSeconds: number }>(
    `/api/live/sessions/${sessionId}/replay-progress?version=${version}`,
    undefined,
    'GET',
    signal,
  )
}
export async function writeReplayProgress(sessionId: string, version: number, seconds: number) {
  const response = await sessionFetch(`/api/live/sessions/${sessionId}/replay-progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ version, positionSeconds: Math.max(0, Math.floor(seconds)) }),
  })
  if (!response.ok) throw new Error('Não foi possível guardar a posição da gravação.')
}
