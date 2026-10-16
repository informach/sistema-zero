import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { inspectDemonstrationImage } from '../src/main/media/demonstration-image'
import { cropRegion, mergeRegion } from '../src/main/media/image-region'
import { probeImage } from '../src/main/media/probe-image'

async function imageDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-image-'))
  if (
    path.dirname(directory) !== path.resolve(os.tmpdir()) ||
    !path.basename(directory).startsWith('marketing-image-')
  )
    throw new Error('Diretório inválido')
  return directory
}

test('demonstração confere dimensões e orientação dos pixels, além do manifesto', async () => {
  const directory = await imageDirectory()
  try {
    const file = path.join(directory, 'captura.jpg')
    const source = { width: 320, height: 480 }
    for (const orientation of [1, 3, 6, 8]) {
      await writeFile(
        file,
        await sharp({
          create: { width: 320, height: 480, channels: 3, background: '#172a46' },
        })
          .withMetadata({ orientation })
          .jpeg()
          .toBuffer(),
      )
      if (orientation === 1) {
        expect(await inspectDemonstrationImage(file, 'image/jpeg', source)).toMatchObject(source)
        await expect(
          inspectDemonstrationImage(file, 'image/jpeg', { width: 480, height: 320 }),
        ).rejects.toThrow('dimensões')
      } else {
        await expect(inspectDemonstrationImage(file, 'image/jpeg', source)).rejects.toThrow(
          'normalizada',
        )
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('imagem é decodificada e o manifesto não aceita extensão falsa ou pixels truncados', async () => {
  const directory = await imageDirectory()
  try {
    const file = path.join(directory, 'teste com acento.png')
    const bytes = await sharp({
      create: { width: 320, height: 480, channels: 3, background: '#172a46' },
    })
      .png()
      .toBuffer()
    await writeFile(file, bytes)
    expect(await probeImage(file, 'image/png')).toMatchObject({
      width: 320,
      height: 480,
      codec: 'png',
      rotation: 0,
    })
    await expect(probeImage(file, 'image/jpeg')).rejects.toThrow(/tipo declarado/)
    await writeFile(file, bytes.subarray(0, bytes.length - 60))
    await expect(probeImage(file, 'image/png')).rejects.toThrow()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
test('imagem e recorte funcionam no caminho longo do cache por conta e projeto', async () => {
  const directory = await imageDirectory()
  try {
    const nested = path.join(directory, 'a'.repeat(100), 'b'.repeat(100), 'c'.repeat(60))
    await mkdir(nested, { recursive: true })
    const file = path.join(nested, 'original.png'),
      crop = path.join(nested, 'recorte.png')
    await writeFile(
      file,
      await sharp({ create: { width: 20, height: 30, channels: 3, background: '#123456' } })
        .png()
        .toBuffer(),
    )
    expect(await probeImage(file, 'image/png')).toMatchObject({ width: 20, height: 30 })
    await cropRegion(file, { x: 0, y: 0, width: 0.5, height: 0.5 }, crop)
    expect(await probeImage(crop, 'image/png')).toMatchObject({ width: 10, height: 15 })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
test('edição regional preserva cada pixel fora da seleção e o arquivo original', async () => {
  const directory = await imageDirectory()
  try {
    const source = path.join(directory, 'original.png'),
      crop = path.join(directory, 'recorte.png')
    const original = await sharp({
      create: { width: 40, height: 30, channels: 4, background: { r: 12, g: 34, b: 56, alpha: 1 } },
    })
      .png()
      .toBuffer()
    await writeFile(source, original)
    const region = { x: 0.25, y: 0.2, width: 0.5, height: 0.5 }
    await cropRegion(source, region, crop)
    expect(await probeImage(crop, 'image/png')).toMatchObject({ width: 20, height: 15 })
    const generated = await sharp({
      create: {
        width: 80,
        height: 60,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer()
    const merged = await mergeRegion(source, region, generated),
      pixels = await sharp(merged).ensureAlpha().raw().toBuffer()
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 40; x++) {
        const at = (y * 40 + x) * 4
        if (x < 10 || x >= 30 || y < 6 || y >= 21)
          expect([...pixels.subarray(at, at + 4)]).toEqual([12, 34, 56, 255])
        else expect([...pixels.subarray(at, at + 4)]).toEqual([255, 0, 0, 128])
      }
    expect(await Bun.file(source).bytes()).toEqual(new Uint8Array(original))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
