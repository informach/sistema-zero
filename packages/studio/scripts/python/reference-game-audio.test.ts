import { expect, test } from 'bun:test'
import { VISUAL_REFERENCE_GAMES } from '../../src/examples/python/visualReferenceGames.manifest'
import { readPythonAudioWav } from '../../src/runtime/python/audio/wav'
import { REFERENCE_GAME_SOUNDS, renderReferenceSound } from './reference-game-audio'

test('every original sound is deterministic, audible PCM16 material within runtime limits', () => {
  expect(REFERENCE_GAME_SOUNDS).toHaveLength(
    VISUAL_REFERENCE_GAMES.reduce((total, game) => total + game.sounds.length, 0),
  )
  for (const sound of REFERENCE_GAME_SOUNDS) {
    const first = renderReferenceSound(sound)
    expect(first).toEqual(renderReferenceSound(sound))
    expect(readPythonAudioWav(first)).toMatchObject({ channels: 1, sampleRate: 22050 })
    expect(first.length).toBeLessThan(200000)
    expect(first.subarray(44).some((value) => value !== 0)).toBe(true)
    expect(new DataView(first.buffer, first.byteOffset, first.byteLength).getInt16(44, true)).toBe(
      0,
    )
  }
  for (const game of VISUAL_REFERENCE_GAMES) {
    const paths = game.sounds.map(({ path }) => path)
    expect(game.sounds.length).toBeGreaterThan(0)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path).toMatch(/^[a-z][a-z0-9_]*\.wav$/)
  }
})

test('invalid scores fail explicitly instead of generating silence or excessive material', () => {
  const valid = REFERENCE_GAME_SOUNDS[0]!
  for (const notes of [[], [NaN], [0], [9000], [440.1]])
    expect(() => renderReferenceSound({ ...valid, notes })).toThrow()
  for (const noteMilliseconds of [NaN, 0, 1001, 10.5])
    expect(() => renderReferenceSound({ ...valid, noteMilliseconds })).toThrow()
})
