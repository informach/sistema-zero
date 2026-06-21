import { describe, expect, it } from 'bun:test'
import { glossErrorMessage } from './errorGloss'

describe('glossErrorMessage', () => {
  it('reconhece "is not defined" e cita o nome', () => {
    const gloss = glossErrorMessage('x is not defined')
    expect(gloss).not.toBeNull()
    expect(gloss).toContain('"x"')
    // Dica em português, calma, com próximo passo.
    expect(gloss).toMatch(/Dica:/)
  })

  it('reconhece "is not a function"', () => {
    const gloss = glossErrorMessage('y is not a function')
    expect(gloss).not.toBeNull()
    expect(gloss).toMatch(/Dica:/)
    // Não vaza inglês na dica.
    expect(gloss).not.toMatch(/function\b/i)
  })

  it('reconhece "Cannot read properties of undefined"', () => {
    const gloss = glossErrorMessage("Cannot read properties of undefined (reading 'nome')")
    expect(gloss).not.toBeNull()
    expect(gloss).toMatch(/Dica:/)
  })

  it('reconhece "Cannot read property of null" (forma singular antiga)', () => {
    const gloss = glossErrorMessage("Cannot read property 'x' of null")
    expect(gloss).not.toBeNull()
    expect(gloss).toMatch(/Dica:/)
  })

  it('reconhece "is not defined" com aspas ao redor do nome', () => {
    const gloss = glossErrorMessage("'minhaVar' is not defined")
    expect(gloss).not.toBeNull()
    expect(gloss).toContain('"minhaVar"')
  })

  it.each([
    'Uncaught ReferenceError: pontos is not defined',
    'ReferenceError: pontos is not defined',
  ])('cita o nome REAL mesmo com prefixo do navegador (%j)', (msg) => {
    const gloss = glossErrorMessage(msg)
    expect(gloss).not.toBeNull()
    expect(gloss).toContain('"pontos"')
    // NÃO cita o prefixo do navegador como se fosse o nome da variável.
    expect(gloss).not.toContain('"Uncaught"')
    expect(gloss).not.toContain('"ReferenceError"')
  })

  it('devolve null para mensagens desconhecidas (mostra só o original)', () => {
    expect(glossErrorMessage('Algo totalmente diferente aconteceu')).toBeNull()
    expect(glossErrorMessage('SyntaxError: Unexpected end of input')).toBeNull()
  })

  it('devolve null para string vazia', () => {
    expect(glossErrorMessage('')).toBeNull()
  })
})
