import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { readPythonAudioWav } from '../../runtime/python/audio/wav'
import { PYTHON_EXAMPLE_SUMMARIES } from '../pythonCatalog'
import { VISUAL_REFERENCE_GAME_BLOCKS } from './visualReferenceGames.blocks.generated'
import { VISUAL_REFERENCE_GAMES } from './visualReferenceGames.manifest'

for (const { key: game, sounds } of VISUAL_REFERENCE_GAMES)
  test(`${game} offers the same complete editable program in Blocks and Code with portable original sounds`, async () => {
    const blocks = PYTHON_EXAMPLE_SUMMARIES.find(({ key }) => key === `python:${game}:blocks`)
    const code = PYTHON_EXAMPLE_SUMMARIES.find(({ key }) => key === `python:${game}:code`)
    expect(blocks).toMatchObject({ kind: 'classic', mode: 'blocks' })
    expect(code).toMatchObject({ kind: 'pro', mode: 'code' })
    if (!blocks || !code) throw new Error(`Missing presentations for ${game}`)
    expect(blocks).not.toHaveProperty('files')
    expect(code).not.toHaveProperty('assets')
    const blockPayload = await blocks.load()
    expect(await code.load()).toEqual(blockPayload)
    const qualified = VISUAL_REFERENCE_GAME_BLOCKS[game]
    expect(blocks.requiredBlockIds).toEqual(qualified.blockIds)
    expect(code.requiredBlockIds).toBeUndefined()
    expect(createHash('sha256').update(blockPayload.files['main.py']!).digest('hex')).toBe(
      qualified.sourceSha256,
    )
    expect(blockPayload.entrypoint).toBe('main.py')
    expect(Object.keys(blockPayload.files).sort()).toEqual([
      'LICENSE',
      'NOTICE.md',
      'README.md',
      'main.py',
      'requirements.txt',
    ])
    for (const [path, contents] of Object.entries(blockPayload.files))
      expect(contents).toBe(
        (await readFile(new URL(`./${game}/${path}`, import.meta.url), 'utf8')).replaceAll(
          '\r\n',
          '\n',
        ),
      )
    expect(blockPayload.files['requirements.txt']).toBe('')
    expect(blockPayload.files.LICENSE).toContain('Copyright (c) 2026 Sistema Zero')
    expect(blockPayload.assets).toHaveLength(sounds.length)
    expect(blocks.requiredProvidedModules).toEqual([{ importName: 'sz_audio', version: '1.0.0' }])
    expect(new Set(blockPayload.assets?.map(({ id }) => id)).size).toBe(sounds.length)
    for (const asset of blockPayload.assets ?? []) {
      if (!asset.proPath) throw new Error('Portable sound path required')
      const bytes = new Uint8Array(Buffer.from(asset.dataUrl.split(',')[1]!, 'base64'))
      expect(asset.kind).toBe('audio')
      expect(asset.license?.name).toBe('MIT')
      expect(asset.license?.attribution).toContain('originais')
      expect(bytes).toEqual(
        new Uint8Array(await readFile(new URL(`./${game}/${asset.proPath}`, import.meta.url))),
      )
      expect(readPythonAudioWav(bytes)).toMatchObject({ channels: 1, sampleRate: 22050 })
      expect(bytes.subarray(44).some((value) => value !== 0)).toBe(true)
    }
  })
