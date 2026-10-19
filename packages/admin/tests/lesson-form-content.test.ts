import { expect, test } from 'bun:test'
import { createLessonAsset } from '@sistemazero/pinta/assets'
import { createEmptyProject } from '@sistemazero/studio'
import { type BlockForm, EMPTY_BLOCK } from '../src/lib/lesson-block-form'
import { LessonFormBufferSlot } from '../src/lib/lesson-form-buffer'
import {
  buildLessonFormContent,
  type LessonFormResourceSnapshot,
} from '../src/lib/lesson-form-content'

test('real block content uses both accepted working values before any render or persistence', () => {
  const opening = new LessonFormBufferSlot<BlockForm>(() => true).open('video', {
    ...EMPTY_BLOCK,
    kind: 'video',
    src: 'https://player.vimeo.com/video/123456789',
  })
  opening.update((form) => ({ ...form, posterUrl: 'https://assets.test/current.webp' }))
  opening.update((form) => ({
    ...form,
    captions: [{ lang: 'pt', url: 'https://assets.test/pt.vtt' }],
  }))
  const before = opening.getSnapshot()
  const content = buildLessonFormContent(
    opening,
    { kind: 'none' },
    {
      kind: 'video',
      provider: 'vimeo',
      src: before.src,
      posterUrl: 'https://assets.test/old.webp',
      captions: [],
    },
  )
  if (content.kind !== 'video') throw new Error('Expected video content from the real constructor')
  expect(content.posterUrl).toBe('https://assets.test/current.webp')
  expect(content.captions).toEqual([{ lang: 'pt', url: 'https://assets.test/pt.vtt' }])
  content.captions?.push({ lang: 'en', url: 'https://assets.test/en.vtt' })
  expect(opening.getSnapshot()).toBe(before)
  expect(before.captions).toHaveLength(1)
})

test('a closed A cannot replace the current B content through a retained form setter', () => {
  const slot = new LessonFormBufferSlot<BlockForm>(() => true)
  const a = slot.open('A', { ...EMPTY_BLOCK, kind: 'rich_text', markdown: 'A' })
  const callbackA = a.update
  slot.close(a)
  const b = slot.open('B', { ...EMPTY_BLOCK, kind: 'rich_text', markdown: 'B' })
  expect(callbackA((form) => ({ ...form, markdown: 'late A' }))).toBe(false)
  expect(buildLessonFormContent(b, { kind: 'none' })).toEqual({ kind: 'rich_text', markdown: 'B' })
})

test('Studio and Pinta require explicit resource snapshots instead of seeds or absent handles', () => {
  const studio = new LessonFormBufferSlot<BlockForm>(() => true).open('studio', {
    ...EMPTY_BLOCK,
    kind: 'studio',
  })
  expect(() => buildLessonFormContent(studio, { kind: 'none' })).toThrow('snapshot deste Estúdio')
  const project = createEmptyProject('stable-working-copy', 'Current project')
  const content = buildLessonFormContent(studio, { kind: 'studio', opening: studio, project })
  expect(content.kind).toBe('studio')
  if (content.kind !== 'studio') throw new Error('Expected Studio')
  expect(content.initialProject).toBe(project)

  const pinta = new LessonFormBufferSlot<BlockForm>(() => true).open('pinta', {
    ...EMPTY_BLOCK,
    kind: 'pinta',
  })
  expect(() => buildLessonFormContent(pinta, { kind: 'none' })).toThrow('snapshot deste Pinta')
  const asset = createLessonAsset('pixel-sprite', 32)
  expect(buildLessonFormContent(pinta, { kind: 'pinta', opening: pinta, asset }).kind).toBe('pinta')
  expect(() => buildLessonFormContent(pinta, { kind: 'studio', opening: pinta, project })).toThrow(
    'snapshot deste Pinta',
  )
})

test('a previous resource cannot fill an unrelated form and global solutions are not reinterpreted', () => {
  const slot = new LessonFormBufferSlot<BlockForm>(() => true)
  const opening = slot.open('text', { ...EMPTY_BLOCK, kind: 'rich_text', markdown: 'Current' })
  const project = createEmptyProject('same-project-id', 'Different snapshot')
  expect(() => buildLessonFormContent(opening, { kind: 'studio', opening, project })).toThrow(
    'tipo atual',
  )
  expect(() =>
    buildLessonFormContent(
      opening,
      { kind: 'none' },
      {
        kind: 'studio',
        initialProject: project,
        solutionProject: project,
      },
    ),
  ).toThrow('gabarito global')
  expect(opening.getSnapshot().markdown).toBe('Current')
})

test('same-kind resource snapshots keep their exact form opening across A to B and renewal', () => {
  const slot = new LessonFormBufferSlot<BlockForm>(() => true)
  const a = slot.open('A', { ...EMPTY_BLOCK, kind: 'studio' })
  const project = createEmptyProject('same-project-id', 'A bytes')
  const resourceA = { kind: 'studio', opening: a, project } satisfies LessonFormResourceSnapshot
  slot.close(a)
  const b = slot.open('B', { ...EMPTY_BLOCK, kind: 'studio' })
  expect(() => buildLessonFormContent(b, resourceA)).toThrow('outra abertura')
  const oldB = { kind: 'studio', opening: b, project } satisfies LessonFormResourceSnapshot
  const resumedB = slot.renew(b)
  expect(() => buildLessonFormContent(resumedB, oldB)).toThrow('outra abertura')
})

test('a retained capture callback cannot serialize a closed opening as the current form', () => {
  const slot = new LessonFormBufferSlot<BlockForm>(() => true)
  const old = slot.open('same-block', { ...EMPTY_BLOCK, kind: 'rich_text', markdown: 'old' })
  const captureOld = () => buildLessonFormContent(old, { kind: 'none' })
  slot.close(old)
  slot.open('same-block', { ...EMPTY_BLOCK, kind: 'rich_text', markdown: 'current' })
  expect(captureOld).toThrow('ativa')
})

test('a current opening remains readable for explicit capture while ordinary gestures are fenced', () => {
  let canEdit = true
  const slot = new LessonFormBufferSlot<BlockForm>(() => canEdit)
  const opening = slot.open('block', { ...EMPTY_BLOCK, kind: 'rich_text', markdown: 'accepted' })
  canEdit = false
  expect(opening.update((form) => ({ ...form, markdown: 'refused' }))).toBe(false)
  expect(buildLessonFormContent(opening, { kind: 'none' })).toEqual({
    kind: 'rich_text',
    markdown: 'accepted',
  })
})
