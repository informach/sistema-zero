import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { awaitWithSignal } from '@sistemazero/core/http'

/** Copies source inputs, excluding dependencies installed in the developer's checkout. */
export async function copyPythonSdkProofSources(options: {
  root: string
  directory: string
  signal: AbortSignal
}) {
  for (const entry of [
    'packages/core/src',
    'packages/core/package.json',
    'packages/studio-runtime/src',
    'packages/studio-runtime/runtime',
    'packages/studio-runtime/Dockerfile',
    'packages/studio-runtime/tests/fixtures/python-sdk-worker.ts',
    'packages/studio-runtime/tests/fixtures/python-sdk-workerd.cjs',
  ]) {
    options.signal.throwIfAborted()
    const target = path.join(options.directory, entry)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(path.join(options.root, entry), target, {
      recursive: true,
      filter: (source) => !source.split(path.sep).includes('node_modules'),
    })
  }
}

/** Packages only this proof's sources/assets; never mounts the user's workspace or credentials. */
export async function preparePythonSdkLinux(options: {
  root: string
  evidence: string
  runtimeDirectory: string
  config: string
  seed: string
  signal: AbortSignal
  builderHost?: string
}) {
  options.signal.throwIfAborted()
  const { root, evidence } = options
  const directory = path.join(evidence, 'linux')
  const workerName = `python-sdk-proof-${crypto.randomUUID().replaceAll('-', '')}`
  const containerName = `sz-${workerName}`
  const image = 'sz-python-sdk-linux-qa:verify'
  await mkdir(directory, { recursive: true })
  await copyPythonSdkProofSources({ root, directory, signal: options.signal })
  options.signal.throwIfAborted()
  await cp(options.runtimeDirectory, path.join(directory, 'distribution'), { recursive: true })
  if (options.builderHost) await cp(options.builderHost, path.join(directory, 'builder-host.mjs'))
  await cp(
    path.join(import.meta.dirname, 'python-sdk-linux-runner.cjs'),
    path.join(directory, 'linux-runner.cjs'),
  )
  const config = JSON.parse(await readFile(options.config, 'utf8'))
  config.name = workerName
  config.main = '/proof/packages/studio-runtime/tests/fixtures/python-sdk-worker.ts'
  config.containers[0].image = '/proof/packages/studio-runtime/Dockerfile'
  config.containers[0].image_build_context = '/proof/packages/studio-runtime'
  await writeFile(path.join(directory, 'wrangler.json'), JSON.stringify(config))
  const seed = JSON.parse(await readFile(options.seed, 'utf8'))
  seed.runtimeDirectory = '/proof/distribution'
  await writeFile(path.join(directory, 'seed.json'), JSON.stringify(seed))
  await writeFile(
    path.join(directory, 'package.json'),
    JSON.stringify({
      private: true,
      dependencies: {
        '@sistemazero/core': 'file:./packages/core',
        '@cloudflare/sandbox': '0.10.3',
        '@cloudflare/containers': '0.3.7',
        aws4fetch: '1.0.20',
        capnweb: '0.8.0',
        hono: '4.12.31',
        wrangler: '4.120.1',
        typescript: '5.9.3',
        zod: '4.3.6',
        ...(options.builderHost ? { pyright: '1.1.414' } : {}),
      },
    }),
  )
  options.signal.throwIfAborted()
  const built = Bun.spawn(
    [
      'docker',
      'build',
      '--tag',
      image,
      '--file',
      path.join(import.meta.dirname, 'python-sdk-linux.Dockerfile'),
      import.meta.dirname,
    ],
    { windowsHide: true, stdout: 'inherit', stderr: 'inherit' },
  )
  const abortBuild = () => built.kill()
  options.signal.addEventListener('abort', abortBuild, { once: true })
  if (options.signal.aborted) abortBuild()
  try {
    const exit = await awaitWithSignal(() => built.exited, options.signal)
    if (exit !== 0) throw new Error('Could not build the local Linux SDK tool image')
  } finally {
    options.signal.removeEventListener('abort', abortBuild)
    if (built.exitCode === null) built.kill()
  }
  options.signal.throwIfAborted()
  return {
    containerName,
    workerName,
    command: [
      'docker',
      'run',
      '--rm',
      '--name',
      containerName,
      '--network',
      'host',
      '--mount',
      `type=bind,source=${directory},target=/proof`,
      '--mount',
      'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock',
      '--env',
      'WRANGLER_SEND_METRICS=false',
      '--env',
      'WRANGLER_LOG_PATH=/proof/wrangler.log',
      '--env',
      `STUDIO_SDK_PROOF_LOG_LEVEL=${process.env.STUDIO_SDK_PROOF_LOG_LEVEL ?? 'error'}`,
      image,
    ],
  }
}

async function dockerOutput(args: string[], signal: AbortSignal) {
  signal.throwIfAborted()
  const child = Bun.spawn(['docker', ...args], {
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const abort = () => child.kill()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) abort()
  async function drain(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let tail = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return tail + decoder.decode()
        tail = (tail + decoder.decode(value, { stream: true })).slice(-20_000)
      }
    } finally {
      reader.releaseLock()
    }
  }
  try {
    const [exit, stdout, stderr] = await awaitWithSignal(
      () => Promise.all([child.exited, drain(child.stdout), drain(child.stderr)]),
      signal,
    )
    return { exit, stdout, stderr }
  } finally {
    signal.removeEventListener('abort', abort)
    if (child.exitCode === null) child.kill()
  }
}

/** workerd creates egress sidecars outside the tool container; own those by the unique worker name. */
export async function stopPythonSdkLinux(options: {
  containerName: string
  workerName: string
  evidence: string
  requireCompilerStopped: boolean
}) {
  if (
    !/^python-sdk-proof-[a-f0-9]{32}$/.test(options.workerName) ||
    options.containerName !== `sz-${options.workerName}`
  )
    throw new Error('Invalid local proof ownership')
  const signal = AbortSignal.timeout(30_000)
  await dockerOutput(['stop', '--timeout', '15', options.containerName], signal)
  const prefix = `workerd-${options.workerName}-`
  const list = async () => {
    const result = await dockerOutput(
      [
        'ps',
        '--all',
        '--filter',
        `name=^/(${options.containerName}$|${prefix})`,
        '--format',
        '{{.ID}} {{.Names}}',
      ],
      signal,
    )
    if (result.exit !== 0) throw new Error('Could not inspect the owned local SDK containers')
    return result.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [id, name, extra] = line.split(' ')
        if (
          !id ||
          !/^[a-f0-9]{12,64}$/.test(id) ||
          !(name === options.containerName || name?.startsWith(prefix)) ||
          extra
        )
          throw new Error('Local SDK cleanup returned a container outside this proof')
        return { id, name }
      })
  }
  const before = await list()
  for (const container of before) await dockerOutput(['rm', '--force', container.id], signal)
  const after = await list()
  await writeFile(path.join(options.evidence, 'cleanup.json'), JSON.stringify({ before, after }))
  if (after.length) throw new Error('Owned local SDK containers remained after cleanup')
  if (
    options.requireCompilerStopped &&
    before.some(
      (container) => container.name !== options.containerName && !container.name.endsWith('-proxy'),
    )
  )
    throw new Error('The SDK did not confirm compiler container shutdown before tool cleanup')
}
