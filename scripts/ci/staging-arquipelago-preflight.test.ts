import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { stagingJourney } from '../release/kids-journey-bootstrap.mjs'
import {
  ARQUIPELAGO_SERVICE_ID,
  classifyArquipelagoInventory,
} from './staging-arquipelago-preflight.mjs'

const sha = 'a'.repeat(40)
const old = 'b'.repeat(40)
const id = '00000000-0000-4000-8000-000000000001'
const base = () => ({
  serviceInstance: { activeDeployments: [] as Array<Record<string, unknown>> },
  pending: { edges: [] as unknown[], pageInfo: { hasNextPage: false } },
  history: { edges: [] as unknown[], pageInfo: { hasNextPage: false } },
})
test('autoriza primeira implantação apenas com inventário vazio e completo', async () => {
  const data = base()
  expect(await classifyArquipelagoInventory(data, sha, async () => true)).toBe('initial')
  data.history.edges.push({ node: { id } })
  await expect(classifyArquipelagoInventory(data, sha, async () => true)).rejects.toThrow(
    'histórico',
  )
})
test('autoriza ativo único, saudável, pertencente ao serviço e ancestral do commit', async () => {
  const data = base()
  data.serviceInstance.activeDeployments.push({
    id,
    status: 'SUCCESS',
    projectId: stagingJourney.project,
    environmentId: stagingJourney.environment,
    serviceId: ARQUIPELAGO_SERVICE_ID,
    meta: { commitHash: old },
  })
  expect(
    await classifyArquipelagoInventory(
      data,
      sha,
      async (a: string, b: string) => a === old && b === sha,
    ),
  ).toBe(`ready:${id}`)
  await expect(classifyArquipelagoInventory(data, sha, async () => false)).rejects.toThrow(
    'verificável',
  )
  data.pending.edges.push({ node: { id } })
  await expect(classifyArquipelagoInventory(data, sha, async () => true)).rejects.toThrow(
    'andamento',
  )
})
test('recusa inventário incompleto, identidade divergente e múltiplos ativos', async () => {
  const data = base()
  data.pending.pageInfo.hasNextPage = true
  await expect(classifyArquipelagoInventory(data, sha, async () => true)).rejects.toThrow(
    'incompleto',
  )
  data.pending.pageInfo.hasNextPage = false
  data.serviceInstance.activeDeployments.push({
    id,
    status: 'SUCCESS',
    projectId: stagingJourney.project,
    environmentId: 'production',
    serviceId: ARQUIPELAGO_SERVICE_ID,
    meta: { commitHash: old },
  })
  await expect(classifyArquipelagoInventory(data, sha, async () => true)).rejects.toThrow(
    'verificável',
  )
  data.serviceInstance.activeDeployments.push({ id })
  await expect(classifyArquipelagoInventory(data, sha, async () => true)).rejects.toThrow('único')
})

test('a onda valida o jogo antes de publicar o gateway e repete o preflight imediatamente antes do POST', () => {
  const workflow = Bun.YAML.parse(
    readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  ) as { jobs: { 'deploy-staging': { steps: Array<{ run?: string }> } } }
  const run =
    workflow.jobs['deploy-staging'].steps.find(
      (step) =>
        step.run?.includes('Calcular serviços afetados') ||
        step.run?.includes('ARQUIPELAGO_STATE='),
    )?.run ?? ''
  expect(run.indexOf('ARQUIPELAGO_STATE=')).toBeGreaterThan(0)
  expect(run.indexOf('ARQUIPELAGO_FRESH=')).toBeLessThan(run.indexOf('disparar arquipelago-api'))
  expect(run.indexOf('esperar arquipelago-api')).toBeLessThan(
    run.search(/for s in .*; do disparar/),
  )
})
