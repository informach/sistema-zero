import { describe, expect, it } from 'bun:test'
import { chunkKnowledge, knowledgeHash } from '../../src/domain/kb/chunking'

describe('trechos de conhecimento', () => {
  it('preserva a orientação no fim de um documento e limita cada trecho', () => {
    const text = `# Contexto\n\n${'Introdução com detalhes. '.repeat(400)}\n\n# Aparelho\n\nAutorize o aparelho na área dos pais.`
    const chunks = chunkKnowledge('revision', text, () => crypto.randomUUID(), 500)
    expect(chunks.every((chunk) => chunk.text.length <= 500)).toBe(true)
    expect(chunks.at(-1)?.text).toContain('Autorize o aparelho')
    expect(chunks.at(-1)?.section).toBe('Aparelho')
    expect(chunks.map((c) => c.position)).toEqual(chunks.map((_, index) => index))
    expect(
      chunks
        .map((c) => c.text)
        .join(' ')
        .replace(/\s+/g, ' '),
    ).toBe(text.replace(/\s+/g, ' ').trim())
  })
  it('normaliza quebras e Unicode para hash estável', () => {
    expect(knowledgeHash('Ação\r\n')).toBe(knowledgeHash('Ac\u0327a\u0303o\n'))
    expect(chunkKnowledge('revision', ' \n ', () => 'unused')).toEqual([])
  })
})
