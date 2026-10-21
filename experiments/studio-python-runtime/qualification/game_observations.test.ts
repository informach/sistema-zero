import { expect, test } from 'bun:test'
import { decodeGameObservations } from './game_observations'

for (const prefix of ['__SZ_PACMAN_QA__', '__SZ_SPACE_QA__', '__SZ_SPACE_INPUT__']) {
  test(`${prefix} waits for a complete observation across every console fragment boundary`, () => {
    const value = { event: 'case-passed', value: { name: 'player-wall-0', label: 'posição 🟡' } }
    const record = `${prefix}${JSON.stringify(value)}\n`
    for (let boundary = 0; boundary < record.length; boundary++) {
      expect(decodeGameObservations(record.slice(0, boundary), prefix)).toEqual([])
    }
    expect(decodeGameObservations(record, prefix)).toEqual([value])
  })
}

test('complete observations survive a later incomplete console record', () => {
  const prefix = '__SZ_SPACE_INPUT__'
  const first = { kind: 'input-ready', simulationCalls: 0 }
  const text = `FPS: 60\n${prefix}${JSON.stringify(first)}\n${prefix}{"kind":"pause-proof"`
  expect(decodeGameObservations(text, prefix)).toEqual([first])
})

test('malformed completed JSON is a preserved failure, never silently omitted', () => {
  expect(() => decodeGameObservations('__SZ_SPACE_QA__{"invalid":}\n', '__SZ_SPACE_QA__')).toThrow()
})

test('CRLF, escaped newlines, unrelated stdout and other marker types stay distinct', () => {
  const value = { kind: 'input-delivered', text: 'first\nsecond' }
  expect(
    decodeGameObservations(
      `FPS: 0\r\n__SZ_PACMAN_QA__{}\r\n__SZ_SPACE_INPUT__${JSON.stringify(value)}\r\n`,
      '__SZ_SPACE_INPUT__',
    ),
  ).toEqual([value])
})
