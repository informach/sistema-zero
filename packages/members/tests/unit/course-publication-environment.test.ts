import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import {
  PublicationOperatorRequestSchema,
  runCoursePublicationOperator,
} from '../../scripts/publish-course'
import { loadEnv } from '../../src/infrastructure/config/env'

const base = {
  DATABASE_URL: 'postgres://localhost/test',
  GATEWAY_HMAC_SECRET: 'test-only-not-an-actual-secret-value',
}
const configured = {
  ...base,
  COURSE_PUBLICATION_ENVIRONMENT: 'staging',
  COURSE_PUBLICATION_ADMIN_URL: 'https://admin-stage.example',
  COURSE_PUBLICATION_MEDIA_TOKEN: 'a'.repeat(48),
  COURSE_PUBLICATION_PRODUCTION_ADMIN_URL: 'https://admin.example',
  COURSE_PUBLICATION_PEER_TOKEN: 'b'.repeat(48),
  COURSE_PUBLICATION_SOURCE_TOKEN: 'c'.repeat(48),
}
test('a porta entre ambientes exige pares completos e credenciais separadas', () => {
  expect(loadEnv(base).COURSE_PUBLICATION_ENVIRONMENT).toBeUndefined()
  expect(loadEnv(configured).COURSE_PUBLICATION_ENVIRONMENT).toBe('staging')
  expect(() => loadEnv({ ...configured, COURSE_PUBLICATION_SOURCE_TOKEN: undefined })).toThrow()
  expect(() =>
    loadEnv({
      ...configured,
      COURSE_PUBLICATION_SOURCE_TOKEN: configured.COURSE_PUBLICATION_PEER_TOKEN,
    }),
  ).toThrow()
  expect(() => loadEnv({ ...configured, COURSE_PUBLICATION_ENVIRONMENT: 'production' })).toThrow()
  expect(() =>
    loadEnv({ ...configured, COURSE_PUBLICATION_STAGING_ADMIN_URL: 'https://stage.example' }),
  ).toThrow()
})
test('o operador usa o contrato do serviço e recusa rodar fora do ambiente Railway correto', async () => {
  const request: z.output<typeof PublicationOperatorRequestSchema> = {
    action: 'preview',
    operation: 'promote-kids',
    environment: 'staging',
    sourceCourseId: randomUUID(),
    targetSlug: 'meu-curso',
    requestKey: randomUUID(),
    actorId: randomUUID(),
  }
  expect(PublicationOperatorRequestSchema.parse(request)).toEqual(request)
  expect(() =>
    PublicationOperatorRequestSchema.parse({ ...request, targetUrl: 'https://outro.example' }),
  ).toThrow()
  await expect(runCoursePublicationOperator(request)).rejects.toThrow('Members Railway')
})
