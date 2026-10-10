import { describe, expect, test } from 'bun:test'
import {
  entryLinks,
  entryRedirect,
  parentLoginDestination,
  safeParentDestination,
} from '../src/lib/entry-destination'

const SESSION = '44444444-4444-4444-8444-444444444444'
const DEVICE = '55555555-5555-4555-8555-555555555555'
const CHILD = '11111111-1111-4111-8111-111111111111'
const student = {
  kids: { kind: 'student' as const, sessionId: SESSION, deviceId: DEVICE, grantId: DEVICE },
}
const parent = { kids: { kind: 'parent' as const, sessionId: SESSION, authenticatedAt: 1 } }

describe('/login com sessão válida não pede a escolha de novo', () => {
  test('a criança vai para a área dela, ou para a fase interna do link', () => {
    expect(entryRedirect(student, null)).toBe('/')
    expect(entryRedirect(student, '/cursos/cade/aulas/1')).toBe('/cursos/cade/aulas/1')
    // Destino externo, da API ou da área adulta não serve para a criança.
    expect(entryRedirect(student, 'https://evil.example')).toBe('/')
    expect(entryRedirect(student, '//evil.example')).toBe('/')
    expect(entryRedirect(student, '/pais')).toBe('/')
  })

  test('o responsável vai para a área dos pais, ou para o destino adulto do link', () => {
    expect(entryRedirect(parent, null)).toBe('/pais')
    expect(entryRedirect(parent, '/responsavel/ajuda')).toBe('/responsavel/ajuda')
    expect(entryRedirect(parent, '/cursos/cade')).toBe('/pais')
  })

  test('sem sessão (ou sessão antiga sem contexto) mostra a escolha', () => {
    expect(entryRedirect(null, '/cursos/x')).toBeNull()
    expect(entryRedirect({}, null)).toBeNull()
  })

  test('os cartões levam o destino adiante, cada um só com o que o seu público aceita', () => {
    expect(entryLinks(null)).toEqual({ student: '/login/aluno', parent: '/login/responsavel' })
    expect(entryLinks('/cursos/cade/aulas/1')).toEqual({
      student: `/login/aluno?next=${encodeURIComponent('/cursos/cade/aulas/1')}`,
      parent: `/login/responsavel?next=${encodeURIComponent('/cursos/cade/aulas/1')}`,
    })
    expect(entryLinks('/pais?child=x')).toEqual({
      student: '/login/aluno',
      parent: `/login/responsavel?next=${encodeURIComponent('/pais?child=x')}`,
    })
  })
})

describe('destino depois do login do responsável', () => {
  test('respeita um next adulto interno', () => {
    expect(parentLoginDestination('?next=%2Fresponsavel')).toBe('/responsavel')
    expect(parentLoginDestination(`?next=${encodeURIComponent(`/pais?child=${CHILD}`)}`)).toBe(
      `/pais?child=${CHILD}`,
    )
  })

  test('link de fase vira a área dos pais com a orientação da troca para a criança', () => {
    expect(parentLoginDestination('?next=%2Fcursos%2Fcade%2Faulas%2F1')).toBe(
      `/pais?aluno=${encodeURIComponent('/cursos/cade/aulas/1')}`,
    )
  })

  test('o atalho antigo ?child= continua, e destino estranho cai na área dos pais', () => {
    expect(parentLoginDestination(`?child=${CHILD}`)).toBe(`/pais?child=${CHILD}`)
    expect(parentLoginDestination('?child=../../x')).toBe('/pais')
    expect(parentLoginDestination('?next=https%3A%2F%2Fevil.example')).toBe('/pais')
    expect(parentLoginDestination('?next=%2F%2Fevil.example')).toBe('/pais')
    expect(parentLoginDestination('')).toBe('/pais')
  })

  test('a régua adulta só aceita /pais e /responsavel', () => {
    expect(safeParentDestination('/pais')).toBe('/pais')
    expect(safeParentDestination('/paisagem')).toBeNull()
    expect(safeParentDestination('/pais\\evil')).toBeNull()
    expect(safeParentDestination('/cursos')).toBeNull()
  })
})
