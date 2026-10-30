import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { desafiosIniciaisDoBosque } from '../../../docs/desafios-do-jogo/bosque/quadros-iniciais'
import {
  type ExecutionObservation,
  executionObservationUnavailableReason,
  isSectionExecutionRule,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'
import { instrumentCheckScript } from '../../studio/src/check/instrumentCheckScript'
import type { Project } from '../../studio/src/core/project'
import { generateProjectFiles } from '../../studio/src/generators/project'
import type { JSStatement, SZIRV2 } from '../../studio/src/ir/schema'
import { gameTwoDRuntime } from '../../studio/src/official-extensions/game-2d/runtime'
import { buildPreviewDoc } from '../../studio/src/preview/bootstrap'

const nativeTest = process.env.SZ_CHECK_CHROMIUM ? test : test.skip
function visit(statements: JSStatement[], change: (s: JSStatement) => void) {
  for (const s of statements) {
    change(s)
    if ('body' in s && Array.isArray(s.body)) visit(s.body, change)
    if (s.type === 'if') {
      visit(s.then, change)
      visit(s.else ?? [], change)
    }
  }
}
for (const d of desafiosIniciaisDoBosque('kids'))
  nativeTest(
    `${d.slug}: gabarito executável, inicial incompleto e erros causais`,
    async () => {
      const base = resolve(tmpdir()) + sep
      const dir = await mkdtemp(join(tmpdir(), 'sz-bosque-quadros-'))
      if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
      const runtime = fileURLToPath(new URL('../runtime/', import.meta.url))
      const studio = fileURLToPath(new URL('../../studio/', import.meta.url))
      const driver = Bun.resolveSync(
        'playwright-core',
        dirname(Bun.resolveSync('@playwright/test', studio)),
      )
      const scope = '__sz0123456789abcdef01234567'
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
        {
          const scenarios: { name: string; project: Project; ids?: string[]; passes: boolean }[] = [
            { name: 'gabarito', project: d.conteudo.gabarito as Project, passes: true },
            { name: 'inicial', project: d.conteudo.projetoInicial as Project, passes: false },
          ]
          const wrong = (
            name: string,
            ids: string[],
            change: (behavior: SZIRV2['behavior']) => void,
          ) => {
            const p = structuredClone(d.conteudo.gabarito) as Project
            change((p.ir as SZIRV2).behavior)
            scenarios.push({ name, ids, project: p, passes: false })
          }
          wrong('sem-reinicio', ['recomecar'], (b) => {
            const e = b.events.find((s) => s.type === 'g2d:onKey' && s.key === 'Enter')
            if (e?.type !== 'g2d:onKey') throw Error('Evento Enter ausente')
            e.body = []
          })
          if (d.quadro === 1)
            wrong('acende-sozinho', ['acao'], (b) => {
              const s = b.start.find((s) => s.type === 'var' && s.name === 'aceso')
              if (s?.type !== 'var') throw Error('Informação aceso ausente')
              s.value = { type: 'bool', value: true }
            })
          if (d.quadro === 2 || d.quadro === 3)
            wrong('ignora-condicao', [d.quadro === 2 ? 'sem-alface' : 'sem-atalho'], (b) =>
              visit(b.events, (s) => {
                if (s.type === 'if') s.cond = { type: 'bool', value: true }
              }),
            )
          if (d.quadro === 2)
            wrong('alface-permanece', ['alface-entregue'], (b) => {
              const e = b.events.find((s) => s.type === 'g2d:onOverlap' && s.bVar === 'alface')
              if (e?.type !== 'g2d:onOverlap') throw Error('Contato com a alface ausente')
              e.body = e.body.filter((s) => s.type !== 'g2d:destroySprite')
            })
          if (d.quadro === 4)
            wrong('conta-contato-repetido', ['uma-vez'], (b) =>
              visit(b.events, (s) => {
                if (s.type === 'if') s.cond = { type: 'bool', value: false }
              }),
            )
          if (d.quadro === 5)
            wrong('continua-depois-da-chegada', ['parar'], (b) =>
              visit(b.events, (s) => {
                if (s.type === 'assign' && s.name === 'correndo')
                  s.value = { type: 'bool', value: true }
              }),
            )
          for (const scenario of scenarios) {
            const objectives = d.conteudo.objetivos
              .filter((o) => !scenario.ids || scenario.ids.includes(o.id))
              .map((o) => ({ id: o.id, rule: o.rule as SectionExecutionRule }))
            expect(objectives.length).toBeGreaterThan(0)
            expect(objectives.every((o) => isSectionExecutionRule(o.rule))).toBe(true)
            const p = scenario.project
            const files = generateProjectFiles({ ir: p.ir!, projectName: p.name })
            if (!scenario.ids) expect(files).toEqual(p.files)
            await writeFile(
              join(dir, 'game.html'),
              buildPreviewDoc({
                html: files['index.html'],
                css: files['style.css'],
                js: instrumentCheckScript(files['script.js'], scope),
                extensionScripts: [gameTwoDRuntime],
                runtimeInspection: true,
                assets: Object.fromEntries((p.assets ?? []).map((a) => [a.name, a.dataUrl!])),
              }),
            )
            await writeFile(
              join(dir, 'check-options.json'),
              JSON.stringify({
                mode: 'classic',
                scope,
                objectives,
                deadlineMs: 90000,
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
            const timeout = setTimeout(() => child.kill(), 95000)
            try {
              const [code, out, err] = await Promise.all([
                child.exited,
                new Response(child.stdout).text(),
                new Response(child.stderr).text(),
              ])
              expect(code, `${d.slug}/${scenario.name}\n${out}\n${err}`).toBe(0)
            } finally {
              clearTimeout(timeout)
              if (child.exitCode === null) child.kill()
            }
            const result = JSON.parse(await readFile(join(dir, 'check-result.json'), 'utf8')) as {
              observations: ExecutionObservation[]
            }
            for (const o of objectives) {
              const observed = result.observations.find((r) => r.id === o.id)
              expect(
                executionObservationUnavailableReason(o.rule, observed),
                `${d.slug}/${scenario.name}/${o.id}`,
              ).toBeUndefined()
              expect(
                judgeExecutionObservation(o.rule, observed).passed,
                `${d.slug}/${scenario.name}/${o.id}\n${JSON.stringify(observed)}`,
              ).toBe(scenario.passes)
            }
            console.log('PASS', d.slug, scenario.name)
          }
        }
      } finally {
        if (resolve(dir).startsWith(base) && dir.includes('sz-bosque-quadros-'))
          await rm(dir, { recursive: true, force: true })
      }
    },
    900000,
  )
