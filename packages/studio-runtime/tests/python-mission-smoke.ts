import assert from 'node:assert/strict'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  judgePythonProjectExecution,
  type PythonProjectExecutionObjective,
  preparePythonProjectExecution,
} from '@sistemazero/core/learning'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import {
  pythonMissionRecipe,
  pythonMissionRequest,
} from '@sistemazero/core/studio/python-mission-execution'
import { verifyStudioPythonPlaytestReport } from '@sistemazero/core/studio/python-playtest'
import { studioPythonLogicalFiles } from '@sistemazero/core/studio/python-runtime-distribution'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonRuntimeDistribution } from '../../studio/scripts/build-python-runtime'
import { sha256 } from '../src/artifacts'

// Real Chromium/Pyodide in the production image, with no external network. No expected
// answer is written beside the program: the canonical judge remains in this process.
const root = path.resolve(import.meta.dirname, '../../..')
const cache =
  process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-l0/missions')
const imageTag = process.env.STUDIO_PYTHON_TEST_IMAGE ?? 'sistemazero-studio-runtime:verify'
const pinImage = Bun.spawn(['docker', 'image', 'inspect', imageTag, '--format', '{{.Id}}'], {
  windowsHide: true,
  stdout: 'pipe',
  stderr: 'pipe',
})
const [pinExit, pinOutput, pinError] = await Promise.all([
  pinImage.exited,
  new Response(pinImage.stdout).text(),
  new Response(pinImage.stderr).text(),
])
assert.equal(pinExit, 0, pinError)
const image = pinOutput.trim()
assert.match(image, /^sha256:[a-f0-9]{64}$/)
const imageCheck = Bun.spawn(
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
const [imageExit, imageProfile, imageError] = await Promise.all([
  imageCheck.exited,
  new Response(imageCheck.stdout).text(),
  new Response(imageCheck.stderr).text(),
])
assert.equal(imageExit, 0, imageError)
assert.deepEqual(
  JSON.parse(imageProfile),
  JSON.parse(
    await readFile(
      path.join(root, 'packages/studio-runtime/runtime/validation-profile.json'),
      'utf8',
    ),
  ),
  'Mission qualification requires the current production image',
)
const build = await buildPythonRuntimeDistribution({
  vendorDirectory: path.join(cache, 'vendor'),
  outputDirectory: path.join(cache, 'distributions'),
})
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: 'python-missions-verify',
  releaseId: 'verify-1',
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: ['execute'],
  extensions: [
    { id: 'python-turtle', versions: ['1.0.0'] },
    { id: 'python-pgzero', versions: ['1.0.0'] },
    { id: 'python-raylib-2d', versions: ['1.0.0'] },
    { id: 'python-raylib-3d', versions: ['1.0.0'] },
  ],
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
const consoleRule: Extract<PythonProjectExecutionObjective['rule'], { type: 'behavior' }> = {
  type: 'behavior',
  steps: [],
  expect: { target: { kind: 'console' }, compare: 'contains', value: 'missao concluida' },
}
const motion: Extract<PythonProjectExecutionObjective['rule'], { type: 'behavior' }> = {
  type: 'behavior',
  steps: [{ action: 'press', key: 'ArrowUp', holdMs: 100 }],
  observation: { type: 'idleBeforeAction', idleMs: 100 },
  expect: { target: { kind: 'spritePosition', path: 'heroi', axis: 'y' }, compare: 'increased' },
}
const cases: {
  name: string
  source: string
  objective: PythonProjectExecutionObjective
  expected: boolean
  extension?: string
  asset?: boolean
  extraFiles?: Record<string, string>
}[] = [
  {
    name: 'function-input',
    source: 'def ler():\n    return int(input("N?"))\n',
    objective: {
      id: 'input-function',
      stdin: ['7'],
      rule: { type: 'functionReturns', name: 'ler', cases: [{ args: [], expected: 7 }] },
    },
    expected: true,
  },
  {
    name: 'four-input-lines',
    source: 'print("-".join([input() for _ in range(4)]))\n',
    objective: {
      id: 'input',
      stdin: ['A', '', 'B', 'C'],
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'console' }, compare: 'contains', value: 'A--B-C' },
      },
    },
    expected: true,
  },
  {
    name: 'unused-input',
    source: 'print("missao concluida")\n',
    objective: { id: 'input', stdin: ['unused'], rule: consoleRule },
    expected: false,
  },
  {
    name: 'extra-input',
    source: 'input()\ninput()\nprint("missao concluida")\n',
    objective: { id: 'input', stdin: ['one'], rule: consoleRule },
    expected: false,
  },
  {
    name: 'stdout-limit',
    source: 'print("x" * 20000)\nprint("missao concluida")\n',
    objective: { id: 'output', rule: consoleRule },
    expected: false,
  },
  {
    name: 'network-denied',
    source:
      'from js import fetch\nfrom pyodide.ffi import run_sync\nrun_sync(fetch("https://example.com/"))\nprint("missao concluida")\n',
    objective: { id: 'network', rule: consoleRule },
    expected: false,
  },
  {
    name: 'host-file-denied',
    source: 'print(open("/workspace/mission/host-only.txt").read())\nprint("missao concluida")\n',
    objective: { id: 'host-file', rule: consoleRule },
    expected: false,
  },
  {
    name: 'console-correct',
    source: 'print("missao concluida")\n',
    objective: { id: 'console', rule: consoleRule },
    expected: true,
  },
  {
    name: 'console-wrong',
    source: 'print("outro resultado")\n',
    objective: { id: 'console', rule: consoleRule },
    expected: false,
  },
  {
    name: 'dead-branch',
    source: 'if False:\n    print("missao concluida")\n',
    objective: { id: 'console', rule: consoleRule },
    expected: false,
  },
  {
    name: 'input',
    source: 'nome = input("Nome?")\nprint("missao " + nome)\n',
    objective: { id: 'console', rule: consoleRule, stdin: ['concluida'] },
    expected: true,
  },
  {
    name: 'exception',
    source: 'raise ValueError("erro do programa")\n',
    objective: { id: 'console', rule: consoleRule },
    expected: false,
  },
  {
    name: 'function',
    source: 'def dobro(n):\n    return n * 2\n',
    objective: {
      id: 'function',
      rule: {
        type: 'functionReturns',
        name: 'dobro',
        cases: [
          { args: [3], expected: 6 },
          { args: [-2], expected: -4 },
        ],
      },
    },
    expected: true,
  },
  {
    name: 'function-wrong',
    source: 'def dobro(n):\n    return n + 2\n',
    objective: {
      id: 'function',
      rule: { type: 'functionReturns', name: 'dobro', cases: [{ args: [3], expected: 6 }] },
    },
    expected: false,
  },
  {
    name: 'async-function',
    source: 'async def dobro(n):\n    return n * 2\n',
    objective: {
      id: 'function',
      rule: { type: 'functionReturns', name: 'dobro', cases: [{ args: [3], expected: 6 }] },
    },
    expected: true,
  },
  {
    name: 'cpu-loop',
    source: 'while True:\n    pass\n',
    objective: {
      id: 'value',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 10 },
      },
    },
    expected: false,
  },
  ...[3, 9, -3, 0].map((speed) => ({
    name: `turtle-${speed}`,
    source: `import turtle\nscreen = turtle.Screen()\nscreen.setup(320, 240)\nheroi = turtle.Turtle()\nheroi.speed(0)\ndef subir():\n    heroi.sety(heroi.ycor() + ${speed})\nscreen.onkeypress(subir, "Up")\nscreen.listen()\nscreen.mainloop()\n`,
    objective: { id: 'move', rule: motion },
    expected: speed > 0,
    extension: 'python-turtle',
  })),
  {
    name: 'turtle-click-score',
    source:
      'pontos = 0\nimport turtle\nscreen = turtle.Screen()\nscreen.setup(320, 240)\nheroi = turtle.Turtle()\ndef clicar(x, y):\n    global pontos\n    pontos += 1\nscreen.onclick(clicar)\nscreen.mainloop()\n',
    objective: {
      id: 'score',
      rule: {
        type: 'behavior',
        steps: [{ action: 'click', x: 160, y: 120 }],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'atLeast', value: 1 },
      },
    },
    expected: true,
    extension: 'python-turtle',
  },
  {
    name: 'turtle-autonomous',
    source:
      'import turtle\nscreen = turtle.Screen()\nscreen.setup(320, 240)\nheroi = turtle.Turtle()\nheroi.speed(0)\ndef tick():\n    heroi.sety(heroi.ycor() + 3)\n    screen.ontimer(tick, 20)\ntick()\nscreen.mainloop()\n',
    objective: { id: 'move', rule: motion },
    expected: false,
    extension: 'python-turtle',
  },
  ...(['2d', '3d'] as const).flatMap((dimension) =>
    [3, -3, 0].map((speed) => ({
      name: `raylib-${dimension}-${speed}`,
      source: `from pyray import *\ninit_window(320, 240, "Missao Raylib")\nset_target_fps(60)\nposicao = Vector3(0, 0, 0)\ncamera = Camera3D(Vector3(5, 5, 5), Vector3(0, 0, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)\nwhile not window_should_close():\n    if is_key_down(KEY_RIGHT):\n        posicao.x += ${speed} * get_frame_time()\n    begin_drawing()\n    clear_background(RAYWHITE)\n${dimension === '3d' ? '    begin_mode_3d(camera)\n    draw_cube(posicao, 1, 1, 1, RED)\n    draw_grid(10, 1)\n    end_mode_3d()\n' : '    draw_circle(160 + int(posicao.x), 120, 20, RED)\n'}    end_drawing()\nclose_window()\n`,
      objective: {
        id: 'right',
        rule: {
          type: 'behavior' as const,
          steps: [{ action: 'press' as const, key: 'ArrowRight', holdMs: 100 }],
          expect: {
            target: { kind: 'value' as const, path: 'posicao.x' },
            compare: 'increased' as const,
          },
        },
      },
      expected: speed > 0,
      extension: `python-raylib-${dimension}`,
    })),
  ),
  {
    name: 'raylib-click',
    source:
      'from pyray import *\ninit_window(320, 240, "Clique")\npontos = 0\nwhile not window_should_close():\n    if is_mouse_button_pressed(MOUSE_BUTTON_LEFT):\n        pontos += 1\n    begin_drawing()\n    clear_background(RAYWHITE)\n    draw_circle(160, 120, 30, BLUE)\n    end_drawing()\nclose_window()\n',
    objective: {
      id: 'click',
      rule: {
        type: 'behavior',
        steps: [{ action: 'click', x: 160, y: 120 }],
        expect: { target: { kind: 'value', path: 'pontos' }, compare: 'atLeast', value: 1 },
      },
    },
    expected: true,
    extension: 'python-raylib-2d',
  },
  {
    name: 'raylib-other-module',
    source:
      'from pyray import *\nfrom physics import dobro\ninit_window(320, 240, "Outro arquivo")\nwhile not window_should_close():\n    begin_drawing()\n    clear_background(RAYWHITE)\n    draw_circle(160, 120, 30, BLUE)\n    end_drawing()\nclose_window()\n',
    extraFiles: { 'physics.py': 'def dobro(n):\n    return n * 2\n' },
    objective: {
      id: 'function',
      rule: {
        type: 'functionReturns',
        module: 'physics.py',
        name: 'dobro',
        cases: [{ args: [3], expected: 6 }],
      },
    },
    expected: true,
    extension: 'python-raylib-2d',
  },
  ...[-3, 3, 0].map((speed) => ({
    name: `pgzero-${speed}`,
    source: `WIDTH = 320\nHEIGHT = 240\nheroi = Actor("hero", (100, 100))\ndef update(dt):\n    if keyboard.up:\n        heroi.y += ${speed}\ndef draw():\n    screen.clear()\n    heroi.draw()\n`,
    objective: {
      id: 'move',
      rule: { ...motion, expect: { ...motion.expect, compare: 'decreased' as const } },
    },
    expected: speed < 0,
    extension: 'python-pgzero',
    asset: true,
  })),
]
const selected = process.argv.find((arg) => arg.startsWith('--case='))?.slice(7)
const group = process.argv.find((arg) => arg.startsWith('--group='))?.slice(8)
assert.ok(!(selected && group), 'Select one case or one group')
assert.ok(!selected || cases.some((item) => item.name === selected), 'Unknown smoke case')
assert.ok(!group || cases.some((item) => item.name.startsWith(`${group}-`)), 'Unknown smoke group')
const evidence = path.join(cache, 'mission-docker', crypto.randomUUID())
await mkdir(evidence, { recursive: true })
for (const item of cases.filter(
  (item) => (!selected || item.name === selected) && (!group || item.name.startsWith(`${group}-`)),
)) {
  const directory = path.join(evidence, item.name)
  await mkdir(path.join(directory, 'runtime'), { recursive: true })
  await mkdir(path.join(directory, 'project'), { recursive: true })
  await writeFile(path.join(directory, 'host-only.txt'), 'SYNTHETIC_QA_MARKER_OUTSIDE_PROJECT')
  // Share only immutable verified runtime bytes, mounted read-only. Each case
  // still owns its project, container, browser context, worker and result files.
  const bytes = new TextEncoder().encode(item.source)
  const projectFiles = [
    { path: 'main.py', kind: 'source', sha256: await sha256(bytes), byteLength: bytes.byteLength },
  ]
  for (const [file, source] of Object.entries(item.extraFiles ?? {})) {
    const bytes = new TextEncoder().encode(source)
    await writeFile(path.join(directory, 'project', file), bytes)
    projectFiles.push({
      path: file,
      kind: 'source',
      sha256: await sha256(bytes),
      byteLength: bytes.byteLength,
    })
  }
  if (item.asset) {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
      'base64',
    )
    await mkdir(path.join(directory, 'project/images'), { recursive: true })
    await writeFile(path.join(directory, 'project/images/hero.png'), png)
    projectFiles.push({
      path: 'images/hero.png',
      kind: 'asset',
      sha256: await sha256(png),
      byteLength: png.byteLength,
    })
  }
  const content = {
    version: 1,
    configuration: {
      runtime: {
        profileId: release.manifest.profileId,
        releaseId: release.manifest.releaseId,
        manifestSha256: release.manifestSha256,
      },
      extensions: item.extension ? [{ id: item.extension, version: '1.0.0' }] : [],
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
    directories: item.asset ? ['images'] : [],
    files: projectFiles,
  }
  const snapshot = {
    ...content,
    projectId: `mission-${item.name}`,
    revision: await studioPythonExecutionRevision(content),
  }
  const plan = await preparePythonProjectExecution(
    {
      projectId: snapshot.projectId,
      revision: snapshot.revision,
      runtimeManifestSha256: release.manifestSha256,
      runId: crypto.randomUUID(),
    },
    [item.objective],
  )
  const mission = pythonMissionRequest(plan)
  await writeFile(path.join(directory, 'project/main.py'), bytes)
  await writeFile(
    path.join(directory, 'python-mission-options.json'),
    JSON.stringify({
      version: 1,
      runtimeManifestSha256: release.manifestSha256,
      runtimeFiles: studioPythonLogicalFiles(build.manifest),
      runtimeDeployment: { release, distribution: build.manifest },
      runtimeContentSecurityPolicy: pythonFrameContentSecurityPolicy(
        `https://studio-python-runtime.invalid/v1/runtimes/${release.manifestSha256}/`,
      ),
      payload: { version: 1, name: '', snapshot },
      mission,
    }),
  )
  const container = `sz-mission-${crypto.randomUUID().replaceAll('-', '')}`
  await writeFile(
    path.join(directory, 'measure-python-mission.cjs'),
    await readFile(path.join(import.meta.dirname, 'fixtures/measure-python-mission.cjs')),
    { flag: 'wx' },
  )
  // The fresh proof output directory belongs to the host runner (often UID 1001),
  // while the production image remains UID 1000. Only this attempt's output root
  // needs write access; do not run the learner image as root or weaken its flags.
  if (process.platform !== 'win32') await chmod(directory, 0o777)
  const command = [
    'docker',
    'run',
    '--rm',
    '--name',
    container,
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
    `type=bind,source=${directory},target=/workspace/mission`,
    '--mount',
    `type=bind,source=${build.directory},target=/workspace/mission/runtime,readonly`,
    '--workdir',
    '/workspace/mission',
    '--entrypoint',
    'node',
    image,
    '/workspace/mission/measure-python-mission.cjs',
  ]
  const child = Bun.spawn(command, { windowsHide: true, stdout: 'pipe', stderr: 'pipe' })
  const timer = setTimeout(() => {
    void Bun.spawn(['docker', 'stop', '--time', '1', container], {
      windowsHide: true,
      stdout: 'ignore',
      stderr: 'ignore',
    }).exited
  }, 135_000)
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    await writeFile(
      path.join(directory, 'process.json'),
      JSON.stringify({ command, exitCode, stdout, stderr }),
    )
    assert.equal(exitCode, 0, stdout + stderr)
    const raw = JSON.parse(
      await readFile(path.join(directory, 'python-mission-result.json'), 'utf8'),
    )
    const results = judgePythonProjectExecution(plan, raw.mission)
    assert.equal(results[0]?.passed, item.expected, JSON.stringify(raw))
    assert.equal(raw.executions.length, 1)
    const report = await verifyStudioPythonPlaytestReport(
      raw.executions[0].report,
      snapshot,
      pythonMissionRecipe(mission.probes[0]!),
    )
    assert.equal(report.stopped, true)
    await writeFile(
      path.join(directory, 'judge.json'),
      JSON.stringify({ expected: item.expected, results }),
    )
    console.log(
      JSON.stringify({ name: item.name, expected: item.expected, results, evidence: directory }),
    )
  } finally {
    clearTimeout(timer)
    await Bun.spawn(['docker', 'rm', '-f', container], {
      windowsHide: true,
      stdout: 'ignore',
      stderr: 'ignore',
    }).exited
    const check = Bun.spawn(['docker', 'ps', '-aq', '--filter', `name=^/${container}$`], {
      windowsHide: true,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [code, remaining, error] = await Promise.all([
      check.exited,
      new Response(check.stdout).text(),
      new Response(check.stderr).text(),
    ])
    assert.equal(code, 0, error)
    assert.equal(remaining.trim(), '')
    await writeFile(
      path.join(directory, 'cleanup.json'),
      JSON.stringify({ containerName: container, confirmed: true }),
    )
  }
}
