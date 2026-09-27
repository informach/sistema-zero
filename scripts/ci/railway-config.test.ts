import { describe, expect, test } from 'bun:test'
import { railwayCliVersion, railwayEnvironments, validatePinnedPlan } from './railway-config.mjs'

const tree = 'a'.repeat(40)
function plan(changes: unknown[] = []) {
  return {
    kind: 'railway.config.plan',
    version: 1,
    cliVersion: railwayCliVersion,
    sourceTree: tree,
    environmentId: railwayEnvironments.production,
    configEtag: 'etag',
    changeSetHash: 'sha256:hash',
    destructive: false,
    changeSet: { changes },
  }
}
const build = {
  kind: 'resource.update',
  severity: 'safe',
  address: 'service.members',
  field: 'build',
  after: { builder: 'DOCKERFILE', dockerfilePath: 'packages/members/Dockerfile' },
}

describe('gate do plano Railway', () => {
  test('aceita plano vazio e atualização de serviço existente', () => {
    expect(validatePinnedPlan(plan(), 'production', tree)).toBe(0)
    expect(validatePinnedPlan(plan([build]), 'production', tree)).toBe(1)
  })
  test('recusa plano de outro ambiente, árvore e CLI', () => {
    expect(() => validatePinnedPlan(plan(), 'staging', tree)).toThrow('outro ambiente')
    expect(() => validatePinnedPlan(plan(), 'production', 'b'.repeat(40))).toThrow('divergente')
    expect(() =>
      validatePinnedPlan({ ...plan(), cliVersion: '4.66.0' }, 'production', tree),
    ).toThrow('versão')
  })
  test.each([
    'resource.delete',
    'resource.create',
    'variable.delete',
    'variable.set',
    'domain.create',
  ])('recusa %s mesmo quando rotulado como seguro', (kind) => {
    expect(() => validatePinnedPlan(plan([{ ...build, kind }]), 'production', tree)).toThrow(
      'escopo',
    )
  })
  test.each([
    'database.Postgres',
    'volume.postgres-volume',
    'service.evolution-api',
  ])('não altera %s durante deploy de aplicação', (address) => {
    expect(() => validatePinnedPlan(plan([{ ...build, address }]), 'production', tree)).toThrow(
      'escopo',
    )
  })
  test('aceita a posse padrão do projeto, mas recusa partials e plano destrutivo', () => {
    expect(validatePinnedPlan({ ...plan(), claim: true }, 'production', tree)).toBe(0)
    for (const override of [
      { destructive: true },
      { changeSet: { changes: [], partial: 'outro' } },
    ]) {
      expect(() => validatePinnedPlan({ ...plan(), ...override }, 'production', tree)).toThrow(
        'não permitida',
      )
    }
  })
  test('produção exige main e Wait for CI; staging e Fiscal mantêm publicação controlada', () => {
    const source = {
      ...build,
      field: 'source',
      after: { type: 'github', repo: 'informach/sistema-zero', branch: 'main', checkSuites: true },
    }
    expect(validatePinnedPlan(plan([source]), 'production', tree)).toBe(1)
    for (const after of [
      { ...source.after, branch: 'staging' },
      { ...source.after, checkSuites: false },
    ]) {
      expect(() => validatePinnedPlan(plan([{ ...source, after }]), 'production', tree)).toThrow(
        'gatilho',
      )
    }
    expect(() =>
      validatePinnedPlan(plan([{ ...source, address: 'service.fiscal' }]), 'production', tree),
    ).toThrow('gatilho')
    expect(() =>
      validatePinnedPlan(
        { ...plan([source]), environmentId: railwayEnvironments.staging },
        'staging',
        tree,
      ),
    ).toThrow('gatilho')
  })
})
