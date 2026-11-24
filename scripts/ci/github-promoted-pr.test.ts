import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const sha = 'a'.repeat(40)
const head = 'b'.repeat(40)
const workspace = fileURLToPath(new URL('../../', import.meta.url))
const workflow = readFileSync(
  new URL('../../.github/workflows/railway-config.yml', import.meta.url),
  'utf8',
)
const start = workflow.indexOf(
  'script: |',
  workflow.indexOf('- name: Localizar plano do PR promovido'),
)
const end = workflow.indexOf('\n      - uses: actions/download-artifact', start)
if (start < 0 || end < 0) throw new Error('Production plan discovery script missing')
const script = workflow.slice(start + 'script: |'.length, end).replace(/^ {12}/gm, '')
const execute = new Function(
  'github',
  'context',
  'core',
  'require',
  'process',
  `return (async () => { ${script} })()`,
)

function fixture(options: { expired?: boolean; wrongPlanHead?: boolean } = {}) {
  const requests: string[] = []
  const outputs = new Map<string, unknown>()
  const github = {
    async request(route: string) {
      requests.push(route)
      if (route.includes(`/commits/${sha}/pulls?`)) return { data: [] }
      if (route.includes('/pulls?state=closed&base=main&sort=updated&direction=desc&'))
        return {
          data: [
            {
              number: 42,
              merged_at: '2026-11-24T01:29:07Z',
              merge_commit_sha: sha,
              base: { ref: 'main' },
              head: { sha: head, repo: { full_name: 'informach/sistema-zero' } },
            },
          ],
        }
      throw new Error(`Unexpected GitHub request: ${route}`)
    },
    rest: {
      actions: {
        async listArtifactsForRepo({ name }: { name: string }) {
          expect(name).toBe(`railway-production-plan-${head}`)
          return {
            data: {
              artifacts: [
                {
                  id: 20,
                  expired: options.expired ?? false,
                  workflow_run: { id: 30, head_sha: options.wrongPlanHead ? sha : head },
                },
              ],
            },
          }
        },
        async getWorkflowRun() {
          return {
            data: {
              path: '.github/workflows/railway-config.yml',
              event: 'pull_request',
              head_sha: head,
              conclusion: 'success',
            },
          }
        },
      },
    },
  }
  return {
    requests,
    outputs,
    run: () =>
      execute(
        github,
        { repo: { owner: 'informach', repo: 'sistema-zero' }, sha },
        { setOutput: (name: string, value: unknown) => outputs.set(name, value) },
        createRequire(import.meta.url),
        { env: { GITHUB_WORKSPACE: workspace } },
      ),
  }
}

test('the actual main workflow resolves an unindexed merge and selects its exact PR plan', async () => {
  const current = fixture()
  await current.run()
  expect(current.requests.some((request) => request.includes('/pulls?state=closed'))).toBe(true)
  expect(current.outputs.get('id')).toBe(20)
  expect(current.outputs.get('run')).toBe(30)
})

test.each([
  { expired: true },
  { wrongPlanHead: true },
])('the main workflow still refuses expired or foreign-head plans %j', async (options) => {
  const current = fixture(options)
  await expect(current.run()).rejects.toThrow('Plano validado não encontrado')
  expect(current.outputs.size).toBe(0)
})
