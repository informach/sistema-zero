import { expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { assetToJson } from './assetJson'
import { recoveryJson } from './recoveryJson'

test('recovery retains unknown fields/version and uses the native byte-skin wire format', () => {
  const model = makeModel()
  const extra = { formatVersion: 2, animations: [{ name: 'andar', keys: [1, 2] }] }
  const raw = { ...model, ...extra }
  expect(JSON.parse(recoveryJson(raw))).toEqual({ ...assetToJson(model), ...extra })
  expect(raw.parts[0]?.faces.py?.data).toBeInstanceOf(Uint8Array)
})

test('recovery refuses unrepresentable values instead of producing a lossy file', () => {
  for (const raw of [{ value: Number.NaN }, { buffer: new Float32Array([1]) }, { fn: () => 1 }]) {
    expect(() => recoveryJson(raw)).toThrow()
  }
  const circular: Record<string, unknown> = {}
  circular.self = circular
  expect(() => recoveryJson(circular)).toThrow()
})
