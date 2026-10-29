/** Real Chromium execution of the course rules, without network or learner-state mutation. */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  isExecutionRule,
  judgeExecutionObservation,
} from '../../../packages/core/src/learning/project-execution'
import { instrumentCheckScript } from '../../../packages/studio/src/check/instrumentCheckScript'
import { preloadCourseModels } from '../../../packages/studio/src/core/courseModels'
import { asset3DManifest } from '../../../packages/studio/src/core/projectAssets'
import { gameThreeDExtension } from '../../../packages/studio/src/official-extensions/game-3d'
import { gameThreeDRuntimeWithoutPlatform } from '../../../packages/studio/src/official-extensions/game-3d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { ilhaChecks } from './ilha-do-farol-criterios'
import { ILHA_ESCOLHAS_DO_VIDEO, montarProjetoIlha } from './ilha-do-farol-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  dir = resolve(
    root,
    '.cache/ilha-do-farol',
    process.argv.includes('--docker') ? 'docker' : 'host',
  ),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
mkdirSync(dir, { recursive: true })
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const version = JSON.parse(readFileSync(resolve(runtime, 'package.json'), 'utf8')).dependencies
  .three
const threeRoot = resolve(runtime, 'node_modules/three')
for (const f of readdirSync(runtime))
  if (f.endsWith('.mjs')) {
    let s = readFileSync(resolve(runtime, f), 'utf8')
    if (f === 'check-objectives.mjs')
      s = s.replace("from 'playwright-core'", `from ${JSON.stringify(pathToFileURL(driver).href)}`)
    if (f === 'check-javascript-modules.mjs')
      s = s.replace(
        /export async function createImageThreeModuleResolver\(\) \{[\s\S]*$/m,
        `export async function createImageThreeModuleResolver(){return createPinnedThreeModuleResolver(${JSON.stringify(threeRoot)},${JSON.stringify(version)})}`,
      )
    writeFileSync(resolve(dir, f), s)
  }
const scenario = process.argv[2] ?? 'correto'
const positionScenario = scenario.startsWith('posicao-')
// A parte uma-vez: a luz acende uma vez só (com a guarda) e o erro de antes (sem ela).
const onceScenario = scenario === 'uma-vez' || scenario === 'sem-guarda'
const p = montarProjetoIlha(
    scenario === 'posicao-inalterada'
      ? 'movimento'
      : positionScenario
        ? 'posicao'
        : onceScenario
          ? 'uma-vez'
          : 'personalizar',
    // Outros modelos em todos os objetos: a mesma caixa por categoria, o mesmo jogo.
    scenario === 'personalizado' ? ILHA_ESCOLHAS_DO_VIDEO : {},
  ),
  scope = '__sz0123456789abcdef01234567'
let js = p.files['script.js']
if (scenario === 'sem-movimento') js = js.replace(/SZGame3D.topDown\([^;]+;/, '')
if (scenario === 'sem-memoria') js = js.replace(/temChave = true/g, 'temChave = false')
if (scenario === 'chave-alta')
  js = js.replace(/setPosition\(chave, -3, 1, -2\)/, 'setPosition(chave, -3, 3, -2)')
if (scenario === 'outra-posicao')
  js = js.replace(/setPosition\(chave, -3, 1, -2\)/, 'setPosition(chave, -7, 1, 3)')
if (scenario === 'barco-lento') js = js.replace('4.5, 1.8)', '4.5, 0.03)')
if (scenario === 'sem-guarda') js = js.replace('if (!ganhou) {', 'if (true) {')
if (
  !['correto', 'personalizado', 'uma-vez'].includes(scenario) &&
  !positionScenario &&
  js === p.files['script.js']
)
  throw Error('Mutação não aplicada: ' + scenario)
// Os modelos vêm da biblioteca dos cursos: o projeto guarda só a referência.
await preloadCourseModels(p.assets, js)
writeFileSync(
  resolve(dir, 'game.html'),
  buildPreviewDoc({
    html: p.files['index.html'],
    css: p.files['style.css'],
    js: instrumentCheckScript(js, scope),
    extensionScripts: [gameThreeDRuntimeWithoutPlatform],
    extensionImports: gameThreeDExtension.runtime?.esmImports,
    models3d: asset3DManifest(p.assets),
    runtimeInspection: true,
  }),
)
const objectives = ilhaChecks(
  positionScenario ? 'posicao' : onceScenario ? 'uma-vez' : 'personalizar',
).filter((c) =>
  isExecutionRule(c.rule),
)
writeFileSync(
  resolve(dir, 'check-options.json'),
  JSON.stringify({ mode: 'classic', scope, objectives, deadlineMs: 90000, screenshots: true }),
)
if (process.argv.includes('--prepare-only')) process.exit(0)
const command = process.argv.includes('--docker')
  ? [
      'docker',
      'run',
      '--rm',
      '--network',
      'none',
      '--shm-size=1g',
      '--entrypoint',
      'node',
      '--mount',
      `type=bind,source=${dir},target=/workspace/check`,
      '-w',
      '/workspace/check',
      process.env.SZ_CHECK_DOCKER_IMAGE ?? 'sistemazero-studio-runtime:verify',
      '/opt/sz-runtime/check-objectives.mjs',
    ]
  : ['node', resolve(dir, 'check-objectives.mjs')]
const child = Bun.spawn(command, {
  cwd: dir,
  env: {
    ...process.env,
    SZ_CHECK_CHROMIUM:
      process.env.SZ_CHECK_CHROMIUM ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  },
  stdout: 'pipe',
  stderr: 'pipe',
  windowsHide: true,
})
const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
if (code) throw Error(stderr)
const result = JSON.parse(readFileSync(resolve(dir, 'check-result.json'), 'utf8'))
const verdicts = objectives.map((c) => ({
  id: c.id,
  ...judgeExecutionObservation(
    c.rule as any,
    result.observations.find((o: any) => o.id === c.id),
  ),
}))
writeFileSync(
  resolve(dir, `result-${scenario}.json`),
  JSON.stringify({ verdicts, ...result }, null, 2),
)
console.log(JSON.stringify(verdicts, null, 2))
const expected: Record<string, boolean[]> = {
  correto: [true, true, true, true, true, true, true],
  personalizado: [true, true, true, true, true, true, true],
  'outra-posicao': [true, true, true, true, true, true, true],
  'sem-memoria': [true, true, true, true, true, true, false],
  'chave-alta': [true, true, true, true, false, true, false],
  'sem-movimento': [false, false, false, false, false, false, false],
  'barco-lento': [true, true, true, true, true, true, false],
  'posicao-correta': [true, true, true, true, true, true],
  'posicao-inalterada': [true, true, true, true, false, false],
  'uma-vez': [true, true, true, true, true, true, true],
  'sem-guarda': [true, true, true, true, true, true, false],
}
if (JSON.stringify(verdicts.map((v) => v.passed)) !== JSON.stringify(expected[scenario]))
  throw Error('Os objetivos não distinguiram o cenário esperado: ' + scenario)
