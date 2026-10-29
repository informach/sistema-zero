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
  'Recife Coral: o executor real aprova os gabaritos e reprova os projetos iniciais',
  async () => {
    const manifesto = ManifestoDeDesafiosSchema.parse(
      await Bun.file(
        new URL('../../../docs/desafios-do-jogo/recife/recife.manifesto.json', import.meta.url),
      ).json(),
    )
    const base = resolve(tmpdir()) + sep
    const dir = await mkdtemp(join(tmpdir(), 'sz-recife-browser-'))
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
        const removeContact = (behavior: SZIRV2['behavior'], target: string) => {
          const contact = behavior.events.find(
            (s) => s.type === 'g2d:onOverlap' && s.bVar === target,
          )
          if (contact?.type !== 'g2d:onOverlap') throw Error('Contato ausente')
          contact.body = []
        }
        if (d.tipo === 'quadro-das-cores') {
          wrong('mira-parada', ['mirar'], (behavior) =>
            visit(behavior.loops, (s) => {
              if (s.type === 'g2d:arrowsX') s.speed = 0
            }),
          )
          wrong('bolha-desce', ['soltar', 'prender'], (behavior) =>
            visit(behavior.events, (s) => {
              if (
                s.type === 'g2d:setVelocity' &&
                s.spriteVar === 'bolha' &&
                s.vy.type === 'num' &&
                s.vy.value === -5
              )
                s.vy.value = 5
            }),
          )
          wrong('atravessa-alvo', ['prender', 'contar'], (behavior) =>
            removeContact(behavior, 'alvo'),
          )
          wrong('conta-o-mesmo-alvo', ['contar'], (behavior) =>
            visit(behavior.events, (s) => {
              if (
                s.type === 'if' &&
                s.cond.type === 'binop' &&
                s.cond.left.type === 'var' &&
                s.cond.left.name === 'preso'
              )
                s.cond = { type: 'bool', value: true }
            }),
          )
          wrong('pontua-sem-acertar', ['contar'], (behavior) => {
            const shot = behavior.events.find(
              (s) => s.type === 'g2d:onGroupClick' && s.groupVar === 'botoesSoltar',
            )
            if (shot?.type !== 'g2d:onGroupClick') throw Error('Botão ausente')
            shot.body.push({ type: 'assign', name: 'pontos', value: { type: 'num', value: 1 } })
          })
          wrong('reinicia-bolha-em-voo', ['soltar'], (behavior) => {
            const shot = behavior.events.find(
              (s) => s.type === 'g2d:onGroupClick' && s.groupVar === 'botoesSoltar',
            )
            if (shot?.type !== 'g2d:onGroupClick' || shot.body[0]?.type !== 'if')
              throw Error('Guarda ausente')
            shot.body[0].cond = { type: 'bool', value: true }
          })
        } else if (d.slug.endsWith('rapida')) {
          wrong('velocidade-antiga', ['bolha-rapida'], (behavior) =>
            visit(behavior.events, (s) => {
              if (
                s.type === 'g2d:setVelocity' &&
                s.spriteVar === 'bolha' &&
                s.vy.type === 'num' &&
                s.vy.value === -8
              )
                s.vy.value = -5
            }),
          )
        } else if (d.slug.endsWith('pontos')) {
          wrong('vale-um-ponto', ['dois-pontos'], (behavior) =>
            visit(behavior.events, (s) => {
              if (s.type === 'assign' && s.name === 'pontos' && s.value.type === 'binop')
                s.value.right = { type: 'num', value: 1 }
            }),
          )
        } else {
          wrong('atravessa-alvo-novo', ['segundo-alvo'], (behavior) =>
            removeContact(behavior, 'alvoNovo'),
          )
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
      if (resolve(dir).startsWith(base) && dir.includes('sz-recife-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  420000,
)
