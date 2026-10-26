import { categoryShades } from '../../blockly/colorShades'
import { PROGRAMMING_CATEGORY_COLORS } from '../../blockly/programmingAppearance'
import { PYTHON_CATEGORIES, type PythonBlockOwner } from './contract'

interface PaletteGroup {
  /** Top-level toolbox category, with its icon (same convention as the JavaScript palette). */
  label: string
  /** Base colour; subcategories are shades of it, like the JavaScript categories. */
  colour: string
  /** Subcategories in teaching order, each with its icon. */
  categories: readonly (readonly [category: string, icon: string])[]
}

/** Framework-free palette layout shared by the toolbox, Blockly colours and search. */
export const PYTHON_PALETTE_GROUPS: Readonly<Record<PythonBlockOwner, PaletteGroup>> = {
  // Extensions come first: in a Turtle, Pygame Zero, Pygame-ce or Raylib project they lead.
  'python-raylib-2d': {
    label: '🟦 Raylib 2D',
    colour: '#2563eb',
    categories: [
      ['Janela e laço', '🪟'],
      ['Formas', '🎨'],
      ['Imagens e texturas', '🖼️'],
      ['Texto', '🔤'],
      ['Teclado e mouse', '⌨️'],
      ['Colisões', '💥'],
      ['Vetores e retângulos', '📐'],
      ['Câmera 2D', '🎥'],
      ['Sons e música', '🔊'],
      ['Cores e sorteio', '🎲'],
      ['Avançado', '🧪'],
    ],
  },
  'python-raylib-3d': {
    label: '🧊 Raylib 3D',
    colour: '#0891b2',
    categories: [
      ['Janela e laço', '🪟'],
      ['Câmera 3D', '🎥'],
      ['Formas 3D', '📦'],
      ['Modelos', '🗿'],
      ['Animações', '🏃'],
      ['Colisões 3D', '💥'],
      ['Vetores 3D', '🧭'],
      ['Mouse travado', '🖱️'],
      ['Formas', '🎨'],
      ['Imagens e texturas', '🖼️'],
      ['Texto', '🔤'],
      ['Teclado e mouse', '⌨️'],
      ['Vetores e retângulos', '📐'],
      ['Sons e música', '🔊'],
      ['Cores e sorteio', '🎲'],
      ['Avançado', '🧪'],
      ['Shaders', '✨'],
    ],
  },
  'python-pygame': {
    label: '🕹️ Pygame-ce',
    colour: '#7c3aed',
    // In the order a game is built: window, input, art, drawing, collisions, text and sound.
    categories: [
      ['Janela e laço', '🖥️'],
      ['Eventos e tempo', '⏱️'],
      ['Teclado e mouse', '⌨️'],
      ['Sprites, animações e mapas', '🗺️'],
      ['Superfícies e imagens', '🖼️'],
      ['Transformar', '🔄'],
      ['Desenho', '🎨'],
      ['Retângulos', '📐'],
      ['Vetores', '➡️'],
      ['Grupos e colisões', '🧩'],
      ['Máscaras', '🎭'],
      ['Texto', '🔤'],
      ['Som e música', '🔊'],
    ],
  },
  // Extensions come first: in a Turtle or Pygame Zero project they are the main subject.
  'python-pgzero': {
    label: '🎮 Pygame Zero',
    colour: '#ec4899',
    categories: [
      ['Quando acontecer', '⚡'],
      ['Atores', '🧍'],
      ['Desenhar', '🎨'],
      ['Teclado e mouse', '⌨️'],
      ['Colisões', '💥'],
      ['Janela', '🖥️'],
      ['Relógio', '⏰'],
      ['Animação', '🎞️'],
      ['Sons e música', '🔊'],
      ['Imagens', '🖼️'],
      ['Guardar', '💾'],
    ],
  },
  'python-turtle': {
    label: '🐢 Turtle',
    colour: '#15803d',
    categories: [
      ['Movimento', '🧭'],
      ['Caneta e cores', '🖊️'],
      ['Aparência', '🎭'],
      ['Tartarugas', '🐢'],
      ['Tela', '🖥️'],
      ['Eventos', '⚡'],
      ['Animação e tempo', '⏱️'],
    ],
  },
  programming: {
    label: '🐍 Programação',
    colour: PROGRAMMING_CATEGORY_COLORS.js,
    categories: PYTHON_CATEGORIES.map(
      (category) =>
        [
          category,
          {
            Variáveis: '🏷️',
            'Entrada e saída': '💬',
            'Lógica e decisões': '❓',
            Repetições: '🔁',
            'Números e matemática': '🔢',
            Textos: '🔤',
            'Listas e coleções': '📋',
            Funções: '🧩',
            Som: '🔊',
            Módulos: '📦',
            'Classes e objetos': '🏛️',
            'Tratamento de erros': '🚑',
          }[category],
        ] as const,
    ),
  },
}
export const PYTHON_PALETTE_GROUP_ORDER: readonly PythonBlockOwner[] = [
  'python-raylib-2d',
  'python-raylib-3d',
  'python-pygame',
  'python-pgzero',
  'python-turtle',
  'programming',
]

const shades = new Map<PythonBlockOwner, ReadonlyMap<string, string>>()
/** Colour of one subcategory: a shade of its group's base colour. */
export function pythonCategoryColour(owner: PythonBlockOwner, category: string): string {
  let map = shades.get(owner)
  if (!map) {
    const group = PYTHON_PALETTE_GROUPS[owner]
    const tones = categoryShades(group.colour, group.categories.length)
    map = new Map(group.categories.map(([name], index) => [name, tones[index]!]))
    shades.set(owner, map)
  }
  return map.get(category) ?? PYTHON_PALETTE_GROUPS[owner].colour
}
/** Display name of a subcategory, with its icon. */
export function pythonCategoryLabel(owner: PythonBlockOwner, category: string): string {
  const icon = PYTHON_PALETTE_GROUPS[owner].categories.find(([name]) => name === category)?.[1]
  return icon ? `${icon} ${category}` : category
}
/** Sort key: group order, then the group's teaching order of categories. */
export function pythonCategoryRank(owner: PythonBlockOwner, category: string): number {
  const group = PYTHON_PALETTE_GROUP_ORDER.indexOf(owner)
  const index = PYTHON_PALETTE_GROUPS[owner].categories.findIndex(([name]) => name === category)
  return group * 1000 + (index < 0 ? 999 : index)
}
