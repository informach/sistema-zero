import assert from 'node:assert/strict'
import { mkdir, open, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonRuntimeDistribution } from '../../studio/scripts/build-python-runtime'
import { sha256 } from '../src/artifacts'
import { type PythonInspectionSandbox, runIsolatedPythonInspection } from '../src/python-inspection'

// Explicit Docker integration command; the fixtures are controlled and never grant catalog approval.
const root = path.resolve(import.meta.dirname, '../../..')
const build = await buildPythonRuntimeDistribution()
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: 'python-inspection-verify',
  releaseId: 'verify-1',
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: ['execute'],
  extensions: [],
  sourceTargets: ['browser', 'desktop'],
  requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
  artifacts: build.manifest.files.map(({ path, sha256 }) => ({ path, sha256 })),
  python: {
    version: build.manifest.pythonVersion,
    packages: [],
    providedModules: build.manifest.providedModules,
    features: build.manifest.features,
  },
})
const runId = crypto.randomUUID().replaceAll('-', '')
const evidenceDirectory = path.join(root, '.cache/studio-python-l0/inspection-docker', runId)
for (const [scenario, source, expected] of [
  [
    'valid',
    '\uFEFFimport absent_student_package\nraise RuntimeError("Compilation must not execute this")\n',
    'passed',
  ],
  ['return', 'return 1\n', 'failed'],
  ['encoding', '# coding: ascii\nprint("ação")\n', 'failed'],
  ['bom', '\uFEFF# coding: latin-1\npass\n', 'failed'],
  ['hidden', 'print("dotfile source")\n', 'passed'],
] as const) {
  const entrypoint = scenario === 'hidden' ? '.source/.main.py' : 'main.py'
  const files = new Map([
    [entrypoint, new TextEncoder().encode(source)],
    ['empty.py', new Uint8Array(0)],
  ])
  const content = {
    version: 1 as const,
    configuration: {
      runtime: {
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      },
      extensions: [],
      python: {
        entrypoint,
        dependencyLock: {
          lockVersion: 1 as const,
          target: 'browser' as const,
          pythonVersion: build.manifest.pythonVersion,
          runtimeManifestSha256: release.manifestSha256,
          requirementsSha256: await sha256(new Uint8Array(0)),
          packages: [],
        },
      },
    },
    directories: [],
    files: await Promise.all(
      [...files].map(async ([path, bytes]) => ({
        path,
        kind: 'source' as const,
        sha256: await sha256(bytes),
        byteLength: bytes.byteLength,
      })),
    ),
  }
  const snapshot = {
    ...content,
    projectId: `inspection-${scenario}`,
    revision: await studioPythonExecutionRevision(content),
  }
  const directory = path.join(evidenceDirectory, scenario)
  await mkdir(directory, { recursive: true })
  const containerName = `sz-python-inspect-${runId}-${scenario}`
  let running = false,
    disposed = false,
    containerCwd = ''
  function target(input: string) {
    if (!/^\/workspace\/python-inspection\/[a-f0-9]{32}(?:\/|$)/.test(input))
      throw new Error('Unexpected sandbox path')
    const relative = input.replace(/^\/workspace\/python-inspection\/[a-f0-9]{32}\/?/, '')
    const resolved = path.resolve(directory, relative)
    if (resolved !== directory && !resolved.startsWith(`${directory}${path.sep}`))
      throw new Error('Fixture path escapes workspace')
    return resolved
  }
  const sandbox: PythonInspectionSandbox = {
    async mkdir(input) {
      await mkdir(target(input), { recursive: true })
    },
    async writeFile(input, data) {
      if (typeof data === 'string') {
        await writeFile(target(input), data, 'utf8')
        return
      }
      const output = await open(target(input), 'w')
      const reader = data.getReader()
      try {
        for (;;) {
          const next = await reader.read()
          if (next.done) break
          let offset = 0
          while (offset < next.value.byteLength) {
            const result = await output.write(next.value, offset, next.value.byteLength - offset)
            offset += result.bytesWritten
          }
        }
      } finally {
        reader.releaseLock()
        await output.close()
      }
    },
    async readFile(input) {
      return { content: await readFile(target(input), 'utf8') }
    },
    async exec(command, options) {
      assert.equal(command, 'node /opt/sz-runtime/python-inspect.mjs')
      if (disposed) throw new Error('Job already retired')
      containerCwd = options.cwd
      const guard = `const fs = require('node:fs'); if(process.getuid()===0)throw Error('Root is forbidden'); let denied=false; try {fs.writeFileSync('/opt/sz-runtime/write-probe','bad')}catch(e){if(!['EACCES','EROFS'].includes(e.code))throw e; denied=true} if(!denied)throw Error('Trusted runtime is writable');`
      await writeFile(path.join(directory, 'trusted-guard.cjs'), guard)
      running = true
      const child = Bun.spawn(
        [
          'docker',
          'run',
          '--rm',
          '--name',
          containerName,
          '--network',
          'none',
          '--memory',
          '1g',
          '--cpus',
          '1',
          '--pids-limit',
          '256',
          '--read-only',
          '--tmpfs',
          '/tmp:rw,nosuid,nodev,size=256m',
          '--mount',
          `type=bind,source=${directory},target=${containerCwd}`,
          '--workdir',
          containerCwd,
          '--entrypoint',
          'node',
          'sistemazero-studio-runtime:verify',
          '--require',
          `${containerCwd}/trusted-guard.cjs`,
          '/opt/sz-runtime/python-inspect.mjs',
        ],
        { windowsHide: true, stdout: 'pipe', stderr: 'pipe' },
      )
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      running = false
      await writeFile(
        path.join(directory, 'docker-output.json'),
        JSON.stringify({ exitCode, stdout, stderr }),
      )
      return { success: exitCode === 0, stdout, stderr }
    },
    async destroy() {
      disposed = true
      if (running) {
        const child = Bun.spawn(['docker', 'rm', '-f', containerName], {
          windowsHide: true,
          stdout: 'pipe',
          stderr: 'pipe',
        })
        if ((await child.exited) !== 0) throw new Error('Owned inspection container cleanup failed')
      }
    },
  }
  const started = performance.now()
  const report = await runIsolatedPythonInspection({
    structure: false,
    snapshot,
    approvedDeployment: { release, distribution: build.manifest },
    signal: new AbortController().signal,
    createSandbox: () => sandbox,
    readRuntime: async (file) => Bun.file(path.join(build.directory, file)).stream(),
    readProject: async (file) => new Blob([files.get(file)!]).stream(),
  })
  assert.equal(report.status, expected)
  assert.equal(report.files.find((file) => file.path === 'empty.py')?.status, 'passed')
  assert.equal(report.revision, snapshot.revision)
  assert.equal(disposed, true)
  assert.equal(running, false)
  console.log(
    JSON.stringify({
      scenario,
      status: report.status,
      durationMs: Math.round(performance.now() - started),
      revision: report.revision,
      evidence: directory,
    }),
  )
}
