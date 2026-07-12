import { describe, expect, test } from 'bun:test'
import { computeStudentLevel } from '../../src/domain/gamification/levels'

describe('computeStudentLevel', () => {
  test('sem cursos qualificados → Noob; falta 1 p/ Coder', () => {
    const r = computeStudentLevel({ iniciante: 0, intermediario: 0, avancado: 0 })
    expect(r.slug).toBe('noob')
    expect(r.next).toBe('coder')
    expect(r.remaining).toEqual({ any: 1, iniciante: 0, intermediario: 0, avancado: 0 })
  })

  test('1 curso qualificado (qualquer nível) → Coder; faltam 5 iniciantes p/ Hacker', () => {
    expect(computeStudentLevel({ iniciante: 0, intermediario: 1, avancado: 0 }).slug).toBe('coder')
    const r = computeStudentLevel({ iniciante: 1, intermediario: 0, avancado: 0 })
    expect(r.slug).toBe('coder')
    expect(r.next).toBe('hacker')
    // Piso do Hacker = 6 iniciantes: feito 1 (virou Coder), faltam 5.
    expect(r.remaining).toEqual({ any: 0, iniciante: 5, intermediario: 0, avancado: 0 })
  })

  test('6 iniciante → Hacker; falta intermediário p/ Elite', () => {
    const r = computeStudentLevel({ iniciante: 6, intermediario: 0, avancado: 0 })
    expect(r.slug).toBe('hacker')
    expect(r.next).toBe('elite')
    expect(r.remaining).toEqual({ any: 0, iniciante: 0, intermediario: 5, avancado: 0 })
  })

  test('5 iniciante (ainda não 6) → Coder, não Hacker', () => {
    expect(computeStudentLevel({ iniciante: 5, intermediario: 9, avancado: 9 }).slug).toBe('coder')
  })

  test('6 iniciante + 5 intermediário → Elite', () => {
    expect(computeStudentLevel({ iniciante: 6, intermediario: 5, avancado: 0 }).slug).toBe('elite')
  })

  test('6/5/5 → God (topo, sem próximo)', () => {
    const r = computeStudentLevel({ iniciante: 6, intermediario: 5, avancado: 5 })
    expect(r.slug).toBe('god')
    expect(r.next).toBeNull()
    expect(r.remaining).toBeNull()
  })

  test('contagens acima do piso não regridem o nível', () => {
    expect(computeStudentLevel({ iniciante: 20, intermediario: 20, avancado: 20 }).slug).toBe('god')
  })
})
