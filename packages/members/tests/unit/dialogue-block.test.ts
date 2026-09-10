/**
 * Bloco de DIÁLOGO do mascote — domínio + borda.
 *
 * O bloco existe para dar instrução a criança num balão de fala, no lugar de
 * contexto corrido. É conteúdo, não atividade: nunca pode travar a conclusão da
 * aula. E, como todo tipo novo, ele vive em vários lugares que não se cobram por
 * compilação — o que estes testes seguram é a borda.
 */
import { describe, expect, it } from 'bun:test'
import {
  DIALOGUE_MAX_LENGTH,
  DIALOGUE_POSES,
  isCompletionGatingBlock,
  LESSON_BLOCK_KINDS,
} from '../../src/domain/course/lesson-block'
import { LessonBlockContentSchema } from '../../src/interfaces/http/dtos'

/** A variante `dialogue` da união, lida do TypeBox de verdade. */
function varianteDaBorda(): {
  properties?: {
    pose?: { anyOf?: { const?: string }[] }
    text?: { minLength?: number; maxLength?: number }
  }
  required?: string[]
} {
  const variantes = (LessonBlockContentSchema as { anyOf?: unknown[] }).anyOf ?? []
  const achada = variantes.find(
    (v) =>
      (v as { properties?: { kind?: { const?: unknown } } }).properties?.kind?.const === 'dialogue',
  )
  if (!achada) throw new Error('a borda não conhece o bloco de diálogo')
  return achada as ReturnType<typeof varianteDaBorda>
}

describe('bloco de diálogo', () => {
  it('o kind existe e NUNCA trava a conclusão da aula', () => {
    expect(LESSON_BLOCK_KINDS).toContain('dialogue')
    expect(isCompletionGatingBlock({ kind: 'dialogue', text: 'oi' })).toBe(false)
  })

  it('a borda cobra a fala e respeita a régua editorial', () => {
    const v = varianteDaBorda()
    expect(v.required).toContain('text')
    // Fala vazia não é balão nenhum.
    expect(v.properties?.text?.minLength).toBe(1)
    // O limite é EDITORIAL antes de ser técnico: o bloco existe para não ser
    // parede de texto. Domínio e borda têm que dizer o mesmo número.
    expect(v.properties?.text?.maxLength).toBe(DIALOGUE_MAX_LENGTH)
  })

  it('as poses da borda são exatamente as do domínio', () => {
    const naBorda = (varianteDaBorda().properties?.pose?.anyOf ?? [])
      .map((p) => p.const)
      .filter((p): p is string => typeof p === 'string')
    expect(naBorda.sort()).toEqual([...DIALOGUE_POSES].sort())
    // 'sleeping' existe no elenco do mascote; num balão de fala seria absurdo.
    expect(naBorda).not.toContain('sleeping')
  })

  it('a pose é opcional (o balão pede um mascote falando por padrão)', () => {
    expect(varianteDaBorda().required ?? []).not.toContain('pose')
  })
})
