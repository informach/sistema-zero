import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  memoriaFarolObservada,
  portaComChaveObservada,
  portaSemChaveObservada,
} from '../../../docs/aulas-interativas-tecnico/qa/desafio-farol-observacao'
import { montarProjetoFarol } from '../../../docs/aulas-interativas-tecnico/qa/desafio-farol-projeto'
import {
  type ExecutionObservation,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'
import { FAROL_FAROIS, FAROL_PERSONAGENS } from '../../studio/src/arte/farol-assets'
import { instrumentCheckScript } from '../../studio/src/check/instrumentCheckScript'
import { generateProjectFiles } from '../../studio/src/generators/project'
import { gameTwoDRuntime } from '../../studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../studio/src/preview/bootstrap'

const nativeTest = process.env.SZ_CHECK_CHROMIUM ? test : test.skip
nativeTest(
  'Farol: observação real da memória e dos dois caminhos da porta respeita posições e rejeita regras incorretas',
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sz-farol-browser-')),
      base = resolve(tmpdir()) + sep
    if (!resolve(dir).startsWith(base)) throw Error('Diretório inválido')
    const runtime = fileURLToPath(new URL('../runtime/', import.meta.url)),
      studio = fileURLToPath(new URL('../../studio/', import.meta.url))
    const driver = Bun.resolveSync(
      'playwright-core',
      dirname(Bun.resolveSync('@playwright/test', studio)),
    )
    const scope = '__sz0123456789abcdef01234567'
    try {
      for (const file of await readdir(runtime))
        if (file.endsWith('.mjs')) {
          let source = await readFile(join(runtime, file), 'utf8')
          if (file === 'check-objectives.mjs')
            source = source.replace(
              "from 'playwright-core'",
              `from ${JSON.stringify(pathToFileURL(driver).href)}`,
            )
          await writeFile(join(dir, file), source)
        }
      const objectives = [
        memoriaFarolObservada,
        portaSemChaveObservada,
        portaComChaveObservada,
      ].map((c) => ({ id: c.id, rule: c.rule as SectionExecutionRule }))
      const scenarios = [
        { name: 'correto', expected: [true, true, true] },
        { name: 'sem-memoria', expected: [false, true, false] },
        { name: 'porta-sempre', expected: [true, false, true] },
        { name: 'outra-posicao', expected: [true, true, true] },
        { name: 'chave-na-borda', expected: [true, true, true] },
        { name: 'pares-invertidos', expected: [true, true, true] },
        { name: 'velocidade-1-outra-posicao', expected: [true, true, true] },
        { name: 'velocidade-8', expected: [true, true, true] },
        ...FAROL_PERSONAGENS.map((name, i) => ({
          name: `arte-${name}`,
          expected: [true, true, true],
          personagem: name,
          farol: FAROL_FAROIS[i % FAROL_FAROIS.length]!,
        })),
      ]
      const selected = process.env.SZ_FAROL_SCENARIO
        ? scenarios.filter((s) => s.name === process.env.SZ_FAROL_SCENARIO)
        : scenarios
      expect(selected.length).toBeGreaterThan(0)
      for (const scenario of selected) {
        const project = montarProjetoFarol('concluido'),
          ir = structuredClone(project.ir)
        if (!ir || !('behavior' in ir)) throw Error('Comportamento ausente')
        for (const event of ir.behavior.events)
          if (event.type === 'g2d:onOverlap') {
            if (scenario.name === 'sem-memoria' && event.bVar === 'chave')
              event.body = event.body.filter((s) => s.type !== 'assign' || s.name !== 'temChave')
            if (scenario.name === 'porta-sempre' && event.bVar === 'farol')
              for (const s of event.body)
                if (s.type === 'if') s.cond = { type: 'bool', value: true }
          }
        for (const s of ir.behavior.start)
          if (s.type === 'g2d:createImageSprite' && s.varName === 'chave') {
            if (
              scenario.name === 'outra-posicao' ||
              scenario.name === 'velocidade-1-outra-posicao'
            ) {
              s.x = 280
              s.y = 250
            }
            if (scenario.name === 'chave-na-borda') {
              s.x = 0
              s.y = 0
            }
          }
        if (scenario.name === 'pares-invertidos')
          for (const e of ir.behavior.events)
            if (e.type === 'g2d:onOverlap') [e.aVar, e.bVar] = [e.bVar, e.aVar]
        if ('personagem' in scenario) {
          for (const s of ir.behavior.start)
            if (s.type === 'g2d:createImageSprite') {
              if (s.varName === 'personagem') s.image = scenario.personagem
              if (s.varName === 'farol') s.image = scenario.farol.apagado
            }
          for (const e of ir.behavior.events)
            if (e.type === 'g2d:onOverlap')
              for (const c of e.body)
                if (c.type === 'if')
                  for (const s of c.then)
                    if (s.type === 'g2d:setImage') s.image = scenario.farol.aceso
        }
        if (scenario.name === 'velocidade-1-outra-posicao')
          for (const loop of ir.behavior.loops)
            if (loop.type === 'g2d:updateEachFrame')
              for (const command of loop.body) if (command.type === 'g2d:topDown') command.speed = 1
        if (scenario.name === 'velocidade-8')
          for (const loop of ir.behavior.loops)
            if (loop.type === 'g2d:updateEachFrame')
              for (const command of loop.body) if (command.type === 'g2d:topDown') command.speed = 8
        const files = generateProjectFiles({ ir, projectName: 'Farol: ensaio' })
        await writeFile(
          join(dir, 'game.html'),
          buildPreviewDoc({
            html: files['index.html'],
            css: files['style.css'],
            js: instrumentCheckScript(files['script.js'], scope),
            extensionScripts: [gameTwoDRuntime],
            runtimeInspection: true,
            assets: Object.fromEntries(
              (project.assets ?? []).filter((a) => a.dataUrl).map((a) => [a.name, a.dataUrl!]),
            ),
          }),
        )
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
        const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
        expect(code, stderr).toBe(0)
        const { observations }: { observations: ExecutionObservation[] } = JSON.parse(
          await readFile(join(dir, 'check-result.json'), 'utf8'),
        )
        const verdicts = objectives.map((o) =>
          judgeExecutionObservation(
            o.rule,
            observations.find((v) => v.id === o.id),
          ),
        )
        expect(
          verdicts.map((v) => v.passed),
          `${scenario.name}: ${JSON.stringify({ verdicts, observations })}`,
        ).toEqual(scenario.expected)
        console.log('PASS Farol nativo:', scenario.name)
      }
    } finally {
      if (resolve(dir).startsWith(base) && dir.includes('sz-farol-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  240000,
)
