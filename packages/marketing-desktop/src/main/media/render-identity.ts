import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ExecutionRun,
  renderEngineSchema,
  renderInputHash,
  renderReceiptSchema,
} from '@sistemazero/marketing-contracts'
import type { Asset } from '../../shared/contracts'

export async function bundleHash(directory: string): Promise<string> {
  const hash = createHash('sha256')
  const visit = async (current: string) => {
    const entries = await readdir(current, { withFileTypes: true })
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const entry of entries) {
      const file = path.join(current, entry.name)
      if (entry.isDirectory()) await visit(file)
      else if (entry.isFile()) {
        const relative = path.relative(directory, file).split(path.sep).join('/')
        const contentHash = createHash('sha256')
          .update(await readFile(file))
          .digest('hex')
        hash.update(JSON.stringify([relative, contentHash]))
      } else throw new Error('O bundle de produção contém uma entrada não suportada')
    }
  }
  await visit(directory)
  return hash.digest('hex')
}

export async function renderReceipt(run: ExecutionRun, output: Asset) {
  const { app } = await import('electron')
  const dist = path.join(app.getAppPath(), 'dist')
  const engine = renderEngineSchema.parse(
    JSON.parse(await readFile(path.join(dist, 'render-engine.json'), 'utf8')),
  )
  if (
    engine.platform !== process.platform ||
    engine.architecture !== process.arch ||
    engine.bundleSha256 !== (await bundleHash(path.join(dist, 'remotion'))) ||
    engine.workerSha256 !==
      createHash('sha256')
        .update(await readFile(path.join(dist, 'render-worker.cjs')))
        .digest('hex')
  )
    throw new Error('O motor de produção mudou; reconstrua ou reinstale o app antes de exportar')
  return renderReceiptSchema.parse({
    schemaVersion: 1,
    sourceRevisionId: run.context.source.id,
    inputSha256: await renderInputHash(
      run.context.source,
      run.context.assets ?? [],
      run.request.imageFormat,
      run.request.sourceAssetId,
    ),
    engine,
    outputAssetId: output.id,
    outputSha256: output.sha256,
  })
}
