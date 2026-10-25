import { writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function containerImageState(value: unknown, expectedImage: string) {
  if (
    !object(value) ||
    !object(value.configuration) ||
    !object(value.health) ||
    !object(value.health.instances) ||
    !Array.isArray(value.health.errors)
  )
    throw new Error('Incomplete container deployment metadata')
  const health = value.health.instances
  if (
    typeof value.configuration.image !== 'string' ||
    typeof value.version !== 'number' ||
    !Number.isSafeInteger(value.version) ||
    typeof health.healthy !== 'number' ||
    typeof health.failed !== 'number' ||
    (value.active_rollout_id !== undefined &&
      value.active_rollout_id !== null &&
      typeof value.active_rollout_id !== 'string')
  )
    throw new Error('Invalid container deployment metadata')
  return {
    version: value.version,
    image: value.configuration.image,
    healthy: health.healthy,
    failed: health.failed,
    rolloutActive: value.active_rollout_id != null,
    errors: value.health.errors.length,
    ready:
      value.configuration.image === expectedImage &&
      value.active_rollout_id == null &&
      health.healthy > 0 &&
      health.failed === 0 &&
      value.health.errors.length === 0,
  }
}

export async function waitForContainerImage(options: {
  expectedImage: string
  read: () => Promise<unknown>
  signal: AbortSignal
  pause: () => Promise<void>
  onStatus?: (state: ReturnType<typeof containerImageState>) => void
}) {
  let stableVersion: unknown
  for (;;) {
    options.signal.throwIfAborted()
    const state = containerImageState(await options.read(), options.expectedImage)
    options.signal.throwIfAborted()
    options.onStatus?.(state)
    if (state.ready && stableVersion === state.version) return state
    stableVersion = state.ready ? state.version : undefined
    await options.pause()
  }
}

async function wranglerJson(args: string[]) {
  const node = Bun.which('node')
  if (!node) throw new Error('Native Node is required')
  const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
  const child = Bun.spawn([node, cli, 'containers', ...args, '--json'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const timer = setTimeout(() => child.kill(), 20_000)
  try {
    const [code, stdout] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    if (code !== 0 || stdout.length > 512_000) throw new Error('Container metadata request failed')
    const value: unknown = JSON.parse(stdout)
    return value
  } finally {
    clearTimeout(timer)
  }
}

if (import.meta.main) {
  const [environment, digest, receipt] = process.argv.slice(2)
  if (
    !['staging', 'production'].includes(environment ?? '') ||
    !/^[a-f0-9]{64}$/.test(digest ?? '') ||
    !receipt
  )
    throw new Error(
      'Usage: bun scripts/container-rollout.ts staging|production <image-sha256> <new-receipt.json>',
    )
  const appName =
    environment === 'staging'
      ? 'sistemazero-studio-runtime-staging-probuildsandbox-staging'
      : 'sistemazero-studio-runtime-probuildsandbox'
  const apps = await wranglerJson(['list'])
  if (!Array.isArray(apps)) throw new Error('Invalid container application list')
  const app = apps.find((value) => object(value) && value.name === appName)
  if (!object(app) || typeof app.id !== 'string')
    throw new Error('Expected container application not found')
  const appId = app.id
  const expectedImage = `registry.cloudflare.com/bcc0f2d44140e05b69152cba326132f8/${appName}@sha256:${digest}`
  const signal = AbortSignal.timeout(360_000)
  const started = performance.now(),
    history: ReturnType<typeof containerImageState>[] = []
  try {
    const state = await waitForContainerImage({
      expectedImage,
      signal,
      read: () => wranglerJson(['info', appId]),
      pause: () => delay(10_000, undefined, { signal }),
      onStatus: (state) => {
        history.push(state)
        console.log(JSON.stringify(state))
      },
    })
    await writeFile(
      receipt,
      JSON.stringify(
        {
          environment,
          passed: true,
          state,
          elapsedMs: Math.round(performance.now() - started),
          history,
        },
        null,
        2,
      ),
      { flag: 'wx' },
    )
  } catch (error) {
    await writeFile(
      receipt,
      JSON.stringify(
        { environment, passed: false, elapsedMs: Math.round(performance.now() - started), history },
        null,
        2,
      ),
      { flag: 'wx' },
    )
    throw error
  }
}
