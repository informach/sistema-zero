// Gerado por scripts/generate-pygame-games.ts. Não edite este arquivo.
/** What every game chunk exports (the files, and the media as data URLs). */
export interface PygameGameChunk {
  files: Readonly<Record<string, string>>
  media: Readonly<Record<string, string>>
}

/** One chunk per game: opening a game never downloads the others. */
export const PYGAME_GAME_LOADERS: Readonly<Record<string, () => Promise<PygameGameChunk>>> = {
  'pong': () => import('./pygameGames/pong.generated'),
  'space-shooter': () => import('./pygameGames/spaceShooter.generated'),
  'platformer': () => import('./pygameGames/platformer.generated'),
  'monster-battle': () => import('./pygameGames/monsterBattle.generated'),
  'pirate-maker': () => import('./pygameGames/pirateMaker.generated'),
  'vampire-survivor': () => import('./pygameGames/vampireSurvivor.generated'),
  'pydew-valley': () => import('./pygameGames/pydewValley.generated'),
  'python-monsters': () => import('./pygameGames/pythonMonsters.generated'),
  'super-pirate-world': () => import('./pygameGames/superPirateWorld.generated'),
}

/** The Pinta documents of each game's drawings, in their own chunk: only "Editar no Pinta" needs them. */
export const PYGAME_GAME_DRAWINGS: Readonly<Record<string, () => Promise<string>>> = {
  'space-shooter': () => import('./pygameGames/spaceShooter.drawings.generated').then((chunk) => chunk.drawings),
  'platformer': () => import('./pygameGames/platformer.drawings.generated').then((chunk) => chunk.drawings),
  'monster-battle': () => import('./pygameGames/monsterBattle.drawings.generated').then((chunk) => chunk.drawings),
  'pirate-maker': () => import('./pygameGames/pirateMaker.drawings.generated').then((chunk) => chunk.drawings),
  'vampire-survivor': () => import('./pygameGames/vampireSurvivor.drawings.generated').then((chunk) => chunk.drawings),
  'pydew-valley': () => import('./pygameGames/pydewValley.drawings.generated').then((chunk) => chunk.drawings),
  'python-monsters': () => import('./pygameGames/pythonMonsters.drawings.generated').then((chunk) => chunk.drawings),
  'super-pirate-world': () => import('./pygameGames/superPirateWorld.drawings.generated').then((chunk) => chunk.drawings),
}
