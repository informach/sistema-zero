import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { desafiosIniciaisDoPico } from '../../../docs/desafios-do-jogo/pico/quadros-iniciais'
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
for (const d of desafiosIniciaisDoPico('kids'))
  nativeTest(
    `${d.slug}: gabarito executável, inicial incompleto e erros causais`,
    async () => {
      const base = resolve(tmpdir()) + sep
      const dir = await mkdtemp(join(tmpdir(), 'sz-pico-quadros-'))
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
          const evento = (b: SZIRV2['behavior'], tipo: string, chave?: string) => {
            const e = b.events.find(
              (s) =>
                s.type === tipo &&
                (chave === undefined ||
                  ('key' in s && s.key === chave) ||
                  ('bVar' in s && s.bVar === chave)),
            )
            if (!e || !('body' in e) || !Array.isArray(e.body)) throw Error(`${tipo} ausente`)
            return e as { body: JSStatement[] }
          }
          // A Fase do Pico (lacunas, 01/11/2026): cada erro tira a regra que o quadro ensina.
          wrong(
            'sem-enter',
            d.quadro === 5 ? ['volta-a-fase-1', 'quedas-zeradas'] : ['recomecar'],
            (b) => {
              evento(b, 'g2d:onKey', 'Enter').body = []
            },
          )
          if (d.quadro === 1)
            wrong('pula-no-ar', ['pular'], (b) =>
              visit(b.events, (s) => {
                if (s.type === 'if') s.cond = { type: 'bool', value: true }
              }),
            )
          if (d.quadro === 2)
            wrong('nao-conta', ['agua'], (b) => {
              const e = evento(b, 'g2d:onOverlap', 'mar')
              e.body = e.body.filter((s) => s.type !== 'assign' || s.name !== 'quedas')
            })
          if (d.quadro === 3)
            wrong('nao-muda-de-fase', ['proxima-fase'], (b) =>
              visit(b.events, (s) => {
                if (s.type === 'assign' && s.name === 'fase') s.value = { type: 'num', value: 1 }
              }),
            )
          if (d.quadro === 4)
            wrong('termina-na-fase-1', ['fim'], (b) => {
              const e = evento(b, 'g2d:onOverlap', 'bandeira')
              const se = e.body[0]
              if (se?.type !== 'if') throw Error('Se da fase ausente')
              e.body = [...(se.else ?? [])]
            })
          if (d.quadro === 5)
            wrong('esquece-a-fase', ['volta-a-fase-1'], (b) => {
              const e = evento(b, 'g2d:onKey', 'Enter')
              e.body = e.body.filter((s) => s.type !== 'assign' || s.name !== 'fase')
            })
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
        if (resolve(dir).startsWith(base) && dir.includes('sz-pico-quadros-'))
          await rm(dir, { recursive: true, force: true })
      }
    },
    900000,
  )
