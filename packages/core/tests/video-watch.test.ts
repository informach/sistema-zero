import { describe, expect, test } from 'bun:test'
import {
  defaultLessonSection,
  isVideoOnlySection,
  legacyLessonSections,
  mergeVideoCoverage,
  mergeVideoWatchAnswers,
  readVideoCoverage,
  sectionCompletionIssues,
  videoWatchedFraction,
} from '../src/learning'

describe('video-only sections', () => {
  test('seeks, overlap and replay cannot fabricate watched coverage', () => {
    expect(videoWatchedFraction({ videoDuration: 100, videoRanges: ['0:20', '90:100'] })).toBe(0.3)
    expect(
      videoWatchedFraction({ videoDuration: 100, videoRanges: ['0:50', '0:50', '20:80'] }),
    ).toBe(0.8)
    expect(videoWatchedFraction({ videoDuration: 100, videoRanges: ['0:50', '50:90'] })).toBe(0.9)
    expect(videoWatchedFraction({ positionSeconds: 100 })).toBe(0)
    expect(readVideoCoverage({ videoDuration: 100, videoRanges: ['0:101'] })).toBeNull()
  })
  test('resuming merges different sessions and ignores coverage from a different duration', () => {
    expect(
      mergeVideoWatchAnswers(
        { videoDuration: 100, videoRanges: ['0:45'] },
        { videoDuration: 100, videoRanges: ['45:90'] },
      ),
    ).toEqual({ videoDuration: 100, videoRanges: ['0:90'] })
    expect(
      mergeVideoCoverage(
        { duration: 100, ranges: [[0, 90]] },
        { duration: 200, ranges: [[0, 30]] },
      ),
    ).toEqual({ duration: 200, ranges: [[0, 30]] })
  })
  test('a video with a workspace or another activity cannot become a watch-time gate', () => {
    const blocks = [
      { id: 'v', kind: 'video', content: { kind: 'video' } },
      { id: 's', kind: 'studio', content: { kind: 'studio' } },
    ]
    const section = {
      ...defaultLessonSection('section', 'Vídeo', ['v']),
      completion: { version: 1 as const, blockIds: ['v'] },
    }
    expect(isVideoOnlySection(section, blocks)).toBe(true)
    expect(sectionCompletionIssues([section], blocks)).toEqual([])
    expect(
      sectionCompletionIssues([{ ...section, workspaceBlockId: 's' }], blocks).some((i) =>
        i.message.includes('90%'),
      ),
    ).toBe(true)
    expect(isVideoOnlySection({ ...section, blockIds: ['v', 's'] }, blocks)).toBe(false)
  })
  test('legacy projection retains two stages and stable project identity; no missing activity is invented', () => {
    const blocks = [
      { id: 'v', kind: 'video' },
      { id: 's', kind: 'studio' },
      { id: 'q', kind: 'quiz' },
    ]
    const sections = legacyLessonSections('lesson', 'Aula', blocks)
    expect(sections.map((s) => s.blockIds)).toEqual([['v', 's'], ['q']])
    expect(sections[0]?.workspaceBlockId).toBe('s')
    expect(
      legacyLessonSections(
        'lesson',
        'Aula',
        blocks.filter((b) => b.kind !== 'studio'),
      ).map((s) => s.blockIds),
    ).toEqual([['v'], ['q']])
    expect(
      legacyLessonSections(
        'lesson',
        'Aula',
        blocks.filter((b) => b.kind !== 'quiz'),
      ),
    ).toHaveLength(1)
  })
})
