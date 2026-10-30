import { expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  ERROS_DO_VALE,
  type ErroDoVale,
  montarProjetoTexto,
} from '../../../docs/desafios-do-jogo/vale/texto-projetos'
import { ManifestoDeDesafiosSchema } from '../../arquipelago-contracts/src/desafios'
import {
  type ExecutionObservation,
  executionObservationUnavailableReason,
  isSectionExecutionRule,
  judgeExecutionObservation,
  type SectionExecutionRule,
} from '../../core/src/learning/project-execution'
import { createCheckScope, prepareClassicCheckDocument } from '../../studio/src/check/serverCheck'

/**
 * C02 (30/10/2026): o Vale em JavaScript textual no executor real (`check-objectives.mjs` com o
 * Chrome local), com o documento montado pelo MESMO `prepareClassicCheckDocument` que o Members
 * manda ao studio-runtime. Gabarito passa em tudo, inicial em nada, e cada erro causal reprova o
 * objetivo que ele quebra.
 */
const nativeTest = process.env.SZ_CHECK_CHROMIUM ? test : test.skip
const QUEBRA: Record<ErroDoVale, string[]> = {
  'onda-fixa': ['ondas-crescem'],
  'alcance-sem-a-borda': ['alcance'],
  'alcance-so-em-x': ['alcance'],
  'primeira-da-lista': ['alvo'],
  'ignora-o-alcance': ['alvo'],
  'r-sem-zerar-a-onda': ['recomecar'],
}

nativeTest(
  'Vale em texto: o executor real aprova o gabarito e reprova o inicial e os erros',
  async () => {
    const base = resolve(tmpdir()) + sep
    const dir = await mkdtemp(join(tmpdir(), 'sz-vale-texto-browser-'))
    if (!resolve(dir).startsWith(base)) throw Error('Diretório de ensaio inválido')
    const runtime = fileURLToPath(new URL('../runtime/', import.meta.url))
    const studio = fileURLToPath(new URL('../../studio/', import.meta.url))
    const driver = Bun.resolveSync(
      'playwright-core',
      dirname(Bun.resolveSync('@playwright/test', studio)),
    )
    const placar: Record<string, number> = { cenarios: 0, objetivos: 0 }
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
      for (const arquivo of ['vale-texto.manifesto.json', 'vale-texto-adulto.manifesto.json']) {
        const manifesto = ManifestoDeDesafiosSchema.parse(
          await Bun.file(
            new URL(`../../../docs/desafios-do-jogo/vale/${arquivo}`, import.meta.url),
          ).json(),
        )
        const [d] = manifesto.desafios
        if (!d) throw Error('Manifesto vazio')
        // Os dois públicos guardam os mesmos projetos; o adulto confere só gabarito e inicial.
        const cenarios: { nome: string; projeto: unknown; ids?: string[]; passa: boolean }[] = [
          { nome: 'gabarito', projeto: d.conteudo.gabarito, passa: true },
          { nome: 'inicial', projeto: d.conteudo.projetoInicial, passa: false },
          ...(arquivo.includes('adulto')
            ? []
            : (Object.keys(ERROS_DO_VALE) as ErroDoVale[]).map((erro) => ({
                nome: erro,
                projeto: montarProjetoTexto(erro),
                ids: QUEBRA[erro],
                passa: false,
              }))),
        ]
        for (const cenario of cenarios) {
          const objectives = d.conteudo.objetivos
            .filter((o) => !cenario.ids || cenario.ids.includes(o.id))
            .map((o) => ({ id: o.id, rule: o.rule as SectionExecutionRule }))
          for (const o of objectives) expect(isSectionExecutionRule(o.rule), o.id).toBe(true)
          const scope = createCheckScope()
          await writeFile(
            join(dir, 'game.html'),
            await prepareClassicCheckDocument(cenario.projeto, scope),
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
          for (const o of objectives)
            expect(
              executionObservationUnavailableReason(
                o.rule,
                observations.find((r) => r.id === o.id),
              ),
              `${d.slug}/${cenario.nome}/${o.id}`,
            ).toBeUndefined()
          const vereditos = objectives.map((o) => ({
            id: o.id,
            ...judgeExecutionObservation(
              o.rule,
              observations.find((r) => r.id === o.id),
            ),
          }))
          console.log(d.slug, cenario.nome, JSON.stringify(vereditos))
          expect(
            vereditos.map((v) => v.passed),
            JSON.stringify(observations),
          ).toEqual(objectives.map(() => cenario.passa))
          placar.cenarios = (placar.cenarios ?? 0) + 1
          placar.objetivos = (placar.objetivos ?? 0) + objectives.length
        }
      }
      console.log('placar', JSON.stringify(placar))
    } finally {
      if (resolve(dir).startsWith(base) && dir.includes('sz-vale-texto-browser-'))
        await rm(dir, { recursive: true, force: true })
    }
  },
  600000,
)
