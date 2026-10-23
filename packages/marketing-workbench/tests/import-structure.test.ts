import { expect, test } from 'bun:test'
import { actionDefinition } from '../src/action-definition'

test('retomada do calendário mantém versão conferida e não aceita datas ou peça arbitrária', () => {
  const project = crypto.randomUUID(),
    operationId = crypto.randomUUID(),
    input = {
      sourceVersionId: crypto.randomUUID(),
      parserVersion: 'editorial-calendar-v1',
      key: 'P01',
      pieceId: crypto.randomUUID(),
      expectedRevisionId: crypto.randomUUID(),
      expectedMappingId: null,
    }
  expect(
    actionDefinition(`/projects/${project}/import-calendars`, input, operationId).body,
  ).toEqual({ ...input, operationId })
  expect(() =>
    actionDefinition(
      `/projects/${project}/import-calendars`,
      { ...input, editorialDate: '2026-11-01' },
      operationId,
    ),
  ).toThrow()
})

test('recuperação de conversão conserva identidade, versão da origem e revisão esperada', () => {
  const project = crypto.randomUUID(),
    operationId = crypto.randomUUID(),
    sourceVersionId = crypto.randomUUID(),
    expectedMappingId = crypto.randomUUID()
  const input = {
    sourceVersionId,
    expectedMappingId,
    key: 'MC01',
    parserVersion: 'editorial-markdown-v2',
  }
  const action = actionDefinition(`/projects/${project}/import-structures`, input, operationId)
  expect(action.body).toEqual({ ...input, operationId })
  expect(action.projectId).toBe(project)
  expect(
    action.result.safeParse({
      status: 'conflict',
      pieceId: crypto.randomUUID(),
      mappingId: expectedMappingId,
      message: 'Preservado',
    }).success,
  ).toBe(true)
  expect(() =>
    actionDefinition(
      `/projects/${project}/import-structures`,
      { ...input, expectedMappingId: 'qualquer' },
      operationId,
    ),
  ).toThrow()
  expect(() =>
    actionDefinition(`/projects/${project}/import-structures/extra`, input, operationId),
  ).toThrow()
})
