import { expect, test } from 'bun:test'
import {
  cancelLessonMediaFocus,
  hasLessonMediaFocus,
  registerLessonMedia,
  requestLessonMediaFocus,
} from '../src/lib/lesson-media-focus'

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

test('a newer play request supersedes an older request still waiting for a video pause', async () => {
  const first = Symbol('first'),
    second = Symbol('second')
  let paused: (() => void) | undefined
  const removeFirst = registerLessonMedia(first, () => {})
  const removeSecond = registerLessonMedia(
    second,
    () =>
      new Promise<void>((resolve) => {
        paused = resolve
      }),
  )
  try {
    const old = requestLessonMediaFocus(first)
    expect(await requestLessonMediaFocus(second)).toBe(true)
    paused?.()
    expect(await old).toBe(false)
  } finally {
    removeFirst()
    removeSecond()
  }
})

test('unmount invalidates a play request that is still waiting', async () => {
  const narration = Symbol('narration'),
    video = Symbol('video')
  let paused: (() => void) | undefined
  const removeNarration = registerLessonMedia(narration, () => {})
  const removeVideo = registerLessonMedia(
    video,
    () =>
      new Promise<void>((resolve) => {
        paused = resolve
      }),
  )
  try {
    const pending = requestLessonMediaFocus(narration)
    removeNarration()
    paused?.()
    expect(await pending).toBe(false)
  } finally {
    removeNarration()
    removeVideo()
  }
})

test('turning sound off cancels pending focus and a later play can acquire it again', async () => {
  const narration = Symbol('narration'),
    video = Symbol('video')
  let paused: (() => void) | undefined
  const removeNarration = registerLessonMedia(narration, () => {})
  const removeVideo = registerLessonMedia(
    video,
    () =>
      new Promise<void>((resolve) => {
        paused = resolve
      }),
  )
  try {
    const pending = requestLessonMediaFocus(narration)
    cancelLessonMediaFocus(narration)
    paused?.()
    expect(await pending).toBe(false)
    expect(hasLessonMediaFocus(narration)).toBe(false)
    removeVideo()
    expect(await requestLessonMediaFocus(narration)).toBe(true)
  } finally {
    removeNarration()
    removeVideo()
  }
})

test('a fala do Zappy e o relógio da cena convivem; o vídeo ainda pausa os dois (08/11/2026)', async () => {
  const fala = Symbol('fala'),
    relogio = Symbol('relogio'),
    video = Symbol('video')
  const pausas: string[] = []
  const tirar = [
    registerLessonMedia(fala, () => pausas.push('fala'), { tipo: 'fala' }),
    registerLessonMedia(relogio, () => pausas.push('relogio'), { tipo: 'relogio' }),
    registerLessonMedia(video, () => pausas.push('video')),
  ]
  try {
    expect(await requestLessonMediaFocus(fala)).toBe(true)
    expect(pausas).toEqual(['video'])
    expect(await requestLessonMediaFocus(relogio)).toBe(true)
    expect(pausas).toEqual(['video', 'video'])
    expect(await requestLessonMediaFocus(video)).toBe(true)
    expect(pausas.slice(2).sort()).toEqual(['fala', 'relogio'])
  } finally {
    for (const t of tirar) t()
  }
})
