// QA host for the production app, mission session and shared guide.
import { PensaApp, type PensaTransport } from '@sistemazero/pensa'
import { PensaMissionPanel } from '@sistemazero/ui/pensa-mission-panel'
import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  usePensaMissionHandoff,
  usePensaMissionSession,
} from '../../community-kids/src/components/kids/use-pensa-mission-session'
import type {
  CloudCreationSummary,
  CloudPeek,
  CreationsCloud,
} from '../../community-kids/src/lib/creations-cloud'
import '@sistemazero/ui/tool-chrome.css'
import './styles.css'

const fixture: { viewerId: string; projectId: string } = await fetch('/fixture').then((r) =>
  r.json(),
)
const transport: PensaTransport = {
  async request<T>(
    path: string,
    init?: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown },
  ): Promise<T> {
    const response = await fetch(`/api/pensa${path}`, {
      method: init?.method ?? 'GET',
      headers: { 'content-type': 'application/json', 'x-sz-viewer': fixture.viewerId },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`)
    return body
  },
}
function NativeHost() {
  const [missionId, setMissionId] = useState<string | null>(null)
  const [visit, setVisit] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const handoff = usePensaMissionHandoff(missionId, 'studio', fixture.viewerId)
  function navigate(path: string) {
    const url = new URL(path, location.origin)
    setMissionId(url.searchParams.get('missao'))
    setVisit((n) => n + 1)
  }
  const cloud = useMemo<Pick<CreationsCloud, 'confirm' | 'peek'>>(
    () => ({
      async confirm(itemId) {
        const response = await fetch('/fixture/saved')
        if (!response.ok) throw new Error('Guarde o jogo antes de conferir.')
        const saved: { summary: CloudCreationSummary } = await response.json()
        if (saved.summary.itemId !== itemId) throw new Error('O jogo salvo mudou.')
      },
      async peek(itemId): Promise<CloudPeek | null> {
        const response = await fetch('/fixture/saved')
        if (!response.ok) return null
        const saved: { summary: CloudCreationSummary; serverNow: number; json: string } =
          await response.json()
        if (saved.summary.itemId !== itemId) throw new Error('O jogo salvo mudou.')
        return {
          summary: saved.summary,
          serverNow: saved.serverNow,
          load: async () => ({
            json: saved.json,
            summary: saved.summary,
            parts: [],
            fetchPart: async () => {
              throw new Error('This scenario has no asset parts')
            },
          }),
        }
      },
    }),
    [],
  )
  const session = usePensaMissionSession({
    handoff: handoff.data,
    viewerId: fixture.viewerId,
    cloud,
    update: handoff.update,
    retry: handoff.retry,
    navigate,
  })
  if (!missionId)
    return (
      <PensaApp
        key={visit}
        adapter={{
          viewerId: fixture.viewerId,
          mode: 'kids',
          theme: 'light',
          transport,
          onOpenMission: (mission) => setMissionId(mission.missionId),
          onOpenGame: () => {},
        }}
      />
    )
  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', padding: 16 }}>
      <p>Host de verificação · armazenamento local</p>
      <button
        type="button"
        onClick={() => {
          void fetch('/fixture/save', { method: 'POST' })
            .then((response) => {
              if (!response.ok) throw new Error('Falha ao guardar.')
              setSaved(true)
            })
            .catch((error: unknown) =>
              setSaveError(error instanceof Error ? error.message : 'Falha ao guardar.'),
            )
        }}
      >
        Guardar jogo com a extensão recomendada
      </button>
      {saved ? <p role="status">Jogo guardado no banco de verificação.</p> : null}
      {saveError || handoff.error ? <p role="alert">{saveError || handoff.error}</p> : null}
      {session ? <PensaMissionPanel session={session} /> : <p>Abrindo missão…</p>}
    </main>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing root')
createRoot(root).render(<NativeHost />)
