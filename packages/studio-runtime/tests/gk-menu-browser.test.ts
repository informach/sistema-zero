import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  type ExecutionObservation,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'
import { instrumentCheckScript } from '../../studio/src/check/instrumentCheckScript'
import { gameKitRuntime } from '../../studio/src/official-extensions/game-2d-advanced/runtime'
import { buildPreviewDoc } from '../../studio/src/preview/bootstrap'

/**
 * O executor dos objetivos e o menu do Jogo 2D Avançado (revisão do lote 3 da conclusão,
 * 22/11/2026). O motor abre sempre no menu dele, e antes o executor do servidor só apertava o
 * "Começar" dos kits do Pro: todo objetivo de execução num jogo do Avançado ficava parado no menu
 * (o mesmo defeito que o piloto de "Meus testes" tinha). Agora os dois apertam o "Jogar" de
 * fábrica, e nenhum aperta outro botão de um menu que a criança trocou.
 *
 * Roda com o Chromium de verdade (`SZ_CHECK_CHROMIUM`, como no CI).
 */
const nativeTest = process.env.SZ_CHECK_CHROMIUM ? test : test.skip
const scope = '__sz0123456789abcdef01234567'

const ESPACO_MARCA_PONTO = [
  'let pontos = 0; let ajuda = 0;',
  'SZGameKit.setup({ width: 400, height: 200 });',
  "SZGameKit.onUpdate(function () { if (SZGameKit.keyPressed('Space')) pontos++; });",
].join('\n')

type RegraDeComportamento = Extract<SectionExecutionRule, { type: 'behavior' }>
const objetivo = (expect: RegraDeComportamento['expect']): SectionExecutionRule =>
  ({
    type: 'behavior',
    steps: [{ action: 'press', key: 'Space' }],
    expect,
  }) as SectionExecutionRule

const CENARIOS = [
  {
    nome: 'o menu de fábrica: o executor aperta Jogar e o Espaço marca ponto',
    script: `${ESPACO_MARCA_PONTO}\nSZGameKit.start();`,
    rule: objetivo({ target: { kind: 'value', path: 'pontos' }, compare: 'increased' }),
    passa: true,
  },
  {
    nome: 'o menu trocado pela criança (sem Jogar): nenhum botão é apertado',
    script: [
      ESPACO_MARCA_PONTO,
      "SZGameKit.createScreen('menu', 'Minha aventura', 'Escolha.');",
      "SZGameKit.addButton('menu', 'Como jogar', function () { ajuda++; });",
      'SZGameKit.start();',
    ].join('\n'),
    // Uma espera, não o Espaço: com o botão da criança focado, o Espaço o aperta (como na mão dela).
    rule: {
      type: 'behavior',
      steps: [{ action: 'wait', ms: 500 }],
      expect: { target: { kind: 'value', path: 'ajuda' }, compare: 'equals', value: 0 },
    } as SectionExecutionRule,
    passa: true,
  },
] as const

nativeTest(
  'Jogo 2D Avançado no menu: o executor do servidor começa a partida como a criança',
  async () => {
    const base = resolve(tmpdir()) + sep
    const dir = await mkdtemp(join(tmpdir(), 'sz-gk-menu-browser-'))
    if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
    const runtime = fileURLToPath(new URL('../runtime/', import.meta.url))
    const studio = fileURLToPath(new URL('../../studio/', import.meta.url))
    const driver = Bun.resolveSync(
      'playwright-core',
      dirname(Bun.resolveSync('@playwright/test', studio)),
    )
    try {
      for (const file of await readdir(runtime)) {
        if (!file.endsWith('.mjs')) continue
        let source = await readFile(join(runtime, file), 'utf8')
        if (file === 'check-objectives.mjs')
          source = source.replace(
            "from 'playwright-core'",
            `from ${JSON.stringify(pathToFileURL(driver).href)}`,
          )
        await writeFile(join(dir, file), source)
      }
      for (const cenario of CENARIOS) {
        await writeFile(
          join(dir, 'game.html'),
          buildPreviewDoc({
            html: '<!doctype html><html><head></head><body></body></html>',
            css: '',
            js: instrumentCheckScript(cenario.script, scope),
            extensionScripts: [gameKitRuntime],
            runtimeInspection: true,
            assets: {},
          }),
        )
        const objectives = [{ id: 'caso', rule: cenario.rule }]
        await writeFile(
          join(dir, 'check-options.json'),
          JSON.stringify({
            mode: 'classic',
            scope,
            objectives,
            deadlineMs: 60000,
            screenshots: false,
          }),
        )
        const child = Bun.spawn(['node', join(dir, 'check-objectives.mjs')], {
          cwd: dir,
          env: process.env,
          stdout: 'pipe',
          stderr: 'pipe',
          windowsHide: true,
        })
        const [code, stderr, stdout] = await Promise.all([
          child.exited,
          new Response(child.stderr).text(),
          new Response(child.stdout).text(),
        ])
        expect(code, `${stderr}\n${stdout}`).toBe(0)
        const { observations }: { observations: ExecutionObservation[] } = JSON.parse(
          await readFile(join(dir, 'check-result.json'), 'utf8'),
        )
        const verdict = judgeExecutionObservation(
          cenario.rule,
          observations.find((o) => o.id === 'caso'),
        )
        expect(verdict.passed, `${cenario.nome}: ${JSON.stringify(observations)}`).toBe(
          cenario.passa,
        )
      }
    } finally {
      if (resolve(dir).startsWith(base) && dir.includes('sz-gk-menu-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  240000,
)
