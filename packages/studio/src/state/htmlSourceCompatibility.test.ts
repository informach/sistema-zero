import { expect, it } from 'bun:test'
import { htmlSourceCompatible } from './htmlSourceCompatibility'

const doc = (body: string) =>
  `<!doctype html>\n<html lang="pt-BR">\n  <head>\n    <title>X</title>\n  </head>\n  <body>\n${body}\n  </body>\n</html>\n`

it('treats the same document with attributes in another order as equal', () => {
  // Revisão da missão: o bloco guarda a classe à parte, e ela volta no fim dos atributos.
  // Abrir o Reino Zero Ultra e o Cidade & Moinho regravava o index.html só por isso.
  expect(
    htmlSourceCompatible(
      doc(
        '<div class="touch-controls" aria-label="Controles"><button id="a" type="button">P1</button></div>',
      ),
      doc(
        '<div aria-label="Controles" class="touch-controls"><button type="button" id="a">P1</button></div>',
      ),
    ),
  ).toBe(true)
  expect(
    htmlSourceCompatible(
      doc(
        '<svg><g class="cata-vento" transform="translate(60, 70)"><circle r="7"></circle></g></svg>',
      ),
      doc(
        '<svg><g transform="translate(60, 70)" class="cata-vento"><circle r="7"></circle></g></svg>',
      ),
    ),
  ).toBe(true)
})

it('does not equate different text, values, attributes, structure or whitespace', () => {
  const base = doc('<div class="a" id="b">Olá</div>')
  for (const other of [
    doc('<div class="a" id="b">Oi</div>'),
    doc('<div class="a" id="c">Olá</div>'),
    doc('<div class="a">Olá</div>'),
    doc('<div class="a" id="b" title="t">Olá</div>'),
    doc('<span class="a" id="b">Olá</span>'),
    doc('<div class="a" id="b">Olá</div><p></p>'),
    doc(' <div class="a" id="b">Olá</div>'),
  ])
    expect(htmlSourceCompatible(base, other)).toBe(false)
  expect(htmlSourceCompatible(base, base)).toBe(true)
})

it('keeps the head, doctype and comments in the comparison', () => {
  expect(
    htmlSourceCompatible(
      doc('<p>a</p>'),
      doc('<p>a</p>').replace('<title>X</title>', '<title>Y</title>'),
    ),
  ).toBe(false)
  expect(htmlSourceCompatible(doc('<!-- a --><p>a</p>'), doc('<!-- b --><p>a</p>'))).toBe(false)
  expect(
    htmlSourceCompatible(doc('<p>a</p>'), doc('<p>a</p>').replace('<!doctype html>\n', '')),
  ).toBe(false)
})
