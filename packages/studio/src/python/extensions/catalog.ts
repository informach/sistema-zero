import { PGZERO_EXTENSION } from '../../runtime/python/pgzero/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'

/** Metadata only. Neither the interpreter nor Blockly is loaded by this catalog. */
export const PYTHON_EXTENSIONS = Object.freeze([
  Object.freeze({
    ...TURTLE_EXTENSION,
    name: 'Turtle',
    emoji: '🐢',
    description: 'Desenhe com a tartaruga e crie animações e jogos usando Python.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê os comandos Python, como turtle.forward(100). Um desenho vetorial do Pinta vira forma da tartaruga com "usar o desenho do Pinta como forma": ela gira junto e cresce sem borrar.',
  }),
  Object.freeze({
    ...PGZERO_EXTENSION,
    name: 'Pygame Zero',
    emoji: '🎮',
    description:
      'Faça jogos com atores, imagens, sons, teclado e mouse. É o mesmo Pygame Zero do computador.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê o Python do Pygame Zero, como heroi.draw() e screen.draw.text(...). Para jogar no computador: pip install pygame-ce e pip install --no-deps pgzero.',
  }),
  Object.freeze({
    ...RAYLIB_2D_EXTENSION,
    name: 'Raylib 2D',
    emoji: '🟦',
    description:
      'Faça jogos 2D com o raylib: janela, formas, imagens, texto, câmera, sons, teclado e mouse. É o mesmo raylib do computador.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê o Python do raylib, como draw_texture(nave, x, y, WHITE). Para jogar no computador: pip install raylib.',
  }),
  Object.freeze({
    ...RAYLIB_3D_EXTENSION,
    name: 'Raylib 3D',
    emoji: '🧊',
    description:
      'Faça jogos 3D com o raylib: câmera 3D, cubos, esferas, modelos, animações e colisões, mais o placar, os sons e o teclado. É o mesmo raylib do computador.',
    help: 'Os blocos têm nomes em português. Na Ponte, você vê o Python do raylib, como draw_model(nave, posicao, 1, WHITE). Para jogar no computador: pip install raylib.',
  }),
])
/** Extensions that own the game canvas: a project uses at most one of them. */
export const PYTHON_CANVAS_EXTENSION_IDS: readonly string[] = [
  TURTLE_EXTENSION.id,
  PGZERO_EXTENSION.id,
  RAYLIB_2D_EXTENSION.id,
  RAYLIB_3D_EXTENSION.id,
]
