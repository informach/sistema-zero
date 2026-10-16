import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { videoSchema } from '@sistemazero/marketing-contracts'
import { app } from 'electron'
import { LocalAssets } from './assets'
import { boundedMediaProcess, mediaProcess } from './media/media-process'
import { probeVideo } from './media/probe-video'
import { renderProcess } from './media/render-process'
import { renderTimeline } from './media/render-timeline'
import type { ChunkProgress } from './media/timeline-chunks'
import { DiskBudget } from './sync/disk-budget'

/** Actual Electron utility processes, FFmpeg, cache restart and rational-FPS seam comparison. */
export async function proveRenderChunks() {
  if (app.isPackaged) throw new Error('Prova disponível somente no checkout')
  // Independent test-fixture/measurement tool. The application renderer continues
  // to use only its bundled Remotion binaries (which omit testsrc2 and PSNR).
  const fullFFmpeg = process.argv
    .find((argument) => argument.startsWith('--proof-ffmpeg='))
    ?.slice('--proof-ffmpeg='.length)
  assert(
    fullFFmpeg &&
      path.isAbsolute(fullFFmpeg) &&
      /^ffmpeg(?:\.exe)?$/.test(path.basename(fullFFmpeg)),
    'Informe o FFmpeg completo para gerar e medir a amostra de teste',
  )
  const directory = path.join(app.getAppPath(), '.cache/render-chunks-proof', crypto.randomUUID())
  await mkdir(directory, { recursive: true })
  const budget = new DiskBudget(directory),
    assets = new LocalAssets(path.join(directory, 'assets'), (bytes) => budget.reserve(bytes)),
    deadline = AbortSignal.timeout(600000),
    phases: Array<{ name: string; elapsedMs: number; progress: ChunkProgress[] }> = []
  await assets.start()
  try {
    const original = path.join(directory, 'fonte com áudio.mp4')
    await boundedMediaProcess(
      fullFFmpeg,
      [
        '-v',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=320x240:rate=30000/1001:duration=16',
        '-f',
        'lavfi',
        '-i',
        'aevalsrc=0.08*sin(2*PI*(220*t+25*t*t))+0.04*sin(2*PI*773*t):s=48000:d=16',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-colorspace',
        'bt709',
        '-color_primaries',
        'bt709',
        '-color_trc',
        'bt709',
        '-c:a',
        'aac',
        '-shortest',
        original,
      ],
      deadline,
    )
    const source = await assets.importFile(original),
      track = crypto.randomUUID(),
      overlay = crypto.randomUUID()
    const timeline = videoSchema.parse({
      schemaVersion: 1,
      recipeVersion: 'marketing-timeline-v1',
      width: 320,
      height: 240,
      fps: { numerator: 30000, denominator: 1001 },
      durationInFrames: 440,
      background: '#172a46',
      accent: '#ffdb56',
      captions: [],
      tracks: [
        { id: track, kind: 'visual' },
        { id: overlay, kind: 'visual' },
      ],
      clips: [
        {
          id: crypto.randomUUID(),
          trackId: track,
          kind: 'video',
          assetId: source.id,
          startFrame: 0,
          durationInFrames: 440,
          sourceStartMs: 500,
          volume: 0.7,
          fadeInFrames: 7,
          fadeOutFrames: 11,
        },
        ...[10, 180, 330].map((startFrame, index) => ({
          id: crypto.randomUUID(),
          trackId: overlay,
          kind: 'text',
          text: `Cena ${index + 1}`,
          startFrame,
          durationInFrames: 100,
        })),
      ],
    })
    const props = { timeline, assets: { [source.id]: source.url } }
    const run = async (name: string, value = props) => {
      const progress: ChunkProgress[] = [],
        started = Date.now()
      const output = await renderTimeline(
        value,
        { assets },
        path.join(directory, name),
        deadline,
        (step) => {
          progress.push(step)
          console.log(JSON.stringify({ phase: name, ...step }))
        },
      )
      phases.push({ name, elapsedMs: Date.now() - started, progress })
      return (await assets.verify(output.id)).path
    }
    const first = await run('initial')
    assert.deepEqual(phases[0]?.progress.at(-1), {
      total: 3,
      rendered: 3,
      reused: 0,
      audioReused: false,
    })
    const changed = structuredClone(props)
    changed.timeline.clips[2]!.text = 'Detalhe ajustado'
    await run('edited', changed)
    assert.deepEqual(phases[1]?.progress.at(-1), {
      total: 3,
      rendered: 1,
      reused: 2,
      audioReused: true,
    })
    await run('repeated', changed)
    assert.deepEqual(phases[2]?.progress.at(-1), {
      total: 3,
      rendered: 0,
      reused: 3,
      audioReused: true,
    })
    const reference = path.join(directory, 'reference.mp4'),
      input = path.join(directory, 'reference.json')
    await writeFile(input, JSON.stringify(props))
    await renderProcess(input, reference, 'timeline', deadline)
    const metadata = await probeVideo(first, 'video/mp4', deadline)
    assert.equal(metadata.hasAudio, true)
    assert.equal(metadata.colorSpace, 'bt709')
    const frameCounts = []
    for (const file of [first, reference]) {
      const result = await mediaProcess(
        'ffprobe',
        [
          '-v',
          'error',
          '-count_frames',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=nb_read_frames',
          '-of',
          'csv=p=0',
          file,
        ],
        deadline,
      )
      frameCounts.push(Number(result.stdout.trim()))
    }
    assert.deepEqual(frameCounts, [440, 440])
    const videoQuality = await boundedMediaProcess(
      fullFFmpeg,
      [
        '-v',
        'info',
        '-i',
        first,
        '-i',
        reference,
        '-filter_complex',
        '[0:v][1:v]psnr',
        '-an',
        '-f',
        'null',
        '-',
      ],
      deadline,
    )
    const psnr = Number(/average:([\d.]+)/.exec(videoQuality.stderr)?.[1])
    assert(psnr > 35, `Qualidade entre render integral e trechos: PSNR ${psnr}`)
    const pcm: Buffer[] = []
    for (const [index, file] of [first, reference].entries()) {
      const output = path.join(directory, `audio-${index}.f32`)
      await boundedMediaProcess(
        fullFFmpeg,
        ['-v', 'error', '-y', '-i', file, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', output],
        deadline,
      )
      pcm.push(await readFile(output))
    }
    const a = pcm[0]!,
      b = pcm[1]!,
      samples = Math.min(a.length, b.length) / 4
    assert(
      Math.abs(a.length - b.length) / 4 <= 1024,
      'Duração de áudio diverge além de um pacote AAC',
    )
    const seams = [150, 300].map((frame) => {
      const center = Math.round((frame / (30000 / 1001)) * 48000),
        from = center - 7200,
        to = Math.min(samples, center + 7200)
      let squared = 0
      for (let at = from; at < to; at++)
        squared += (a.readFloatLE(at * 4) - b.readFloatLE(at * 4)) ** 2
      const rmse = Math.sqrt(squared / (to - from))
      assert(rmse < 0.01, `Descontinuidade na junção ${frame}: RMSE ${rmse}`)
      return { frame, samples: to - from, rmse }
    })
    const adjustedAudio = structuredClone(changed)
    adjustedAudio.timeline.clips[0]!.volume = 0.35
    await run('audio-edited', adjustedAudio)
    assert.deepEqual(phases[3]?.progress.at(-1), {
      total: 3,
      rendered: 0,
      reused: 3,
      audioReused: false,
    })
    const silentTimeline = videoSchema.parse({
      ...timeline,
      durationInFrames: 30,
      fps: { numerator: 30, denominator: 1 },
      tracks: [{ id: overlay, kind: 'visual' }],
      clips: [
        {
          id: crypto.randomUUID(),
          trackId: overlay,
          kind: 'text',
          text: 'Sem áudio',
          startFrame: 0,
          durationInFrames: 30,
        },
      ],
    })
    const silentOutput = await run('silent', { timeline: silentTimeline, assets: {} })
    const silentMetadata = await probeVideo(silentOutput, 'video/mp4', deadline)
    assert.equal(silentMetadata.hasAudio, true)
    assert(Math.abs((silentMetadata.durationMs ?? 0) - 1000) < 100)
    // A separate cache proves cancellation preserves a completed chunk and that
    // fresh local-media URLs after restart do not invalidate its content identity.
    const restartDirectory = path.join(directory, 'restart-assets')
    let restarted = new LocalAssets(restartDirectory, (bytes) => budget.reserve(bytes))
    await restarted.start()
    try {
      const local = await restarted.importFile(original),
        controller = new AbortController(),
        steps: ChunkProgress[] = [],
        cancelled = { ...props, assets: { [source.id]: local.url } }
      await assert.rejects(
        renderTimeline(
          cancelled,
          { assets: restarted },
          path.join(directory, 'cancelled'),
          controller.signal,
          (step) => {
            steps.push(step)
            if (step.rendered === 1) controller.abort(new Error('Cancelamento da prova'))
          },
        ),
      )
      assert.equal(steps[0]?.rendered, 1)
      restarted.close()
      restarted = new LocalAssets(restartDirectory, (bytes) => budget.reserve(bytes))
      await restarted.start()
      const restored = restarted.list().find((asset) => asset.id === local.id)
      assert(restored)
      const progress: ChunkProgress[] = []
      await renderTimeline(
        { ...props, assets: { [source.id]: restored.url } },
        { assets: restarted },
        path.join(directory, 'resumed'),
        deadline,
        (step) => progress.push(step),
      )
      assert.deepEqual(progress.at(-1), { total: 3, rendered: 2, reused: 1, audioReused: false })
      const evidence = {
        directory,
        phases,
        frameCounts,
        psnr,
        seams,
        audioSampleCounts: [a.length / 4, b.length / 4],
        metadata,
        silentMetadata,
        cancelledAfter: steps[0],
        resumed: progress.at(-1),
      }
      await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
      console.log(JSON.stringify(evidence))
    } finally {
      restarted.close()
    }
  } finally {
    assets.close()
  }
}
