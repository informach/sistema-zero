import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runViewSchema, videoSchema } from '@sistemazero/marketing-contracts'
import { app } from 'electron'
import { z } from 'zod'
import { LocalAssets } from './assets'
import { probeVideo } from './media/probe-video'
import { renderReceipt } from './media/render-identity'
import { renderTimeline } from './media/render-timeline'

export async function proveElectronTimeline() {
  if (app.isPackaged) throw new Error('Prova disponível somente no checkout de desenvolvimento')
  const base = path.join(app.getAppPath(), '.cache/timeline-proof'),
    directory = path.join(base, 'electron')
  await mkdir(directory, { recursive: true })
  const assets = new LocalAssets(path.join(directory, 'assets'))
  await assets.start()
  try {
    const evidence = z
      .object({ timeline: videoSchema })
      .parse(JSON.parse(await readFile(path.join(base, 'evidence.json'), 'utf8')))
    const original = await assets.importFile(path.join(base, 'original com áudio.mp4'))
    const sourceId = evidence.timeline.clips[0]?.assetId
    if (!sourceId) throw new Error('Original da prova ausente')
    const timeline = evidence.timeline
    const props = { timeline, assets: { [sourceId]: original.url } }
    const output = await renderTimeline(props, { assets }, directory, AbortSignal.timeout(180000))
    const metadata = await probeVideo(
      (await assets.verify(output.id)).path,
      'video/mp4',
      AbortSignal.timeout(30000),
    )
    const id = () => crypto.randomUUID(),
      projectId = id(),
      entityId = id(),
      revisionId = id(),
      actor = id()
    const run = runViewSchema.parse({
      request: {
        schemaVersion: 1,
        operationId: id(),
        id: id(),
        projectId,
        entityId,
        revisionId,
        intent: 'adjust',
        capability: 'render',
        provider: 'codex',
        instruction: 'Exportar montagem',
        selection: [],
        protectedIds: [],
        contextHash: 'a'.repeat(64),
        limits: {},
      },
      context: {
        schemaVersion: 1,
        source: {
          id: revisionId,
          projectId,
          entityId,
          parentRevisionId: null,
          createdBy: actor,
          createdAt: new Date().toISOString(),
          document: {
            schemaVersion: 1,
            kind: 'video',
            title: 'Verificação de render Electron',
            representationId: id(),
            timeline,
          },
        },
        selected: [],
        directions: [],
        evidence: [],
        protectedIds: [],
        assets: [
          {
            schemaVersion: 1,
            id: sourceId,
            projectId,
            name: original.name,
            sha256: original.sha256,
            size: original.size,
            mime: original.mime,
            role: 'original',
            sourceAssetId: null,
            width: 320,
            height: 240,
            durationMs: 6006,
            codec: 'h264',
            rotation: 0,
          },
        ],
      },
      state: 'running',
      epoch: 1,
      createdBy: actor,
      createdAt: new Date().toISOString(),
      attempt: null,
      leaseExpired: false,
      outcome: null,
    })
    const receipt = await renderReceipt(run, output)
    const controller = new AbortController(),
      reason = new Error('Cancelamento de verificação')
    const before = new Set(assets.list().map((asset) => asset.id)),
      started = Date.now()
    const timer = setTimeout(() => controller.abort(reason), 1500)
    let canceled = false
    try {
      await renderTimeline(
        { ...props, timeline: { ...timeline, durationInFrames: 9000 } },
        { assets },
        path.join(directory, 'canceled'),
        controller.signal,
      )
    } catch (error) {
      if (error !== reason) throw error
      canceled = true
    } finally {
      clearTimeout(timer)
    }
    const cancellationMs = Date.now() - started
    if (!canceled || cancellationMs > 12000 || assets.list().some((asset) => !before.has(asset.id)))
      throw new Error('Render cancelado deixou resultado ou não encerrou a tempo')
    await assets.verify(original.id)
    await writeFile(
      path.join(directory, 'evidence.json'),
      JSON.stringify(
        {
          utilityProcessRenderPassed: true,
          cancellationMs,
          canceled,
          originalPreserved: true,
          metadata,
          receipt,
        },
        null,
        2,
      ),
    )
    console.log(
      JSON.stringify({
        utilityProcessRenderPassed: true,
        cancellationMs,
        canceled,
        durationMs: metadata.durationMs,
      }),
    )
  } finally {
    assets.close()
  }
}
