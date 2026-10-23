import { describe, expect, test } from 'bun:test'
import {
  cohortPatch,
  familyLabel,
  MAX_TEACHERS,
  mergeStaffPages,
  type StaffUser,
  teacherSelectionPayload,
  teacherShortName,
  toggleTeacher,
} from '../src/lib/live-teachers'

const user = (id: string, firstName: string, lastName = '', role = 'staff'): StaffUser => ({
  id,
  firstName,
  lastName,
  email: `${id}@sistemazero.com.br`,
  role,
})
const ana = user('ana', 'Ana Paula', 'Souza', 'admin')
const bia = user('bia', 'Bia', 'Lima')
const caio = user('caio', '', '', 'superadmin')

describe('escolha das professoras da turma', () => {
  test('o payload leva os ids e o primeiro nome de cada professora', () => {
    expect(teacherSelectionPayload(['ana', 'bia'], [ana, bia])).toEqual({
      ok: true,
      teacherIds: ['ana', 'bia'],
      teacherNames: { ana: 'Ana', bia: 'Bia' },
    })
  })

  test('quem não veio na lista da equipe usa o nome conhecido (a própria pessoa)', () => {
    expect(teacherSelectionPayload(['eu'], [], { eu: 'Helena' })).toEqual({
      ok: true,
      teacherIds: ['eu'],
      teacherNames: { eu: 'Helena' },
    })
    // Sem nome conhecido, vai só o id: o servidor decide o rótulo.
    expect(teacherSelectionPayload(['x'], [])).toEqual({
      ok: true,
      teacherIds: ['x'],
      teacherNames: {},
    })
  })

  test('recusa turma sem professora e acima de quatro, sem repetir ids', () => {
    expect(teacherSelectionPayload([], [ana])).toEqual({
      ok: false,
      error: 'Escolha pelo menos uma professora.',
    })
    expect(teacherSelectionPayload(['a', 'b', 'c', 'd', 'e'], []).ok).toBe(false)
    const repeated = teacherSelectionPayload(['ana', 'ana'], [ana])
    expect(repeated.ok && repeated.teacherIds).toEqual(['ana'])
  })

  test('marcar respeita o teto e desmarcar nunca deixa a turma vazia', () => {
    const four = ['a', 'b', 'c', 'd']
    expect(MAX_TEACHERS).toBe(4)
    expect(toggleTeacher(four, 'e', true)).toEqual(four)
    expect(toggleTeacher(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleTeacher(['a', 'b'], 'a', false)).toEqual(['b'])
    expect(toggleTeacher(['a'], 'a', false)).toEqual(['a'])
  })

  test('as páginas por papel viram uma lista sem repetição, por nome', () => {
    const merged = mergeStaffPages([[bia, ana], [ana], [caio]])
    expect(merged.map((item) => item.id)).toEqual(['ana', 'bia', 'caio'])
    expect(teacherShortName(caio)).toBe('caio')
  })

  test('o PATCH da turma leva só o que mudou', () => {
    const cohort = { status: 'draft' as const, teacherIds: ['ana'] }
    const same = teacherSelectionPayload(['ana'], [ana])
    const both = teacherSelectionPayload(['bia', 'ana'], [ana, bia])
    if (!same.ok || !both.ok) throw new Error('seleção inválida')
    expect(cohortPatch(cohort, { status: 'draft', selection: same })).toBeNull()
    expect(cohortPatch(cohort, { status: 'open', selection: same })).toEqual({ status: 'open' })
    expect(cohortPatch(cohort, { status: 'draft', selection: both })).toEqual({
      teacherIds: ['bia', 'ana'],
      teacherNames: { bia: 'Bia', ana: 'Ana' },
    })
    // A ordem não importa para "mudou".
    const reordered = { status: 'open' as const, teacherIds: ['ana', 'bia'] }
    expect(cohortPatch(reordered, { status: 'open', selection: both })).toBeNull()
  })

  test('a família na lista de inscrições', () => {
    expect(familyLabel({ id: '1', name: 'Rita Alves', email: 'rita@x.com' })).toBe(
      'Rita Alves · rita@x.com',
    )
    expect(familyLabel({ id: '1', name: '', email: 'rita@x.com' })).toBe('rita@x.com')
    expect(familyLabel(undefined)).toBeNull()
  })
})
