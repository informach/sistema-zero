import { strict as assert } from 'node:assert'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import {
  clipSchema,
  type DemonstrationRecipeId,
  type DemonstrationSource,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { LocalAssets } from '../src/main/assets'
import { probeImage } from '../src/main/media/probe-image'
import { probeVideo } from '../src/main/media/probe-video'

// Run after `bun run build`. Fixtures exercise the maintained composition, not editorial approval.
const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(desktop, '../..')
const directory = path.join(desktop, '.cache/demonstration-proof')
const audit = path.join(root, '.audits/marketing-demonstracoes-flute-2026-10-16')
await mkdir(directory, { recursive: true })
await mkdir(audit, { recursive: true })
const assets = new LocalAssets(path.join(directory, 'assets'))
const browser = await openBrowser('chrome')
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
const acervo = 'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/postagens'
const files = [
  `${acervo}/p07-primeira-dificuldade/apoio/v3/comparacao-antes.png`,
  `${acervo}/p07-primeira-dificuldade/apoio/v3/comparacao-depois.png`,
  `${acervo}/p08-uma-derrota-nao-conta-tudo/apoio/bloco-ataque-real.png`,
  `${acervo}/p08-uma-derrota-nao-conta-tudo/apoio/batalha-completa.png`,
]
const reports: unknown[] = []
const started = performance.now()
try {
  await assets.start()
  const imported = await Promise.all(files.map((file) => assets.importFile(path.join(root, file))))
  const dimensions = await Promise.all(
    files.map((file) => probeImage(path.join(root, file), 'image/png')),
  )
  const urls = Object.fromEntries(imported.map((asset) => [asset.id, asset.url]))
  function source(index: number, label: string, focus: DemonstrationSource['focus']) {
    const asset = imported[index],
      metadata = dimensions[index]
    if (!asset || !metadata?.width || !metadata.height) throw new Error('Fonte ausente')
    return {
      id: randomUUID(),
      assetId: asset.id,
      sha256: asset.sha256,
      width: metadata.width,
      height: metadata.height,
      evidenceId: randomUUID(),
      evidenceRevisionId: randomUUID(),
      label,
      focus,
    }
  }
  const recipes: Array<{
    recipeId: DemonstrationRecipeId
    headline: string
    sources: DemonstrationSource[]
  }> = [
    {
      recipeId: 'detail-context-v1',
      headline: 'A barra revela parte do resultado.',
      sources: [
        source(3, 'Captura antes da resposta do Dragão', {
          x: 0.49,
          y: 0.38,
          width: 0.13,
          height: 0.06,
        }),
      ],
    },
    {
      recipeId: 'rule-result-v1',
      headline: 'Uma regra muda o próximo ataque.',
      sources: [
        source(2, 'Regra: dano-base de 22 ao time', { x: 0, y: 0, width: 1, height: 1 }),
        source(3, 'Condição observada: vida abaixo da metade', {
          x: 0.49,
          y: 0.38,
          width: 0.13,
          height: 0.06,
        }),
      ],
    },
    {
      recipeId: 'before-after-v1',
      headline: 'A plataforma mudou de x = 12 para x = 7.',
      sources: [
        source(0, 'Antes: plataforma distante', { x: 0.59, y: 0.35, width: 0.16, height: 0.09 }),
        source(1, 'Depois: plataforma mais próxima', {
          x: 0.46,
          y: 0.35,
          width: 0.14,
          height: 0.09,
        }),
      ],
    },
  ]
  const serveUrl = path.join(desktop, 'dist/remotion')
  const trackId = randomUUID()
  function timeline(height: number, recipeIndex?: number) {
    const scenes = recipeIndex === undefined ? recipes : [recipes[recipeIndex]]
    return videoSchema.parse({
      schemaVersion: 1,
      recipeVersion: 'marketing-timeline-v1',
      width: 1080,
      height,
      fps: { numerator: 30000, denominator: 1001 },
      durationInFrames: scenes.length * 90,
      tracks: [{ id: trackId, kind: 'visual', muted: false }],
      clips: scenes.map((scene, index) =>
        clipSchema.parse({
          id: randomUUID(),
          trackId,
          kind: 'image',
          assetId: scene?.sources[0]?.assetId,
          startFrame: index * 90,
          durationInFrames: 90,
          fit: 'contain',
          demonstration: { schemaVersion: 1, ...scene },
        }),
      ),
      captions: [],
      background: '#fffcf4',
      accent: '#ffdb56',
    })
  }
  for (const height of [1920, 1350]) {
    for (let index = 0; index < recipes.length; index++) {
      const recipe = recipes[index]
      if (!recipe) throw new Error('Receita ausente')
      const inputProps = { timeline: timeline(height, index), assets: urls }
      const composition = await selectComposition({
        serveUrl,
        id: 'MarketingTimeline',
        inputProps,
        puppeteerInstance: browser,
      })
      const hashes = new Map<number, string>()
      // Last frame first, seek backwards, then repeat last: no dependence on elapsed wall time.
      for (const [order, frame] of [89, 0, 45, 89].entries()) {
        const output = path.join(directory, `${recipe.recipeId}-${height}-${frame}-${order}.png`)
        await renderStill({
          serveUrl,
          composition,
          inputProps,
          output,
          frame,
          imageFormat: 'png',
          puppeteerInstance: browser,
        })
        const digest = sha256(await readFile(output))
        if (hashes.has(frame))
          assert.equal(digest, hashes.get(frame), 'Seek changed the same frame')
        hashes.set(frame, digest)
        const metadata = await probeImage(output, 'image/png')
        assert.equal(metadata.width, 1080)
        assert.equal(metadata.height, height)
      }
      reports.push({
        recipe: recipe.recipeId,
        width: 1080,
        height,
        fps: '30000/1001',
        frames: Object.fromEntries(hashes),
        repeatedLastFrameIdentical: true,
      })
      console.log(`${recipe.recipeId} ${height}: frames and reverse seek passed`)
    }
  }
  const inputProps = { timeline: timeline(1920), assets: urls }
  const composition = await selectComposition({
    serveUrl,
    id: 'MarketingTimeline',
    inputProps,
    puppeteerInstance: browser,
  })
  const mp4 = path.join(directory, 'three-recipes.mp4')
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    outputLocation: mp4,
    codec: 'h264',
    concurrency: 2,
    puppeteerInstance: browser,
  })
  const metadata = await probeVideo(mp4, 'video/mp4', AbortSignal.timeout(120000))
  assert.equal(metadata.width, 1080)
  assert.equal(metadata.height, 1920)
  assert.equal(metadata.codec, 'h264')
  assert.ok(Math.abs((metadata.durationMs ?? 0) - 9009) < 100)
  // Verify hard failures, not a blank scene or silently clipped text.
  const missing = { ...inputProps, assets: {} }
  const missingComposition = await selectComposition({
    serveUrl,
    id: 'MarketingTimeline',
    inputProps: missing,
    puppeteerInstance: browser,
  })
  await assert.rejects(
    () =>
      renderStill({
        serveUrl,
        composition: missingComposition,
        inputProps: missing,
        output: path.join(directory, 'missing.png'),
        imageFormat: 'png',
        puppeteerInstance: browser,
      }),
    /mídia.*carregada/,
  )
  const oversized = structuredClone(inputProps)
  const demo = oversized.timeline.clips[0]?.demonstration
  if (!demo) throw new Error('Cena ausente')
  demo.headline = Array.from({ length: 20 }, () => 'Linha').join('\n')
  const oversizedComposition = await selectComposition({
    serveUrl,
    id: 'MarketingTimeline',
    inputProps: oversized,
    puppeteerInstance: browser,
  })
  await assert.rejects(
    () =>
      renderStill({
        serveUrl,
        composition: oversizedComposition,
        inputProps: oversized,
        output: path.join(directory, 'overflow.png'),
        imageFormat: 'png',
        puppeteerInstance: browser,
      }),
    /texto|Texto/,
  )
  for (const [index, file] of files.entries())
    assert.equal(sha256(await readFile(path.join(root, file))), imported[index]?.sha256)
  await writeFile(
    path.join(audit, 'render-evidence.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        status: 'Local composition proof, not editorial approval or publication',
        environment: {
          platform: os.platform(),
          arch: os.arch(),
          cpu: os.cpus()[0]?.model,
          logicalCpus: os.cpus().length,
          memoryBytes: os.totalmem(),
          bun: Bun.version,
          elapsedMsExcludingBrowserSetup: Math.round(performance.now() - started),
          remotion: '4.0.535',
        },
        sourceDocuments: [
          `${acervo}/p07-primeira-dificuldade/apoio/v3/fontes-e-producao.md`,
          `${acervo}/p08-uma-derrota-nao-conta-tudo/apoio/fontes-e-producao.md`,
        ],
        sources: files.map((file, index) => ({
          file,
          sha256: imported[index]?.sha256,
          dimensions: dimensions[index],
        })),
        scenes: recipes,
        renders: reports,
        mp4: {
          file: 'packages/marketing-desktop/.cache/demonstration-proof/three-recipes.mp4',
          sha256: sha256(await readFile(mp4)),
          ...metadata,
        },
        checks: {
          missingAssetRejected: true,
          textOverflowRejected: true,
          originalSourceHashesPreserved: true,
        },
      },
      null,
      2,
    ),
  )
  console.log('MP4, missing source, text overflow and source integrity passed')
} finally {
  await browser.close({ silent: true })
  assets.close()
}
