import { describe, expect, test } from 'bun:test'
import { redactAuthors } from '../src/lib/hub-redact'

const ME = 'user-me'
const OTHER = 'user-other'

describe('redactAuthors', () => {
  test('item único: mantém o authorId do PRÓPRIO viewer', () => {
    const out = redactAuthors({ id: 't1', authorId: ME, title: 'oi' }, ME)
    expect(out.authorId).toBe(ME)
  })

  test('item único: redige (null) o authorId de TERCEIRO, preservando o resto', () => {
    const out = redactAuthors({ id: 't1', authorId: OTHER, title: 'oi' }, ME)
    expect(out.authorId).toBeNull()
    expect(out.title).toBe('oi')
  })

  test('viewer null (sem sessão) → redige TUDO, inclusive o que seria próprio', () => {
    expect(redactAuthors({ authorId: ME }, null).authorId).toBeNull()
    expect(redactAuthors({ authorId: OTHER }, null).authorId).toBeNull()
  })

  test('página: redige cada item e preserva os metadados do cursor', () => {
    const out = redactAuthors(
      {
        items: [
          { id: 'a', authorId: ME },
          { id: 'b', authorId: OTHER },
        ],
        nextCursor: 'cur',
        hasMore: true,
      },
      ME,
    )
    expect(out.items[0]?.authorId).toBe(ME)
    expect(out.items[1]?.authorId).toBeNull()
    expect(out.nextCursor).toBe('cur')
    expect(out.hasMore).toBe(true)
  })

  test('envelope de erro (sem authorId/items) passa intacto', () => {
    const err = { error: { code: 'POSTING_NOT_ALLOWED' } }
    expect(redactAuthors(err, ME)).toEqual(err)
  })

  test('body null/undefined/primitivo → devolve como veio', () => {
    expect(redactAuthors(null, ME)).toBeNull()
    expect(redactAuthors(undefined, ME)).toBeUndefined()
    expect(redactAuthors('x', ME)).toBe('x')
  })

  test('NÃO muta o input ao redigir (cópia rasa, original intacto)', () => {
    const input = { authorId: OTHER }
    const out = redactAuthors(input, ME)
    expect(input.authorId).toBe(OTHER)
    expect(out).not.toBe(input)
  })

  test('item já do viewer volta por referência (sem cópia desnecessária)', () => {
    const input = { authorId: ME }
    expect(redactAuthors(input, ME)).toBe(input)
  })

  test('vitrine: redige o authorId de terceiro MAS preserva o authorDisplayName (nome do autor)', () => {
    const out = redactAuthors(
      {
        id: 'p1',
        authorId: OTHER,
        isShowcase: true,
        authorDisplayName: 'Sofia',
        title: 'Meu Jogo',
      },
      ME,
    )
    // O UUID some (privacidade), mas o primeiro nome do autor da vitrine permanece.
    expect(out.authorId).toBeNull()
    expect(out.authorDisplayName).toBe('Sofia')
    expect(out.title).toBe('Meu Jogo')
  })
})
