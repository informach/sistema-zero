// O objetivo que RODA o jogo do extra "Meu primeiro desenho no Pinta" no executor de verdade
// (Chromium), no molde do `desafio-farol-browser.ts`.
// Uso: bun docs/aulas-interativas-tecnico/qa/meu-desenho-browser.ts <cenário>
// Cenários: correto (a chave criada com minha-chave) e sem-troca (o jogo inicial, com a chave
// dourada: a chave ainda é recolhida, mas não começa com o desenho, e o objetivo reprova).
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
import { meuDesenhoChecks } from './meu-desenho-criterios'
import {
  CHAVE_EXEMPLO,
  projetoComMinhaChave,
  projetoInicialMeuDesenho,
} from './meu-desenho-projeto'

const root = resolve(import.meta.dirname, '../../..'),
  runtime = resolve(root, 'packages/studio-runtime/runtime'),
  studio = resolve(root, 'packages/studio')
const scenario = process.argv[2] ?? 'correto'
const REPROVA: Record<string, string[]> = {
  correto: [],
  'sem-troca': ['minha-chave-em-execucao'],
}
if (!REPROVA[scenario]) throw Error(`Cenário desconhecido: ${scenario}`)
const dir = resolve(root, `.cache/meu-desenho-check-${scenario}`)
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

// No jogo da criança, o desenho está nos materiais nos DOIS cenários (a vaga de arte o põe); o que
// muda é se o bloco da chave usa a imagem dele.
const p = scenario === 'correto' ? projetoComMinhaChave() : projetoInicialMeuDesenho()
const assets = (p.assets ?? []).some((a) => a.name === CHAVE_EXEMPLO.name)
  ? (p.assets ?? [])
  : [...(p.assets ?? []), CHAVE_EXEMPLO]
const scope = '__sz0123456789abcdef01234567'
writeFileSync(
  resolve(dir, 'game.html'),
  buildPreviewDoc({
    html: p.files['index.html'],
    css: p.files['style.css'],
    js: instrumentCheckScript(p.files['script.js'], scope),
    extensionScripts: [gameTwoDRuntime],
    assets: Object.fromEntries(assets.map((a) => [a.name, a.dataUrl])),
    assetsMeta: assetMetaManifest(assets),
    runtimeInspection: true,
  }),
)
const objectives = meuDesenhoChecks.filter((c) => isExecutionRule(c.rule))
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
