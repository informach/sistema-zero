import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')
const start = workflow.indexOf('          esperar() {')
const end = workflow.indexOf('\n          }\n', start)
if (start < 0 || end < start) throw new Error('Actual staging poll function required')
const polling = workflow.slice(start, end + '\n          }'.length)
// Execute the actual shell control flow, never deployment functions or HTTP.
if (/serviceInstanceDeploy|\bcurl\b|\bssh\b|\brailway\b/.test(polling))
  throw new Error('Polling boundary unexpectedly contains a provider operation')

function simulate(scenario: string) {
  const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
  return spawnSync(bash, ['--noprofile', '--norc', '-s'], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
    env: {
      PATH: process.env.PATH ?? process.env.Path,
      SYSTEMROOT: process.env.SYSTEMROOT,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      SIMULATION: scenario,
    },
    input: `set -euo pipefail
SECONDS=0
declare -A DEP=([fixture]=synthetic-id)
# Synthetic provider statuses and a logical clock; no network or real waits.
# The queue case models five minutes of provider processing per round.
sleep() {
  if [ "$SIMULATION" = queued-then-success ]; then
    SECONDS=$((SECONDS + 300))
  else
    SECONDS=$((SECONDS + $1))
  fi
}
gql() { printf '{}'; }
jq() {
  case "$1" in
    -nc) printf '{}' ;;
    -e)
      while IFS= read -r ignored; do :; done
      if [ "$SIMULATION" = invalid-json ]; then return 1; fi
      return 0 ;;
    -r)
      while IFS= read -r ignored; do :; done
      case "$SIMULATION" in
        success) printf 'SUCCESS\\n' ;;
        failed) printf 'FAILED\\n' ;;
        queued-then-success) if [ "$SECONDS" -ge 1500 ]; then printf 'SUCCESS\\n'; else printf 'BUILDING\\n'; fi ;;
        *) printf 'BUILDING\\n' ;;
      esac ;;
    *) return 92 ;;
  esac
}
echo() {
  builtin echo "$@"
  # Reproduce deadline expiry after the last in-loop guard, as processing a
  # partial provider round can do. The final pending predicate must not abort
  # the caller before its explicit failure diagnostic under errexit.
  if [ "$SIMULATION" = deadline-during-round ] && [[ "$1" == \\[* ]]; then
    SECONDS=$((SECONDS + 7200))
  fi
}
${polling}
esperar fixture
printf '__MONITOR_RETURNED__\\n'
if [ "$FAIL" -eq 1 ] || [ "$PENDING" -eq 1 ]; then
  printf '__DEPLOYMENT_NOT_CONVERGED__\\n'
  exit 1
fi
printf '__DEPLOYMENT_CONVERGED__\\n'
`,
  })
}

test('a queued application can converge after the former 20 minute cutoff', () => {
  const result = simulate('queued-then-success')
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(0)
  expect(result.stdout).toContain('__DEPLOYMENT_CONVERGED__')
})

test('expiry during a pending round reaches the explicit diagnostic under Bash errexit', () => {
  const result = simulate('deadline-during-round')
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(1)
  expect(result.stdout).toContain('__MONITOR_RETURNED__')
  expect(result.stdout).toContain('__DEPLOYMENT_NOT_CONVERGED__')
  expect(result.stdout).not.toContain('__DEPLOYMENT_CONVERGED__')
})

test.each(['success', 'failed', 'invalid-json'])('preserves the %s outcome', (scenario) => {
  const result = simulate(scenario)
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(scenario === 'success' ? 0 : 1)
  if (scenario === 'success') expect(result.stdout).toContain('__DEPLOYMENT_CONVERGED__')
  if (scenario === 'failed') expect(result.stdout).toContain('__DEPLOYMENT_NOT_CONVERGED__')
  if (scenario === 'invalid-json') {
    expect(result.stdout).toContain('5 polls consecutivos')
    expect(result.stdout).not.toContain('__MONITOR_RETURNED__')
  }
})
