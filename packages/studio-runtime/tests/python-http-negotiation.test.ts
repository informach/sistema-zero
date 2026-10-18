import { expect, test } from 'bun:test'
import {
  pythonRuntimeNotModified,
  selectPythonRuntimeEncoding,
} from '../src/python-http-negotiation'

test('negotiates gzip without overriding exclusions or explicit identity preference', () => {
  const cases: [string | null, boolean, 'gzip' | 'identity' | undefined][] = [
    [null, true, 'identity'],
    ['', true, 'identity'],
    ['  ', true, 'identity'],
    ['gzip, deflate, br', true, 'gzip'],
    ['GZIP;Q=0.7', true, 'gzip'],
    ['gzip;q=0', true, 'identity'],
    ['gzip;q=0, *;q=1', true, 'identity'],
    ['gzip;q=0, identity;q=0', true, undefined],
    ['br, identity;q=0', true, undefined],
    ['*', true, 'gzip'],
    ['*;q=0', true, undefined],
    ['gzip;q=1, *;q=0', true, 'gzip'],
    ['identity;q=1, gzip;q=0.5', true, 'identity'],
    ['identity;q=0.5, gzip;q=1', true, 'gzip'],
    ['identity;q=0, *;q=1', true, 'gzip'],
    ['identity;q=0.5, *;q=0', true, 'identity'],
    ['gzip', false, 'identity'],
    ['gzip, identity;q=0', false, undefined],
    ['identity', true, 'identity'],
    ['gzip;q=1.001', true, 'identity'],
    ['gzip;q=-1', true, 'identity'],
    ['gzip;q=1.000', true, 'gzip'],
    ['gzip;q=0, gzip;q=1', true, 'identity'],
    ['gzip;level=9', true, 'identity'],
    [', gzip, ,', true, 'gzip'],
    ['gzip'.repeat(3000), true, undefined],
  ]
  for (const [header, available, expected] of cases)
    expect(selectPythonRuntimeEncoding(header, available), String(header)).toBe(expected)
})

test('conditional GET/HEAD matches only the selected representation, with weak tag comparison', () => {
  const identity = `"${'a'.repeat(64)}"`
  const gzip = `"${'b'.repeat(64)}"`
  for (const header of [identity, `W/${identity}`, `"other", W/${identity}`, '*'])
    expect(pythonRuntimeNotModified(header, identity)).toBe(true)
  for (const header of [null, '', gzip, 'W/garbage', identity.slice(1, -1), 'x'.repeat(9000)])
    expect(pythonRuntimeNotModified(header, identity)).toBe(false)
  expect(pythonRuntimeNotModified(identity, gzip)).toBe(false)
  expect(pythonRuntimeNotModified(`${identity}, ${gzip}`, gzip)).toBe(true)
})
