import { describe, expect, test } from 'bun:test'
import { summarizeAsset } from '../core/assetSummary'
import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { createMemoryPersistence } from './memoryPersistence'

describe('memory persistence document contract', () => {
  test('unsupported input cannot be saved individually, conditionally or in a batch', async () => {
    const future = { ...makeModel(), formatVersion: 2, clips: ['andar'] }
    const p = createMemoryPersistence()
    for (const write of [
      () => p.save(future),
      () => p.saveIfUnchanged(future, null),
      () => p.saveMany([makeSky(), future]),
    ]) {
      await expect(write()).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
      expect(p.snapshot()).toEqual([])
    }
  })

  test('a stored future document blocks every replacement and removal atomically', async () => {
    const future = { ...makeModel(), formatVersion: 2, clips: ['andar'] }
    const sky = makeSky()
    const p = createMemoryPersistence([sky, future])
    for (const mutate of [
      () => p.save(makeModel()),
      () => p.saveIfUnchanged(makeModel(), future.updatedAt),
      () => p.saveMany([{ ...sky, name: 'changed' }, makeModel()]),
      () => p.remove(future.id),
      () => p.removeIfUnchanged(future.id, future.updatedAt),
      () => p.removeMany([sky.id, future.id]),
    ]) {
      await expect(mutate()).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
      expect(p.snapshot()).toEqual([sky, future])
    }
  })

  test('future reads are recoverable and listings report issues without exposing owned raw data', async () => {
    const future = { ...makeModel(), formatVersion: 2, clips: ['andar'] }
    const sky = makeSky()
    const p = createMemoryPersistence([future, sky])
    await expect(p.load(future.id)).rejects.toBeInstanceOf(MoldaUnsupportedVersionError)
    const read = await p.read?.(future.id)
    expect(read).toEqual({ status: 'unsupported', version: 2, raw: future })
    if (read?.status !== 'unsupported') throw new Error('Expected unsupported read')
    expect(read.raw).not.toBe(future)
    Object.assign(read.raw as object, { name: 'mutated outside' })
    expect(await p.read?.(future.id)).toEqual({ status: 'unsupported', version: 2, raw: future })
    expect(await p.listSummaries?.()).toEqual([summarizeAsset(sky)])
    expect(p.getReadIssues?.()).toEqual([
      { id: future.id, name: future.name, status: 'unsupported', version: 2 },
    ])
    expect(await p.loadAll()).toEqual([sky])
    expect(p.getReadIssues?.()).toHaveLength(1)
    expect(await p.read?.('absent')).toBeNull()
    p.seed([sky])
    expect(await p.loadAll()).toEqual([sky])
    expect(p.getReadIssues?.()).toEqual([])
  })

  test('all clones are prepared before mutation, including a failure in the last input', async () => {
    const initial = makeModel()
    const p = createMemoryPersistence([initial])
    const unclonable = { ...makeSky(), unexpectedFunction: () => undefined }
    await expect(p.saveMany([{ ...initial, name: 'changed' }, unclonable])).rejects.toThrow()
    expect(p.snapshot()).toEqual([initial])
    expect(await p.loadRecovery?.(initial.id)).toBeUndefined()
    expect(() => p.seed([makeTexture(), unclonable])).toThrow()
    expect(p.snapshot()).toEqual([initial])
  })

  test('migration preserves the oldest exact original and recovery is independently cloned', async () => {
    const original = { ...makeTexture(), metadata: { legacy: ['keep'] } }
    const p = createMemoryPersistence([original])
    await p.save({ ...makeTexture(), name: 'changed' })
    expect(await p.read?.(original.id)).toMatchObject({
      status: 'valid',
      legacy: false,
      sourceVersion: 1,
    })
    const recovery = await p.loadRecovery?.(original.id)
    expect(recovery).toEqual(original)
    Object.assign(recovery as object, { name: 'changed outside' })
    await p.save({ ...makeTexture(), name: 'changed twice' })
    expect(await p.loadRecovery?.(original.id)).toEqual(original)
    await p.remove(original.id)
    expect(await p.load(original.id)).toBeNull()
    expect(await p.loadRecovery?.(original.id)).toBeUndefined()
  })

  test('corrupt known documents are not absent for CAS but allow explicit repair or removal', async () => {
    const corrupt = { ...makeModel(), formatVersion: 0 }
    const p = createMemoryPersistence([corrupt])
    expect(await p.load(corrupt.id)).toBeNull()
    expect(await p.loadAll()).toEqual([])
    expect(p.getReadIssues?.()).toEqual([{ id: corrupt.id, name: corrupt.name, status: 'invalid' }])
    expect(await p.saveIfUnchanged(makeModel(), null)).toBe(false)
    expect(await p.removeIfUnchanged(corrupt.id, null)).toBe(false)
    await p.save(makeModel())
    expect(await p.loadRecovery?.(corrupt.id)).toEqual(corrupt)
    p.seed([corrupt])
    await p.remove(corrupt.id)
    expect(p.snapshot()).toEqual([])
  })

  test('caller buffers, reads and snapshots never mutate storage; CAS consumes one revision', async () => {
    const initial = makeTexture()
    const p = createMemoryPersistence()
    await p.save(initial)
    const stored = structuredClone(initial)
    initial.bitmap.data.fill(0)
    expect(await p.load(initial.id)).toEqual(stored)
    const next = { ...stored, updatedAt: stored.updatedAt + 1 }
    expect(
      await Promise.all([
        p.saveIfUnchanged(next, stored.updatedAt),
        p.saveIfUnchanged({ ...next, name: 'late' }, stored.updatedAt),
      ]),
    ).toEqual([true, false])
    const snapshot = p.snapshot()[0]
    if (snapshot?.kind !== 'texture') throw new Error('Expected texture')
    snapshot.bitmap.data.fill(0)
    expect(await p.load(initial.id)).toEqual(next)
    expect(await p.removeIfUnchanged(initial.id, stored.updatedAt)).toBe(false)
    expect(await p.removeIfUnchanged(initial.id, next.updatedAt)).toBe(true)
    expect(await p.saveIfUnchanged(next, null)).toBe(true)
  })
})
