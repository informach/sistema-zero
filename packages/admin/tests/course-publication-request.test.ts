import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { coursePublicationRequest } from '../src/lib/course-publication-request'

test('BFF de publicação só encaminha as operações autorizadas e o comando com versão', () => {
  const id = randomUUID(),
    empty = new URLSearchParams()
  expect(coursePublicationRequest('GET', [], new URLSearchParams({ sourceCourseId: id }))).toEqual({
    path: '/members/admin/course-publications',
    query: { sourceCourseId: id },
  })
  expect(
    coursePublicationRequest('POST', [id, 'approve'], empty, {
      version: 0,
      planHash: 'a'.repeat(64),
    }),
  ).toEqual({
    path: `/members/admin/course-publications/${id}/approve`,
    body: { version: 0, planHash: 'a'.repeat(64) },
  })
  expect(() => coursePublicationRequest('POST', ['http://production.test'], empty, {})).toThrow()
  expect(() => coursePublicationRequest('POST', [id, 'delete'], empty, {})).toThrow()
  expect(() =>
    coursePublicationRequest(
      'GET',
      ['capabilities'],
      new URLSearchParams({ targetUrl: 'http://evil.test' }),
    ),
  ).toThrow()
  expect(() =>
    coursePublicationRequest('POST', ['preview'], empty, {
      sourceCourseId: id,
      targetSlug: 'curso-adulto',
      requestKey: randomUUID(),
      environment: 'production',
    }),
  ).toThrow()
  expect(() => coursePublicationRequest('POST', [id, 'approve'], empty, { version: 0 })).toThrow()
})
