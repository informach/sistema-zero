import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { type makeCancelSignal, renderMedia, selectComposition } from '@remotion/renderer'
import { canonicalJson } from '@sistemazero/marketing-contracts'
import { generatedPropsSchema } from '@sistemazero/marketing-production/data'
import { z } from 'zod'
import {
  compositionRenderInputSchema,
  compositionRenderProofSchema,
} from './composition-render-input'
import { validateCompositionSource } from './composition-source'

export async function renderCompositionWorker(
  raw: unknown,
  outputLocation: string,
  serveUrl: string,
  cancelSignal: ReturnType<typeof makeCancelSignal>['cancelSignal'],
  signal: AbortSignal,
) {
  const input = compositionRenderInputSchema.parse(raw),
    allowed = new Set([
      ...input.input.assetIds,
      ...(input.input.fontAssetId ? [input.input.fontAssetId] : []),
    ])
  for (const [id, value] of Object.entries(input.assets)) {
    const url = new URL(value)
    if (
      !allowed.has(id) ||
      url.protocol !== 'http:' ||
      url.hostname !== '127.0.0.1' ||
      !url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/[a-f0-9]{48}\/[a-f0-9-]{36}$/.test(url.pathname)
    )
      throw new Error('A composição só aceita mídias locais autorizadas')
  }
  if ([...allowed].some((id) => !input.assets[id]))
    throw new Error('Uma mídia da composição não foi carregada')
  const prepared = validateCompositionSource(input.source, input.input.assetIds),
    props = generatedPropsSchema.parse({
      input: input.input,
      javascript: prepared.javascript,
      assets: input.assets,
    }),
    composition = await selectComposition({
      serveUrl,
      id: 'MarketingGenerated',
      inputProps: props,
    }),
    observed = new Set<number>(),
    texts = input.input.requiredText.map(() => new Set<number>()),
    observationSchema = z
      .object({
        frame: z
          .number()
          .int()
          .min(0)
          .max(input.input.durationInFrames - 1),
        seen: z
          .array(
            z
              .number()
              .int()
              .min(0)
              .max(Math.max(0, texts.length - 1)),
          )
          .max(20),
      })
      .strict()
  signal.throwIfAborted()
  await renderMedia({
    serveUrl,
    composition,
    inputProps: props,
    outputLocation,
    codec: 'vp9',
    pixelFormat: 'yuva420p',
    imageFormat: 'png',
    colorSpace: 'bt709',
    muted: true,
    concurrency: 2,
    offthreadVideoCacheSizeInBytes: 128 * 1024 * 1024,
    mediaCacheSizeInBytes: 128 * 1024 * 1024,
    cancelSignal,
    onBrowserLog: (log) => {
      const prefix = 'marketing-composition-check:'
      if (!log.text.startsWith(prefix)) return
      const value = observationSchema.parse(JSON.parse(log.text.slice(prefix.length)))
      observed.add(value.frame)
      for (const index of value.seen) texts[index]?.add(value.frame)
    },
  })
  signal.throwIfAborted()
  const minimumVisible = Math.max(
    1,
    Math.min(Math.ceil(composition.fps / 2), Math.floor(composition.durationInFrames / 4)),
  )
  if (
    observed.size !== composition.durationInFrames ||
    texts.some((frames) => frames.size < minimumVisible)
  )
    throw new Error(
      'A composição não conservou o texto exigido por tempo suficiente; peça um ajuste',
    )
  const hash = (value: string) => createHash('sha256').update(value).digest('hex')
  const proof = compositionRenderProofSchema.parse({
    schemaVersion: 1,
    sourceSha256: hash(input.source),
    compiledSha256: hash(prepared.javascript),
    inputSha256: hash(canonicalJson(input.input)),
    observedFrames: observed.size,
    textFrames: texts.map((frames) => frames.size),
  })
  await writeFile(`${outputLocation}.receipt.json`, JSON.stringify(proof))
}
