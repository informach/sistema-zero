import assert from 'node:assert/strict'
import { chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { pythonProjectStructureRecipe } from '@sistemazero/core/studio/python-mission-execution'
import {
  StudioPythonPlaytestRecipeSchema,
  verifyStudioPythonPlaytestCapture,
  verifyStudioPythonPlaytestReport,
} from '@sistemazero/core/studio/python-playtest'
import { studioPythonLogicalFiles } from '@sistemazero/core/studio/python-runtime-distribution'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonRuntimeDistribution } from '../../studio/scripts/build-python-runtime'
import { sha256 } from '../src/artifacts'

// Explicit headless proof. Docker also checks network/resource isolation; neither mode qualifies SDK/remote/performance.
const root = path.resolve(import.meta.dirname, '../../..')
const docker = process.argv.includes('--docker')
const health = process.argv.includes('--health')
const cache = process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-l0')
let image = process.env.STUDIO_PYTHON_TEST_IMAGE ?? 'sistemazero-studio-runtime:verify'
if (docker) {
  const pin = Bun.spawn(['docker', 'image', 'inspect', image, '--format', '{{.Id}}'], {
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [code, output, error] = await Promise.all([
    pin.exited,
    new Response(pin.stdout).text(),
    new Response(pin.stderr).text(),
  ])
  assert.equal(code, 0, error)
  image = output.trim()
  assert.match(image, /^sha256:[a-f0-9]{64}$/)

  const profile = Bun.spawn(
    [
      'docker',
      'run',
      '--rm',
      '--network',
      'none',
      '--entrypoint',
      'cat',
      image,
      '/opt/sz-runtime/validation-profile.json',
    ],
    { windowsHide: true, stdout: 'pipe', stderr: 'pipe' },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    profile.exited,
    new Response(profile.stdout).text(),
    new Response(profile.stderr).text(),
  ])
  assert.equal(exitCode, 0, stderr)
  assert.deepEqual(
    JSON.parse(stdout),
    JSON.parse(
      await readFile(
        path.join(root, 'packages/studio-runtime/runtime/validation-profile.json'),
        'utf8',
      ),
    ),
    'The Docker proof requires the current trusted image',
  )
}
const build = await buildPythonRuntimeDistribution({
  vendorDirectory: path.join(cache, 'vendor'),
  outputDirectory: path.join(cache, 'distributions'),
})
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: 'python-playtest-verify',
  releaseId: 'verify-1',
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: ['execute'],
  extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
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
const evidence = path.join(
  cache,
  docker ? 'playtest-docker' : 'playtest-native',
  crypto.randomUUID(),
)
await mkdir(evidence, { recursive: true })
const turtle = [
  'import turtle',
  'screen = turtle.Screen()',
  'screen.setup(320, 240)',
  'actor = turtle.Turtle()',
  'actor.speed(0)',
  'screen.addshape("hero.png")',
  'actor.shape("hero.png")',
  'def key():',
  '    actor.forward(10)',
  '    print("key-fired")',
  'def click(x, y):',
  '    print("click-fired")',
  'screen.onkey(key, "space")',
  'screen.onclick(click)',
  'screen.listen()',
  'name = input("Nome?")',
  'print("ola " + name)',
  'screen.mainloop()',
  '',
].join('\n')
const standardCases = [
  ['console', 'from helper import marker\nprint(marker)\n', 'passed'],
  ['empty', '', 'passed'],
  ['import-error', 'import absent_student_package\n', 'failed'],
  ['import-error-input', 'import absent_student_package\n', 'failed'],
  ['completed-missing-input', 'print("done without input")\n', 'failed'],
  ['turtle', turtle, 'passed'],
  ['modified-file', 'print("original")\n', 'transport-failed'],
] as const
const healthCases = [
  ['health-correct', 'while False:\n    pass\n', 'passed'],
  ['health-import-error', 'import absent_student_package\n', 'failed'],
  ['health-cpu-loop', 'while True:\n    pass\n', 'failed'],
  ['health-input', 'input("Nome?")\n', 'failed'],
] as const
for (const [name, source, expected] of health ? healthCases : standardCases) {
  const directory = path.join(evidence, name)
  await mkdir(path.join(directory, 'runtime'), { recursive: true })
  await mkdir(path.join(directory, 'project'), { recursive: true })
  for (const file of build.manifest.files) {
    const target = path.join(directory, 'runtime', file.path)
    await mkdir(path.dirname(target), { recursive: true })
    await copyFile(path.join(build.directory, file.path), target)
  }
  const files = new Map<string, Uint8Array<ArrayBuffer>>([
    ['main.py', new TextEncoder().encode(source)],
    ['helper.py', new TextEncoder().encode('marker = "helper-output"\n')],
  ])
  if (name === 'turtle')
    files.set(
      'hero.png',
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
        ),
        (char) => char.charCodeAt(0),
      ),
    )
  const content = {
    version: 1,
    configuration: {
      runtime: {
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      },
      extensions: name === 'turtle' ? [{ id: 'python-turtle', version: '1.0.0' }] : [],
      python: {
        entrypoint: 'main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: build.manifest.pythonVersion,
          runtimeManifestSha256: release.manifestSha256,
          requirementsSha256: await sha256(new Uint8Array(0)),
          packages: [],
        },
      },
    },
    directories: [],
    files: await Promise.all(
      [...files].map(async ([filePath, bytes]) => ({
        path: filePath,
        kind: filePath.endsWith('.png') ? 'asset' : 'source',
        sha256: await sha256(bytes),
        byteLength: bytes.byteLength,
      })),
    ),
  }
  const snapshot = {
    ...content,
    projectId: `playtest-${name}`,
    revision: await studioPythonExecutionRevision(content),
  }
  const recipe = StudioPythonPlaytestRecipeSchema.parse(
    health
      ? pythonProjectStructureRecipe()
      : name === 'import-error-input' || name === 'completed-missing-input'
        ? { version: 1, stdin: ['Lia'], keys: ['Space'] }
        : name === 'turtle'
          ? {
              version: 1,
              stdin: ['Lia'],
              keys: ['Space'],
              clicks: [{ x: 0.25, y: 0.25 }],
              requireGraphics: true,
            }
          : { version: 1 },
  )
  for (const [file, bytes] of files) await writeFile(path.join(directory, 'project', file), bytes)
  await writeFile(
    path.join(directory, 'python-playtest-options.json'),
    JSON.stringify({
      version: 1,
      runtimeManifestSha256: release.manifestSha256,
      runtimeFiles: studioPythonLogicalFiles(build.manifest),
      runtimeDeployment: { release, distribution: build.manifest },
      runtimeContentSecurityPolicy: pythonFrameContentSecurityPolicy(
        `https://studio-python-runtime.invalid/v1/runtimes/${release.manifestSha256}/`,
      ),
      payload: { version: 1, name: '', snapshot },
      recipe,
    }),
  )
  if (name === 'modified-file')
    await writeFile(path.join(directory, 'project/main.py'), 'print("tampered")\n')
  const containerName = `sz-python-playtest-${crypto.randomUUID().replaceAll('-', '')}`
  // The fresh proof output directory belongs to the host runner (often UID 1001),
  // while the production image remains UID 1000. Only this attempt's output root
  // needs write access; do not run the learner image as root or weaken its flags.
  if (process.platform !== 'win32') await chmod(directory, 0o777)
  const command = docker
    ? [
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
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--tmpfs',
        '/tmp:rw,nosuid,nodev,size=256m',
        '--mount',
        `type=bind,source=${directory},target=/workspace/playtest`,
        '--workdir',
        '/workspace/playtest',
        '--entrypoint',
        'node',
        image,
        '/opt/sz-runtime/python-playtest.mjs',
      ]
    : ['node', path.join(root, 'packages/studio-runtime/runtime/python-playtest.mjs')]
  const child = Bun.spawn(command, {
    cwd: directory,
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  let expired = false
  const deadline = setTimeout(() => {
    expired = true
    if (docker)
      void Bun.spawn(['docker', 'stop', '--time', '1', containerName], {
        windowsHide: true,
        stdout: 'ignore',
        stderr: 'ignore',
      }).exited
    else child.kill()
  }, 40_000)
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    await writeFile(
      path.join(directory, 'native-output.json'),
      JSON.stringify({ exitCode, stdout, stderr, expired }),
    )
    assert.equal(expired, false, 'The proof exceeded its external deadline')
    if (expected === 'transport-failed') {
      assert.notEqual(exitCode, 0, stdout + stderr)
      assert.match(stderr, /size changed|hash changed/)
    } else {
      assert.equal(exitCode, 0, stdout + stderr)
      const report = await verifyStudioPythonPlaytestReport(
        JSON.parse(await readFile(path.join(directory, 'python-playtest-result.json'), 'utf8')),
        snapshot,
        recipe,
      )
      assert.equal(report.status, expected)
      assert.equal(report.stopped, true)
      if (name === 'console') assert.match(report.stdout, /helper-output/)
      if (name.startsWith('import-error'))
        assert.match(report.errors.join(' '), /absent_student_package/)
      if (name === 'import-error-input' || name === 'completed-missing-input') {
        assert.equal(report.input.stdinSubmitted, 0)
        assert.equal(report.input.keysDispatched, 0)
        assert.match(report.errors.join(' '), /entradas da receita/)
      }
      if (name === 'turtle') {
        assert.match(report.stdout, /ola Lia/)
        assert.match(report.stdout, /key-fired/)
        assert.match(report.stdout, /click-fired/)
        assert.ok(report.capture)
        await verifyStudioPythonPlaytestCapture(
          report.capture,
          new Uint8Array(await readFile(path.join(directory, report.capture.path))),
        )
      }
    }
    console.log(JSON.stringify({ name, expected, exitCode, evidence: directory }))
  } finally {
    clearTimeout(deadline)
    if (docker) {
      await Bun.spawn(['docker', 'rm', '-f', containerName], {
        windowsHide: true,
        stdout: 'ignore',
        stderr: 'ignore',
      }).exited
      const remaining = Bun.spawn(['docker', 'ps', '-aq', '--filter', `name=^/${containerName}$`], {
        windowsHide: true,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [code, ids, error] = await Promise.all([
        remaining.exited,
        new Response(remaining.stdout).text(),
        new Response(remaining.stderr).text(),
      ])
      assert.equal(code, 0, error)
      assert.equal(ids.trim(), '', 'The owned container must retire')
      await writeFile(
        path.join(directory, 'cleanup.json'),
        JSON.stringify({ containerName, confirmed: true }),
      )
    }
  }
}
