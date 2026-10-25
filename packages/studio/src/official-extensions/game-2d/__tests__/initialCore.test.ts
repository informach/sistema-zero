import { describe, expect, it } from 'bun:test'
import {
  montarProjetoCadeTodoMundo,
  montarProjetoCadeTodoMundoCompleto,
} from '../../../../../../docs/aulas-interativas-tecnico/qa/cade-todo-mundo-projeto'
import {
  montarProjetoFarol,
  montarProjetoFarolDaParte,
} from '../../../../../../docs/aulas-interativas-tecnico/qa/desafio-farol-projeto'
import { resolveBlockLevel } from '../../../blockly/blockLevels'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import type { SZIRV2 } from '../../../ir'
import { gameTwoDExamples } from '../exampleCatalog'
import { GAME_TWO_D_INITIAL_CORE, GAME_TWO_D_INITIAL_PROJECTS } from '../initialCore'

function typesOf(ir: SZIRV2): string[] {
  const types = new Set<string>()
  function visit(value: unknown): void {
    if (!value || typeof value !== 'object') return
    if ('type' in value && typeof value.type === 'string') types.add(value.type)
    for (const child of Object.values(value)) visit(child)
  }
  visit(buildWorkspaceStateFromIR(ir))
  return [...types]
}

const examples = gameTwoDExamples.filter((example) => example.featured)
const courseProjects = [
  ['Cadê Todo Mundo? inicial', montarProjetoCadeTodoMundo()],
  ['Cadê Todo Mundo? primeiro achado', montarProjetoCadeTodoMundo(true)],
  ['Cadê Todo Mundo? completo', montarProjetoCadeTodoMundoCompleto()],
  ...(['dia-1', 'dia-2', 'dia-3', 'concluido'] as const).map(
    (stage) => [`Farol ${stage}`, montarProjetoFarol(stage)] as const,
  ),
  ...(
    ['andar', 'borda', 'recolher', 'guardar', 'programar-chave', 'sem-chave', 'decisao'] as const
  ).map((stage) => [`Farol ${stage}`, montarProjetoFarolDaParte(stage)] as const),
] as const

describe('núcleo inicial Jogo 2D — exemplos e cursos reais', () => {
  it('a promessa tem os quatro exemplos e as duas aventuras', () => {
    expect(examples).toHaveLength(4)
    expect(GAME_TWO_D_INITIAL_PROJECTS).toEqual([
      'Pegue a moeda',
      'Herói que anda',
      'Mini plataforma',
      'Sala com paredes',
      'Cadê Todo Mundo?',
      'A Chave do Farol',
    ])
  })

  for (const { name, ir } of examples) {
    it(`${name} pode ser reconstruído no primeiro degrau`, () => {
      const types = typesOf(ir)
      expect(types.length).toBeGreaterThan(10)
      expect(
        types.filter((type) => type.startsWith('sz_g2d_') && !GAME_TWO_D_INITIAL_CORE.has(type)),
      ).toEqual([])
      expect(
        types.filter(
          (type) => !type.startsWith('sz_frame_') && resolveBlockLevel(type) !== 'iniciante-2d',
        ),
      ).toEqual([])
    })
  }

  for (const [name, project] of courseProjects) {
    it(`${name} cabe no núcleo sem blocos de página ou Canvas`, () => {
      const ir = project.ir
      if (!ir || !('behavior' in ir)) throw new Error(`Projeto sem IR atual: ${name}`)
      const types = typesOf(ir)
      expect(ir.html).toEqual([])
      expect(ir.css).toEqual([])
      expect(types.filter((type) => /^sz_(html_|css_|canvas_|t3d_)/.test(type))).toEqual([])
      expect(
        types.filter((type) => type.startsWith('sz_g2d_') && !GAME_TWO_D_INITIAL_CORE.has(type)),
      ).toEqual([])
      expect(
        types.filter(
          (type) => !type.startsWith('sz_frame_') && resolveBlockLevel(type) !== 'iniciante-2d',
        ),
      ).toEqual([])
    })
  }
})
