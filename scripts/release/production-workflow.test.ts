import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const temporary: string[] = []
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
})

// Runs the actual workflow shell on Linux, with transport replaced by a local executable.
// No Railway or GitHub request can leave this test.
describe.skipIf(process.platform === 'win32')('production workflow gates', () => {
  async function run(scenario: string) {
    const directory = mkdtempSync(join(tmpdir(), 'sz-release-workflow-'))
    temporary.push(directory)
    const workflow = Bun.YAML.parse(
      await Bun.file(
        new URL('../../.github/workflows/deploy-production.yml', import.meta.url),
      ).text(),
    ) as {
      jobs: { 'deploy-production': { steps: Array<{ run?: string }> } }
    }
    const script = workflow.jobs['deploy-production'].steps.find((step) => step.run)?.run
    if (!script) throw new Error('Missing production deployment shell')
    await Bun.write(
      join(directory, 'run.sh'),
      script.replace(/\$\{\{[^}]+\}\}/g, 'test-placeholder'),
    )
    await Bun.write(
      join(directory, 'curl'),
      `#!/bin/bash
printf '%s\\n' "$*" >> "$CALLS"
case "$*" in
  *commits/main*) printf '{"sha":"%s"}\\n' "$MAIN_SHA" ;;
  *serviceInstanceDeployV2*) echo '{"data":{"serviceInstanceDeployV2":"deployment-test"}}' ;;
  *activeDeployments*)
    if [ "$SCENARIO" = missing ] && [[ "$*" == *fc8a1b29* ]]; then
      echo '{"data":{"serviceInstance":{"activeDeployments":[]}}}'
    else
      echo '{"data":{"serviceInstance":{"activeDeployments":[{"id":"before","status":"SUCCESS","meta":{"commitHash":"before-sha"}}]}}}'
    fi ;;
  *deployment-test*)
    if [ "$SCENARIO" = skipped ]; then STATUS=SKIPPED; else STATUS=SUCCESS; fi
    printf '{"data":{"deployment":{"id":"deployment-test","status":"%s","meta":{"commitHash":"wrong-sha"}}}}\\n' "$STATUS" ;;
  *) echo '{"data":{"environments":{"edges":[{"node":{"name":"production","id":"19c212a5-85c0-493c-9630-a7a0569e8412"}}]}}}' ;;
esac
`,
    )
    await Bun.write(join(directory, 'sleep'), '#!/bin/sh\nexit 0\n')
    chmodSync(join(directory, 'curl'), 0o755)
    chmodSync(join(directory, 'sleep'), 0o755)
    const child = Bun.spawn(['bash', 'run.sh'], {
      cwd: directory,
      env: {
        PATH: `${directory}:${process.env.PATH}`,
        RAILWAY_TOKEN: 'test',
        RAILWAY_API: 'http://unused.invalid',
        PROJECT_ID: 'project-test',
        FORCED: 'members,community-kids',
        EXPECTED_SHA: 'a'.repeat(40),
        MAIN_SHA: scenario === 'head' ? 'b'.repeat(40) : 'a'.repeat(40),
        SCENARIO: scenario,
        CALLS: join(directory, 'calls'),
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [out, error, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    return { code, output: out + error, calls: await Bun.file(join(directory, 'calls')).text() }
  }

  test('a changed main cannot trigger any deployment', async () => {
    const result = await run('head')
    expect(result.code).not.toBe(0)
    expect(result.output).toContain('main difere do SHA aprovado')
    expect(result.calls).not.toContain('serviceInstanceDeployV2')
  })
  test('every selected service is checked before any deployment', async () => {
    const result = await run('missing')
    expect(result.code).not.toBe(0)
    expect(result.output).toContain('não tem deployment ativo saudável')
    expect(result.calls).not.toContain('serviceInstanceDeployV2')
  })
  test('SKIPPED does not count as a successful release', async () => {
    const result = await run('skipped')
    expect(result.code).not.toBe(0)
    expect(result.output).toContain('SKIPPED')
    expect(result.output).toContain('não convergiu')
  })
  test('SUCCESS on a different commit fails the release', async () => {
    const result = await run('wrong-sha')
    expect(result.code).not.toBe(0)
    expect(result.output).toContain('SHA divergente')
  })
})
