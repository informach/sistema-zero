import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { courseModelSha } from '../../../packages/studio/src/core/courseModels'
import type { ProjectAsset } from '../../../packages/studio/src/core/project'
import { projectBlockTypes } from '../../../packages/studio/src/core/projectDocumentGuards'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'
import { DESAFIOS_3D } from './projetos'

/** Os blocos 3D da trilha: os da Ilha do Farol, o 3D do Faísca. */
const TRILHA_3D = new Set<string>(
  JSON.parse(
    readFileSync(
      new URL('../../aulas-interativas/faisca/a-ilha-do-farol/blocos.json', import.meta.url),
      'utf8',
    ),
  ).blocks,
)
const registro = readFileSync(
  new URL('../../../packages/studio/src/core/course-models/registry.generated.ts', import.meta.url),
  'utf8',
)

test('um desafio 3D por ilha, nas sete ilhas', () => {
  expect(DESAFIOS_3D.map((d): string => d.ilha).sort()).toEqual(
    ['bosque', 'nuvens', 'pico', 'recife', 'sua-ilha', 'vale-dos-dinos', 'vila-doce'].sort(),
  )
})

for (const d of DESAFIOS_3D)
  for (const publico of ['kids', 'adulto'] as const)
    test(`${d.ilha} (${publico}): arquivo igual à fonte, só blocos da trilha 3D, modelos da biblioteca`, async () => {
      const manifesto = criarManifesto(d, publico)
      expect(
        await Bun.file(
          new URL(
            `./${d.ilha}-3d${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
            import.meta.url,
          ),
        ).json(),
      ).toEqual(JSON.parse(JSON.stringify(manifesto)))
      const [desafio] = manifesto.desafios
      if (!desafio) throw new Error('Manifesto vazio')
      expect(desafio.tipo).toBe('desafio-do-dia')
      expect(desafio.conteudo.recompensa.cor).toBe(false)
      for (const texto of [desafio.conteudo.enunciado, ...desafio.conteudo.dicas])
        expect(texto).not.toMatch(/[—–!]/)
      for (const nome of ['projetoInicial', 'gabarito'] as const) {
        const projeto = desafio.conteudo[nome] as {
          ir: unknown
          blocksState: unknown
          assets: ProjectAsset[]
        }
        expect(SZIRV2Schema.safeParse(projeto.ir).success, nome).toBe(true)
        const usados = projectBlockTypes(projeto.blocksState)
        expect(usados.length, nome).toBeGreaterThan(0)
        expect(
          usados.filter((t) => !TRILHA_3D.has(t)),
          nome,
        ).toEqual([])
        // Nenhum modelo embutido: só referências que o Estúdio sabe carregar.
        for (const asset of projeto.assets) {
          const sha = courseModelSha(asset)
          expect(sha, asset.name).not.toBeNull()
          // O import do modelo, que não depende de o Biome tirar as aspas da chave.
          expect(registro, asset.name).toContain(`./m-${sha}.generated'`)
        }
      }
      // O inicial deixa os dois encontros vazios; o gabarito os preenche.
      const inicial = projectBlockTypes(
        (desafio.conteudo.projetoInicial as { blocksState: unknown }).blocksState,
      )
      expect(inicial).not.toContain('sz_js_if_else')
      expect(inicial).not.toContain('sz_g3d_restart')
      const checks = desafio.conteudo.objetivos as SectionJavaScriptProjectCheck[]
      expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
      expect(checks.every((c) => isSectionExecutionRule(c.rule))).toBe(true)
      for (const c of checks) expect(executionRuleBudgetMs(c.rule as never)).toBeLessThan(30_000)
      for (const c of checks) expect(c.label).not.toMatch(/[—–!]/)
      expect(desafio.conteudo.objetivos.filter((o) => o.optional).map((o) => o.id)).toEqual([
        'recomecar',
      ])
    })
