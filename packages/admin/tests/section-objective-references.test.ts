import { describe, expect, test } from 'bun:test'
import type { SectionJavaScriptProjectCheck } from '@sistemazero/core/learning'
import { testSectionObjectives } from '../src/lib/objectives-test'
import {
  objectiveProject,
  objectiveSectionId,
  objectiveWorkspace,
  otherObjectiveSectionId,
} from './fixtures/section-objective-examples'

const loop: SectionJavaScriptProjectCheck = {
  id: 'loop',
  label: 'Use repetição',
  rule: { type: 'usesLoop' },
}
const functionCheck: SectionJavaScriptProjectCheck = {
  id: 'jump',
  label: 'Crie pular',
  rule: { type: 'definesFunction', name: 'pular' },
}
const initial = objectiveProject()
const loopProject = objectiveProject({ ir: { js: [{ type: 'repeat', times: 3, body: [] }] } })

describe('Testar agora: referências canônicas da parte', () => {
  test('resolve solução e checkpoint desta parte, sem ler o gabarito global', () => {
    const workspace = objectiveWorkspace(initial, loopProject, initial)
    const report = testSectionObjectives([loop], workspace, {}, objectiveSectionId)
    expect(report.rows[0]).toMatchObject({ initial: false, checkpoint: false, solution: true })
    expect(report.problems).toEqual([])
    const other = testSectionObjectives([loop], workspace, {}, otherObjectiveSectionId)
    expect(other.rows[0]?.solution).toBeNull()
    expect(other.rows[0]?.checkpoint).toBeNull()
  })

  test('gabarito global antigo exige conversão explícita, sem fallback', () => {
    const report = testSectionObjectives(
      [loop],
      { initialProject: initial, solutionProject: loopProject },
      {},
      objectiveSectionId,
    )
    expect(report.rows[0]?.solution).toBe('error')
    expect(report.problems.join(' ')).toContain('Converta o gabarito global')
  })

  test('pré-requisito já preparado não reprova quando outro objetivo ainda falta', () => {
    const prepared: SectionJavaScriptProjectCheck = {
      id: 'prepared',
      label: 'Preserve a repetição',
      rule: { type: 'usesBlock', blockType: 'sz_js_repeat' },
    }
    const preparedProject = objectiveProject({
      blocksState: {
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: { block: { type: 'sz_js_repeat' } },
              },
            },
          ],
        },
      },
    })
    const report = testSectionObjectives(
      [prepared, functionCheck],
      objectiveWorkspace(preparedProject),
      {},
      objectiveSectionId,
    )
    expect(report.rows[0]?.initial).toBe(true)
    expect(report.rows[1]?.initial).toBe(false)
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).not.toContain('já cumpre todos')
  })

  test('todos obrigatórios já satisfeitos geram aviso agregado, sem alegar conclusão da parte', () => {
    const prepared: SectionJavaScriptProjectCheck = {
      id: 'prepared',
      label: 'Preserve a repetição',
      rule: { type: 'usesBlock', blockType: 'sz_js_repeat' },
    }
    const project = objectiveProject({
      blocksState: {
        blocks: {
          blocks: [
            {
              type: 'sz_frame_start',
              inputs: {
                CHILDREN: { block: { type: 'sz_js_repeat' } },
              },
            },
          ],
        },
      },
    })
    const report = testSectionObjectives(
      [prepared],
      objectiveWorkspace(project, project),
      {},
      objectiveSectionId,
    )
    expect(report.problems).toEqual([])
    expect(report.notes.join(' ')).toContain('já cumpre todos os objetivos obrigatórios do projeto')
    expect(report.notes.join(' ')).toContain('vídeo, quiz e entrega')
  })

  test('registro inválido é erro de autoria e nunca ausência ou fallback global', () => {
    const report = testSectionObjectives(
      [loop],
      {
        initialProject: initial,
        projectExamples: null,
        solutionProject: loopProject,
      },
      {},
      objectiveSectionId,
    )
    expect(report.problems.length).toBeGreaterThan(0)
    expect(report.rows[0]?.solution).toBe('error')
  })

  test('IR atrasado na solução não pode aparecer como objetivo aprovado', () => {
    const report = testSectionObjectives(
      [loop],
      objectiveWorkspace(initial, { ...loopProject, bridgeCodeAhead: true }),
      {},
      objectiveSectionId,
    )
    expect(report.rows[0]?.solution).toBe('inconclusive')
    expect(report.problems.join(' ')).toContain('sincronizando')
  })

  test('execução sem resultado para um objetivo é inconclusiva, não reprovação', () => {
    const behavior: SectionJavaScriptProjectCheck = {
      id: 'motion',
      label: 'Mova o herói',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'x' }, compare: 'changed' },
      },
    }
    const report = testSectionObjectives(
      [behavior],
      objectiveWorkspace(initial, initial),
      {
        initial: { results: [] },
        solution: { results: [] },
      },
      objectiveSectionId,
    )
    expect(report.rows[0]?.solution).toBe('inconclusive')
    expect(report.problems.join(' ')).not.toContain('não cumpre')
  })

  test('checkpoint não substitui o inicial como baseline das ideias escritas em código', () => {
    const code = (script: string) =>
      objectiveProject({
        ir: null,
        mode: 'bridge',
        files: { 'index.html': '', 'style.css': '', 'script.js': script },
      })
    const report = testSectionObjectives(
      [functionCheck],
      objectiveWorkspace(code(''), code('function pular() {}'), code('function pular() {}')),
      {},
      objectiveSectionId,
    )
    expect(report.rows[0]).toMatchObject({ initial: false, checkpoint: true, solution: true })
    expect(report.problems).toEqual([])
    const seeded = testSectionObjectives(
      [functionCheck],
      objectiveWorkspace(code('function pular() {}'), code('function pular() {}'), code('')),
      {},
      objectiveSectionId,
    )
    expect(seeded.rows[0]?.solution).toBe(false)
  })

  test('execução apenas extra não exige gabarito e não transforma ausência em reprovação', () => {
    const check: SectionJavaScriptProjectCheck = {
      id: 'motion',
      label: 'Mova o herói',
      optional: true,
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'x' }, compare: 'changed' },
      },
    }
    const report = testSectionObjectives(
      [check],
      objectiveWorkspace(initial),
      {},
      objectiveSectionId,
    )
    expect(report.rows[0]).toMatchObject({ initial: 'pending', checkpoint: null, solution: null })
    expect(report.problems).toEqual([])
    expect(report.initialEntry.kind).toBe('no-required-objectives')
    expect(report.notes.join(' ')).toContain('Todos os objetivos são desafios extras')
  })

  test('erro de transporte, espera e resultado falso continuam estados distintos', () => {
    const check: SectionJavaScriptProjectCheck = {
      id: 'motion',
      label: 'Mova o herói',
      rule: {
        type: 'behavior',
        steps: [],
        expect: { target: { kind: 'value', path: 'x' }, compare: 'changed' },
      },
    }
    const workspace = objectiveWorkspace(initial, initial, initial)
    const report = testSectionObjectives(
      [check],
      workspace,
      {
        initial: 'pending',
        checkpoint: 'error',
        solution: { results: [{ id: check.id, passed: false }] },
      },
      objectiveSectionId,
    )
    expect(report.rows[0]).toMatchObject({
      initial: 'pending',
      checkpoint: 'error',
      solution: false,
    })
    expect(report.initialEntry.kind).toBe('inconclusive')
    expect(report.checkpointEntry?.kind).toBe('inconclusive')
    expect(report.problems.join(' ')).toContain('não cumpre')
    expect(report.notes.join(' ')).toContain('Não consegui rodar o jogo agora')
  })
})
