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

  it.each([
    "IndexSizeError: Failed to execute 'arc' on 'CanvasRenderingContext2D': The radius provided (-1) is negative.",
    "RangeError: Failed to execute 'roundRect' on 'CanvasRenderingContext2D': Radius value -1 is negative.",
  ])('explica raio Canvas negativo com um próximo passo (%j)', (message) => {
    const gloss = glossErrorMessage(message)
    expect(gloss).toContain('raio')
    expect(gloss).toContain('0 ou um número maior')
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

describe('glossErrorMessage com erros do Python', () => {
  const casos: [string, string][] = [
    ["TypeError: unsupported operand type(s) for +: 'int' and 'str'", 'str(numero)'],
    ['TypeError: can only concatenate str (not "int") to str', 'str(numero)'],
    ['IndentationError: expected an indented block after', 'recuo'],
    ["SyntaxError: expected ':'", 'dois-pontos'],
    ['ZeroDivisionError: division by zero', 'dividir por zero'],
    ['IndexError: list index out of range', 'posição que não existe'],
    ["AttributeError: 'NoneType' object has no attribute 'x'", 'None'],
    ["AttributeError: 'Actor' object has no attribute 'posicao'", 'depois do ponto'],
    ["ValueError: invalid literal for int() with base 10: 'oi'", 'não é um número'],
    ['TypeError: mover() takes 1 positional argument but 2 were given', 'número de valores'],
    ["KeyError: 'SPCAE'", 'nome de tecla'],
    ["KeyError: 'vidas'", 'dicionário'],
    ['SyntaxError: invalid syntax', 'parênteses'],
  ]
  for (const [mensagem, trecho] of casos)
    it(`dá uma dica para "${mensagem}"`, () => {
      expect(glossErrorMessage(mensagem)).toContain(trecho)
    })

  it('o NameError do Python continua citando o nome', () => {
    expect(glossErrorMessage("NameError: name 'pontos' is not defined")).toContain('"pontos"')
  })
})
