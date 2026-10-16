import { createHash } from 'node:crypto'
import { mkdir, open, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type CompositionInput,
  canonicalJson,
  compositionIdentity,
  type ExecutionRun,
  generatedCompositionSchema,
} from '@sistemazero/marketing-contracts'
import type { ExecutionResources } from '../execution/supervisor'
import { downloadAsset } from '../sync/asset-download'
import { compositionRenderProofSchema } from './composition-render-input'
import { withOutputBudget } from './output-budget'
import { probeVideo } from './probe-video'
import { verifiedRenderEngine } from './render-identity'
import { renderProcess } from './render-process'

/** The client never evaluates generated code; the isolated worker owns compilation and render. */
export async function renderGenerated(
  run: ExecutionRun,
  source: string,
  input: CompositionInput,
  protectedText: string[],
  resources: Pick<ExecutionResources, 'assets' | 'transport'>,
  directory: string,
  signal: AbortSignal,
) {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex')
  const engine = await verifiedRenderEngine()
  const inputSha256 = await compositionIdentity(source, input, run.context.assets ?? [])
  const receiptFile = path.join(directory, 'generated-receipt.json')
  let previous: unknown
  try {
    previous = JSON.parse(await readFile(receiptFile, 'utf8'))
  } catch (error) {
    if (
      !(error instanceof SyntaxError) &&
      !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
    )
      throw error
  }
  const recovered = generatedCompositionSchema.safeParse(previous)
  if (recovered.success) {
    const value = recovered.data
    if (
      value.inputSha256 === inputSha256 &&
      value.source === source &&
      canonicalJson(value.input) === canonicalJson(input) &&
      value.sourceSha256 === hash(source) &&
      value.sourceRevisionId === run.context.source.id &&
      canonicalJson(value.engine) === canonicalJson(engine) &&
      canonicalJson(value.protectedText) === canonicalJson(protectedText)
    ) {
      const saved = resources.assets.list().find((asset) => asset.id === value.outputAssetId)
      if (saved) {
        signal.throwIfAborted()
        const verified = await resources.assets.verify(saved.id)
        if (verified.asset.sha256 === value.outputSha256) return value
      }
    }
  }
  const urls: Record<string, string> = {}
  for (const id of [...input.assetIds, ...(input.fontAssetId ? [input.fontAssetId] : [])]) {
    const manifest = run.context.assets?.find((asset) => asset.id === id)
    if (
      !manifest ||
      (id === input.fontAssetId
        ? manifest.mime !== 'font/woff2'
        : !manifest.mime.startsWith('image/'))
    )
      throw new Error('A composição exige imagens e fonte confirmadas no pedido')
    const asset = await downloadAsset(
      run.request.projectId,
      id,
      resources.assets,
      resources.transport,
      signal,
    )
    const verified = await resources.assets.verify(id)
    if (verified.asset.sha256 !== manifest.sha256) throw new Error('A mídia mudou desde o pedido')
    urls[id] = asset.url
  }
  const release = await resources.assets.reserve(1_000_000_000)
  try {
    await mkdir(directory, { recursive: true })
    const propsFile = path.join(directory, 'composition-input.json'),
      output = path.join(directory, 'composition.webm')
    await writeFile(propsFile, JSON.stringify({ source, input, assets: urls }))
    await withOutputBudget(directory, [output], 500_000_000, signal, (bounded) =>
      renderProcess(propsFile, output, 'composition', bounded),
    )
    const proof = compositionRenderProofSchema.parse(
      JSON.parse(await readFile(`${output}.receipt.json`, 'utf8')),
    )
    if (proof.sourceSha256 !== hash(source) || proof.inputSha256 !== hash(canonicalJson(input)))
      throw new Error('O render não corresponde ao fonte e aos parâmetros da composição')
    const metadata = await probeVideo(output, 'video/webm', signal)
    const durationMs = (input.durationInFrames * 1000 * input.fps.denominator) / input.fps.numerator
    if (
      metadata.width !== input.width ||
      metadata.height !== input.height ||
      metadata.codec !== 'vp9' ||
      metadata.hasAudio !== false ||
      metadata.rotation !== 0 ||
      Math.abs((metadata.durationMs ?? 0) - durationMs) > 2
    )
      throw new Error('A prévia da composição não corresponde às dimensões ou duração da cena')
    const asset = await resources.assets.importFile(output, { signal })
    const generated = generatedCompositionSchema.parse({
      schemaVersion: 1,
      source,
      input,
      engine,
      protectedText,
      sourceSha256: proof.sourceSha256,
      compiledSha256: proof.compiledSha256,
      inputSha256,
      sourceRevisionId: run.context.source.id,
      outputAssetId: asset.id,
      outputSha256: asset.sha256,
      observedFrames: proof.observedFrames,
      textFrames: proof.textFrames,
    })
    const pending = `${receiptFile}.${crypto.randomUUID()}.pending`
    const handle = await open(pending, 'wx', 0o600)
    try {
      await handle.writeFile(JSON.stringify(generated))
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(pending, receiptFile)
    return generated
  } finally {
    release()
  }
}
