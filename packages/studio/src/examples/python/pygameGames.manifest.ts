/**
 * The Pygame-ce gallery: complete ports of nine pygame-ce games (five final lessons of a course
 * and four independent projects), with original art drawn in Pinta and original sound. Each game
 * lives in src/examples/python/pygame/<key>/ and opens in Blocks and in Code.
 */
export interface PygameGame {
  key: string
  name: string
  emoji: string
  description: string
  genre: string
  concepts: readonly string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export const PYGAME_GAMES = [
  {
    key: 'pong',
    name: 'Pong',
    emoji: '🏓',
    description: 'Raquete contra o computador até sete pontos, com placar guardado em arquivo.',
    genre: 'Arcade',
    concepts: ['Classes', 'Sprites', 'Colisão', 'Arquivos'],
    difficulty: 'beginner',
  },
  {
    key: 'space-shooter',
    name: 'Space Shooter',
    emoji: '🚀',
    description: 'Desvie dos meteoros e destrua-os com o laser; quanto mais tempo, mais pontos.',
    genre: 'Tiro espacial',
    concepts: ['Sprites', 'Máscaras', 'Eventos', 'Animação'],
    difficulty: 'beginner',
  },
  {
    key: 'platformer',
    name: 'Platformer',
    emoji: '🐝',
    description:
      'Corra, pule e atire nas abelhas e minhocas até chegar à bandeira no alto do mapa.',
    genre: 'Plataforma',
    concepts: ['Classes', 'Mapas', 'Gravidade', 'Câmera'],
    difficulty: 'intermediate',
  },
  {
    key: 'monster-battle',
    name: 'Monster Battle',
    emoji: '🐲',
    description:
      'Batalha por turnos entre monstros de fogo, água e planta: derrote quantos adversários conseguir.',
    genre: 'RPG de batalha',
    concepts: ['Classes', 'Dicionários', 'Turnos', 'Interface'],
    difficulty: 'intermediate',
  },
  {
    key: 'pirate-maker',
    name: 'Pirate Maker',
    emoji: '🏴‍☠️',
    description:
      'Monte a sua fase de piratas com o mouse e jogue o que construiu: moedas, conchas que cospem pérolas e palmeiras para pular.',
    genre: 'Editor de fases e plataforma',
    concepts: ['Classes', 'Dicionários', 'Mouse e câmera', 'Auto-tile'],
    difficulty: 'advanced',
  },
  {
    key: 'vampire-survivor',
    name: 'Vampire Survivor',
    emoji: '🧛',
    description:
      'Mire com o mouse e sobreviva às ondas de morcegos, gosmas e esqueletos num campo cercado por muros de pedra.',
    genre: 'Sobrevivência vista de cima',
    concepts: ['Classes', 'Mapas', 'Câmera', 'Máscaras'],
    difficulty: 'intermediate',
  },
  {
    key: 'pydew-valley',
    name: 'PyDew Valley',
    emoji: '🌽',
    description:
      'Prepare a terra, plante, regue, durma para a plantação crescer e venda a colheita ao comerciante.',
    genre: 'Simulação de fazenda',
    concepts: ['Classes', 'Mapas', 'Câmera', 'Temporizadores'],
    difficulty: 'advanced',
  },
  {
    key: 'python-monsters',
    name: 'Python Monsters',
    emoji: '🐉',
    description:
      'Explore o mundo, enfrente treinadores e capture monstros em batalhas por iniciativa até vê-los evoluir.',
    genre: 'RPG',
    concepts: ['Classes', 'Dicionários', 'Mapas com camadas', 'Temporizadores'],
    difficulty: 'advanced',
  },
  {
    key: 'super-pirate-world',
    name: 'Super Pirate World',
    emoji: '🦜',
    description:
      'Plataforma pirata com mapa do mundo, pulo na parede, inimigos e seis fases para liberar em sequência.',
    genre: 'Plataforma',
    concepts: ['Classes', 'Mapas do Pinta', 'Colisão', 'Câmera'],
    difficulty: 'advanced',
  },
] as const satisfies readonly PygameGame[]
