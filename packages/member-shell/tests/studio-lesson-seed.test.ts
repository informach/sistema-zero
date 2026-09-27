import { describe, expect, mock, test } from 'bun:test'
import type { Project } from '@sistemazero/studio'
import { resolveStudioLessonSeed } from '../src/lib/studio-lesson-seed'

const local = { id: 'lesson-child', name: 'Meu trabalho local' } as Project
const submitted = { id: 'submitted', name: 'Minha entrega' } as Project
const carryover = { id: 'previous', name: 'Aula anterior' } as Project
const initial = { id: 'initial', name: 'Projeto inicial' } as Project

describe('saved lesson project priority', () => {
  test('keeps local work ahead of the submitted project and the template', async () => {
    const cloud = mock(async () => submitted)
    expect(
      await resolveStudioLessonSeed({ local: async () => local, submitted: cloud, initial }),
    ).toBe(local)
    expect(cloud).not.toHaveBeenCalled()
  })

  test('a local migration failure cannot open a submitted project or the template', async () => {
    const failure = new Error('historical project needs recovery')
    const cloud = mock(async () => submitted)
    await expect(
      resolveStudioLessonSeed({
        local: async () => {
          throw failure
        },
        submitted: cloud,
        initial,
      }),
    ).rejects.toBe(failure)
    expect(cloud).not.toHaveBeenCalled()
  })

  test('an unavailable browser database cannot be mistaken for an empty draft', async () => {
    await expect(
      resolveStudioLessonSeed({
        local: async () => {
          throw new Error('IndexedDB unavailable')
        },
        initial,
      }),
    ).rejects.toThrow('IndexedDB unavailable')
  })

  test('without a local draft, restores the submitted work before the previous lesson', async () => {
    expect(
      await resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => submitted,
        carryover: async () => carryover,
        initial,
      }),
    ).toBe(submitted)
  })

  test('uses the previous lesson only when the local draft and submission are absent', async () => {
    expect(
      await resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => null,
        carryover: async () => carryover,
        initial,
      }),
    ).toBe(carryover)
  })

  test('uses the initial project only after confirming there is no saved work', async () => {
    expect(
      await resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => null,
        carryover: async () => null,
        initial,
      }),
    ).toBe(initial)
  })

  test('a failed submission read cannot open the initial project', async () => {
    await expect(
      resolveStudioLessonSeed({
        local: async () => null,
        submitted: async () => {
          throw new Error('submission unavailable')
        },
        initial,
      }),
    ).rejects.toThrow('submission unavailable')
  })
})
