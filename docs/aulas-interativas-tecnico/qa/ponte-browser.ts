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
import { ponteChecks } from './ponte-criterios'
import { montarProjetoPonte, type PonteDimensao } from './ponte-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const d = (process.argv[2] ?? '2d') as PonteDimensao,
  scenario = process.argv[3] ?? 'correto',
  // A etapa dos objetivos (o jogo é sempre o completo); as anteriores só no cenário correto.
  etapa = (process.argv[4] ?? 'atravessar') as import('./ponte-projeto').PonteEtapa
if (!['2d', '3d'].includes(d)) throw Error('Dimensão inválida')
const dir = resolve(root, `.cache/ponte-check-${d}-${scenario}-${etapa}`)
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
const p = montarProjetoPonte(d, 'atravessar'),
  scope = '__sz0123456789abcdef01234567'
let js = p.files['script.js']
// Os erros plausíveis da criança (a tabela da proposta).
const TIMER = /\n( *)__szProjectRunContext\.setTimeout\(\(\) => \{\n[\s\S]*?\n\1\}, 4 \* 1000\);/
const timer = js.match(TIMER)?.[0]
if (!timer) throw Error('Não achei o "depois de" no jogo')
if (scenario === 'sem-tempo') js = js.replace(timer, '')
if (scenario === 'fora') {
  // O "depois de" no começo do jogo, logo depois de criar a variável.
  js = js.replace(timer, '')
  js = js.replace('let ponteAberta = false;', `let ponteAberta = false;${timer}`)
}
if (scenario === 'rapido') js = js.replace(timer, timer.replace('4 * 1000', '1 * 1000'))
if (scenario === 'so-imagem') js = js.replace(timer, timer.replace(/\n *ponteAberta = false;/, ''))
if (scenario === 'sem-se') js = js.replace('if (ponteAberta)', 'if (true)')
if (scenario === 'invertida') js = js.replace('if (ponteAberta)', 'if (!ponteAberta)')
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
const objectives = ponteChecks(d, etapa).filter((c) => isExecutionRule(c.rule))
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
/** O que cada erro deve reprovar em cada etapa (o resto continua passando), nas duas dimensões. */
const REPROVA: Record<string, Partial<Record<string, string[]>>> = {
  correto: { alavanca: [], sobe: [], atravessar: [] },
  'sem-tempo': { sobe: ['sobe-sozinha', 'de-novo'], atravessar: ['atrasado'] },
  // Solto no começo, o "depois de" sobe a ponte uma vez, 4 s depois de o jogo começar: o
  // resultado da travessia dependeria da hora em que o robô puxa, então nela quem pega o erro é o
  // objetivo de estrutura (o "depois de" dentro do encontro com a alavanca).
  fora: { sobe: ['sobe-sozinha'] },
  rapido: { sobe: ['aberta-antes'] },
  'so-imagem': { sobe: [], atravessar: ['atrasado'] },
  'sem-se': { atravessar: ['atrasado', 'fechada'] },
  invertida: { atravessar: ['a-tempo', 'atrasado', 'fechada'] },
}
/**
 * No 3D o robô chega à alavanca pela entrada da ponte, encostando nela levantada. Com a pergunta
 * tirada ou ao contrário, esse encontro já leva o personagem à pedra, o robô não chega e todos os
 * objetivos da travessia reprovam (o jogo errado não passa, só o motivo é outro).
 */
if (d === '3d') {
  const todos = ['a-tempo', 'atrasado', 'fechada', 'reinicio']
  REPROVA['sem-se'] = { atravessar: todos }
  REPROVA.invertida = { atravessar: todos }
}
/**
 * O que depende da hora em que o robô puxa e por isso pode dar os dois resultados: no "fora", o
 * "depois de" solto no começo sobe a ponte 4 s depois de o jogo começar, antes ou depois do
 * primeiro puxão; no "rapido", a ponte sobe 1 s depois de cada puxão, perto das conferências
 * logo depois dele (o aperto que leva à alavanca ainda corre depois do encontro).
 */
const INDIFERENTE: Record<string, Partial<Record<string, string[]>>> = {
  fora: { sobe: ['de-novo'] },
  rapido: { sobe: ['sobe-sozinha', 'de-novo'] },
}
const reprova = REPROVA[scenario]?.[etapa]
if (!reprova) throw Error(`Cenário sem expectativa nesta etapa: ${scenario} ${etapa}`)
const indiferente = INDIFERENTE[scenario]?.[etapa] ?? []
const expected = (id: string) => !reprova.includes(id)
if (verdicts.some((v) => !indiferente.includes(v.id) && v.passed !== expected(v.id)))
  process.exit(1)
