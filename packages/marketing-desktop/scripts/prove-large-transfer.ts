import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  projectSchema,
  UPLOAD_PART_BYTES,
  uploadStartSchema,
  uploadViewSchema,
} from '@sistemazero/marketing-contracts'
import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import { LocalAssets } from '../src/main/assets'
import { downloadAsset } from '../src/main/sync/asset-download'
import { AssetTransfer, requireStorageUrl } from '../src/main/sync/asset-transfer'
import { DiskBudget } from '../src/main/sync/disk-budget'
import { LocalWorkspaceStore } from '../src/main/sync/local-store'
import type { SyncTransport } from '../src/main/sync/sync-engine'
import { proofBrowser } from './proof-browser'

// Four separate processes demonstrate durable recovery, not an in-memory restart.
const phase = z
  .enum(['interrupt', 'resume', 'download-interrupt', 'download-resume'])
  .parse(process.argv.find((value) => value.startsWith('--phase='))?.split('=')[1])
const directory = path.resolve('.cache/large-transfer-proof')
const stateFile = path.join(directory, 'state.json')
const size = 2_000_000_000
const interruptedParts = 8
const stateSchema = z.object({
  project: projectSchema,
  input: uploadStartSchema,
  userId: z.string().uuid(),
})
app.setName('Marketing Large Transfer Review')
app.setPath('userData', path.join(directory, `profile-${phase}`))
app.on('window-all-closed', () => {})

async function hashFile(file: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
async function main() {
  let window: BrowserWindow | undefined
  let assets: LocalAssets | undefined
  let local: LocalWorkspaceStore | undefined
  let sample: ReturnType<typeof setInterval> | undefined
  let exitCode = 0
  try {
    await app.whenReady()
    await mkdir(directory, { recursive: true })
    const browser = await proofBrowser('large-transfer')
    window = browser.window
    const budget = new DiskBudget(directory)
    const started = Date.now()
    let peakRss = process.memoryUsage().rss
    sample = setInterval(() => {
      peakRss = Math.max(peakRss, process.memoryUsage().rss)
    }, 500)
    const senderDirectory = path.join(directory, 'sender')
    assets = new LocalAssets(
      phase.startsWith('download-') ? path.join(directory, 'receiver') : senderDirectory,
      (bytes) => budget.reserve(bytes),
    )
    await assets.start()
    let state: z.infer<typeof stateSchema>
    if (phase === 'interrupt') {
      const source = path.join(directory, 'source.txt')
      const release = await budget.reserve(size)
      try {
        // Exclusive creation prevents silently overwriting a previous proof's original.
        const file = await open(source, 'wx')
        const block = Buffer.alloc(
          UPLOAD_PART_BYTES,
          'Arquivo sintético para conferir transferência e integridade.\n',
        )
        try {
          let position = 0
          while (position < size) {
            const length = Math.min(block.length, size - position)
            const { bytesWritten } = await file.write(block, 0, length, position)
            if (!bytesWritten) throw new Error('A fixture não pôde ser escrita')
            position += bytesWritten
          }
          await file.sync()
        } finally {
          await file.close()
        }
      } finally {
        release()
      }
      const asset = await assets.importFile(source)
      const project = projectSchema.parse(
        await browser.request('/api/marketing/workspace/projects', {
          schemaVersion: 1,
          operationId: randomUUID(),
          id: randomUUID(),
          name: 'Transferência de 2 GB · revisão isolada',
          product: 'Revisão isolada',
        }),
      )
      state = stateSchema.parse({
        project,
        userId: browser.userId,
        input: {
          operationId: randomUUID(),
          manifest: {
            schemaVersion: 1,
            id: asset.id,
            projectId: project.id,
            name: asset.name,
            sha256: asset.sha256,
            size: asset.size,
            mime: asset.mime,
            role: 'original',
            sourceAssetId: null,
            width: null,
            height: null,
            durationMs: null,
            codec: null,
            rotation: null,
          },
        },
      })
      await writeFile(stateFile, JSON.stringify(state, null, 2), { flag: 'wx' })
    } else state = stateSchema.parse(JSON.parse(await readFile(stateFile, 'utf8')))
    assert.equal(state.userId, browser.userId)
    assert.equal(state.input.manifest.size, size)
    local = new LocalWorkspaceStore(path.join(directory, 'workspace.sqlite'), {
      origin: browser.origin,
      userId: browser.userId,
    })
    const projects = z
      .array(projectSchema)
      .parse(await browser.request('/api/marketing/workspace/projects'))
    assert(projects.some((project) => project.id === state.project.id))
    local.saveProjects(projects)
    const sent: number[] = []
    const transport: SyncTransport = {
      request(route, method = 'GET', body) {
        if (method !== 'GET' && method !== 'POST') throw new Error('Método fora da prova')
        if (route.endsWith('/part')) sent.push(z.object({ number: z.number() }).parse(body).number)
        return browser.request(`/api/marketing/workspace${route}`, body, method)
      },
    }
    const manifest = state.input.manifest
    const route = `/projects/${state.project.id}/assets/${manifest.id}`
    const signal = AbortSignal.timeout(30 * 60_000)
    const interruption = new Error('Interrupção controlada após os bytes chegarem ao R2')
    let confirmedParts = 0
    const transfer = new AssetTransfer(
      local,
      assets,
      transport,
      async (url, bytes, headers, partSignal) => {
        const response = await fetch(requireStorageUrl(url), {
          method: 'PUT',
          body: bytes,
          headers,
          redirect: 'error',
          credentials: 'omit',
          signal: AbortSignal.any([partSignal, AbortSignal.timeout(120_000)]),
        })
        await response.body?.cancel()
        if (!response.ok) throw new Error(`Parte recusada: HTTP ${response.status}`)
        confirmedParts++
        if (phase === 'interrupt' && confirmedParts === interruptedParts) throw interruption
      },
    )
    let details: Record<string, unknown>
    if (phase === 'interrupt') {
      await assert.rejects(
        () => transfer.upload(state.input, signal),
        (error) => error === interruption,
      )
      const view = uploadViewSchema.parse(await transport.request(route))
      assert.equal(view.parts.length, interruptedParts)
      assert.equal(view.bytesReceived, false)
      assert.equal(local.transfers(state.project.id)[0]?.state, 'failed')
      details = { confirmedParts: view.parts.length, localPreserved: true, state: view.state }
    } else if (phase === 'resume') {
      const before = uploadViewSchema.parse(await transport.request(route))
      assert(before.parts.length >= interruptedParts)
      const receivedParts = new Set(before.parts.map((part) => part.number))
      await writeFile(
        path.join(directory, `resume-attempt-${process.pid}.json`),
        JSON.stringify(
          {
            pid: process.pid,
            beforeParts: [...receivedParts],
            startedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      )
      let last = 0
      await transfer.upload(state.input, signal, (fraction) => {
        const progress = Math.floor(fraction * 100)
        if (progress >= last + 10) {
          last = progress
          console.log(JSON.stringify({ phase, progress }))
        }
      })
      assert.deepEqual(
        sent,
        Array.from({ length: Math.ceil(size / UPLOAD_PART_BYTES) }, (_, index) => index + 1).filter(
          (number) => !receivedParts.has(number),
        ),
      )
      let view = await transfer.confirm(state.project.id, manifest.id)
      while (view.state !== 'confirmed') {
        assert.notEqual(view.state, 'failed', view.error ?? 'Integridade recusada')
        await delay(2000, undefined, { signal })
        view = await transfer.confirm(state.project.id, manifest.id)
      }
      assert.equal(await hashFile(path.join(directory, 'source.txt')), manifest.sha256)
      assert.equal(local.transfers(state.project.id)[0]?.state, 'confirmed')
      details = {
        skippedParts: before.parts.length,
        sentParts: sent.length,
        serverVerifiedSha256: true,
        originalIntact: true,
      }
    } else {
      const receiver = assets
      const partial = path.join(assets.directory, `${manifest.id}.download.partial`)
      const offset = phase === 'download-resume' ? (await stat(partial)).size : 0
      const offsets: number[] = []
      let received = 0
      const download = () =>
        downloadAsset(
          state.project.id,
          manifest.id,
          receiver,
          transport,
          signal,
          async (url, requested, requestSignal) => {
            offsets.push(requested)
            const response = await fetch(url, {
              headers: requested ? { range: `bytes=${requested}-` } : {},
              redirect: 'error',
              credentials: 'omit',
              signal: requestSignal,
            })
            if (phase !== 'download-interrupt' || !response.body) return response
            const stream = response.body.pipeThrough(
              new TransformStream<Uint8Array, Uint8Array>({
                transform(chunk, controller) {
                  if (received >= 32 * 1024 * 1024) throw interruption
                  received += chunk.byteLength
                  controller.enqueue(chunk)
                },
              }),
            )
            return new Response(stream, { status: response.status, headers: response.headers })
          },
        )
      if (phase === 'download-interrupt') {
        await assert.rejects(download, (error) => error === interruption)
        const partialSize = (await stat(partial)).size
        assert(partialSize > 0 && partialSize < size)
        assert.equal(assets.list().length, 0)
        details = { partialBytes: partialSize, incompleteNotExposed: true }
      } else {
        assert(offset > 0 && offset < size)
        const asset = await download()
        assert.deepEqual(offsets, [offset])
        assert.equal(asset.sha256, manifest.sha256)
        assert.equal(asset.size, size)
        details = { resumedOffset: offset, wholeFileHashVerified: true }
      }
    }
    const evidence = {
      phase,
      pid: process.pid,
      projectId: state.project.id,
      assetId: manifest.id,
      bytes: size,
      sha256: manifest.sha256,
      elapsedMs: Date.now() - started,
      peakRss,
      storage: 'R2 testes-marketing',
      ...details,
    }
    await writeFile(path.join(directory, `${phase}.json`), JSON.stringify(evidence, null, 2))
    console.log(JSON.stringify(evidence))
  } catch (error) {
    exitCode = 1
    console.error(error instanceof Error ? error.message : 'Falha na prova de transferência')
  } finally {
    if (sample) clearInterval(sample)
    try {
      local?.close()
      assets?.close()
      window?.destroy()
    } catch {
      exitCode = 1
      console.error('Falha ao encerrar recursos da prova')
    }
    app.exit(exitCode)
  }
}
void main()
