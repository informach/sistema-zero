import { describe, expect, test } from 'bun:test'
import {
  normalizeVersion,
  parseRequestedVersion,
  resolveVersionMapping,
  stripVersionPrefix,
} from '../../src/domain/versioning/version'

const vh = { accept: 'accept-version', explicit: 'x-api-version' }

describe('version', () => {
  test('normalizeVersion', () => {
    expect(normalizeVersion('1')).toBe('v1')
    expect(normalizeVersion('v2')).toBe('v2')
    expect(normalizeVersion('V3')).toBe('v3')
  })

  test('precedência: path > header explícito > accept > default', () => {
    expect(parseRequestedVersion('/v2/payments', new Headers(), vh, 'v1')).toEqual({
      version: 'v2',
      fromPath: true,
    })
    expect(
      parseRequestedVersion('/payments', new Headers({ 'x-api-version': '3' }), vh, 'v1'),
    ).toEqual({ version: 'v3', fromPath: false })
    expect(
      parseRequestedVersion('/payments', new Headers({ 'accept-version': 'v4' }), vh, 'v1'),
    ).toEqual({ version: 'v4', fromPath: false })
    expect(parseRequestedVersion('/payments', new Headers(), vh, 'v1')).toEqual({
      version: 'v1',
      fromPath: false,
    })
  })

  test('stripVersionPrefix', () => {
    expect(stripVersionPrefix('/v1/payments/123')).toBe('/payments/123')
    expect(stripVersionPrefix('/v2')).toBe('/')
    expect(stripVersionPrefix('/payments')).toBe('/payments')
  })

  test('resolveVersionMapping', () => {
    const versions = [{ version: 'v1', deprecated: true, sunset: 'Wed, 01 Jan 2025 00:00:00 GMT' }]
    expect(resolveVersionMapping(versions, 'v1')?.deprecated).toBe(true)
    expect(resolveVersionMapping(versions, 'v2')).toBeUndefined()
    expect(resolveVersionMapping(undefined, 'v1')).toBeUndefined()
  })
})
