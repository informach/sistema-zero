import { Player, type PlayerRef } from '@remotion/player'
import { clipSchema, itemSchema, projectSchema, UPLOAD_PART_BYTES, videoSchema } from '../../../packages/marketing-contracts/src'
import { TimelineComposition } from '../../../packages/marketing-production/src'
import { createRoot } from 'react-dom/client'
import { createRef } from 'react'
import { useCurrentFrame } from 'remotion'
import { RequestPanel } from '../../../packages/marketing-workbench/src/request-panel'
import VideoPreview from '../../../packages/marketing-workbench/src/video-preview'
import type { WorkbenchPort } from '../../../packages/marketing-workbench/src/port'
import '../../../packages/marketing-desktop/src/renderer/console.css'

const proof = window.proofInput
const query = new URLSearchParams(location.search)
const scene = proof.scenes[Number(query.get('scene') ?? 0)]
const height = Number(query.get('height') ?? 1920)
const uuid = () => crypto.randomUUID(), trackId = uuid(), projectId = uuid(), userId = uuid()
const timeline = videoSchema.parse({ schemaVersion: 1, recipeVersion: 'marketing-timeline-v1', width: 1080, height, fps: { numerator: 30000, denominator: 1001 }, durationInFrames: 90, tracks: [{ id: trackId, kind: 'visual', muted: false }], clips: [clipSchema.parse({ id: uuid(), trackId, kind: 'image', assetId: scene.sources[0].assetId, startFrame: 0, durationInFrames: 90, fit: 'contain', demonstration: { schemaVersion: 1, ...scene } })], captions: [], background: '#fffcf4', accent: '#ffdb56' })
const assets = Object.fromEntries(scene.sources.map((source) => [source.assetId, proof.sources.find((file) => file.sha256 === source.sha256).url]))
const player = createRef<PlayerRef>()
window.seekProof = (frame: number) => player.current?.seekTo(frame)
function CheckedTimeline(props) {
  return <div data-proof-frame={useCurrentFrame()}><TimelineComposition {...props} /></div>
}
const writes: unknown[] = []
Object.assign(window, { proofWrites: writes })
const unavailable = async () => { throw new Error('Operação fora desta prova local') }
const port: WorkbenchPort = {
  location: 'web', identity: 'demonstration-proof', userId,
  projects: unavailable, createProject: unavailable, view: unavailable, save: unavailable, saveBatch: unavailable, resolveDrafts: unavailable,
  synchronize: async () => {}, subscribe: () => () => {}, openDesktop: unavailable,
  assetUrl: async (_projectId, id) => assets[id],
  async request(path, method = 'GET', body) {
    if (method !== 'GET') { writes.push({ path, body }); throw new Error('Prova não executa pedidos') }
    if (path.includes('/runs?')) return { items: [], nextCursor: null }
    const source = scene.sources.find((source) => path.endsWith(source.assetId))
    if (!source) throw new Error('Consulta fora da fixture')
    return { manifest: { schemaVersion: 1, id: source.assetId, projectId, name: source.label, sha256: source.sha256, size: 1000, mime: 'image/png', role: 'original', sourceAssetId: null, width: source.width, height: source.height, durationMs: null, codec: null, rotation: 0 }, state: 'confirmed', partBytes: UPLOAD_PART_BYTES, bytesReceived: true, parts: [], error: null }
  },
}
const item = itemSchema.parse({ id: uuid(), projectId, revisionId: uuid(), kind: 'video', document: { schemaVersion: 1, kind: 'video', title: 'Demonstração de revisão', representationId: uuid(), timeline }, archived: false, updatedAt: new Date().toISOString() })
const target = { id: item.id, confirmed: item, document: item.document, archived: false, pending: [], conflict: false, error: null }
const project = projectSchema.parse({ id: projectId, name: 'Prova local', product: 'Sistema Zero', createdBy: userId, createdAt: item.updatedAt, sequence: 1, permissions: ['read', 'edit', 'execute'] })
createRoot(document.getElementById('root')!).render(query.has('raw') ? <div id="player-proof" style={{ width: 1080, height }}><Player ref={player} component={CheckedTimeline} inputProps={{ timeline, assets }} durationInFrames={90} fps={30000 / 1001} compositionWidth={1080} compositionHeight={height} style={{ width: 1080, height }} controls={false} /></div> : <main className="mx-auto max-w-4xl space-y-6 p-4"><h1>Prova local, sem execução nem publicação</h1><VideoPreview port={port} projectId={projectId} timeline={timeline} /><RequestPanel port={port} project={project} target={target} entries={[target]} handoff={null} team={[]} onChanged={async () => {}} /></main>)
