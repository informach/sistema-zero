import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  PRODUCTION_APPLICATION_NAMES,
  PRODUCTION_GITHUB_SOURCES,
  productionSource,
} from '../../.railway/production-sources'
import {
  railwayCliVersion,
  railwayEnvironments,
  runConfig,
  validatePinnedPlan,
} from './railway-config.mjs'

const tree = 'a'.repeat(40)

describe('dependências embarcadas no deploy', () => {
  test.each([
    ['community', 'molda'],
    ['community', 'pensa'],
    ['members', 'studio'],
  ])('%s acompanha mudanças do pacote %s', (service, dependency) => {
    const config = JSON.parse(
      readFileSync(new URL(`../../.railway/services/${service}.json`, import.meta.url), 'utf8'),
    ) as { build: { watchPatterns: string[] } }
    expect(config.build.watchPatterns).toContain(`/packages/${dependency}/**`)
    const workflow = readFileSync(
      new URL('../../.github/workflows/ci.yml', import.meta.url),
      'utf8',
    )
    const selection = workflow
      .split('\n')
      .find((line) => line.trimStart().startsWith(`packages/${dependency}/*)`))
    expect(selection).toMatch(new RegExp(`\\badd ${service}(?:;|\\s)`))
  })
})

describe('configuração operacional da IA do Estúdio', () => {
  test.each([
    ['members', 'STUDIO_AI_VAULT_KEYS'],
    ['members', 'STUDIO_AI_VAULT_ACTIVE_ID'],
    ['members', 'STUDIO_AI_CALLBACK_ORIGINS'],
    ['members', 'STUDIO_AUTHORING_POLICY_SHA256'],
    ['community-kids', 'STUDIO_AI_RECONCILE_CRON_SECRET'],
    ['community-kids', 'FUNNEL_URL'],
  ])('preserva %s.%s nos dois ambientes', (service, key) => {
    const source = readFileSync(new URL('../../.railway/variables.ts', import.meta.url), 'utf8')
    const common = source.slice(0, source.indexOf('const extra:'))
    const declaration = common.match(new RegExp(`  '?${service}'?: \\[([\\s\\S]*?)\\n  \\]`))
    expect(declaration).not.toBeNull()
    expect(declaration?.[1]).toContain(`'${key}'`)
  })
})

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

const temporary: string[] = []
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function execution(savedPlan: ReturnType<typeof plan> & { claim?: boolean }, drift = false) {
  const directory = mkdtempSync(join(tmpdir(), 'sz-railway-config-'))
  temporary.push(directory)
  const path = join(directory, 'plan.json')
  writeFileSync(path, JSON.stringify(savedPlan))
  const calls: string[][] = []
  const railwayEnvs: NodeJS.ProcessEnv[] = []
  // Somente a fronteira de processos é substituída. O script lê e valida o plano real.
  const exec = (command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }) => {
    calls.push([command, ...args])
    if (command === 'railway') railwayEnvs.push({ ...options?.env })
    if (command === 'git' && args[0] === 'status') return ''
    if (command === 'git' && args[0] === 'rev-parse') return tree
    if (command === 'railway' && args[0] === 'link') return ''
    if (command === 'railway' && args[0] === 'config') {
      if (args[1] === 'apply') return ''
      if (args[1] === 'plan' && args[2] === '--detailed-exit-code') {
        if (drift) throw Object.assign(new Error('Update Postgres networking'), { status: 2 })
        return ''
      }
    }
    throw new Error(`Comando inesperado: ${command} ${args.join(' ')}`)
  }
  return { path, calls, exec, railwayEnvs }
}

describe('execução do plano Railway', () => {
  test('IaC usa o vínculo explícito e não os overrides do processo de deploy', () => {
    const keys = ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_SERVICE_ID'] as const
    const previous = keys.map((key) => [key, process.env[key]] as const)
    try {
      for (const key of keys) process.env[key] = 'inherited-runtime-context-qa'
      const f = execution(plan())
      runConfig('check', 'production', f.path, f.exec)
      expect(f.calls[2]).toEqual([
        'railway',
        'link',
        '--project',
        '415d5a1c-5f75-432c-8445-b395d0977ce3',
        '--environment',
        railwayEnvironments.production,
      ])
      expect(f.railwayEnvs).toHaveLength(2)
      for (const env of f.railwayEnvs) {
        for (const key of keys) expect(env[key]).toBeUndefined()
      }
      expect(process.env.RAILWAY_ENVIRONMENT_ID).toBe('inherited-runtime-context-qa')
    } finally {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })
  test.each([false, true])('plano vazio com claim=%s só confere o estado remoto', (claim) => {
    const f = execution({ ...plan(), claim })
    runConfig('apply', 'production', f.path, f.exec)
    expect(f.calls.filter((call) => call[0] === 'railway' && call[1] === 'config')).toEqual([
      ['railway', 'config', 'plan', '--detailed-exit-code'],
    ])
  })

  test('aplica mudanças permitidas pelo plano fixado antes de conferir o estado remoto', () => {
    const f = execution({ ...plan([build]), environmentId: railwayEnvironments.staging })
    runConfig('apply', 'staging', f.path, f.exec)
    expect(f.calls.filter((call) => call[0] === 'railway' && call[1] === 'config')).toEqual([
      ['railway', 'config', 'apply', '--plan', f.path, '--yes'],
      ['railway', 'config', 'plan', '--detailed-exit-code'],
    ])
  })

  test.each([false, true])('divergência remota bloqueia o deploy com mudanças=%s', (changed) => {
    const f = execution(
      { ...plan(changed ? [build] : []), environmentId: railwayEnvironments.staging },
      true,
    )
    expect(() => runConfig('apply', 'staging', f.path, f.exec)).toThrow(
      'Update Postgres networking',
    )
  })

  test('produção recusa config apply real antes de qualquer mutação; check vazio é readonly', () => {
    const changed = execution(plan([build]))
    expect(() => runConfig('apply', 'production', changed.path, changed.exec)).toThrow(
      'onda operacional',
    )
    expect(changed.calls.some((call) => call[0] === 'railway' && call[1] === 'config')).toBe(false)
    const empty = execution(plan())
    runConfig('check', 'production', empty.path, empty.exec)
    expect(empty.calls.filter((call) => call[0] === 'railway' && call[1] === 'config')).toEqual([
      ['railway', 'config', 'plan', '--detailed-exit-code'],
    ])
  })

  test('mudança no banco é recusada antes de executar qualquer apply', () => {
    const f = execution(plan([{ ...build, address: 'database.Postgres', field: 'networking' }]))
    expect(() => runConfig('apply', 'production', f.path, f.exec)).toThrow('escopo')
    expect(f.calls.some((call) => call[0] === 'railway' && call[1] === 'config')).toBe(false)
  })
})

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
  test.each([
    'production',
    'staging',
  ])('qualquer atualização de origem exige operação explícita em %s', (environment) => {
    for (const address of ['service.members', 'service.admin', 'service.fiscal']) {
      for (const after of [
        { type: 'github', repo: 'informach/sistema-zero', branch: 'main' },
        { type: 'github', repo: 'informach/sistema-zero' },
        { type: 'github', repo: 'informach/sistema-zero', branch: 'main', checkSuites: true },
        { type: 'github', repo: 'informach/sistema-zero', branch: 'main', checkSuites: false },
        null,
      ]) {
        const source = { ...build, address, field: 'source', after }
        const saved = { ...plan([source]), environmentId: railwayEnvironments[environment] }
        expect(() => validatePinnedPlan(saved, environment, tree)).toThrow('escopo')
        const executionFixture = execution(saved)
        expect(() =>
          runConfig('apply', environment, executionFixture.path, executionFixture.exec),
        ).toThrow('escopo')
        expect(
          executionFixture.calls.some((call) => call[0] === 'railway' && call[1] === 'config'),
        ).toBe(false)
      }
    }
  })
})

describe('origens de produção qualificadas após native off', () => {
  test('toda aplicação tem um literal fechado e nomes novos recusam antes de criar recursos', () => {
    const services = readdirSync(new URL('../../.railway/services/', import.meta.url))
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -5))
      .sort()
    expect([...PRODUCTION_APPLICATION_NAMES].sort()).toEqual(services)
    for (const name of services) {
      const source = productionSource(name)
      expect(source).toMatchObject({ type: 'github', repo: 'informach/sistema-zero' })
      expect(Object.hasOwn(source, 'checkSuites')).toBe(false)
    }
    expect(() => productionSource('novo-servico')).toThrow('sem origem')
    expect(() => productionSource('toString')).toThrow('sem origem')
  })
  test('branch ausente permanece ausente, sem o default main do helper GitHub', () => {
    const absent = [
      'fiscal',
      'helpdesk',
      'helpdesk-app',
      'hub',
      'marketing',
      'marketing-app',
      'referrals',
    ]
    expect(
      Object.entries(PRODUCTION_GITHUB_SOURCES)
        .filter(([, source]) => !Object.hasOwn(source, 'branch'))
        .map(([name]) => name)
        .sort(),
    ).toEqual(absent)
    for (const name of PRODUCTION_APPLICATION_NAMES) {
      const source = productionSource(name)
      if (Object.hasOwn(source, 'branch')) expect(source.branch).toBe('main')
    }
    expect(productionSource('members').rootDirectory).toBe('/')
    expect(Object.hasOwn(productionSource('helpdesk'), 'rootDirectory')).toBe(false)
    expect(Object.hasOwn(productionSource('helpdesk'), 'branch')).toBe(false)
  })
})
