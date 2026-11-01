import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  CoursePromotionService,
  CoursePromotionSourceService,
} from '../../src/application/course-publication/course-promotion.service'
import type { CoursePromotionPeerPort } from '../../src/domain/course-publication/peer'
import type { CoursePublicationAdminRepository } from '../../src/domain/ports/course-publication.port'
import { buildApp } from '../helpers'

const peerToken = 'peer-capability-'.repeat(4)
const sourceToken = 'source-capability-'.repeat(4)
const internalToken = 'existing-internal-capability'
const unused = async (): Promise<never> => {
  throw new Error('This request must not reach the publication database')
}
const repository: CoursePublicationAdminRepository = {
  sourceForPromotion: unused,
  snapshotForPromotion: unused,
  promotionBinding: unused,
  snapshotForMirror: unused,
  create: unused,
  view: unused,
  latest: unused,
  approve: unused,
  cancel: unused,
  resume: unused,
}
const peer: CoursePromotionPeerPort = {
  available: unused,
  prepare: unused,
  view: unused,
  latest: unused,
  binding: unused,
  command: unused,
}

for (const profile of ['staging', 'production', 'both'] as const) {
  test(`publication capabilities do not capture health or existing authentication: ${profile}`, async () => {
    const { app } = buildApp({
      internalToken,
      requireAdmin: true,
      coursePromotion:
        profile !== 'staging'
          ? { service: new CoursePromotionService(repository), token: peerToken, enabled: true }
          : undefined,
      coursePromotionSource:
        profile !== 'production'
          ? { service: new CoursePromotionSourceService(repository, peer), token: sourceToken }
          : undefined,
    })
    const get = (path: string, headers: Record<string, string> = {}) =>
      app.handle(new Request(`http://localhost${path}`, { headers }))
    for (const path of ['/health', '/readyz']) expect((await get(path)).status).toBe(200)
    const existingHeaders = {
      'x-internal-token': internalToken,
      'x-auth-user-id': randomUUID(),
      'x-auth-user-role': 'admin',
      'x-auth-user-status': 'active',
    }
    expect((await get('/members/admin/courses', existingHeaders)).status).toBe(200)
    expect((await get('/members/admin/courses')).status).toBe(401)
    expect(
      (await get('/members/admin/courses', { 'x-course-promotion-token': peerToken })).status,
    ).toBe(401)
    if (profile !== 'staging') {
      const path = '/members/internal/course-promotions/capabilities'
      expect((await get(path)).status).toBe(401)
      expect((await get(path, { 'x-course-source-token': sourceToken })).status).toBe(401)
      const response = await get(path, { 'x-course-promotion-token': peerToken })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        environment: 'production',
        result: { available: true },
      })
      const invalidJson = await app.handle(
        new Request('http://localhost/members/internal/course-promotions/preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{',
        }),
      )
      expect(invalidJson.status).toBe(401)
    }
    if (profile !== 'production') {
      const path = '/members/internal/course-promotion-sources/not-a-uuid'
      expect((await get(path)).status).toBe(401)
      expect((await get(path, { 'x-course-promotion-token': peerToken })).status).toBe(401)
      expect((await get(path, { 'x-course-source-token': sourceToken })).status).toBe(400)
    }
    for (const path of [
      '/members/internal/%63ourse-promotions/capabilities',
      '/members/internal/course-promotions%2Fcapabilities',
      '/members/internal/course-promotions//capabilities',
      '/members/internal/course-promotions/capabilities/',
    ])
      expect((await get(path)).status).not.toBe(200)
  })
}

test('readiness responds through a real Bun listener with both publication capabilities enabled', async () => {
  const { app } = buildApp({
    internalToken,
    requireAdmin: true,
    coursePromotion: {
      service: new CoursePromotionService(repository),
      token: peerToken,
      enabled: true,
    },
    coursePromotionSource: {
      service: new CoursePromotionSourceService(repository, peer),
      token: sourceToken,
    },
  })
  app.listen({ hostname: '127.0.0.1', port: 0 })
  try {
    if (!app.server) throw new Error('Missing local test listener')
    const base = `http://127.0.0.1:${app.server.port}`
    const readiness = await fetch(`${base}/readyz`)
    expect(readiness.status).toBe(200)
    expect(await readiness.json()).toEqual({ status: 'ready', checks: { db: 'ok' } })
    const unauthorized = await fetch(`${base}/members/internal/course-promotions/capabilities`)
    expect(unauthorized.status).toBe(401)
    await unauthorized.arrayBuffer()
    const authorized = await fetch(`${base}/members/internal/course-promotions/capabilities`, {
      headers: { 'x-course-promotion-token': peerToken },
    })
    expect(authorized.status).toBe(200)
    await authorized.arrayBuffer()
  } finally {
    await app.stop()
  }
})
