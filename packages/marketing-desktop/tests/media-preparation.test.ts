import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { mediaInputArguments, mediaProcess } from '../src/main/media/media-process'
import { prepareVideo } from '../src/main/media/prepare-video'
import { probeVideo } from '../src/main/media/probe-video'
import { prepareWaveform } from '../src/main/media/waveform'

test('WebM de navegador sem média de FPS preserva original e prepara derivada por timestamps', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-webm-review-'))
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('marketing-webm-review-')
  )
    throw new Error('Pasta fora da prova')
  const file = path.resolve(import.meta.dir, 'fixtures/browser-vp9-no-average-rate.webm')
  const before = await readFile(file)
  const signal = AbortSignal.timeout(30000)
  try {
    const metadata = await probeVideo(file, 'video/webm', signal)
    expect(metadata).toMatchObject({
      codec: 'vp9',
      width: 800,
      height: 600,
      frameRate: null,
      hasAudio: false,
    })
    expect(metadata.durationMs).toBeCloseTo(3938.762, 2)
    const prepared = await prepareVideo(file, 'video/webm', root, signal, true)
    expect(prepared.metadata.frameRate).toEqual({ numerator: 30, denominator: 1 })
    expect(
      Math.abs((prepared.metadata.durationMs ?? 0) - (metadata.durationMs ?? 0)),
    ).toBeLessThanOrEqual(100)
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-xerror',
        ...mediaInputArguments(prepared.file, 'video/mp4'),
        '-c:v',
        'libx264',
        '-threads',
        '2',
        '-f',
        'null',
        '-',
      ],
      signal,
    )
    expect(
      createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
    ).toBe(createHash('sha256').update(before).digest('hex'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 35000)

test('FFmpeg incorporado lê vídeo/áudio reais, MOV rotacionado, arquivo incompleto e cancelamento', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-media-'))
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('marketing-media-')
  )
    throw new Error('Diretório temporário inválido')
  const signal = AbortSignal.timeout(45000),
    source = path.join(root, 'gravação com espaço.mp4'),
    rotated = path.join(root, 'celular.mov')
  try {
    const image = path.join(root, 'quadro.png')
    await sharp({ create: { width: 160, height: 90, channels: 3, background: '#e33030' } })
      .png()
      .toFile(image)
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-loop',
        '1',
        '-framerate',
        '30000/1001',
        '-i',
        image,
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=2',
        '-t',
        '2',
        '-c:v',
        'libx264',
        '-threads',
        '2',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-shortest',
        source,
      ],
      signal,
    )
    const original = await readFile(source),
      metadata = await probeVideo(source, 'video/mp4', signal)
    expect(metadata).toMatchObject({
      width: 160,
      height: 90,
      hasAudio: true,
      codec: 'h264',
      rotation: 0,
      frameRate: { numerator: 30000, denominator: 1001 },
    })
    expect(metadata.durationMs).toBeGreaterThanOrEqual(2000)
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-display_rotation:v:0',
        '90',
        ...mediaInputArguments(source, 'video/mp4'),
        '-c',
        'copy',
        rotated,
      ],
      signal,
    )
    expect(await probeVideo(rotated, 'video/quicktime', signal)).toMatchObject({
      width: 160,
      height: 90,
      rotation: 90,
      hasAudio: true,
    })
    const presentation = await prepareVideo(
      rotated,
      'video/quicktime',
      path.join(root, 'prepared'),
      signal,
      true,
    )
    expect(presentation.metadata).toMatchObject({
      width: 90,
      height: 160,
      rotation: 0,
      codec: 'h264',
      hasAudio: true,
      frameRate: { numerator: 30, denominator: 1 },
    })
    const waveform = await prepareWaveform(
      {
        file: source,
        mime: 'video/mp4',
        assetId: crypto.randomUUID(),
        sha256: 'a'.repeat(64),
        durationMs: metadata.durationMs ?? 0,
      },
      root,
      signal,
    )
    expect(waveform.peaks.length).toBeLessThanOrEqual(2000)
    expect(Math.max(...waveform.peaks)).toBeGreaterThan(0)
    const silent = path.join(root, 'sem áudio.mp4')
    await mediaProcess(
      'ffmpeg',
      ['-v', 'error', ...mediaInputArguments(source, 'video/mp4'), '-an', '-c:v', 'copy', silent],
      signal,
    )
    expect((await probeVideo(silent, 'video/mp4', signal)).hasAudio).toBe(false)
    const truncated = path.join(root, 'incompleto.mp4')
    await writeFile(truncated, original.subarray(0, 64))
    await expect(probeVideo(truncated, 'video/mp4', signal)).rejects.toThrow()
    await expect(probeVideo(source, 'audio/wav', signal)).rejects.toThrow()
    await expect(
      mediaProcess('ffprobe', ['-version'], AbortSignal.abort(new Error('Cancelado pela pessoa'))),
    ).rejects.toThrow('Cancelado pela pessoa')
    expect(await readFile(source)).toEqual(original)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 60000)

test('vídeo VFR é preparado em CFR mantendo duração e posição temporal das imagens', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'marketing-vfr-'))
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('marketing-vfr-')
  )
    throw new Error('Diretório temporário inválido')
  const signal = AbortSignal.timeout(30000)
  try {
    for (const [index, color] of ['#ff0000', '#00ff00', '#0000ff'].entries())
      await sharp({ create: { width: 320, height: 240, channels: 3, background: color } })
        .png()
        .toFile(path.join(root, `frame-${index}.png`))
    const list = path.join(root, 'frames.txt'),
      source = path.join(root, 'vfr.mp4')
    await writeFile(
      list,
      "ffconcat version 1.0\nfile 'frame-0.png'\nduration 0.12\nfile 'frame-1.png'\nduration 0.8\nfile 'frame-2.png'\nduration 0.28\nfile 'frame-2.png'\n",
    )
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-f',
        'concat',
        '-safe',
        '1',
        '-i',
        list,
        '-fps_mode',
        'vfr',
        '-c:v',
        'libx264',
        '-bf',
        '0',
        '-threads',
        '2',
        '-pix_fmt',
        'yuv420p',
        source,
      ],
      signal,
    )
    const original = await readFile(source),
      sourceMetadata = await probeVideo(source, 'video/mp4', signal)
    const prepared = await prepareVideo(
      source,
      'video/mp4',
      path.join(root, 'prepared'),
      signal,
      true,
    )
    expect(prepared.metadata.frameRate).toEqual({ numerator: 30, denominator: 1 })
    expect(
      Math.abs((prepared.metadata.durationMs ?? 0) - (sourceMetadata.durationMs ?? 0)),
    ).toBeLessThanOrEqual(100)
    for (const [seconds, channel] of [
      [0.05, 0],
      [0.5, 1],
      [1.1, 2],
    ]) {
      const image = path.join(root, `check-${channel}.png`)
      await mediaProcess(
        'ffmpeg',
        [
          '-v',
          'error',
          '-ss',
          String(seconds),
          ...mediaInputArguments(prepared.file, 'video/mp4'),
          '-frames:v',
          '1',
          image,
        ],
        signal,
      )
      const stats = await sharp(image).stats()
      expect(stats.channels[channel ?? -1]?.mean).toBeGreaterThan(230)
    }
    expect(await readFile(source)).toEqual(original)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 45000)
