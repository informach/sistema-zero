import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ManifestoDeDesafiosSchema } from '../../arquipelago-contracts/src/desafios'
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
function visit(statements: JSStatement[], change: (statement: JSStatement) => void) {
  for (const statement of statements) {
    change(statement)
    if ('body' in statement && Array.isArray(statement.body)) visit(statement.body, change)
    if (statement.type === 'if') {
      visit(statement.then, change)
      visit(statement.else ?? [], change)
    }
  }
}
nativeTest(
  'Bosque: o executor real aprova os gabaritos e reprova os projetos iniciais',
  async () => {
    const manifesto = ManifestoDeDesafiosSchema.parse(
      await Bun.file(
        new URL('../../../docs/desafios-do-jogo/bosque/bosque.manifesto.json', import.meta.url),
      ).json(),
    )
    const base = resolve(tmpdir()) + sep
    const dir = await mkdtemp(join(tmpdir(), 'sz-bosque-browser-'))
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
      for (const d of manifesto.desafios) {
        // Os cinco quadros anteriores têm sua matriz causal em quadros-bosque-browser.test.ts.
        if (!d.slug.startsWith('bosque-corrida-dos-bichos')) continue
        if (process.env.SZ_BOSQUE_SCENARIO && !d.slug.endsWith(process.env.SZ_BOSQUE_SCENARIO))
          continue
        const scenarios: { name: string; project: Project; ids?: string[]; passes: boolean }[] = [
          { name: 'gabarito', project: d.conteudo.gabarito as Project, passes: true },
          { name: 'projetoInicial', project: d.conteudo.projetoInicial as Project, passes: false },
        ]
        const broken = structuredClone(d.conteudo.gabarito) as Project
        const behavior = (broken.ir as SZIRV2).behavior
        if (d.tipo === 'quadro-das-cores') {
          const event = behavior.events.find(
            (e) => e.type === 'g2d:onGroupClick' && e.groupVar === 'botoesLargada',
          )
          if (event?.type !== 'g2d:onGroupClick') throw Error('Largada ausente')
          event.body = event.body.filter((s) => !s.type.startsWith('g2d:'))
          scenarios.push({
            name: 'largada-sem-reposicionar',
            project: broken,
            ids: ['largada'],
            passes: false,
          })
          const moving = structuredClone(d.conteudo.gabarito) as Project
          visit((moving.ir as SZIRV2).behavior.events, (s) => {
            if (s.type === 'assign' && s.name === 'correndo')
              s.value = { type: 'bool', value: true }
          })
          scenarios.push({ name: 'nao-para', project: moving, ids: ['chegada'], passes: false })
        } else if (d.slug.endsWith('pedras')) {
          visit(behavior.loops, (s) => {
            if (s.type === 'g2d:setVelocity' && s.vy.type === 'num' && s.vy.value === 2)
              s.vy.value = 0
          })
          scenarios.push({
            name: 'pula-sem-descer',
            project: broken,
            ids: ['aterrissar'],
            passes: false,
          })
        } else if (d.slug.endsWith('noite')) {
          visit(behavior.events, (s) => {
            if (s.type === 'g2d:setOpacity') s.percent = 15
          })
          scenarios.push({ name: 'luz-nao-apaga', project: broken, ids: ['apagar'], passes: false })
        } else {
          const event = behavior.events.find(
            (e) => e.type === 'g2d:onGroupClick' && e.groupVar === 'botoesLargada',
          )
          if (event?.type !== 'g2d:onGroupClick') throw Error('Largada ausente')
          event.body.push({ type: 'assign', name: 'corridas', value: { type: 'num', value: 0 } })
          scenarios.push({
            name: 'largada-apaga-placar',
            project: broken,
            ids: ['guardar'],
            passes: false,
          })
        }
        for (const scenario of scenarios) {
          const project = scenario.project
          const objectives = d.conteudo.objetivos
            .filter((o) => isSectionExecutionRule(o.rule))
            .filter((o) => !scenario.ids || scenario.ids.includes(o.id))
            .map((o) => ({ id: o.id, rule: o.rule as SectionExecutionRule }))
          const files = generateProjectFiles({ ir: project.ir!, projectName: project.name })
          if (!scenario.ids) expect(files).toEqual(project.files)
          await writeFile(
            join(dir, 'game.html'),
            buildPreviewDoc({
              html: files['index.html'],
              css: files['style.css'],
              js: instrumentCheckScript(files['script.js'], scope),
              extensionScripts: [gameTwoDRuntime],
              runtimeInspection: true,
              assets: Object.fromEntries((project.assets ?? []).map((a) => [a.name, a.dataUrl!])),
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
          const [code, stderr, stdout] = await Promise.all([
            child.exited,
            new Response(child.stderr).text(),
            new Response(child.stdout).text(),
          ])
          expect(code, `${stderr}\n${stdout}`).toBe(0)
          const { observations }: { observations: ExecutionObservation[] } = JSON.parse(
            await readFile(join(dir, 'check-result.json'), 'utf8'),
          )
          const verdicts = objectives.map((o) => ({
            id: o.id,
            ...judgeExecutionObservation(
              o.rule,
              observations.find((r) => r.id === o.id),
            ),
          }))
          for (const o of objectives)
            expect(
              executionObservationUnavailableReason(
                o.rule,
                observations.find((r) => r.id === o.id),
              ),
              `${d.slug}/${scenario.name}/${o.id}`,
            ).toBeUndefined()
          console.log(d.slug, scenario.name, JSON.stringify(verdicts))
          expect(
            verdicts.map((v) => v.passed),
            JSON.stringify(observations),
          ).toEqual(objectives.map(() => scenario.passes))
        }
      }
    } finally {
      if (resolve(dir).startsWith(base) && dir.includes('sz-bosque-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  420000,
)
