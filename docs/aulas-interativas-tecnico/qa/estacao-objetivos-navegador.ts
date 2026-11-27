/**
 * Roda os objetivos da Estação de Reciclagem no executor de verdade (`studio-runtime`), com as
 * mutações que cada objetivo precisa reprovar.
 *
 *   bun docs/aulas-interativas-tecnico/qa/estacao-objetivos-navegador.ts <2d|3d> [etapa] [cenário]
 *
 * Cenários: `correto` (o gabarito da etapa: todos passam) e as mutações, cada uma derrubando o
 * objetivo dela: `sem-guarda` (o relógio cria fora da partida), `sem-retirada` (a reciclável
 * continua encostando e o placar dispara), `sem-ponto` e `sem-dano`. Os objetivos de blocos (os
 * intervalos, a vida única, a derrota e a vitória) são conferidos em `estacao-reciclagem.test.ts`.
 *
 * `--um-por-vez` roda um objetivo de cada vez (o executor roda três páginas juntas no 2D, e numa
 * máquina de poucos núcleos isso deixa o jogo lento demais para medir).
 * Usa o Chromium de `SZ_CHECK_CHROMIUM` (padrão: o do Playwright desta máquina).
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
import { estacaoChecks } from './estacao-criterios'
import { type EstacaoDimensao, type EstacaoEtapa, montarProjetoEstacao } from './estacao-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const d = (process.argv[2] ?? '2d') as EstacaoDimensao,
  etapa = (process.argv[3] ?? 'meta-nova') as EstacaoEtapa,
  scenario = process.argv[4] ?? 'correto'
if (!['2d', '3d'].includes(d)) throw Error('Dimensão inválida')
const dir = resolve(root, `.cache/estacao-check-${d}-${etapa}-${scenario}`)
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
const p = montarProjetoEstacao(d, etapa),
  scope = '__sz0123456789abcdef01234567'
let js = p.files['script.js']
const trocar = (de: RegExp | string, para: string) => {
  const antes = js
  js = js.replace(de, para)
  if (js === antes) throw Error(`Mutação não aplicada: ${scenario}`)
}
if (scenario === 'sem-guarda')
  trocar(
    d === '2d'
      ? /(everySeconds\("cada", [\d.]+\)\) \{\n\s*)if \(SZGame2D\.sceneIs\("jogando"\)\)/
      : /(everySecondsLoop\([\d.]+, \(\) => \{\n\s*)if \(estado === "jogando"\)/,
    '$1if (true)',
  )
if (scenario === 'sem-retirada')
  trocar(/\n\s*SZGame[23]D\.removeFromGroup\(reciclaveis, pecaReciclavel\);/, '')
if (scenario === 'sem-ponto') trocar(/\n\s*pontos = pontos \+ 1;/, '')
if (scenario === 'sem-dano')
  trocar(/\n\s*SZGame[23]D\.(?:damageSprite|hurt)\(coletor, 1(?:, 60)?\);/, '')
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
            ...Array.from({ length: 8 }, () => ({ action: 'wait' as const, ms: passo })),
          ],
          expect: { target: { kind: 'value' as const, path: sonda }, compare: 'truthy' as const },
          checkpoints: Array.from({ length: 8 }, (_, i) => ({
            afterStep: i + 3,
            expect: {
              target: { kind: 'value' as const, path: sonda },
              compare: 'equals' as const,
              value: -1,
            },
          })),
        },
      },
    ]
  : estacaoChecks(d, etapa).filter((c) => isExecutionRule(c.rule))
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
/** O que cada mutação derruba (o resto continua passando). */
const derruba: Record<string, string[]> = {
  correto: [],
  'sem-guarda': ['relogios-so-na-partida'],
  // no 3D o encontro só dispara quando COMEÇA a encostar: sem tirar a peça, o placar sobe um
  // ponto do mesmo jeito, e quem reprova é o objetivo dos blocos (`um-ponto-por-peca`)
  'sem-retirada': d === '2d' ? ['ponto-uma-vez'] : [],
  'sem-ponto': ['ponto-uma-vez'],
  'sem-dano': ['proibida-tira-vida'],
}
const esperado = derruba[scenario]
if (!esperado) throw Error(`Cenário desconhecido: ${scenario}`)
const errados = verdicts.filter((v) => v.passed === esperado.includes(v.id))
if (errados.length) {
  console.error('Fora do esperado:', errados.map((v) => v.id).join(', '))
  process.exit(1)
}
console.log('OK', d, etapa, scenario)
