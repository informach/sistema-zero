import type { BlockCatalogEntry } from '@sistemazero/studio'
import { z } from 'zod'
import type { QuizQuestion } from '@/lib/types'

export type ImportParseResult<T> = { success: true; data: T } | { success: false; errors: string[] }

export interface ImportedQuizValue {
  questions: QuizQuestion[]
  passingScore?: number
}

export interface ImportedStudioBlocks {
  blocks: string[]
}

const nonBlankMarkdown = (maxLength: number, emptyMessage: string) =>
  z
    .string()
    .max(maxLength, `Use no máximo ${maxLength} caracteres.`)
    .refine((value) => value.trim().length > 0, emptyMessage)

const QuizChoiceImportSchema = z.strictObject({
  label: nonBlankMarkdown(2_000, 'Informe o texto da alternativa.'),
  correct: z.boolean(),
})

const QuizQuestionImportSchema = z
  .strictObject({
    prompt: nonBlankMarkdown(5_000, 'Informe o enunciado.'),
    choices: z.array(QuizChoiceImportSchema).min(2, 'Adicione ao menos 2 alternativas.'),
    explanation: z.string().max(5_000, 'Use no máximo 5000 caracteres.').optional(),
  })
  .refine((question) => question.choices.some((choice) => choice.correct), {
    path: ['choices'],
    message: 'Marque ao menos uma alternativa com "correct": true.',
  })

export const QuizImportSchema = z.strictObject({
  passingScore: z
    .number()
    .int('A nota de corte precisa ser um número inteiro.')
    .min(0, 'A nota de corte mínima é 0.')
    .max(100, 'A nota de corte máxima é 100.')
    .optional(),
  questions: z.array(QuizQuestionImportSchema).min(1, 'Adicione ao menos uma pergunta.'),
})

export type QuizImportDocument = z.infer<typeof QuizImportSchema>

export const StudioBlocksImportSchema = z.strictObject({
  blocks: z
    .array(
      z.string().min(1, 'Informe o ID do bloco.').max(80, 'O ID pode ter no máximo 80 caracteres.'),
    )
    .min(1, 'Adicione ao menos um ID de bloco.')
    .max(500, 'A lista pode ter no máximo 500 blocos.'),
})

export type StudioBlocksImportDocument = z.infer<typeof StudioBlocksImportSchema>

export const QUIZ_IMPORT_EXAMPLE: QuizImportDocument = {
  passingScore: 70,
  questions: [
    {
      prompt: 'Qual bloco repete uma ação?',
      choices: [
        { label: 'Repita', correct: true },
        { label: 'Espere', correct: false },
      ],
      explanation: 'O bloco **Repita** executa a ação várias vezes.',
    },
  ],
}

function parseJson(text: string): ImportParseResult<unknown> {
  try {
    return { success: true, data: JSON.parse(text) as unknown }
  } catch {
    return {
      success: false,
      errors: ['O arquivo não contém um JSON válido. Confira vírgulas, aspas e chaves.'],
    }
  }
}

function humanPath(path: PropertyKey[]): string {
  if (path.length === 0) return 'Arquivo'
  if (path[0] === 'passingScore') return 'Nota de corte'
  if (path[0] === 'blocks') {
    return typeof path[1] === 'number' ? `Bloco ${path[1] + 1}` : 'Blocos'
  }
  if (path[0] !== 'questions') return path.map(String).join(' > ')
  if (typeof path[1] !== 'number') return 'Perguntas'

  const parts = [`Pergunta ${path[1] + 1}`]
  if (path[2] === 'prompt') parts.push('enunciado')
  if (path[2] === 'explanation') parts.push('explicação')
  if (path[2] === 'choices') {
    if (typeof path[3] === 'number') {
      parts.push(`alternativa ${path[3] + 1}`)
      if (path[4] === 'label') parts.push('texto')
      if (path[4] === 'correct') parts.push('correta')
    } else {
      parts.push('alternativas')
    }
  }
  return parts.join(' > ')
}

function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = humanPath(issue.path)
    if (issue.code === 'unrecognized_keys') {
      return `${path}: campo(s) não reconhecido(s): ${issue.keys.join(', ')}.`
    }
    if (issue.code === 'invalid_type') {
      return `${path}: campo obrigatório ausente ou tipo inválido.`
    }
    return `${path}: ${issue.message}`
  })
}

export function parseQuizImport(text: string): ImportParseResult<ImportedQuizValue> {
  const json = parseJson(text)
  if (!json.success) return json

  const parsed = QuizImportSchema.safeParse(json.data)
  if (!parsed.success) return { success: false, errors: formatZodErrors(parsed.error) }

  const questions = parsed.data.questions.map<QuizQuestion>((question) => {
    const generatedChoices = question.choices.map((choice) => ({
      id: crypto.randomUUID(),
      label: choice.label,
      correct: choice.correct,
    }))
    return {
      id: crypto.randomUUID(),
      prompt: question.prompt,
      choices: generatedChoices.map(({ id, label }) => ({ id, label })),
      correctChoiceIds: generatedChoices
        .filter((choice) => choice.correct)
        .map((choice) => choice.id),
      ...(question.explanation?.trim() ? { explanation: question.explanation } : {}),
    }
  })

  return {
    success: true,
    data: {
      questions,
      ...(parsed.data.passingScore !== undefined ? { passingScore: parsed.data.passingScore } : {}),
    },
  }
}

export function parseStudioBlocksImport(
  text: string,
  catalog: readonly BlockCatalogEntry[],
): ImportParseResult<ImportedStudioBlocks> {
  const json = parseJson(text)
  if (!json.success) return json

  const parsed = StudioBlocksImportSchema.safeParse(json.data)
  if (!parsed.success) return { success: false, errors: formatZodErrors(parsed.error) }

  const knownIds = new Set(catalog.map((entry) => entry.type))
  const seen = new Set<string>()
  const errors: string[] = []
  for (const [index, id] of parsed.data.blocks.entries()) {
    if (seen.has(id)) errors.push(`Bloco ${index + 1}: ID duplicado: ${id}.`)
    else seen.add(id)
    if (!knownIds.has(id)) errors.push(`Bloco ${index + 1}: ID desconhecido: ${id}.`)
  }

  return errors.length > 0
    ? { success: false, errors }
    : { success: true, data: { blocks: parsed.data.blocks } }
}
