import { expect, test } from 'bun:test'
import { cenarioAdminRequest } from '../src/lib/cenarios-admin-request'

const id = '00000000-0000-4000-8000-000000000001'
test('cenários: proxy só aceita as operações administrativas declaradas', () => {
  expect(cenarioAdminRequest('GET', ['projetos'], new URLSearchParams(), undefined)).toEqual({
    path: '/arquipelago/admin/cenarios/projetos',
    method: 'GET',
  })
  expect(
    cenarioAdminRequest('GET', ['projetos', id], new URLSearchParams('revisao=2'), undefined),
  ).toEqual({
    path: `/arquipelago/admin/cenarios/projetos/${id}`,
    method: 'GET',
    query: { revisao: 2 },
  })
  for (const path of [
    ['..', 'salvamento'],
    ['projetos', id, 'apagar'],
    ['catalogos', '../../auth', 'a'.repeat(64)],
  ])
    expect(() => cenarioAdminRequest('GET', path, new URLSearchParams(), undefined)).toThrow()
  expect(() =>
    cenarioAdminRequest('DELETE', ['projetos', id], new URLSearchParams(), undefined),
  ).toThrow()
  expect(() =>
    cenarioAdminRequest(
      'GET',
      ['projetos', id],
      new URLSearchParams('revisao=1&revisao=2'),
      undefined,
    ),
  ).toThrow(/duplicados/)
  expect(() =>
    cenarioAdminRequest('POST', ['projetos', id, 'aplicar'], new URLSearchParams(), {
      revisao: -1,
    }),
  ).toThrow()
})
