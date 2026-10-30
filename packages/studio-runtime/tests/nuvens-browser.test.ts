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
  'Ilha das Nuvens: o executor real aprova os gabaritos e reprova os projetos iniciais',
  async () => {
    const manifesto = ManifestoDeDesafiosSchema.parse(
      await Bun.file(
        new URL('../../../docs/desafios-do-jogo/nuvens/nuvens.manifesto.json', import.meta.url),
      ).json(),
    )
    const base = resolve(tmpdir()) + sep
    const dir = await mkdtemp(join(tmpdir(), 'sz-nuvens-browser-'))
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
      for (const d of manifesto.desafios.filter((d) => d.ordem >= 60)) {
        for (const objective of d.conteudo.objetivos)
          expect(isSectionExecutionRule(objective.rule), `${d.slug}/${objective.id}`).toBe(true)
        const scenarios: { name: string; project: Project; ids?: string[]; passes: boolean }[] = [
          { name: 'gabarito', project: d.conteudo.gabarito as Project, passes: true },
          { name: 'projetoInicial', project: d.conteudo.projetoInicial as Project, passes: false },
        ]
        const wrong = (
          name: string,
          ids: string[],
          change: (behavior: SZIRV2['behavior']) => void,
        ) => {
          const project = structuredClone(d.conteudo.gabarito) as Project
          change((project.ir as SZIRV2).behavior)
          scenarios.push({ name, project, ids, passes: false })
        }
        const eventos = (behavior: SZIRV2['behavior']) => behavior.events
        const simulacao = (behavior: SZIRV2['behavior']) => {
          const s = behavior.loops.find((l) => l.type === 'g2d:everySeconds')
          if (s?.type !== 'g2d:everySeconds') throw Error('Simulação ausente')
          return s
        }
        const tecla = (behavior: SZIRV2['behavior'], key: string) => {
          const c = eventos(behavior).find((s) => s.type === 'g2d:onKey' && s.key === key)
          if (c?.type !== 'g2d:onKey') throw Error(`Tecla ${key} ausente`)
          return c
        }
        /** Troca o número somado numa variável (dentro de `statements`). */
        const somaDe = (statements: JSStatement[], nome: string, de: number, para: number) =>
          visit(statements, (s) => {
            if (
              s.type === 'assign' &&
              s.name === nome &&
              s.value.type === 'binop' &&
              s.value.right.type === 'num' &&
              s.value.right.value === de
            )
              s.value.right = { type: 'num', value: para }
          })
        if (d.tipo === 'quadro-das-cores') {
          wrong('tempo-parado', ['tempo', 'sem-agua'], (behavior) => {
            const s = simulacao(behavior)
            s.body = s.body.filter((x) => !(x.type === 'assign' && x.name === 'tempo'))
          })
          wrong('cresce-sem-agua', ['sem-agua'], (behavior) => {
            // O se de fora confere a água (C01b: um se dentro do outro, sem o "e").
            const crescer = simulacao(behavior).body.find((x) => x.type === 'if')
            if (crescer?.type !== 'if') throw Error('Condição do crescimento ausente')
            crescer.cond = { type: 'bool', value: true }
          })
          wrong('nao-gasta-agua', ['crescer'], (behavior) => {
            visit(simulacao(behavior).body, (s) => {
              // Tira o gasto da água do ramo do se, mexendo na própria lista.
              if (s.type === 'if') {
                const i = s.then.findIndex((x) => x.type === 'assign' && x.name === 'agua')
                if (i >= 0) s.then.splice(i, 1)
              }
            })
          })
          wrong('rega-pouca', ['botoes'], (behavior) =>
            somaDe(tecla(behavior, 'Space').body, 'agua', 3, 1),
          )
          wrong('nunca-floresce', ['florescer'], (behavior) => {
            const s = simulacao(behavior)
            s.body = s.body.filter(
              (x) => !(x.type === 'if' && JSON.stringify(x.then).includes('florida')),
            )
          })
        } else if (d.slug.endsWith('rega-forte')) {
          wrong('rega-antiga', ['rega-forte'], (behavior) =>
            somaDe(tecla(behavior, 'Space').body, 'agua', 5, 3),
          )
        } else if (d.slug.endsWith('sol-forte')) {
          wrong('sol-forte-sempre', ['sol-forte'], (behavior) =>
            visit(simulacao(behavior).body, (s) => {
              if (s.type === 'if' && s.cond.type === 'binop' && s.cond.op === '>=')
                s.cond = { type: 'bool', value: true }
            }),
          )
        } else {
          wrong('chuva-dobrada', ['chuva'], (behavior) => {
            const s = simulacao(behavior)
            const chuva = s.body.find((x) => x.type === 'assign' && x.name === 'agua')
            if (chuva?.type !== 'assign' || chuva.value.type !== 'binop')
              throw Error('Chuva ausente')
            chuva.value.right = { type: 'num', value: 2 }
          })
        }
        wrong('extra-sem-enter', ['recomecar-enter'], (behavior) => {
          const enter = behavior.events.find((s) => s.type === 'g2d:onKey' && s.key === 'Enter')
          if (enter?.type !== 'g2d:onKey') throw Error('Evento de teclado ausente')
          enter.body = []
        })
        for (const scenario of scenarios) {
          const project = scenario.project
          const objectives = d.conteudo.objetivos
            .filter((o) => !scenario.ids || scenario.ids.includes(o.id))
            .map((o) => ({ id: o.id, rule: o.rule as SectionExecutionRule }))
          expect(objectives.length, `${d.slug}/${scenario.name}`).toBeGreaterThan(0)
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
      if (resolve(dir).startsWith(base) && dir.includes('sz-nuvens-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  420000,
)
