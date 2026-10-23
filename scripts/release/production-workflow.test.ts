import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

interface Workflow {
  on: Record<string, unknown>
  concurrency?: { group: string; 'cancel-in-progress': boolean }
  jobs: Record<
    string,
    {
      if?: string
      'timeout-minutes'?: number
      steps: Array<{ run?: string; uses?: string; env?: Record<string, string> }>
    }
  >
}
const read = (name: string) =>
  Bun.YAML.parse(
    readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8'),
  ) as Workflow

test('production has one deliberate owner and source checks precede provider setup', () => {
  const workflow = read('deploy-production')
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch'])
  expect(workflow.concurrency).toEqual({ group: 'deploy-production', 'cancel-in-progress': false })
  const job = workflow.jobs['deploy-production']!
  expect(job.if).toBe("github.ref == 'refs/heads/main'")
  expect(job['timeout-minutes']).toBe(180)
  const source = job.steps.findIndex((step) => step.run?.includes('production-release.mjs source'))
  const provider = job.steps.findIndex((step) => step.uses?.includes('setup-railway'))
  const deploy = job.steps.findIndex((step) => step.run?.includes('production-release.mjs deploy'))
  expect(source).toBeGreaterThan(0)
  expect(source).toBeLessThan(provider)
  expect(provider).toBeLessThan(deploy)
  expect(job.steps.slice(0, provider).some((step) => step.env?.RAILWAY_TOKEN)).toBe(false)
  expect(job.steps.map((step) => step.run ?? '').join('\n')).not.toMatch(
    /serviceInstanceDeployV2|config\.mjs apply|sleep/,
  )
  expect(job.steps[deploy]!.env?.RAILWAY_ENVIRONMENT_ID).toBe(
    '19c212a5-85c0-493c-9630-a7a0569e8412',
  )
  expect(job.steps[deploy]!.env?.INITIALIZE_RECORDER).toBe(
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Literal GitHub expression in YAML.
    '${{ github.event.inputs.initialize_recorder }}',
  )
  expect(workflow.on.workflow_dispatch).toMatchObject({
    inputs: { initialize_recorder: { type: 'boolean', default: false, required: false } },
  })
})

test('push-main IaC cannot mutate or enable native deployment behind the canonical owner', () => {
  const workflow = read('railway-config')
  const pushJobs = Object.values(workflow.jobs).filter((job) =>
    job.if?.includes("event_name == 'push'"),
  )
  expect(pushJobs).toHaveLength(1)
  const commands = pushJobs.flatMap((job) => job.steps.map((step) => step.run ?? '')).join('\n')
  expect(commands).toContain('railway-config.mjs check production')
  expect(commands).not.toMatch(
    /railway-config\.mjs apply|serviceInstanceDeployV2|kids-journey-rollout\.mjs deploy/,
  )
  expect(
    readFileSync(new URL('../../.github/workflows/deploy-production.yml', import.meta.url), 'utf8'),
  ).not.toContain('WAITING')
})
