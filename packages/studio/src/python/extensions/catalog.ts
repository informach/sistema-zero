import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'

/** Metadata only. Neither the interpreter nor Blockly is loaded by this catalog. */
export const PYTHON_EXTENSIONS = Object.freeze([
  Object.freeze({
    ...TURTLE_EXTENSION,
    name: 'Turtle',
    description: 'Desenhe com a tartaruga e crie animações e jogos usando Python.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê os comandos Python, como turtle.forward(100).',
  }),
])
