import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  montarProjetoCadeTodoMundo,
  montarProjetoCadeTodoMundoCompleto,
} from '../../../docs/aulas-interativas-tecnico/qa/cade-todo-mundo-projeto'
import {
  type ExecutionObservation,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'
import { instrumentCheckScript } from '../../studio/src/check/instrumentCheckScript'
import { generateProjectFiles } from '../../studio/src/generators/project'
import { gameTwoDRuntime } from '../../studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../studio/src/preview/bootstrap'

const nativeTest = process.env.SZ_CHECK_CHROMIUM ? test : test.skip
nativeTest(
  'Cadê: os objetivos executam a solução, erros plausíveis e personalizações no navegador real',
  async () => {
    const base = resolve(tmpdir()) + sep
    const dir = await mkdtemp(join(tmpdir(), 'sz-cade-browser-'))
    if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
    const runtime = fileURLToPath(new URL('../runtime/', import.meta.url))
    const studio = fileURLToPath(new URL('../../studio/', import.meta.url))
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
      const scenarios = [
        { name: 'sem-reacao', lesson: 1, expected: [false, false] },
        { name: 'reacao-correta', lesson: 1, expected: [true, true] },
        { name: 'objeto-fixo', lesson: 1, expected: [false, false] },
        { name: 'todos', lesson: 1, expected: [false, false] },
        { name: 'completo', lesson: 2, expected: [true, true, true, true] },
        { name: 'sem-soma', lesson: 2, expected: [true, false, false, false] },
        { name: 'colocar-um', lesson: 2, expected: [true, false, true, false] },
        { name: 'todo-toque', lesson: 2, expected: [true, true, false, true] },
        { name: 'mensagem-cedo', lesson: 2, expected: [true, true, true, false] },
        { name: 'sem-mensagem', lesson: 2, expected: [true, true, true, false] },
        { name: 'personalizado', lesson: 2, expected: [true, true, true, true] },
      ]
      for (const item of scenarios) {
        const manifest: {
          sections: {
            completion?: { projectChecks?: { id: string; rule: SectionExecutionRule }[] }
          }[]
        } = JSON.parse(
          await readFile(
            resolve(
              import.meta.dirname,
              `../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-${item.lesson}.manifesto.json`,
            ),
            'utf8',
          ),
        )
        const objectives = manifest.sections.find((s) => s.completion?.projectChecks?.length)
          ?.completion?.projectChecks
        if (!objectives?.length) throw Error('Objetivos ausentes')
        const project =
          item.lesson === 1
            ? montarProjetoCadeTodoMundo(item.name !== 'sem-reacao')
            : montarProjetoCadeTodoMundoCompleto()
        const ir = structuredClone(project.ir)
        if (!ir || !('behavior' in ir)) throw Error('Projeto sem comportamento')
        const event = ir.behavior.events[0]
        if (event?.type !== 'g2d:onGroupClick') throw Error('Evento ausente')
        if (item.name === 'objeto-fixo')
          event.body = [{ type: 'g2d:setOpacity', spriteVar: 'esconderijo1', percent: 0 }]
        if (item.name === 'todos')
          event.body = [1, 2, 3].map((n) => ({
            type: 'g2d:setOpacity',
            spriteVar: `esconderijo${n}`,
            percent: 0,
          }))
        if (item.name === 'sem-soma' || item.name === 'todo-toque')
          event.body = event.body.filter((s) => s.type !== 'assign')
        if (item.name === 'colocar-um') {
          const increment = event.body.find((s) => s.type === 'assign')
          if (increment?.type === 'assign') increment.value = { type: 'num', value: 1 }
        }
        for (const loop of ir.behavior.loops)
          if (loop.type === 'g2d:updateEachFrame')
            for (const statement of loop.body) {
              if (statement.type === 'if') {
                if (item.name === 'mensagem-cedo' && statement.cond.type === 'binop')
                  statement.cond.right = { type: 'num', value: 2 }
                if (item.name === 'sem-mensagem') statement.then.splice(0)
                if (item.name === 'personalizado')
                  for (const label of statement.then)
                    if (label.type === 'g2d:drawLabel')
                      label.text = { type: 'str', value: 'Encontrei meus amigos!' }
              }
            }
        if (item.name === 'personalizado')
          for (const sprite of ir.behavior.start)
            if (sprite.type === 'g2d:createImageSprite') {
              if (typeof sprite.x !== 'number' || typeof sprite.y !== 'number')
                throw Error('A posição inicial do sprite precisa ser numérica neste ensaio')
              sprite.x += 7
              sprite.y -= 4
            }
        const files = generateProjectFiles({ ir, projectName: 'Cadê: ensaio' })
        const js =
          item.name === 'todo-toque'
            ? files['script.js'].replace(
                /(function __szProjectRun\([^)]*\)\s*\{)/,
                '$1\nwindow.addEventListener("click", function(){achados += 1});',
              )
            : files['script.js']
        const html = buildPreviewDoc({
          html: files['index.html'],
          css: files['style.css'],
          js: instrumentCheckScript(js, scope),
          extensionScripts: [gameTwoDRuntime],
          runtimeInspection: true,
          assets: Object.fromEntries(
            (project.assets ?? []).filter((a) => a.dataUrl).map((a) => [a.name, a.dataUrl!]),
          ),
        })
        await writeFile(join(dir, 'game.html'), html)
        await writeFile(
          join(dir, 'check-options.json'),
          JSON.stringify({ mode: 'classic', scope, objectives, deadlineMs: 60000 }),
        )
        const child = Bun.spawn(['node', join(dir, 'check-objectives.mjs')], {
          cwd: dir,
          env: process.env,
          stdout: 'pipe',
          stderr: 'pipe',
          windowsHide: true,
        })
        const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
        expect(code, `${item.name}: ${stderr}`).toBe(0)
        const { observations }: { observations: ExecutionObservation[] } = JSON.parse(
          await readFile(join(dir, 'check-result.json'), 'utf8'),
        )
        const verdicts = objectives.map((o) =>
          judgeExecutionObservation(
            o.rule,
            observations.find((s) => s.id === o.id),
          ),
        )
        expect(
          verdicts.map((v) => v.passed),
          `${item.name}: ${JSON.stringify(verdicts)}`,
        ).toEqual(item.expected)
      }
    } finally {
      if (resolve(dir).startsWith(base) && dir.includes('sz-cade-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  180000,
)
