import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { test } from 'node:test'
import { BUILTIN_ART } from '../src/builtins.generated.ts'
import { readWebAnimation } from '../vendor/edi-web-data.mjs'

test('built-in expressions and both chest poses have immutable verified artwork and real WebP reserves', async () => {
  const folder = resolve(import.meta.dirname, '../assets')
  const manifest = JSON.parse(await readFile(resolve(folder, 'manifest.json'), 'utf8'))
  assert.equal(Object.keys(BUILTIN_ART).length, 7)
  for (const art of Object.values(BUILTIN_ART)) {
    const file = basename(art.url)
    const posterFile = basename(art.poster.url)
    const content = await readFile(resolve(folder, file))
    const poster = await readFile(resolve(folder, posterFile))
    assert.equal(createHash('sha256').update(content).digest('hex'), art.sha256)
    assert.equal(createHash('sha256').update(poster).digest('hex'), art.poster.sha256)
    assert.ok(file.includes(`.${art.sha256.slice(0, 12)}.`), 'A nova arte deve receber outra URL')
    assert.ok(
      posterFile.includes(`.${art.poster.sha256.slice(0, 12)}.`),
      'A reserva também precisa mudar de URL',
    )
    assert.equal(manifest.files[file].bytes, content.byteLength)
    assert.equal(manifest.files[posterFile].bytes, poster.byteLength)
    assert.equal(poster.toString('ascii', 0, 4), 'RIFF')
    assert.equal(poster.toString('ascii', 8, 12), 'WEBP')
    assert.equal(JSON.parse(content.toString('utf8')).poster, undefined)
    assert.equal(readWebAnimation(content.toString('utf8')).title, art.title)
  }
  assert.notEqual(BUILTIN_ART.chest.poster.url, BUILTIN_ART.chestOpen.poster.url)
})

test('speech and chest controls preserve authored names, initial values and the already open pose', async () => {
  const read = async (url: string) =>
    JSON.parse(await readFile(resolve(import.meta.dirname, '../assets', basename(url)), 'utf8'))
  const speech = await read(BUILTIN_ART.speaking.url)
  const chest = await read(BUILTIN_ART.chest.url)
  const opened = await read(BUILTIN_ART.chestOpen.url)
  assert.equal(
    speech.document.behavior.inputs.find((input: { name: string }) => input.name === 'falando')
      .initial,
    false,
  )
  assert.equal(
    chest.document.behavior.inputs.find((input: { name: string }) => input.name === 'aberto')
      .initial,
    false,
  )
  assert.equal(
    opened.document.behavior.inputs.find((input: { name: string }) => input.name === 'aberto')
      .initial,
    true,
  )
  const machine = opened.document.behavior.machines.find(
    (item: { id: string }) => item.id === opened.document.behavior.defaultMachineId,
  )
  for (const layer of machine.layers)
    assert.equal(
      layer.states.find((state: { id: string }) => state.id === layer.entryStateId).name,
      'Aberto',
    )
})
