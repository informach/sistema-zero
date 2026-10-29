// Os objetivos que RODAM a Chave do Farol no executor de verdade (Chromium), no molde dos outros
// cursos. Uso: bun docs/aulas-interativas-tecnico/qa/desafio-farol-browser.ts <cenário>
// Cenários: correto, farol-apagado (o então "acende" com a imagem apagada: nada muda) e desenho
// (o farol aceso é um desenho da criança, a vaga de arte de 29/10/2026).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  isExecutionRule,
  isSectionExecutionRule,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { instrumentCheckScript } from '../../../packages/studio/src/check/instrumentCheckScript'
import { assetMetaManifest } from '../../../packages/studio/src/core/projectAssets'
import { gameTwoDRuntime } from '../../../packages/studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../../packages/studio/src/preview/bootstrap'
import { portaCompleta } from './desafio-farol-criterios'
import { montarProjetoFarol } from './desafio-farol-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const scenario = process.argv[2] ?? 'correto'
const REPROVA: Record<string, string[]> = {
  correto: [],
  'farol-apagado': ['porta-com-chave-em-execucao'],
  desenho: [],
}
if (!REPROVA[scenario]) throw Error(`Cenário desconhecido: ${scenario}`)
const dir = resolve(root, `.cache/desafio-farol-check-${scenario}`)
mkdirSync(dir, { recursive: true })
const driver = Bun.resolveSync(
  'playwright-core',
  dirname(Bun.resolveSync('@playwright/test', studio)),
)
for (const f of readdirSync(runtime))
  if (f.endsWith('.mjs')) {
    let s = readFileSync(resolve(runtime, f), 'utf8')
    if (f === 'check-objectives.mjs')
      s = s.replace("from 'playwright-core'", `from ${JSON.stringify(pathToFileURL(driver).href)}`)
    writeFileSync(resolve(dir, f), s)
  }

const p = montarProjetoFarol('concluido')
const scope = '__sz0123456789abcdef01234567'
let js = p.files['script.js']
let assets = p.assets ?? []
const ACESO = 'SZGame2D.setImage(farol, "farol-listrado-aceso")'
if (!js.includes(ACESO)) throw Error('A luz do farol mudou de forma no projeto: ajuste o cenário')
if (scenario === 'farol-apagado')
  js = js.replace(ACESO, 'SZGame2D.setImage(farol, "farol-listrado-apagado")')
if (scenario === 'desenho') {
  // Um desenho de criança (PNG 1x1 qualquer) nos materiais, como a vaga de arte o põe.
  assets = [
    ...assets,
    {
      id: 'lesson-art-meu-farol',
      name: 'meu-farol',
      kind: 'image',
      source: 'lesson-art',
      width: 1,
      height: 1,
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  ]
  js = js.replace(ACESO, 'SZGame2D.setImage(farol, "meu-farol")')
}
if (scenario !== 'correto' && js === p.files['script.js']) throw Error('Mutação não aplicada')
writeFileSync(
  resolve(dir, 'game.html'),
  buildPreviewDoc({
    html: p.files['index.html'],
    css: p.files['style.css'],
    js: instrumentCheckScript(js, scope),
    extensionScripts: [gameTwoDRuntime],
    assets: Object.fromEntries(assets.map((a) => [a.name, a.dataUrl])),
    assetMeta: assetMetaManifest(assets),
    runtimeInspection: true,
  }),
)
const objectives = portaCompleta.filter((c) => isExecutionRule(c.rule))
if (objectives.some((c) => !isSectionExecutionRule(c.rule)))
  throw Error('Contrato de execução inválido')
writeFileSync(
  resolve(dir, 'check-options.json'),
  JSON.stringify({ mode: 'classic', scope, objectives, deadlineMs: 90000, screenshots: false }),
)
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
    o.rule as SectionExecutionRule,
    result.observations.find((x: { id: string }) => x.id === o.id),
  ),
}))
console.log(scenario, JSON.stringify(verdicts, null, 2))
const expected = (id: string) => !REPROVA[scenario]?.includes(id)
if (verdicts.some((v) => v.passed !== expected(v.id))) process.exit(1)
