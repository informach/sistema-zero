import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'

/** Metadata only. Neither the interpreter nor Blockly is loaded by this catalog. */
export const PYTHON_EXTENSIONS = Object.freeze([
  Object.freeze({
    ...TURTLE_EXTENSION,
    name: 'Turtle',
    emoji: '🐢',
    description: 'Desenhe com a tartaruga e crie animações e jogos usando Python.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê os comandos Python, como turtle.forward(100).',
  }),
  Object.freeze({
    ...PGZERO_EXTENSION,
    name: 'Pygame Zero',
    emoji: '🎮',
    description:
      'Faça jogos com atores, imagens, sons, teclado e mouse. É o mesmo Pygame Zero do computador.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê o Python do Pygame Zero, como heroi.draw() e screen.draw.text(...). Para jogar no computador: pip install pygame-ce e pip install --no-deps pgzero.',
  }),
])
/** Extensions that own the game canvas: a project uses at most one of them. */
export const PYTHON_CANVAS_EXTENSION_IDS: readonly string[] = [
  TURTLE_EXTENSION.id,
  PGZERO_EXTENSION.id,
]
