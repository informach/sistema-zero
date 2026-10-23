import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { freemem } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { consumeBoundedCli } from './consume-bounded-cli.mjs'

if (!/^24\./.test(process.versions.node) || 'bun' in process.versions)
  throw new Error('Run this CLI using native Node24')

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const repositoryRoot = resolve(packageRoot, '../..')
const require = createRequire(join(packageRoot, 'package.json'))
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const normalized = (path: string) => realpathSync(path).replaceAll('\\', '/')

interface RuntimeTmpObservation {
  nativeTemporaryEntries: string[]
  publicToolCacheDirectories: string[]
  publicToolCache: { path: string; bytes: number; sha256: string }[]
  unknownEntries: string[]
}

function inspectRuntimeTmp(directory: string): RuntimeTmpObservation {
  const observation: RuntimeTmpObservation = {
    nativeTemporaryEntries: [],
    publicToolCacheDirectories: [],
    publicToolCache: [],
    unknownEntries: [],
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('miniflare-')) {
      observation.nativeTemporaryEntries.push(entry.name)
      continue
    }
    const unknown = () => observation.unknownEntries.push(entry.name)
    if (entry.name !== 'update-check' || !entry.isDirectory() || entry.isSymbolicLink()) {
      unknown()
      continue
    }
    const children = readdirSync(join(directory, entry.name), { withFileTypes: true })
    // update-check creates this directory before its optional public npm lookup/write.
    if (children.length === 0) {
      observation.publicToolCacheDirectories.push('update-check')
      continue
    }
    if (children.length !== 1 || children[0].name !== 'wrangler-latest.json') {
      unknown()
      continue
    }
    const cachePath = join(directory, 'update-check/wrangler-latest.json')
    const stat = lstatSync(cachePath)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024) {
      unknown()
      continue
    }
    const bytes = readFileSync(cachePath)
    let metadata: unknown
    try {
      metadata = JSON.parse(bytes.toString('utf8'))
    } catch {
      unknown()
      continue
    }
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata) ||
      Object.keys(metadata).sort().join(',') !== 'lastUpdate,latest' ||
      !('latest' in metadata) ||
      typeof metadata.latest !== 'string' ||
      metadata.latest.length > 64 ||
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(metadata.latest) ||
      !('lastUpdate' in metadata) ||
      typeof metadata.lastUpdate !== 'number' ||
      !Number.isSafeInteger(metadata.lastUpdate) ||
      metadata.lastUpdate <= 0
    ) {
      unknown()
      continue
    }
    observation.publicToolCache.push({
      path: 'update-check/wrangler-latest.json',
      bytes: bytes.length,
      sha256: sha(bytes),
    })
  }
  return observation
}

async function main() {
  const typescriptPackage = realpathSync(require.resolve('typescript/package.json'))
  const wranglerPackage = realpathSync(require.resolve('wrangler/package.json'))
  const nodePackage = realpathSync(require.resolve('@types/node/package.json'))
  if (json(typescriptPackage).version !== '5.9.3') throw new Error('TypeScript5.9.3 is required')
  if (json(wranglerPackage).version !== '4.120.1') throw new Error('Wrangler4.120.1 is required')
  if (json(nodePackage).version !== '24.19.0')
    throw new Error('Direct Node24.19.0 types are required')
  const node = realpathSync(process.execPath)
  const tsc = join(dirname(typescriptPackage), 'lib/tsc.js')
  const wrangler = join(dirname(wranglerPackage), 'wrangler-dist/cli.js')
  const nativeSource = join(packageRoot, 'src/python-native-sha256.ts')
  const nodeIndex = join(dirname(nodePackage), 'index.d.ts')
  const configPath = join(packageRoot, 'promotion-worker/wrangler.jsonc')
  const typescript: typeof import('typescript') = require('typescript')
  const parsedConfig = typescript.readConfigFile(configPath, (path) => readFileSync(path, 'utf8'))
  if (parsedConfig.error) throw new Error('Operational configuration is not valid JSONC')
  const productConfig = parsedConfig.config
  if (
    productConfig.compatibility_date !== '2026-10-20' ||
    !Array.isArray(productConfig.compatibility_flags) ||
    !productConfig.compatibility_flags.includes('nodejs_compat')
  )
    throw new Error('Operational native runtime compatibility contract differs')

  const cacheRoot = join(repositoryRoot, '.cache')
  mkdirSync(cacheRoot, { recursive: true })
  const output = mkdtempSync(join(cacheRoot, 'python-promoter-types-'))
  for (const name of ['home', 'tmp', 'appdata', 'localappdata', 'xdg', 'logs'])
    mkdirSync(join(output, name))
  const env: Record<string, string> = {
    PATH: dirname(node),
    HOME: join(output, 'home'),
    USERPROFILE: join(output, 'home'),
    APPDATA: join(output, 'appdata'),
    LOCALAPPDATA: join(output, 'localappdata'),
    XDG_CONFIG_HOME: join(output, 'xdg'),
    TEMP: join(output, 'tmp'),
    TMP: join(output, 'tmp'),
    WRANGLER_LOG_PATH: join(output, 'logs/wrangler.log'),
    WRANGLER_SEND_METRICS: 'false',
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
    CI: 'true',
    NO_COLOR: '1',
  }
  for (const name of ['SystemRoot', 'windir']) if (process.env[name]) env[name] = process.env[name]
  const commands: unknown[] = []
  const temporaryResources: RuntimeTmpObservation[] = []
  const receipt = {
    state: 'running',
    output: relative(repositoryRoot, output),
    commands,
    temporaryResources,
    versions: {
      node: process.versions.node,
      typescript: json(typescriptPackage).version,
      wrangler: json(wranglerPackage).version,
      nodeTypes: json(nodePackage).version,
    },
    retainedResourceLease: false,
    signalsSent: false,
    cleanupIndependentlyQualified: false,
    lifetimeScope:
      'Direct child settlement only; Wrangler owns local RTTI disposal. No complete native process-tree observation is claimed.',
    tools: [node, tsc, wrangler, nodePackage].map((path) => ({
      path,
      sha256: sha(readFileSync(path)),
    })),
  }
  const save = () =>
    writeFileSync(join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  save()
  const readClosedLog = (path: string) => {
    if (statSync(path).size > 16 * 1024 * 1024)
      throw new Error('Closed operational type-gate log exceeds16MiB; evidence is preserved')
    return readFileSync(path, 'utf8')
  }
  async function run(role: string, argv: string[], operationMs = 120000, graceMs = 15000) {
    if (freemem() < 2048 * 1024 * 1024) throw new Error('Type gate needs at least2048MiB free RAM')
    const stdoutPath = join(output, 'logs', `${role}.stdout.log`)
    const stderrPath = join(output, 'logs', `${role}.stderr.log`)
    const command: { role: string; argv: string[]; status: string; result: unknown } = {
      role,
      argv,
      status: 'running',
      result: null,
    }
    receipt.commands.push(command)
    save()
    const result = await consumeBoundedCli({
      application: node,
      argv,
      cwd: output,
      env,
      stdoutPath,
      stderrPath,
      operationMs,
      graceMs,
      onSpawn(record: unknown) {
        command.result = record
        save()
      },
      onDeadline(record: unknown) {
        command.result = record
        command.status = 'deadline'
        save()
      },
      onRetain(record: unknown) {
        command.result = record
        command.status = 'retained'
        receipt.retainedResourceLease = true
        save()
      },
    })
    command.result = result
    command.status =
      result.status === 0 &&
      !result.timedOut &&
      !result.retained &&
      !result.errorCode &&
      !result.observerFailure &&
      !result.deadlineObservationFailure
        ? 'passed'
        : 'failed'
    save()
    if (command.status !== 'passed') {
      // These are credential-free LOCAL CLI/compiler diagnostics, never authenticated SDK logs.
      if (!result.retained)
        for (const log of [stdoutPath, stderrPath]) {
          const text = readClosedLog(log)
          if (text) process.stderr.write(text.slice(0, 16384))
        }
      throw new Error(
        `Operational type gate failed at ${role}; evidence: ${relative(repositoryRoot, output)}`,
      )
    }
    readClosedLog(stderrPath)
    return readClosedLog(stdoutPath)
  }
  try {
    const emptyEnv = join(output, 'empty.env')
    writeFileSync(emptyEnv, '', { flag: 'wx' })
    const generated = join(output, 'worker.generated.d.ts')
    const qaConfig = join(output, 'wrangler.types.jsonc')
    writeFileSync(
      qaConfig,
      JSON.stringify(
        {
          name: 'sz-operational-local-types-only',
          main: join(packageRoot, 'promotion-worker/index.ts'),
          compatibility_date: productConfig.compatibility_date,
          compatibility_flags: productConfig.compatibility_flags,
          workers_dev: false,
          preview_urls: false,
          routes: [],
          observability: { enabled: false },
          version_metadata: { binding: 'CF_VERSION_METADATA' },
          secrets: { required: ['OPERATOR_HMAC_KEY'] },
          r2_buckets: [
            { binding: 'PYTHON_RUNTIME', bucket_name: 'qa-operational-types-only', remote: false },
          ],
        },
        null,
        2,
      ),
    )
    await run('local-runtime-types', [
      '--max-old-space-size=768',
      wrangler,
      'types',
      generated,
      '--config',
      qaConfig,
      '--env-file',
      emptyEnv,
      '--include-runtime=true',
      '--include-env=true',
      '--strict-vars=false',
      '--env-interface=OperationalPromotionNativeEnv',
    ])
    receipt.retainedResourceLease = true
    const temporary = inspectRuntimeTmp(join(output, 'tmp'))
    receipt.temporaryResources.push(temporary)
    save()
    if (temporary.nativeTemporaryEntries.length || temporary.unknownEntries.length) {
      throw new Error('Local runtime generator retained temporary resources; evidence is preserved')
    }
    // update-check metadata is a retained public tool cache, not native process ownership.
    receipt.retainedResourceLease = false
    save()
    const sourceImport = (target: string) => {
      const path = relative(output, target).split(sep).join('/')
      return path.startsWith('.') ? path : `./${path}`
    }
    const entry = join(output, 'entry-check.ts')
    writeFileSync(
      entry,
      `import worker from ${JSON.stringify(sourceImport(join(packageRoot, 'promotion-worker/index')))}\nimport type {OperationalPromotionBindings} from ${JSON.stringify(sourceImport(join(packageRoot, 'promotion-worker/handler')))}\ndeclare const generated:OperationalPromotionNativeEnv\nconst bindings:OperationalPromotionBindings=generated\nexport {bindings}\nexport default worker satisfies ExportedHandler<OperationalPromotionNativeEnv>\n`,
    )
    const capabilities = join(output, 'capabilities.ts')
    writeFileSync(
      capabilities,
      `import {encodeOwnedUtf8} from ${JSON.stringify(sourceImport(join(repositoryRoot, 'packages/core/src/creations/utf8')))}\nimport {createPythonNativeSha256} from ${JSON.stringify(sourceImport(nativeSource.slice(0, -3)))}\nexport const owned:Uint8Array<ArrayBuffer>=encodeOwnedUtf8('á😀')\nconst hash=createPythonNativeSha256()\nhash.update(owned)\nexport const digest:string=hash.digestHex()\n`,
    )
    const common = {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2022', 'ESNext.Disposable', 'ESNext.Float16'],
      types: [],
      strict: true,
      skipLibCheck: false,
    }
    const nodeConfig = join(output, 'tsconfig.node-api.json')
    writeFileSync(
      nodeConfig,
      JSON.stringify(
        {
          compilerOptions: {
            ...common,
            typeRoots: [dirname(dirname(nodeIndex))],
            composite: true,
            declaration: true,
            emitDeclarationOnly: true,
            rootDir: packageRoot,
            outDir: join(output, 'node-api'),
            allowJs: true,
            checkJs: false,
            tsBuildInfoFile: join(output, 'node-api.tsbuildinfo'),
          },
          files: [
            nodeIndex,
            nativeSource,
            fileURLToPath(import.meta.url),
            join(packageRoot, 'scripts/consume-bounded-cli.mjs'),
          ],
        },
        null,
        2,
      ),
    )
    const workerConfig = join(output, 'tsconfig.worker.json')
    writeFileSync(
      workerConfig,
      JSON.stringify(
        {
          compilerOptions: {
            ...common,
            typeRoots: [],
            noEmit: true,
            allowImportingTsExtensions: true,
            disableSourceOfProjectReferenceRedirect: true,
            incremental: true,
            tsBuildInfoFile: join(output, 'worker.tsbuildinfo'),
          },
          files: [generated, entry, capabilities],
          references: [{ path: './tsconfig.node-api.json' }],
        },
        null,
        2,
      ),
    )
    const nodeLog = await run('node-api', [
      '--max-old-space-size=768',
      tsc,
      '--project',
      nodeConfig,
      '--pretty',
      'false',
      '--listFiles',
    ])
    const declaration = join(output, 'node-api/src/python-native-sha256.d.ts')
    if (
      /\b(?:import|Hash|Buffer)\b|reference\s+types|node:/.test(readFileSync(declaration, 'utf8'))
    )
      throw new Error('Native digest declaration exposes Node types')
    const listedFiles = (log: string) =>
      log
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /\.tsx?$/.test(line) && existsSync(line))
        .map(normalized)
    const nodeFiles = listedFiles(nodeLog).filter((path) =>
      path.includes('/node_modules/@types/node/'),
    )
    const nodeRoot = `${normalized(dirname(nodePackage))}/`
    if (!nodeFiles.length || nodeFiles.some((path) => !path.startsWith(nodeRoot)))
      throw new Error('Node declaration project includes a second Node version')
    const workerLog = await run('worker', [
      '--max-old-space-size=768',
      tsc,
      '--project',
      workerConfig,
      '--pretty',
      'false',
      '--listFiles',
    ])
    const workerFiles = listedFiles(workerLog)
    if (
      workerFiles.some(
        (path) =>
          path.includes('/node_modules/@types/node/') ||
          path.includes('/node_modules/@types/bun/') ||
          path.includes('/bun-types/') ||
          path.includes('/@cloudflare/workers-types/') ||
          /\/lib\.(?:dom|webworker)(?:\.[^/]+)?\.d\.ts$/.test(path),
      ) ||
      workerFiles.includes(normalized(nativeSource)) ||
      !workerFiles.includes(normalized(declaration))
    )
      throw new Error('Worker graph must use the emitted adapter without Node/Bun ambient types')
    receipt.state = 'passed'
    save()
    console.log(`Operational Worker types passed: ${relative(repositoryRoot, output)}`)
  } catch (error) {
    receipt.state = 'failed'
    save()
    throw error
  }
}

await main()
