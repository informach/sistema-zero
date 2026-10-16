import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  assetManifestSchema,
  rasterExport,
  runViewSchema,
  videoSchema,
} from '@sistemazero/marketing-contracts'
import { app } from 'electron'
import sharp from 'sharp'
import { z } from 'zod'
import { LocalAssets } from './assets'
import { mediaProcess } from './media/media-process'
import { probeVideo } from './media/probe-video'
import { renderArt } from './media/render-art'
import { renderReceipt } from './media/render-identity'
import { renderTimeline } from './media/render-timeline'

/** Uses a real provider result, then exercises the same isolated render process as production. */
export async function proveHybridVideo() {
  if (app.isPackaged) throw new Error('Prova disponível somente no checkout')
  const base = path.join(app.getAppPath(), '.cache'),
    directory = path.join(base, 'hybrid-video-proof')
  await mkdir(directory, { recursive: true })
  const assets = new LocalAssets(path.join(directory, 'assets'))
  await assets.start()
  try {
    const proof = z
      .object({ run: runViewSchema })
      .parse(
        JSON.parse(
          await readFile(path.join(base, 'video-adaptation-proof/codex-evidence.json'), 'utf8'),
        ),
      )
    const proposal = proof.run.outcome?.status === 'succeeded' ? proof.run.outcome.video : undefined
    const adapted = proposal?.variants[0]?.timeline,
      art = adapted?.clips[0]?.art
    if (!adapted || !art) throw new Error('Execute a prova nativa de adaptação antes do render')
    const source = await assets.importFile(path.join(base, 'timeline-proof/original com áudio.mp4'))
    const metadata = await probeVideo(
      (await assets.verify(source.id)).path,
      source.mime,
      AbortSignal.timeout(30000),
    )
    const id = () => crypto.randomUUID(),
      overlayTrack = id(),
      visualTrack = adapted.tracks[0]?.id
    if (!visualTrack) throw new Error('Trilha ausente')
    const timeline = videoSchema.parse({
      ...adapted,
      durationInFrames: 180,
      tracks: [...adapted.tracks, { id: overlayTrack, kind: 'visual' }],
      clips: [
        ...adapted.clips,
        {
          id: id(),
          trackId: visualTrack,
          kind: 'video',
          assetId: source.id,
          startFrame: 90,
          durationInFrames: 90,
          sourceStartMs: 500,
          fit: 'cover',
        },
        {
          id: id(),
          trackId: overlayTrack,
          kind: 'text',
          text: 'Etapas da criação',
          effect: 'list',
          listItems: ['Planejar', 'Criar', 'Testar'].map((text) => ({ id: id(), text })),
          position: 'top',
          startFrame: 90,
          durationInFrames: 30,
        },
        {
          id: id(),
          trackId: overlayTrack,
          kind: 'text',
          text: 'Etapas da atividade',
          effect: 'counter',
          counter: { from: 0, to: 3, prefix: '', suffix: ' etapas', decimals: 0 },
          startFrame: 120,
          durationInFrames: 30,
        },
        {
          id: id(),
          trackId: overlayTrack,
          kind: 'text',
          text: 'Conheça a atividade',
          effect: 'cta',
          position: 'bottom',
          startFrame: 150,
          durationInFrames: 30,
        },
      ],
      captions: [
        {
          id: id(),
          assetId: source.id,
          startMs: 500,
          endMs: 1300,
          text: 'Criação em ação.',
          corrected: true,
        },
      ],
    })
    const output = await renderTimeline(
      { timeline, assets: { [source.id]: source.url } },
      { assets },
      directory,
      AbortSignal.timeout(300000),
    )
    const outputPath = (await assets.verify(output.id)).path
    const final = await probeVideo(outputPath, 'video/mp4', AbortSignal.timeout(30000))
    if (!final.hasAudio || Math.abs((final.durationMs ?? 0) - 6000) > 100)
      throw new Error('Áudio ou duração incorretos')
    const still = await renderArt(
      { composition: art.composition, title: art.title, body: art.body, assets: {} },
      { assets },
      path.join(directory, 'source-art'),
      AbortSignal.timeout(90000),
    )
    const frameFile = path.join(directory, 'art-frame.png')
    await mediaProcess(
      'ffmpeg',
      ['-v', 'error', '-y', '-ss', '1', '-i', outputPath, '-frames:v', '1', frameFile],
      AbortSignal.timeout(30000),
    )
    const reference = await sharp((await assets.verify(still.id)).path)
        .removeAlpha()
        .raw()
        .toBuffer(),
      actual = await sharp(frameFile).removeAlpha().raw().toBuffer()
    if (actual.length !== reference.length) throw new Error('Dimensões da arte alteradas')
    let error = 0
    for (let index = 0; index < actual.length; index++)
      error += Math.abs((actual[index] ?? 0) - (reference[index] ?? 0))
    const meanPixelError = error / actual.length
    if (meanPixelError > 3)
      throw new Error(`A arte mudou na conversão: erro médio ${meanPixelError}`)
    const jpeg = await renderArt(
      { composition: art.composition, title: art.title, body: art.body, assets: {} },
      { assets },
      path.join(directory, 'source-art-jpeg'),
      AbortSignal.timeout(90000),
      'jpeg',
    )
    const jpegPath = (await assets.verify(jpeg.id)).path,
      jpegMetadata = await sharp(jpegPath).metadata(),
      jpegPixels = await sharp(jpegPath).removeAlpha().raw().toBuffer()
    if (
      jpeg.mime !== 'image/jpeg' ||
      jpegMetadata.width !== art.composition.width ||
      jpegMetadata.height !== art.composition.height ||
      jpegPixels.length !== reference.length
    )
      throw new Error('A exportação JPEG não conservou formato e dimensões')
    let jpegError = 0
    for (let index = 0; index < jpegPixels.length; index++)
      jpegError += Math.abs((jpegPixels[index] ?? 0) - (reference[index] ?? 0))
    const jpegMeanPixelError = jpegError / reference.length
    if (jpegMeanPixelError > 3)
      throw new Error(`Perda excessiva na exportação JPEG: ${jpegMeanPixelError}`)
    if (proof.run.context.source.document.kind !== 'component')
      throw new Error('Arte de origem ausente')
    const { composition: _composition, ...rasterDocument } = proof.run.context.source.document
    const rasterManifest = assetManifestSchema.parse({
      id: still.id,
      name: still.name,
      size: still.size,
      sha256: still.sha256,
      mime: still.mime,
      schemaVersion: 1,
      projectId: proof.run.request.projectId,
      role: 'final',
      sourceAssetId: null,
      width: art.composition.width,
      height: art.composition.height,
      codec: 'png',
      rotation: 0,
      durationMs: null,
    })
    const raster = rasterExport(
      { ...proof.run.context.source, document: { ...rasterDocument, assetIds: [still.id] } },
      [rasterManifest],
    )
    const converted = await renderArt(
      { composition: raster.composition, body: '', title: '', assets: { [still.id]: still.url } },
      { assets },
      path.join(directory, 'raster-jpeg'),
      AbortSignal.timeout(90000),
      'jpeg',
    )
    const convertedPixels = await sharp((await assets.verify(converted.id)).path)
      .removeAlpha()
      .raw()
      .toBuffer()
    if (convertedPixels.length !== reference.length)
      throw new Error('A conversão raster alterou as dimensões')
    let rasterError = 0
    for (let index = 0; index < convertedPixels.length; index++)
      rasterError += Math.abs((convertedPixels[index] ?? 0) - (reference[index] ?? 0))
    const rasterMeanPixelError = rasterError / reference.length
    if (rasterMeanPixelError > 3)
      throw new Error(`A conversão raster alterou a arte: ${rasterMeanPixelError}`)
    await assets.verify(still.id)
    for (const [label, second] of [
      ['list', 3.8],
      ['counter', 4.8],
      ['cta', 5.7],
    ] as const)
      await mediaProcess(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-ss',
          String(second),
          '-i',
          outputPath,
          '-frames:v',
          '1',
          path.join(directory, `${label}.png`),
        ],
        AbortSignal.timeout(30000),
      )
    const sourceRevision = {
      ...proof.run.context.source,
      id: id(),
      document: {
        schemaVersion: 1 as const,
        kind: 'video' as const,
        title: 'Composição híbrida de verificação',
        representationId: id(),
        timeline,
      },
    }
    const receipt = await renderReceipt(
      {
        ...proof.run,
        context: {
          ...proof.run.context,
          source: sourceRevision,
          assets: [
            assetManifestSchema.parse({
              schemaVersion: 1,
              id: source.id,
              projectId: proof.run.request.projectId,
              name: source.name,
              size: source.size,
              sha256: source.sha256,
              mime: source.mime,
              role: 'original',
              sourceAssetId: null,
              ...metadata,
            }),
          ],
        },
      },
      output,
    )
    const before = assets.list().length,
      overflowArt = structuredClone(art)
    overflowArt.body = 'Texto que não cabe na composição. '.repeat(120)
    let overflowRejected = false
    try {
      await renderArt(
        {
          composition: overflowArt.composition,
          title: overflowArt.title,
          body: overflowArt.body,
          assets: {},
        },
        { assets },
        path.join(directory, 'overflow'),
        AbortSignal.timeout(90000),
      )
    } catch (error) {
      if (error instanceof Error && error.message.includes('ultrapassa')) overflowRejected = true
      else throw error
    }
    if (!overflowRejected || assets.list().length !== before)
      throw new Error('Texto excedente não bloqueou a exportação')
    await assets.verify(source.id)
    await writeFile(
      path.join(directory, 'evidence.json'),
      JSON.stringify(
        {
          passed: true,
          originalPreserved: true,
          meanPixelError,
          jpegMeanPixelError,
          rasterMeanPixelError,
          jpeg: {
            sha256: jpeg.sha256,
            width: jpegMetadata.width,
            height: jpegMetadata.height,
            mime: jpeg.mime,
          },
          overflowRejected,
          timeline,
          final,
          receipt,
        },
        null,
        2,
      ),
    )
    console.log(
      JSON.stringify({
        hybridRenderPassed: true,
        meanPixelError,
        overflowRejected,
        durationMs: final.durationMs,
        hasAudio: final.hasAudio,
      }),
    )
  } finally {
    assets.close()
  }
}
