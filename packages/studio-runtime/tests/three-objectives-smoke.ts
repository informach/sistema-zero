import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ExecutionObjectiveRequest,
  judgeExecutionObservation,
} from '@sistemazero/core/learning'
import { createCheckScope, prepareClassicCheckDocument } from '../../studio/src/check/serverCheck'
import { createEmptyProject } from '../../studio/src/core/project'
import { generateProjectFiles } from '../../studio/src/generators/project'
import { rotatingCubeExample } from '../../studio/src/official-extensions/game-3d/examples'
import { gameThreeDManifest } from '../../studio/src/official-extensions/game-3d/manifest'
import {
  CHECK_ENTRY_PATH,
  parseCheckRequest,
  proCheckEntry,
  proCheckModules,
  withCheckEntry,
} from '../src/check'
import { trustedPackageJson, trustedViteConfig } from '../src/contracts'

const root = path.resolve(import.meta.dirname, '../../..')
const cache =
  process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-runtime')
const tag = process.env.STUDIO_PYTHON_TEST_IMAGE ?? 'sistemazero-studio-runtime:verify'
async function docker(args: string[]) {
  const child = Bun.spawn(['docker', ...args], {
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { exit, stdout, stderr }
}
const pin = await docker(['image', 'inspect', tag, '--format', '{{.Id}}'])
assert.equal(pin.exit, 0, pin.stderr)
const image = pin.stdout.trim()
assert.match(image, /^sha256:[a-f0-9]{64}$/)
const profile = await docker([
  'run',
  '--rm',
  '--network',
  'none',
  '--entrypoint',
  'cat',
  image,
  '/opt/sz-runtime/validation-profile.json',
])
assert.equal(profile.exit, 0, profile.stderr)
assert.deepEqual(
  JSON.parse(profile.stdout),
  JSON.parse(
    await readFile(
      path.join(root, 'packages/studio-runtime/runtime/validation-profile.json'),
      'utf8',
    ),
  ),
)
const evidence = path.join(cache, 'three-objectives', crypto.randomUUID())
await mkdir(evidence, { recursive: true })
type Case = {
  name: string
  mode: 'classic' | 'pro'
  speed: number
  expected: boolean
  axis?: 'x' | 'y' | 'z'
  drawExpected?: boolean
  startupError?: boolean
  network?: boolean
}
const cases: Case[] = [
  { name: 'blocks', mode: 'classic', speed: 0, expected: true },
  ...(['classic', 'pro'] as const).flatMap((mode) =>
    [3, 9, -3, 0].map((speed) => ({ name: `${mode}-${speed}`, mode, speed, expected: speed > 0 })),
  ),
  { name: 'pro-no-export', mode: 'pro', speed: 3, expected: false },
  ...(['classic', 'pro'] as const).flatMap((mode) =>
    (['x', 'y'] as const).map((axis) => ({
      name: `${mode}-${axis}`,
      mode,
      axis,
      speed: 3,
      expected: true,
    })),
  ),
  { name: 'pro-wrong-return', mode: 'pro', speed: 3, expected: true, drawExpected: false },
  {
    name: 'pro-error',
    mode: 'pro',
    speed: 3,
    expected: false,
    drawExpected: false,
    startupError: true,
  },
  { name: 'pro-network', mode: 'pro', speed: 3, expected: true, network: true },
]
for (const item of cases) {
  const scope = createCheckScope()
  const axis = item.axis ?? 'z'
  const variable =
    item.mode === 'pro'
      ? { kind: 'moduleValue' as const, module: 'src/main.ts', path: `jogador.position.${axis}` }
      : {
          kind: 'value' as const,
          path: item.name === 'blocks' ? 'caixa.rotation.y' : `jogador.position.${axis}`,
        }
  const objectives: ExecutionObjectiveRequest[] = [
    {
      id: 'move',
      rule: {
        type: 'behavior',
        steps:
          item.name === 'blocks'
            ? [{ action: 'wait', ms: 250 }]
            : [{ action: 'press', key: 'ArrowRight', holdMs: 150 }],
        expect: { target: variable, compare: 'increased' },
      },
    },
  ]
  if (item.name !== 'blocks')
    objectives.push({
      id: 'draw',
      rule: {
        type: 'functionReturns',
        name: 'desenhoReal',
        ...(item.mode === 'pro' ? { module: 'src/main.ts' } : {}),
        cases: [{ args: [], expected: true }],
      },
    })
  let document = '',
    files: Record<string, string> = {}
  if (item.mode === 'classic') {
    const project = createEmptyProject(`three-${item.name}`, 'QA 3D')
    project.installedExtensions = [
      { id: 'game-3d', version: gameThreeDManifest.version, installedAt: 1 },
    ]
    if (item.name === 'blocks') {
      project.ir = rotatingCubeExample.ir
      project.files = generateProjectFiles({ ir: rotatingCubeExample.ir, projectName: 'QA Cubo' })
    } else {
      project.files['index.html'] = '<canvas id="stage" width="640" height="480"></canvas>'
      project.files['script.js'] =
        `const mundo=SZGame3D.createScene('stage'); const jogador=SZGame3D.createBox(mundo,{size:1.5,color:'#fba458'}); document.addEventListener('keydown', e=>{if(e.key==='ArrowRight') jogador.position.${axis}+=${item.speed}}); function desenhoReal(){return mundo.renderer.info.render.calls>0} SZGame3D.animate(mundo,()=>{});`
    }
    document = await prepareClassicCheckDocument(project, scope)
  } else {
    const source = `import * as THREE from 'three';\n${item.name === 'pro-no-export' ? '' : 'export '}const jogador=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#58d9c6'})); const scene=new THREE.Scene();scene.background=new THREE.Color('#142335');scene.add(jogador);const camera=new THREE.PerspectiveCamera(55,640/480,0.1,100);camera.position.set(3,3,5);camera.lookAt(0,0,0);const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas')});renderer.setSize(640,480);function draw(){renderer.render(scene,camera);requestAnimationFrame(draw)}draw();document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')jogador.position.${axis}+=${item.speed}});export function desenhoReal(){return ${item.drawExpected === false ? 'false' : 'renderer.info.render.calls>0'}}${item.startupError ? 'throw new Error("QA erro 3D");' : ''}${item.network ? 'export async function redeBloqueada(){try{await fetch("https://external-network-denied.invalid/probe");return false}catch{return true}}' : ''}`
    const request = parseCheckRequest({
      mode: 'pro',
      executionId: `three-${crypto.randomUUID()}`,
      scope,
      templateId: 'three-ts',
      files: {
        'index.html':
          '<!doctype html><body style="margin:0"><canvas></canvas><script type="module" src="/src/main.ts"></script></body>',
        'src/main.ts': source,
      },
      objectives,
    })
    assert.equal(request.mode, 'pro')
    if (request.mode !== 'pro') throw Error('Missing Pro request')
    files = {
      ...request.build.files,
      'index.html': withCheckEntry(request.build.files['index.html']!),
      [CHECK_ENTRY_PATH]: proCheckEntry(scope, proCheckModules(objectives)),
      'package.json': trustedPackageJson('three-ts'),
      'vite.config.mjs': trustedViteConfig('three-ts'),
    }
  }
  if (item.network)
    objectives.push({
      id: 'network',
      rule: {
        type: 'functionReturns',
        name: 'redeBloqueada',
        module: 'src/main.ts',
        cases: [{ args: [], expected: true }],
      },
    })
  else
    objectives.push({
      id: 'resources',
      rule: {
        type: 'behavior',
        steps: [],
        expect: {
          target: { kind: 'console' },
          compare: 'notContains',
          value: 'Failed to load resource',
        },
      },
    })
  const options = { mode: item.mode, scope, objectives, screenshots: true, deadlineMs: 75_000 }
  const script = `const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');if(process.getuid()!==1000)throw Error('Non-root production identity required');const root='/workspace/builds/proof';fs.mkdirSync(root,{recursive:true});process.chdir(root);const files=${JSON.stringify(files)};for(const [name,content] of Object.entries(files)){fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,content)};if(${JSON.stringify(item.mode)}==='classic')fs.writeFileSync('game.html',${JSON.stringify(document)});else{fs.symlinkSync('/opt/sz-runtime/node_modules','node_modules');cp.execFileSync(process.execPath,['/opt/sz-runtime/node_modules/vite/bin/vite.js','build','--configLoader','native'],{cwd:root,timeout:40000,stdio:'pipe'})};fs.writeFileSync('check-options.json',${JSON.stringify(JSON.stringify(options))});cp.execFileSync(process.execPath,['/opt/sz-runtime/check-objectives.mjs'],{cwd:root,timeout:80000,stdio:'pipe'});const report=JSON.parse(fs.readFileSync('check-result.json','utf8'));const images=report.observations.filter(x=>x.screenshot).map(x=>({id:x.id,base64:fs.readFileSync(x.screenshot).toString('base64')}));console.log(JSON.stringify({uid:process.getuid(),report,images}));`
  const name = `sz-three-objective-${crypto.randomUUID().replaceAll('-', '')}`
  const directory = path.join(evidence, item.name)
  await mkdir(directory)
  if (document) await writeFile(path.join(directory, 'game.html'), document)
  const child = Bun.spawn(
    [
      'docker',
      'run',
      '--rm',
      '--name',
      name,
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
      '/workspace/builds:rw,nosuid,nodev,uid=1000,gid=1000,size=512m',
      '--tmpfs',
      '/tmp:rw,nosuid,nodev,size=256m',
      '--entrypoint',
      'node',
      '-i',
      image,
    ],
    { windowsHide: true, stdin: new TextEncoder().encode(script), stdout: 'pipe', stderr: 'pipe' },
  )
  let expired = false
  const timer = setTimeout(() => {
    expired = true
    void docker(['stop', '--time', '1', name])
  }, 100_000)
  try {
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    await writeFile(
      path.join(directory, 'process.json'),
      JSON.stringify({ exit, stdout, stderr, expired, image }),
    )
    assert.equal(expired, false)
    assert.equal(exit, 0, stderr)
    const result = JSON.parse(stdout)
    assert.equal(result.uid, 1000)
    const results = objectives.map((objective) => ({
      id: objective.id,
      ...judgeExecutionObservation(
        objective.rule,
        result.report.observations.find((o: { id: string }) => o.id === objective.id),
      ),
    }))
    assert.equal(
      results[0]?.passed,
      item.expected,
      JSON.stringify({ results, report: result.report }),
    )
    if (item.name !== 'blocks')
      assert.equal(results[1]?.passed, item.drawExpected ?? true, JSON.stringify(result.report))
    assert.equal(results.at(-1)?.passed, !item.startupError, JSON.stringify(result.report))
    const screenshot = result.images.find((image: { id: string }) => image.id === 'move')
    assert.ok(screenshot)
    const bytes = Buffer.from(screenshot.base64, 'base64')
    assert.ok(bytes.length > 2000)
    assert.equal(bytes[0], 0xff)
    assert.equal(bytes[1], 0xd8)
    await writeFile(path.join(directory, 'scene.jpg'), bytes)
    await writeFile(
      path.join(directory, 'summary.json'),
      JSON.stringify({
        image,
        name: item.name,
        expected: item.expected,
        results,
        observations: result.report.observations,
        uid: result.uid,
        captureBytes: bytes.length,
      }),
    )
    console.log(
      JSON.stringify({ name: item.name, results, captureBytes: bytes.length, evidence: directory }),
    )
  } finally {
    clearTimeout(timer)
    await docker(['rm', '-f', name])
    const remaining = await docker(['ps', '-aq', '--filter', `name=^/${name}$`])
    assert.equal(remaining.exit, 0)
    assert.equal(remaining.stdout.trim(), '')
    await writeFile(
      path.join(directory, 'cleanup.json'),
      JSON.stringify({ name, remaining: [], confirmed: true }),
    )
  }
}
