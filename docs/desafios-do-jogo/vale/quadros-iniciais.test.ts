import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ManifestoDeDesafiosSchema } from '../../../packages/arquipelago-contracts/src/desafios'
import {
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { desafiosIniciaisDoVale } from './quadros-iniciais'

function tipos(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(tipos)
  const o = value as Record<string, unknown>
  return [
    ...(typeof o.type === 'string' && o.type.startsWith('sz_') ? [o.type] : []),
    ...Object.values(o).flatMap(tipos),
  ]
}
const blocos = (curso: string): string[] => {
  const dados = JSON.parse(
    readFileSync(new URL(`../../aulas-interativas/${curso}/blocos.json`, import.meta.url), 'utf8'),
  )
  return dados.blocks ?? dados['2d']
}
const faisca = new Set([
  ...blocos('faisca/cade-todo-mundo'),
  ...blocos('faisca/a-ilha-do-farol'),
  ...blocos('faisca/desafio-primeiro-jogo'),
  ...blocos('faisca/o-jardim-secreto'),
])
const construtor = new Set([
  ...faisca,
  ...blocos('construtor/nave-contra-asteroides'),
  ...blocos('construtor/o-jogo-do-meu-jeito'),
])
const inventor = new Set([...construtor, ...blocos('inventor/corre-dino')])

test('os cinco quadros são determinísticos, por público, e preservam o laço preparado e só pedem ações do repertório declarado', () => {
  for (const publico of ['kids', 'adulto'] as const) {
    const desafios = desafiosIniciaisDoVale(publico)
    expect(desafios).toEqual(desafiosIniciaisDoVale(publico))
    expect(
      ManifestoDeDesafiosSchema.safeParse({
        formato: 'arquipelago-desafios',
        versao: 1,
        escopo: 'ilha',
        desafios,
      }).success,
    ).toBe(true)
    expect(desafios.map((d) => d.quadro)).toEqual([1, 2, 3, 4, 5])
    for (const d of desafios) {
      expect(d.publico).toBe(publico)
      // C01b: só os quadros sem lista pedem publicação.
      expect(d.publicar).toBe(d.quadro !== null && d.quadro >= 3)
      expect(d.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
      const temLacoPreparado = d.quadro === 1 || d.quadro === 2
      const loops = (raw: unknown) => {
        const ir = SZIRV2Schema.parse((raw as { ir: unknown }).ir)
        return ir.behavior.events.flatMap((e) =>
          e.type === 'g2d:onKey' && e.key === 'Space'
            ? e.body.filter((s) => s.type === 'g2d:forEachInGroup')
            : [],
        )
      }
      const iniciais = loops(d.conteudo.projetoInicial)
      const completos = loops(d.conteudo.gabarito)
      expect(iniciais).toHaveLength(temLacoPreparado ? 1 : 0)
      expect(completos).toHaveLength(iniciais.length)
      expect(iniciais.every((s) => s.type === 'g2d:forEachInGroup' && s.body.length === 0)).toBe(
        true,
      )
      expect(
        completos.map((s) => (s.type === 'g2d:forEachInGroup' ? [s.groupVar, s.itemName] : null)),
      ).toEqual(
        iniciais.map((s) => (s.type === 'g2d:forEachInGroup' ? [s.groupVar, s.itemName] : null)),
      )
      for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
        const p = raw as { ir: unknown; blocksState: unknown }
        expect(SZIRV2Schema.safeParse(p.ir).success, d.slug).toBe(true)
        const repertorio = inventor
        expect(
          [...new Set(tipos(p.blocksState))].filter(
            (t) => !repertorio.has(t) && !(temLacoPreparado && t === 'sz_g2d_for_each_in_group'),
          ),
          d.slug,
        ).toEqual([])
        expect(
          tipos(p.blocksState).filter((t) => /sz_(?:html|css|canvas|adv_raw|js_object)/.test(t)),
        ).toEqual([])
      }
      expect(
        isSectionCompletion({ version: 1, blockIds: [], projectChecks: d.conteudo.objetivos }),
        d.slug,
      ).toBe(true)
      expect(d.conteudo.objetivos.every((c) => isSectionExecutionRule(c.rule))).toBe(true)
      expect(
        d.conteudo.objetivos.reduce(
          (n, c) => n + (isSectionExecutionRule(c.rule) ? executionRuleBudgetMs(c.rule) : 0),
          0,
        ),
      ).toBeLessThanOrEqual(40000)
      expect(
        [d.conteudo.enunciado, ...d.conteudo.dicas, d.conteudo.desafioExtra?.texto].join(' '),
      ).not.toMatch(/[—!]/)
    }
  }
})
