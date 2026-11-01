import { expect, test } from 'bun:test'
import { recordingPart } from '../src/lib/recording-part'

test('sem escolha abre normalmente e a numeração explícita começa em um', () => {
  expect(recordingPart(undefined)).toBeNull()
  expect(recordingPart('1')).toBe(1)
  expect(recordingPart('23')).toBe(23)
})
test('uma parte inválida não cai silenciosamente na primeira', () => {
  for (const value of ['', '0', '-1', '1.5', '100', '02', 'abc', ' 2'])
    expect(() => recordingPart(value)).toThrow(RangeError)
})
