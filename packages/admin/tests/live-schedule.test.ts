import { describe, expect, test } from 'bun:test'
import type { LiveCohort, LiveCourseSummary } from '@sistemazero/core/live'
import {
  buildSchedule,
  cohortsByCourse,
  LIVE_TIME_ZONES,
  mergeById,
  timeZoneOptions,
  zonedLocalToUtcIso,
} from '../src/lib/live-schedule'

describe('datas da turma de curso ao vivo', () => {
  test('a hora digitada é lida no fuso da TURMA, não no do computador', () => {
    expect(zonedLocalToUtcIso('2026-10-17T15:00', 'America/Sao_Paulo')).toBe(
      '2026-10-17T18:00:00.000Z',
    )
    expect(zonedLocalToUtcIso('2026-10-17T15:00', 'America/Manaus')).toBe(
      '2026-10-17T19:00:00.000Z',
    )
    expect(zonedLocalToUtcIso('2026-10-17T15:00', 'America/Noronha')).toBe(
      '2026-10-17T17:00:00.000Z',
    )
    // Virada do dia no UTC.
    expect(zonedLocalToUtcIso('2026-12-31T22:30', 'America/Sao_Paulo')).toBe(
      '2027-01-01T01:30:00.000Z',
    )
    expect(zonedLocalToUtcIso('', 'America/Sao_Paulo')).toBeNull()
    expect(zonedLocalToUtcIso('17/10/2026 15:00', 'America/Sao_Paulo')).toBeNull()
  })

  test('um intervalo por aula, na ordem do curso, com o recado do que consertar', () => {
    const ok = buildSchedule(
      [
        { start: '2026-10-17T15:00', end: '2026-10-17T16:30' },
        { start: '2026-10-24T15:00', end: '2026-10-24T16:30' },
      ],
      'America/Sao_Paulo',
    )
    expect(ok).toEqual({
      ok: true,
      schedule: [
        { startsAt: '2026-10-17T18:00:00.000Z', endsAt: '2026-10-17T19:30:00.000Z' },
        { startsAt: '2026-10-24T18:00:00.000Z', endsAt: '2026-10-24T19:30:00.000Z' },
      ],
    })
    expect(buildSchedule([], 'America/Sao_Paulo')).toMatchObject({ ok: false })
    expect(
      buildSchedule([{ start: '2026-10-17T15:00', end: '' }], 'America/Sao_Paulo'),
    ).toMatchObject({ ok: false, error: 'Informe o início e o fim do encontro 1.' })
    expect(
      buildSchedule([{ start: '2026-10-17T15:00', end: '2026-10-17T15:00' }], 'America/Sao_Paulo'),
    ).toMatchObject({ ok: false, error: expect.stringContaining('encontro 1, o fim') })
    expect(
      buildSchedule(
        [
          { start: '2026-10-17T15:00', end: '2026-10-17T16:30' },
          { start: '2026-10-17T16:00', end: '2026-10-17T17:00' },
        ],
        'America/Sao_Paulo',
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('O encontro 2 começa antes') })
  })

  test('os fusos do Brasil e o do computador quando é outro', () => {
    expect(timeZoneOptions('America/Sao_Paulo')).toHaveLength(LIVE_TIME_ZONES.length)
    const withLisbon = timeZoneOptions('Europe/Lisbon')
    expect(withLisbon.at(-1)).toEqual({
      value: 'Europe/Lisbon',
      label: 'Europe/Lisbon (este computador)',
    })
  })

  test('as turmas ficam com o curso delas; as sem curso listado ficam à parte', () => {
    const course = (id: string): LiveCourseSummary => ({
      id,
      slug: id,
      title: id,
      audience: 'kids',
      description: '',
      coverImageUrl: null,
      lessons: [],
    })
    const cohort = (id: string, courseId: string | null): LiveCohort => ({
      id,
      programId: '',
      courseId,
      title: id,
      timeZone: 'America/Sao_Paulo',
      capacity: 8,
      accessDays: 30,
      teacherIds: [],
      status: 'draft',
      createdAt: '2026-10-14T00:00:00Z',
    })
    const { byCourse, others } = cohortsByCourse(
      [course('a'), course('b')],
      [cohort('t1', 'a'), cohort('t2', null), cohort('t3', 'z'), cohort('t4', 'a')],
    )
    expect(byCourse.get('a')?.map((item) => item.id)).toEqual(['t1', 't4'])
    expect(byCourse.get('b')).toEqual([])
    expect(others.map((item) => item.id)).toEqual(['t2', 't3'])
    expect(
      mergeById(
        [{ id: '1', v: 1 }],
        [
          { id: '1', v: 2 },
          { id: '2', v: 3 },
        ],
      ),
    ).toEqual([
      { id: '1', v: 2 },
      { id: '2', v: 3 },
    ])
  })
})
