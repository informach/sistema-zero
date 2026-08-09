import { describe, expect, test } from 'bun:test'
import type { BlockCatalogEntry } from '@sistemazero/studio'
import {
  parseQuizImport,
  parseStudioBlocksImport,
  QUIZ_IMPORT_EXAMPLE,
} from '../src/lib/lesson-block-import'

const CATALOG: readonly BlockCatalogEntry[] = [
  { type: 'sz_control_repeat', label: 'Repita', category: 'Controle' },
  { type: 'sz_val_number', label: 'Número', category: 'Valores' },
  // As 🗂️ Áreas do projeto entram no catálogo do Estúdio desde 08/08, então a
  // importação de lista de blocos precisa aceitá-las como qualquer outro id.
  { type: 'sz_frame_start', label: '⚙️ Ao iniciar', category: '🗂️ Áreas do projeto' },
  { type: 'sz_frame_molds', label: '🧩 Meus moldes', category: '🗂️ Áreas do projeto' },
]

describe('parseQuizImport', () => {
  test('converte o formato amigável, preserva Markdown e gera IDs únicos', () => {
    const result = parseQuizImport(JSON.stringify(QUIZ_IMPORT_EXAMPLE))

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.passingScore).toBe(70)
    expect(result.data.questions).toHaveLength(1)
    const question = result.data.questions[0]!
    expect(question.prompt).toBe('Qual bloco repete uma ação?')
    expect(question.explanation).toContain('**Repita**')
    expect(question.choices.map((choice) => choice.label)).toEqual(['Repita', 'Espere'])
    expect(question.correctChoiceIds).toEqual([question.choices[0]!.id])

    const ids = [question.id, ...question.choices.map((choice) => choice.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('aceita quiz de fixação e múltiplas alternativas corretas', () => {
    const result = parseQuizImport(
      JSON.stringify({
        questions: [
          {
            prompt: 'Selecione duas',
            choices: [
              { label: 'A', correct: true },
              { label: 'B', correct: true },
              { label: 'C', correct: false },
            ],
          },
        ],
      }),
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.passingScore).toBeUndefined()
    expect(result.data.questions[0]!.correctChoiceIds).toHaveLength(2)
  })

  test('rejeita JSON malformado sem produzir dados aplicáveis', () => {
    const result = parseQuizImport('{"questions": [}')

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors[0]).toContain('JSON válido')
  })

  test('lista erros por caminho e rejeita campos extras', () => {
    const result = parseQuizImport(
      JSON.stringify({
        extra: true,
        questions: [
          {
            prompt: '   ',
            choices: [
              { label: '', correct: false, extraChoice: true },
              { label: 'B', correct: false },
            ],
          },
        ],
      }),
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors.some((error) => error.includes('Arquivo: campo(s) não reconhecido'))).toBe(
      true,
    )
    expect(result.errors.some((error) => error.includes('Pergunta 1 > enunciado'))).toBe(true)
    expect(result.errors.some((error) => error.includes('alternativa 1 > texto'))).toBe(true)

    const withoutCorrect = parseQuizImport(
      JSON.stringify({
        questions: [
          {
            prompt: 'Pergunta válida',
            choices: [
              { label: 'A', correct: false },
              { label: 'B', correct: false },
            ],
          },
        ],
      }),
    )
    expect(withoutCorrect.success).toBe(false)
    if (!withoutCorrect.success) {
      expect(withoutCorrect.errors.some((error) => error.includes('correct": true'))).toBe(true)
    }
  })

  test('rejeita nota decimal ou fora do intervalo e pergunta incompleta', () => {
    for (const passingScore of [-1, 50.5, 101]) {
      const result = parseQuizImport(
        JSON.stringify({ passingScore, questions: QUIZ_IMPORT_EXAMPLE.questions }),
      )
      expect(result.success).toBe(false)
    }

    const empty = parseQuizImport(JSON.stringify({ questions: [] }))
    expect(empty.success).toBe(false)
  })

  test('aplica os limites de texto do contrato persistido', () => {
    const base = QUIZ_IMPORT_EXAMPLE.questions[0]!
    for (const question of [
      { ...base, prompt: 'x'.repeat(5_001) },
      {
        ...base,
        choices: [
          { label: 'x'.repeat(2_001), correct: true },
          { label: 'B', correct: false },
        ],
      },
      { ...base, explanation: 'x'.repeat(5_001) },
    ]) {
      expect(parseQuizImport(JSON.stringify({ questions: [question] })).success).toBe(false)
    }
  })
})

describe('parseStudioBlocksImport', () => {
  test('aceita IDs conhecidos e preserva a ordem', () => {
    const result = parseStudioBlocksImport(
      JSON.stringify({ blocks: ['sz_val_number', 'sz_control_repeat'] }),
      CATALOG,
    )

    expect(result).toEqual({
      success: true,
      data: { blocks: ['sz_val_number', 'sz_control_repeat'] },
    })
  })

  test('rejeita lista vazia, duplicatas, IDs desconhecidos e campos extras', () => {
    expect(parseStudioBlocksImport(JSON.stringify({ blocks: [] }), CATALOG).success).toBe(false)

    const invalid = parseStudioBlocksImport(
      JSON.stringify({
        blocks: ['sz_control_repeat', 'sz_control_repeat', 'nao_existe'],
      }),
      CATALOG,
    )
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.errors.some((error) => error.includes('duplicado'))).toBe(true)
      expect(invalid.errors.some((error) => error.includes('desconhecido'))).toBe(true)
    }

    const extra = parseStudioBlocksImport(
      JSON.stringify({ blocks: ['sz_control_repeat'], label: 'extra' }),
      CATALOG,
    )
    expect(extra.success).toBe(false)
  })

  test('aceita as Áreas do projeto, que a aula pode querer restringir', () => {
    const result = parseStudioBlocksImport(
      JSON.stringify({ blocks: ['sz_frame_molds', 'sz_frame_start', 'sz_val_number'] }),
      CATALOG,
    )
    expect(result.success).toBe(true)
  })

  test('aplica os limites do contrato', () => {
    const tooMany = Array.from({ length: 501 }, (_, index) => `block-${index}`)
    expect(parseStudioBlocksImport(JSON.stringify({ blocks: tooMany }), CATALOG).success).toBe(
      false,
    )
    expect(
      parseStudioBlocksImport(JSON.stringify({ blocks: ['x'.repeat(81)] }), CATALOG).success,
    ).toBe(false)
  })
})
