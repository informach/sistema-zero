import { describe, expect, it } from 'bun:test'
import { DEFAULT_AUTOMATION_POLICY } from '@sistemazero/helpdesk-contracts'
import { buildTestApp, json, request, staffHeaders } from '../helpers'

const admin = staffHeaders({ 'x-auth-user-role': 'admin' })
describe('Política de automação', () => {
  it('nasce desligada e staff não consulta nem altera configuração sensível', async () => {
    const t = buildTestApp()
    const denied = await request(t.app, 'GET', '/helpdesk/settings/automation')
    expect(denied.status).toBe(403)
    const allowed = await request(t.app, 'GET', '/helpdesk/settings/automation', { headers: admin })
    expect((await json(allowed)).policy.mode).toBe('off')
    const write = await request(t.app, 'PATCH', '/helpdesk/settings/automation', {
      body: { version: 0, policy: DEFAULT_AUTOMATION_POLICY },
    })
    expect(write.status).toBe(403)
  })
  it('piloto exige relatório revisado; limites e temas são obrigatórios', async () => {
    const t = buildTestApp()
    const active = {
      ...DEFAULT_AUTOMATION_POLICY,
      mode: 'pilot',
      categories: ['studio'],
      cohortPercent: 5,
      dailyBudgetMicros: 100000,
      attemptReserveMicros: 10000,
    }
    const missing = await request(t.app, 'PATCH', '/helpdesk/settings/automation', {
      headers: admin,
      body: { version: 0, policy: active },
    })
    expect(missing.status).toBe(400)
    const invalid = await request(t.app, 'PATCH', '/helpdesk/settings/automation', {
      headers: admin,
      body: { version: 0, policy: { ...active, mode: 'shadow', attemptReserveMicros: 0 } },
    })
    expect(invalid.status).toBe(400)
    const shadow = await request(t.app, 'PATCH', '/helpdesk/settings/automation', {
      headers: admin,
      body: { version: 0, policy: { ...active, mode: 'shadow' } },
    })
    expect(shadow.status).toBe(200)
    const stale = await request(t.app, 'PATCH', '/helpdesk/settings/automation', {
      headers: admin,
      body: { version: 0, policy: DEFAULT_AUTOMATION_POLICY },
    })
    expect(stale.status).toBe(409)
  })
  it('relatórios inconsistentes não podem liberar o piloto', async () => {
    const t = buildTestApp()
    const result = await request(t.app, 'POST', '/helpdesk/settings/automation/evaluations', {
      headers: admin,
      body: {
        policyHash: 'a'.repeat(64),
        indexVersion: 1,
        evaluatedAt: new Date().toISOString(),
        datasetVersion: 'fixture-1',
        model: 'fake',
        promptVersion: 'knowledge-answer-1',
        cases: 100,
        reviewedResponses: 10,
        correctResponses: 100,
        answerableCases: 100,
        retrievedCases: 100,
        criticalErrors: 0,
        deterministicPassed: true,
        p95Ms: 1000,
      },
    })
    expect(result.status).toBe(400)
  })
})
