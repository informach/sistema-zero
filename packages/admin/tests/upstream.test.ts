import { describe, expect, test } from 'bun:test'
import { normalizeUpstreamError } from '../src/lib/upstream'

describe('normalizeUpstreamError', () => {
  test('repassa o envelope conhecido { error: { code, message } }', () => {
    expect(
      normalizeUpstreamError({ error: { code: 'NOT_FOUND', message: 'Curso não encontrado.' } }),
    ).toEqual({ error: { code: 'NOT_FOUND', message: 'Curso não encontrado.' } })
  })

  test('usa UPSTREAM_ERROR quando o code falta mas há message', () => {
    expect(normalizeUpstreamError({ error: { message: 'Algo falhou.' } })).toEqual({
      error: { code: 'UPSTREAM_ERROR', message: 'Algo falhou.' },
    })
  })

  test('genérico para shapes desconhecidos (stack/HTML/texto cru/null)', () => {
    const generic = {
      error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível completar a operação.' },
    }
    expect(normalizeUpstreamError('Error: connect ECONNREFUSED 10.0.0.1:5432')).toEqual(generic)
    expect(normalizeUpstreamError('<html>502 Bad Gateway</html>')).toEqual(generic)
    expect(normalizeUpstreamError({ message: 'sem envelope' })).toEqual(generic)
    expect(normalizeUpstreamError(null)).toEqual(generic)
    expect(normalizeUpstreamError({ error: { code: 'X', message: '   ' } })).toEqual(generic)
  })
})
