/**
 * Roda os objetivos de um Poder do Construtor no executor de verdade (`studio-runtime`), com as
 * mutações que cada objetivo precisa reprovar (molde de `estacao-objetivos-navegador.ts`).
 *
 *   bun docs/aulas-interativas-tecnico/qa/poderes-objetivos-navegador.ts <poder> <2d|3d> [etapa] [cenário]
 *
 * Os poderes, as etapas finais e as mutações estão em `poderes-navegador-casos.ts`. Cenário
 * `correto` = o gabarito da etapa (todos passam); cada mutação derruba os objetivos dela. Os
 * objetivos de blocos são conferidos no teste de cada Poder (`<poder>.test.ts`).
 *
 * `--um-por-vez` roda um objetivo de cada vez; `--sonda=caminho [--passo=ms] [--antes=ms]` lê um
 * caminho oito vezes depois do Enter (para medir as janelas). Usa o Chromium de `SZ_CHECK_CHROMIUM`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
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
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import { PODERES_NAVEGADOR } from './poderes-navegador-casos'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const caso = PODERES_NAVEGADOR[args[0] ?? '']
if (!caso)
  throw Error(`Poder desconhecido: ${args[0]} (${Object.keys(PODERES_NAVEGADOR).join(', ')})`)
const d = (args[1] ?? '2d') as PoderDimensaoConstrutor,
  etapa = args[2] ?? caso.etapaFinal,
  scenario = args[3] ?? 'correto'
if (!['2d', '3d'].includes(d)) throw Error('Dimensão inválida')
const dir = resolve(root, `.cache/poder-check-${args[0]}-${d}-${etapa}-${scenario}`)
mkdirSync(dir, { recursive: true })
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
const version = JSON.parse(readFileSync(resolve(runtime, 'package.json'), 'utf8')).dependencies
  .three
// O three.js pinado do executor; sem o node_modules do runtime instalado, o do Estúdio (mesma versão).
const threeDir = existsSync(resolve(runtime, 'node_modules/three'))
  ? resolve(runtime, 'node_modules/three')
  : resolve(studio, 'node_modules/three')
for (const f of readdirSync(runtime))
  if (f.endsWith('.mjs')) {
    let s = readFileSync(resolve(runtime, f), 'utf8')
    if (f === 'check-objectives.mjs') {
      s = s.replace("from 'playwright-core'", `from ${JSON.stringify(pathToFileURL(driver).href)}`)
      if (process.argv.includes('--um-por-vez'))
        s = s.replace('const CONCURRENCY = 3', 'const CONCURRENCY = 1')
    }
    if (f === 'check-javascript-modules.mjs')
      s = s.replace(
        /export async function createImageThreeModuleResolver\(\) \{[\s\S]*$/m,
        `export async function createImageThreeModuleResolver(){return createPinnedThreeModuleResolver(${JSON.stringify(threeDir)},${JSON.stringify(version)})}`,
      )
    writeFileSync(resolve(dir, f), s)
  }
const p = caso.montar(d, etapa),
  scope = '__sz0123456789abcdef01234567'
const mutacao = caso.mutacoes(d)[scenario]
if (!mutacao) throw Error(`Cenário desconhecido: ${scenario}`)
const js = mutacao.aplicar(p.files['script.js'])
if (scenario !== 'correto' && js === p.files['script.js'])
  throw Error(`Mutação não aplicada: ${scenario}`)
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
const sonda = process.argv.find((a) => a.startsWith('--sonda='))?.slice(8)
/** `--sonda=caminho [--passo=ms]`: lê o caminho oito vezes depois do Enter (para medir as janelas). */
const passo = Number(process.argv.find((a) => a.startsWith('--passo='))?.slice(8) ?? 1200)
const inicio = Number(process.argv.find((a) => a.startsWith('--inicio='))?.slice(9) ?? 0)
const seta = process.argv.find((a) => a.startsWith('--seta='))?.slice(7) as 'ArrowLeft' | undefined
const antes = Number(process.argv.find((a) => a.startsWith('--antes='))?.slice(8) ?? 1)
const objectives = sonda
  ? [
      {
        id: 'sonda',
        label: 'sonda',
        rule: {
          type: 'behavior' as const,
          steps: [
            { action: 'wait' as const, ms: antes },
            { action: 'press' as const, key: 'Enter' as const, holdMs: 40 },
            seta
              ? { action: 'press' as const, key: seta, holdMs: Math.max(40, inicio) }
              : { action: 'wait' as const, ms: Math.max(1, inicio) },
            // `--espaco`: um aperto de Espaço antes das leituras (a primeira leitura fica logo depois)
            ...(process.argv.includes('--espaco')
              ? [{ action: 'press' as const, key: 'Space' as const, holdMs: 40 }]
              : []),
            ...Array.from({ length: 8 }, () => ({ action: 'wait' as const, ms: passo })),
          ],
          expect: { target: { kind: 'value' as const, path: sonda }, compare: 'truthy' as const },
          checkpoints: Array.from({ length: 8 }, (_, i) => ({
            afterStep: i + (process.argv.includes('--espaco') ? 4 : 3),
            expect: {
              target: { kind: 'value' as const, path: sonda },
              compare: 'equals' as const,
              value: -1,
            },
          })),
        },
      },
    ]
  : caso.checks(d, etapa).filter((c) => isExecutionRule(c.rule))
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
    SZ_CHECK_CHROMIUM: process.env.SZ_CHECK_CHROMIUM ?? chromium.executablePath(),
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
console.log(d, etapa, scenario, JSON.stringify(verdicts, null, 2))
if (process.argv.includes('--observar') || sonda)
  for (const o of result.observations as {
    id: string
    final?: { value?: { value?: unknown } }
    checkpoints?: { final?: { value?: { value?: unknown } } }[]
  }[])
    console.log(
      o.id,
      JSON.stringify(o.final?.value?.value),
      JSON.stringify((o.checkpoints ?? []).map((c) => c.final?.value?.value)),
    )
if (sonda) process.exit(0)
writeFileSync(resolve(dir, 'vereditos.json'), JSON.stringify(verdicts, null, 2))
const esperado = mutacao.derruba
const errados = verdicts.filter((v) => v.passed === esperado.includes(v.id))
if (errados.length) {
  console.error('Fora do esperado:', errados.map((v) => v.id).join(', '))
  process.exit(1)
}
console.log('OK', d, etapa, scenario)
