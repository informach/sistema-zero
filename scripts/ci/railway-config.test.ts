import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  // Somente a fronteira de processos é substituída. O script lê e valida o plano real.
  const exec = (command: string, args: string[]) => {
    calls.push([command, ...args])
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
  return { path, calls, exec }
}

describe('execução do plano Railway', () => {
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
