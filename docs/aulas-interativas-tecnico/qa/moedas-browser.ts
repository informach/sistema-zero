import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  isExecutionRule,
  isSectionExecutionRule,
  judgeExecutionObservation,
} from '../../../packages/core/src/learning/project-execution'
import { instrumentCheckScript } from '../../../packages/studio/src/check/instrumentCheckScript'
import { preloadCourseModels } from '../../../packages/studio/src/core/courseModels'
import { asset3DManifest, assetMetaManifest } from '../../../packages/studio/src/core/projectAssets'
import { gameTwoDRuntime } from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import { gameThreeDExtension } from '../../../packages/studio/src/official-extensions/game-3d'
import { gameThreeDRuntimeWithoutPlatform } from '../../../packages/studio/src/official-extensions/game-3d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { moedasChecks } from './moedas-criterios'
import { type MoedasDimensao, montarProjetoMoedas } from './moedas-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const d = (process.argv[2] ?? '2d') as MoedasDimensao,
  scenario = process.argv[3] ?? 'correto'
if (!['2d', '3d'].includes(d)) throw Error('Dimensão inválida')
const dir = resolve(root, `.cache/moedas-check-${d}-${scenario}`)
mkdirSync(dir, { recursive: true })
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const version = JSON.parse(readFileSync(resolve(runtime, 'package.json'), 'utf8')).dependencies
  .three
for (const f of readdirSync(runtime))
  if (f.endsWith('.mjs')) {
    let s = readFileSync(resolve(runtime, f), 'utf8')
    if (f === 'check-objectives.mjs')
      s = s.replace("from 'playwright-core'", `from ${JSON.stringify(pathToFileURL(driver).href)}`)
    if (f === 'check-javascript-modules.mjs')
      s = s.replace(
        /export async function createImageThreeModuleResolver\(\) \{[\s\S]*$/m,
        `export async function createImageThreeModuleResolver(){return createPinnedThreeModuleResolver(${JSON.stringify(resolve(runtime, 'node_modules/three'))},${JSON.stringify(version)})}`,
      )
    writeFileSync(resolve(dir, f), s)
  }
const p = montarProjetoMoedas(d, 'bau'),
  scope = '__sz0123456789abcdef01234567'
let js = p.files['script.js']
// Os erros plausíveis da criança (a tabela da proposta).
if (scenario === 'sem-remover')
  js = js.replace(
    /SZGame2D\.removeFromGroup\(moedasDoCaminho, moeda\);|SZGame3D\.remove\(cena, moeda\);/,
    '',
  )
if (scenario === 'igual-a-5') js = js.replace('moedas >= 5', 'moedas === 5')
if (scenario === 'maior-que-5') js = js.replace('moedas >= 5', 'moedas > 5')
if (scenario === 'sem-somar') js = js.replace('moedas = moedas + 1;', '')
if (scenario === 'sem-zerar') js = js.replace('let moedas = 0;', 'let moedas = 0; moedas = 2;')
if (scenario !== 'correto' && js === p.files['script.js']) throw Error('Mutação não aplicada')
await preloadCourseModels(p.assets, js)
writeFileSync(
  resolve(dir, 'game.html'),
  buildPreviewDoc({
    html: p.files['index.html'],
    css: p.files['style.css'],
    js: instrumentCheckScript(js, scope),
    extensionScripts: [d === '3d' ? gameThreeDRuntimeWithoutPlatform : gameTwoDRuntime],
    ...(d === '3d'
      ? {
          extensionImports: gameThreeDExtension.runtime?.esmImports,
          models3d: asset3DManifest(p.assets),
        }
      : {
          assets: Object.fromEntries(p.assets!.map((a) => [a.name, a.dataUrl])),
          assetMeta: assetMetaManifest(p.assets),
        }),
    runtimeInspection: true,
  }),
)
const objectives = moedasChecks(d, 'bau').filter((c) => isExecutionRule(c.rule))
if (objectives.some((c) => !isSectionExecutionRule(c.rule)))
  throw Error('Contrato de execução inválido')
writeFileSync(
  resolve(dir, 'check-options.json'),
  JSON.stringify({ mode: 'classic', scope, objectives, deadlineMs: 90000, screenshots: true }),
)
if (process.argv.includes('--prepare-only')) process.exit(0)
const child = Bun.spawn(['node', resolve(dir, 'check-objectives.mjs')], {
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
const verdicts = objectives.map((o) => ({
  id: o.id,
  ...judgeExecutionObservation(
    o.rule as import('../../../packages/core/src/learning/project-execution').SectionExecutionRule,
    result.observations.find((x: { id: string }) => x.id === o.id),
  ),
}))
console.log(d, scenario, JSON.stringify(verdicts, null, 2))
writeFileSync(resolve(dir, 'vereditos.json'), JSON.stringify(verdicts, null, 2))
/** O que cada erro deve reprovar (o resto continua passando). */
const REPROVA: Record<string, string[]> =
  d === '3d'
    ? {
        correto: [],
        'sem-remover': ['cinco'],
        'igual-a-5': [],
        'maior-que-5': ['cinco'],
        'sem-somar': ['cinco'],
        'sem-zerar': ['meta', 'cinco', 'reinicio'],
      }
    : {
        correto: [],
        'sem-remover': ['contar', 'uma-vez', 'meta', 'cinco', 'seis'],
        'igual-a-5': ['seis'],
        'maior-que-5': ['cinco'],
        'sem-somar': ['contar', 'uma-vez', 'meta', 'cinco', 'seis'],
        'sem-zerar': ['zero', 'contar', 'uma-vez', 'meta', 'cinco', 'seis', 'reinicio'],
      }
if (!REPROVA[scenario]) throw Error(`Cenário desconhecido: ${scenario}`)
const expected = (id: string) => !REPROVA[scenario]!.includes(id)
if (verdicts.some((v) => v.passed !== expected(v.id))) process.exit(1)
