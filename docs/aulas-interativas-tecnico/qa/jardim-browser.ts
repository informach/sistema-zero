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
import { jardimChecks } from './jardim-criterios'
import { type JardimDimensao, montarProjetoJardim } from './jardim-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const d = (process.argv[2] ?? '2d') as JardimDimensao,
  scenario = process.argv[3] ?? 'correto'
if (!['2d', '3d'].includes(d)) throw Error('Dimensão inválida')
// `regador:x,z` tem dois-pontos, que o Windows não aceita em nome de pasta.
const dir = resolve(root, `.cache/jardim-check-${d}-${scenario.replace(/[^\w-]+/g, '_')}`)
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
const p = montarProjetoJardim(d, 'posicao'),
  scope = '__sz0123456789abcdef01234567'
let js = p.files['script.js']
if (scenario === 'sem-memoria') js = js.replaceAll('temRegador = true', 'temRegador = false')
if (scenario === 'sem-movimento') js = js.replace(/SZGame[23]D.topDown\([^;]+;/, '')
if (scenario === 'sem-decisao') js = js.replace(/if \(temRegador\)/g, 'if (true)')
if (scenario === 'renomeada') js = js.replaceAll('temRegador', 'pegouOObjeto')
// Sem a guarda da partida (só 3D): a volta à flor repete o florescer.
if (scenario === 'sem-guarda') js = js.replace('if (!ganhou) {', 'if (true) {')
// 26/11/2026, caso real de produção (o executor encostava às vezes): a coleta dentro de uma guarda
// ("Se temRegador = falso") e o regador em outros lugares do chão. `regador:x,z` muda só o lugar
// (3D); `guardado` põe a guarda; `jeffrey` faz os dois, com o regador em (-4, -2).
const guard = (s: string) =>
  s.replace(
    // 3D: `onTouch(personagem, regador, () => {`; 2D: `onOverlap(() => personagem, () => regador, …`.
    /(SZGame[23]D\.on(?:Touch|Overlap)\((?:\(\) => )?personagem, (?:\(\) => )?regador, \(\) => \{\n)([\s\S]*?)(\n {2}\}(?:, "[^"]*")?\);)/,
    (_m, open: string, body: string, close: string) =>
      `${open}    if (temRegador === false) {\n${body.replace(/^/gm, '  ')}\n    }${close}`,
  )
const place = (s: string, x: number, z: number) =>
  s.replace(
    /SZGame3D\.setPosition\(regador, [^,]+, ([^,]+), [^)]+\);/,
    (_m, y: string) => `SZGame3D.setPosition(regador, ${x}, ${y}, ${z});`,
  )
const lugar = scenario.match(/^regador:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/)
if (lugar) {
  if (d !== '3d') throw Error('regador:x,z é do 3D')
  js = place(js, Number(lugar[1]), Number(lugar[2]))
}
if (scenario === 'guardado') js = guard(js)
if (scenario === 'jeffrey') {
  if (d !== '3d') throw Error('jeffrey é do 3D')
  js = place(guard(js), -4, -2)
}
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
          assetsMeta: assetMetaManifest(p.assets),
        }),
    runtimeInspection: true,
  }),
)
const objectives = jardimChecks(d, 'posicao').filter((c) => isExecutionRule(c.rule))
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
const expected = (id: string) =>
  scenario === 'sem-movimento'
    ? false
    : scenario === 'sem-memoria'
      ? id !== 'com-regador' && id !== 'uma-vez'
      : scenario === 'sem-decisao'
        ? id !== 'sem-regador'
        : scenario === 'sem-guarda'
          ? id !== 'uma-vez'
          : true
if (verdicts.some((v) => v.passed !== expected(v.id))) process.exit(1)
