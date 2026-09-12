import { expect, test } from 'bun:test'
import { registerLessonMedia, requestLessonMediaFocus } from '../src/lib/lesson-media-focus'

test('narration pauses embedded video and reports failed pauses; unmount removes the player', async () => {
  const video = Symbol('video'),
    narration = Symbol('narration')
  const pauses: string[] = []
  const removeVideo = registerLessonMedia(video, async () => {
    pauses.push('video')
  })
  const removeNarration = registerLessonMedia(narration, () => {
    pauses.push('narration')
  })
  try {
    expect(await requestLessonMediaFocus(narration)).toBe(true)
    expect(pauses).toEqual(['video'])
    expect(await requestLessonMediaFocus(video)).toBe(true)
    expect(pauses).toEqual(['video', 'narration'])
    removeVideo()
    expect(await requestLessonMediaFocus(narration)).toBe(true)
    expect(pauses).toHaveLength(2)
    const removeBroken = registerLessonMedia(video, async () => {
      throw new Error('Player unavailable')
    })
    expect(await requestLessonMediaFocus(narration)).toBe(false)
    removeBroken()
  } finally {
    removeVideo()
    removeNarration()
  }
})
