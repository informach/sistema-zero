import { expect, test } from 'bun:test'
import { railwayCliVersion, railwayEnvironments } from './railway-config.mjs'
import { reconcileWatchPaths, watchPathsPatch } from './staging-watch-paths.mjs'

const tree = 'a'.repeat(40)
const id = 'e00eca0b-5323-4424-9b58-fdb073cfce82'
const before = {
  builder: 'DOCKERFILE',
  dockerfilePath: 'packages/admin/Dockerfile',
  watchPatterns: ['/old/**'],
}
const after = { ...before, watchPatterns: ['/old/**', '/new/**'] }
function fixture() {
  return {
    plan: {
      kind: 'railway.config.plan',
      version: 1,
      cliVersion: railwayCliVersion,
      environmentId: railwayEnvironments.staging,
      sourceTree: tree,
      configEtag: 'etag',
      changeSetHash: 'sha256:x',
      destructive: false,
      changeSet: {
        partial: false,
        changes: [
          {
            address: 'service.admin',
            field: 'build',
            kind: 'resource.update',
            severity: 'safe',
            before,
            after,
            details: ['build.watchPatterns (old → new)'],
          },
        ],
      },
    },
    config: { services: { [id]: { build: before } } },
  }
}
test('reconcilia apenas os caminhos previstos sem iniciar deploy e confirma o estado', async () => {
  const { plan, config } = fixture()
  const calls: string[] = []
  let reads = 0
  const result = await reconcileWatchPaths(plan, config, tree, {
    async assertIdle() {
      calls.push('idle')
    },
    async commit(input: unknown) {
      calls.push('commit')
      expect(input).toEqual({
        environmentId: railwayEnvironments.staging,
        skipDeploys: true,
        patch: { services: { [id]: { build: { watchPatterns: after.watchPatterns } } } },
      })
      return 'patch-1'
    },
    async wait(patchId: string) {
      calls.push('wait')
      expect(patchId).toBe('patch-1')
    },
    async config() {
      calls.push('config')
      reads++
      return reads === 1 ? config : { services: { [id]: { build: after } } }
    },
  })
  expect(result).toEqual({ count: 1, patchId: 'patch-1' })
  expect(calls).toEqual(['idle', 'config', 'commit', 'wait', 'config'])
})
test('recusa alterações de deploy, serviço inesperado, ambiente, árvore ou configuração divergente', () => {
  const { plan, config } = fixture()
  expect(() =>
    watchPathsPatch({ ...plan, environmentId: railwayEnvironments.production }, config, tree),
  ).toThrow()
  expect(() => watchPathsPatch(plan, config, 'b'.repeat(40))).toThrow()
  expect(() => watchPathsPatch(plan, { services: {} }, tree)).toThrow()
  expect(() =>
    watchPathsPatch(
      {
        ...plan,
        changeSet: {
          ...plan.changeSet,
          changes: [{ ...plan.changeSet.changes[0], details: ['deploy.startCommand (a → b)'] }],
        },
      },
      config,
      tree,
    ),
  ).toThrow()
  expect(() =>
    watchPathsPatch(
      {
        ...plan,
        changeSet: {
          ...plan.changeSet,
          changes: [{ ...plan.changeSet.changes[0], address: 'service.auth' }],
        },
      },
      config,
      tree,
    ),
  ).toThrow()
})
test('falha fechada se o Railway confirmar um estado diferente', async () => {
  const { plan, config } = fixture()
  await expect(
    reconcileWatchPaths(plan, config, tree, {
      async assertIdle() {},
      async commit() {
        return 'p'
      },
      async wait() {},
      async config() {
        return config
      },
    }),
  ).rejects.toThrow('divergiram')
})

test('não envia alteração quando o ambiente está ocupado ou a base mudou', async () => {
  const { plan, config } = fixture()
  let commits = 0
  const ports = {
    async assertIdle() {
      throw new Error('ocupado')
    },
    async commit() {
      commits++
      return 'p'
    },
    async wait() {},
    async config() {
      return config
    },
  }
  await expect(reconcileWatchPaths(plan, config, tree, ports)).rejects.toThrow('ocupado')
  expect(commits).toBe(0)
  await expect(
    reconcileWatchPaths(plan, config, tree, {
      ...ports,
      async assertIdle() {},
      async config() {
        return { services: {} }
      },
    }),
  ).rejects.toThrow()
  expect(commits).toBe(0)
})
