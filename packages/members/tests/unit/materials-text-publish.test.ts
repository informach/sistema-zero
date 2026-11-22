import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MATERIALS_TEXT_MAX_CHARS } from '../../src/interfaces/http/dtos'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'

// O Passo a passo do projeto morava num item de texto do bloco de materiais (com a prévia em livro).
// A importação aceita o manifesto pelo core; a PUBLICAÇÃO valida o bloco por este DTO. Com o teto
// de 2000 caracteres, os cursos do Faísca importavam e não publicavam (29/10/2026). Desde 22/11/2026
// o material de curso infantil não leva texto para ler (`materiais-sem-texto.test.ts`, nas aulas):
// os manifestos continuam conferidos, e o teto do DTO é provado com o tamanho do Passo a passo.
const faisca = resolve(import.meta.dirname, '../../../../docs/aulas-interativas/faisca')

describe('materiais com o Passo a passo inteiro', () => {
  test('todo bloco de materiais dos manifestos do Faísca passa na publicação', () => {
    let conferidos = 0
    for (const curso of readdirSync(faisca, { withFileTypes: true }).filter((d) => d.isDirectory()))
      for (const nome of readdirSync(resolve(faisca, curso.name)).filter((n) =>
        n.endsWith('.manifesto.json'),
      )) {
        const manifesto = JSON.parse(readFileSync(resolve(faisca, curso.name, nome), 'utf8')) as {
          blocks: { key: string; content?: { kind: string; items?: { markdown?: string }[] } }[]
        }
        for (const block of manifesto.blocks) {
          // Bloco vazio espera o PDF anexado no Admin antes de publicar (o Cadê).
          if (block.content?.kind !== 'materials' || !block.content.items?.length) continue
          conferidos++
          expect(
            () => parsePublishedLessonBlock(block.content),
            `${nome}/${block.key}`,
          ).not.toThrow()
        }
      }
    // Anti-vácuo: os blocos de materiais das Aulas 1 e da Chave do Farol foram mesmo conferidos.
    expect(conferidos).toBeGreaterThanOrEqual(8)
  })

  test('o texto do tamanho do Passo a passo (16 mil caracteres) passa na publicação', () => {
    // A régua de antes (2000) reprovaria este: era o maior Passo a passo copiado no material.
    expect(() =>
      parsePublishedLessonBlock({
        kind: 'materials',
        items: [{ id: 'passos', kind: 'text', markdown: 'a'.repeat(16_000) }],
      }),
    ).not.toThrow()
  })

  test('acima do teto continua recusado', () => {
    expect(() =>
      parsePublishedLessonBlock({
        kind: 'materials',
        items: [{ id: 'passos', kind: 'text', markdown: 'a'.repeat(MATERIALS_TEXT_MAX_CHARS + 1) }],
      }),
    ).toThrow()
  })
})
