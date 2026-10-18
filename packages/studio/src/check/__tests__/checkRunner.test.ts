/**
 * O executor dos objetivos de verdade (etapa 3, 18/10/2026): o documento que o Members monta
 * (`prepareClassicCheckDocument`) aberto pelo `check-objectives.mjs` da imagem do
 * `studio-runtime`, num Chromium real, e julgado pela régua do core. É o caminho inteiro menos o
 * Worker e o contêiner. Sem Chromium na máquina, o teste é pulado (não é verde por vácuo: avisa).
 */
import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ExecutionObjectiveRequest,
  type ExecutionObservation,
  judgeExecutionObservation,
} from '@sistemazero/core/learning'
import { createEmptyProject } from '../../core/project'
import { generateProjectFiles } from '../../generators/project'
import { platformerExample } from '../../official-extensions/game-2d/examples/foundations'
import { createCheckScope, prepareClassicCheckDocument } from '../serverCheck'

const RUNNER = resolve(import.meta.dir, '../../../../studio-runtime/runtime/check-objectives.mjs')
const CHROMIUM = process.env.SZ_CHECK_CHROMIUM ?? '/opt/pw-browsers/chromium'
const available = existsSync(CHROMIUM) && existsSync(RUNNER)
if (!available) console.warn('[checkRunner] sem Chromium: o teste do executor foi pulado')

async function check(project: unknown, objectives: ExecutionObjectiveRequest[]) {
  const dir = mkdtempSync(join(tmpdir(), 'sz-check-'))
  const runtime = mkdtempSync(join(tmpdir(), 'sz-check-rt-'))
  // O script importa `playwright-core` do lado dele, como na imagem (/opt/sz-runtime).
  const playwright = dirname(
    dirname(fileURLToPath(import.meta.resolve('playwright-core/package.json'))),
  )
  symlinkSync(
    playwright,
    join(runtime, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  writeFileSync(join(runtime, 'check-objectives.mjs'), readFileSync(RUNNER))
  writeFileSync(
    join(runtime, 'execution-observation.generated.mjs'),
    readFileSync(join(dirname(RUNNER), 'execution-observation.generated.mjs')),
  )
  const scope = createCheckScope()
  writeFileSync(join(dir, 'game.html'), await prepareClassicCheckDocument(project, scope))
  writeFileSync(
    join(dir, 'check-options.json'),
    JSON.stringify({ mode: 'classic', scope, objectives, deadlineMs: 60_000 }),
  )
  const ran = spawnSync('node', [join(runtime, 'check-objectives.mjs')], {
    cwd: dir,
    env: { ...process.env, SZ_CHECK_CHROMIUM: CHROMIUM },
    encoding: 'utf8',
    timeout: 90_000,
  })
  if (ran.status !== 0) throw new Error(`executor falhou: ${ran.stderr}`)
  const { observations } = JSON.parse(readFileSync(join(dir, 'check-result.json'), 'utf8')) as {
    observations: ExecutionObservation[]
  }
  return Object.fromEntries(
    objectives.map((objective) => [
      objective.id,
      judgeExecutionObservation(
        objective.rule,
        observations.find((item) => item.id === objective.id),
      ),
    ]),
  )
}

describe.skipIf(!available)('o executor roda o jogo e confere', () => {
  test('jogo de código: variável, tecla, texto, console e função', async () => {
    const project = createEmptyProject('p-codigo', 'Teste')
    project.files['script.js'] = [
      'let pontos = 0',
      'const heroi = { x: 10 }',
      'function dobro(n) { return n * 2 }',
      "document.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { heroi.x += 5; pontos++ } })",
      "document.body.textContent = 'Olá, jogo!'",
      "console.log('começou')",
    ].join('\n')
    const result = await check(project, [
      {
        id: 'anda',
        rule: {
          type: 'behavior',
          steps: [{ action: 'press', key: 'ArrowRight' }],
          expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
        },
      },
      {
        id: 'pontos',
        rule: {
          type: 'behavior',
          steps: [
            { action: 'press', key: 'ArrowRight' },
            { action: 'press', key: 'ArrowRight' },
          ],
          expect: { target: { kind: 'value', path: 'pontos' }, compare: 'atLeast', value: 2 },
        },
      },
      {
        id: 'texto',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'text' }, compare: 'contains', value: 'olá' },
        },
      },
      {
        id: 'console',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'console' }, compare: 'contains', value: 'começou' },
        },
      },
      {
        id: 'funcao',
        rule: {
          type: 'functionReturns',
          name: 'dobro',
          cases: [
            { args: [3], expected: 6 },
            { args: [-1], expected: -2 },
          ],
        },
      },
      // As metades que FALHAM: sem elas, um executor que aprova tudo passaria.
      {
        id: 'parado',
        rule: {
          type: 'behavior',
          steps: [{ action: 'wait', ms: 200 }],
          expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
        },
      },
      {
        id: 'resposta-errada',
        rule: { type: 'functionReturns', name: 'dobro', cases: [{ args: [3], expected: 7 }] },
      },
      {
        id: 'nao-existe',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'value', path: 'tesouro' }, compare: 'truthy' },
        },
      },
    ])
    expect(result.anda?.passed).toBe(true)
    expect(result.pontos?.passed).toBe(true)
    expect(result.texto?.passed).toBe(true)
    expect(result.console?.passed).toBe(true)
    expect(result.funcao?.passed).toBe(true)
    expect(result.parado?.passed).toBe(false)
    expect(result['resposta-errada']).toEqual({
      passed: false,
      detail: 'Com (3) respondeu 6; esperava 7.',
    })
    expect(result['nao-existe']?.detail).toBe('Não achei tesouro no jogo.')
  }, 120_000)

  test('regra em JavaScript: lê o jogo depois dos passos, sob a CSP da prévia', async () => {
    const project = createEmptyProject('p-regra', 'Regra')
    project.files['script.js'] = [
      'let vidas = 3',
      'const heroi = { x: 10, itens: [] }',
      "document.addEventListener('keydown', (e) => { if (e.key === ' ') { heroi.itens.push('chave'); vidas-- } })",
      "document.body.textContent = 'Fase 1'",
      "console.log('pronto')",
    ].join('\n')
    const result = await check(project, [
      {
        id: 'chave',
        rule: {
          type: 'script',
          steps: [{ action: 'press', key: 'Space' }],
          code: "return jogo.heroi.itens.includes('chave') && jogo.vidas === 2 && texto.includes('Fase') && console.includes('pronto')",
        },
      },
      {
        id: 'espera',
        rule: {
          type: 'script',
          steps: [],
          code: 'await new Promise((r) => setTimeout(r, 50))\nreturn jogo.vidas === 3',
        },
      },
      // As metades que FALHAM.
      { id: 'falso', rule: { type: 'script', steps: [], code: 'return jogo.vidas === 2' } },
      { id: 'numero', rule: { type: 'script', steps: [], code: 'return jogo.vidas' } },
      { id: 'erro', rule: { type: 'script', steps: [], code: 'return jogo.naoExiste.x' } },
      { id: 'escrita', rule: { type: 'script', steps: [], code: 'return (' } },
      { id: 'laco', rule: { type: 'script', steps: [], code: 'while (true) {}' } },
    ])
    expect(result.chave).toEqual({ passed: true })
    expect(result.espera).toEqual({ passed: true })
    expect(result.falso).toEqual({ passed: false, detail: 'A regra em JavaScript devolveu false.' })
    expect(result.numero?.detail).toBe(
      'A regra em JavaScript precisa devolver true ou false; devolveu 3.',
    )
    expect(result.erro?.detail).toStartWith('A regra em JavaScript deu erro:')
    expect(result.escrita?.detail).toStartWith('A regra em JavaScript deu erro:')
    expect(result.laco?.detail).toBe(
      'A regra em JavaScript deu erro: a regra demorou mais de 3 segundos',
    )
  }, 120_000)

  test('o jogo que troca eval, then e innerText não forja o resultado (review da etapa 4)', async () => {
    const project = createEmptyProject('p-trapaca', 'Trapaça')
    project.files['script.js'] = [
      'let pontos = 0',
      "document.body.textContent = 'Fase 1'",
      'const realEval = window.eval',
      'window.eval = () => true',
      'Promise.prototype.then = function (ok) { ok(true) }',
      "Object.defineProperty(HTMLElement.prototype, 'innerText', { get() { return 'Você venceu' } })",
    ].join('\n')
    const result = await check(project, [
      { id: 'regra', rule: { type: 'script', steps: [], code: 'return false' } },
      { id: 'regra-pontos', rule: { type: 'script', steps: [], code: 'return jogo.pontos === 0' } },
      {
        id: 'texto',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'text' }, compare: 'contains', value: 'venceu' },
        },
      },
      {
        id: 'pontos',
        rule: {
          type: 'behavior',
          steps: [],
          expect: { target: { kind: 'value', path: 'pontos' }, compare: 'equals', value: 999 },
        },
      },
    ])
    expect(result.regra?.passed).toBe(false)
    // A metade que passa: a foto do jogo continua certa.
    expect(result['regra-pontos']).toEqual({ passed: true })
    expect(result.texto?.passed).toBe(false)
    expect(result.pontos?.passed).toBe(false)
  }, 120_000)

  test('jogo de blocos do Jogo 2D: o herói anda com a seta e fica parado sem ela', async () => {
    const project = createEmptyProject('p-blocos', 'Plataforma')
    project.ir = platformerExample.ir
    project.files = generateProjectFiles({ ir: platformerExample.ir, projectName: 'Plataforma' })
    project.installedExtensions = [{ id: 'game-2d', version: '2.0.0', installedAt: 1 }]
    const result = await check(project, [
      {
        id: 'anda',
        rule: {
          type: 'behavior',
          steps: [{ action: 'press', key: 'ArrowRight', holdMs: 600 }],
          expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'greaterThan', value: 50 },
        },
      },
      {
        id: 'parado',
        rule: {
          type: 'behavior',
          steps: [{ action: 'wait', ms: 400 }],
          expect: { target: { kind: 'value', path: 'heroi.x' }, compare: 'changed' },
        },
      },
    ])
    expect(result.anda?.passed).toBe(true)
    expect(result.parado?.passed).toBe(false)
  }, 120_000)
})
