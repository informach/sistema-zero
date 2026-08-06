import type { ExtensionExample, ExtensionExampleDifficulty } from '#extensions'
import {
  animatedHeroExample,
  asteroidsClassicExample,
  asteroidsExample,
  aventuraHeroiExample,
  backdropExample,
  balloonExample,
  batalhaMonstrinhosExample,
  cameraAdventureExample,
  catchCoinExample,
  chuvaDeMeteorosExample,
  codeDrawnExample,
  dinoCorredorExample,
  dinoRunExample,
  dueloDeHeroisExample,
  enemyPlatformerExample,
  escaladaDoGuerreiroExample,
  fazendaFelizExample,
  gorilasExample,
  gorilasVsRobotExample,
  heroiQueEvoluiExample,
  mundoPirataExample,
  muralhaDoReinoExample,
  platformerExample,
  pongExample,
  portasDoCasteloExample,
  safariDeMonstrosExample,
  sobreviventeExample,
  stickHeroExample,
  tilemapExample,
  treinadorDeCriaturasExample,
  valeEnsolaradoExample,
  vilaNinjaExample,
} from './examples'

interface GameTwoDExampleMetadata {
  difficulty: ExtensionExampleDifficulty
  concepts: readonly string[]
  genre: string
  recommendedOrder?: number
  featured?: boolean
}

function withMetadata(
  example: ExtensionExample,
  metadata: GameTwoDExampleMetadata,
): ExtensionExample {
  // Preserva a identidade dos exports históricos: testes e consumidores podem
  // referenciar o mesmo objeto importado de `examples`, enquanto o catálogo
  // acrescenta somente metadados editoriais compatíveis.
  return Object.assign(example, metadata)
}

export const gameTwoDExamples = [
  withMetadata(catchCoinExample, {
    difficulty: 'beginner',
    concepts: ['sprites', 'colisão', 'pontuação'],
    genre: 'coleta',
    recommendedOrder: 1,
    featured: true,
  }),
  // Sem `featured`/`recommendedOrder` de propósito: o percurso inicial de quatro
  // passos da vitrine (Pegue a moeda → Herói que anda → Mini plataforma → Sala
  // com paredes) é curadoria aprovada, e a razão de existir deste exemplo é o
  // índice do Zappy, não a esteira de onboarding.
  withMetadata(backdropExample, {
    difficulty: 'beginner',
    concepts: ['cenário', 'imagem de fundo', 'desenho do Pinta'],
    genre: 'aventura',
  }),
  withMetadata(pongExample, {
    difficulty: 'intermediate',
    concepts: ['rebote', 'colisão', 'placar'],
    genre: 'arcade',
  }),
  withMetadata(animatedHeroExample, {
    difficulty: 'beginner',
    concepts: ['movimento', 'animação', 'teclado'],
    genre: 'aventura',
    recommendedOrder: 2,
    featured: true,
  }),
  withMetadata(platformerExample, {
    difficulty: 'beginner',
    concepts: ['plataformas', 'gravidade', 'pulo'],
    genre: 'plataforma',
    recommendedOrder: 3,
    featured: true,
  }),
  withMetadata(enemyPlatformerExample, {
    difficulty: 'intermediate',
    concepts: ['plataformas', 'inimigos', 'vidas'],
    genre: 'plataforma',
  }),
  withMetadata(codeDrawnExample, {
    difficulty: 'intermediate',
    concepts: ['formas', 'canvas', 'desenho'],
    genre: 'demonstração',
  }),
  withMetadata(tilemapExample, {
    difficulty: 'beginner',
    concepts: ['tilemap', 'paredes', 'colisão'],
    genre: 'labirinto',
    recommendedOrder: 4,
    featured: true,
  }),
  withMetadata(asteroidsExample, {
    difficulty: 'intermediate',
    concepts: ['grupos', 'tiros', 'colisão'],
    genre: 'nave',
  }),
  withMetadata(asteroidsClassicExample, {
    difficulty: 'advanced',
    concepts: ['rotação', 'inércia', 'projéteis'],
    genre: 'nave',
  }),
  withMetadata(dinoRunExample, {
    difficulty: 'beginner',
    concepts: ['corrida', 'pulo', 'obstáculos'],
    genre: 'corrida infinita',
  }),
  withMetadata(dinoCorredorExample, {
    difficulty: 'advanced',
    concepts: ['corrida', 'fases', 'dificuldade'],
    genre: 'corrida infinita',
  }),
  withMetadata(batalhaMonstrinhosExample, {
    difficulty: 'intermediate',
    concepts: ['turnos', 'atributos', 'batalha'],
    genre: 'RPG',
  }),
  withMetadata(aventuraHeroiExample, {
    difficulty: 'advanced',
    concepts: ['tilemap', 'itens', 'missões'],
    genre: 'RPG',
  }),
  withMetadata(chuvaDeMeteorosExample, {
    difficulty: 'intermediate',
    concepts: ['desvio', 'grupos', 'temporizadores'],
    genre: 'sobrevivência',
  }),
  withMetadata(mundoPirataExample, {
    difficulty: 'advanced',
    concepts: ['mapa', 'NPCs', 'missões'],
    genre: 'mundo aberto',
  }),
  withMetadata(safariDeMonstrosExample, {
    difficulty: 'advanced',
    concepts: ['criaturas', 'captura', 'inventário'],
    genre: 'aventura',
  }),
  withMetadata(muralhaDoReinoExample, {
    difficulty: 'advanced',
    concepts: ['torres', 'ondas', 'estratégia'],
    genre: 'defesa de torre',
  }),
  withMetadata(escaladaDoGuerreiroExample, {
    difficulty: 'advanced',
    concepts: ['plataformas', 'câmera', 'progressão'],
    genre: 'plataforma',
  }),
  withMetadata(dueloDeHeroisExample, {
    difficulty: 'intermediate',
    concepts: ['combate', 'dois jogadores', 'vidas'],
    genre: 'luta',
  }),
  withMetadata(portasDoCasteloExample, {
    difficulty: 'advanced',
    concepts: ['portas', 'chaves', 'estados'],
    genre: 'quebra-cabeça',
  }),
  withMetadata(valeEnsolaradoExample, {
    difficulty: 'advanced',
    concepts: ['mapa', 'coleta', 'economia'],
    genre: 'simulação',
  }),
  withMetadata(vilaNinjaExample, {
    difficulty: 'advanced',
    concepts: ['combate', 'missões', 'animação'],
    genre: 'ação',
  }),
  withMetadata(treinadorDeCriaturasExample, {
    difficulty: 'advanced',
    concepts: ['criaturas', 'tipos', 'batalha'],
    genre: 'RPG',
  }),
  withMetadata(sobreviventeExample, {
    difficulty: 'advanced',
    concepts: ['ondas', 'experiência', 'melhorias'],
    genre: 'sobrevivência',
  }),
  withMetadata(fazendaFelizExample, {
    difficulty: 'advanced',
    concepts: ['plantio', 'tempo', 'inventário'],
    genre: 'simulação',
  }),
  withMetadata(heroiQueEvoluiExample, {
    difficulty: 'advanced',
    concepts: ['níveis', 'atributos', 'progressão'],
    genre: 'RPG',
  }),
  withMetadata(gorilasExample, {
    difficulty: 'intermediate',
    concepts: ['ângulo', 'força', 'gravidade'],
    genre: 'artilharia',
  }),
  withMetadata(gorilasVsRobotExample, {
    difficulty: 'advanced',
    concepts: ['inteligência artificial', 'trajetória', 'turnos'],
    genre: 'artilharia',
  }),
  withMetadata(stickHeroExample, {
    difficulty: 'beginner',
    concepts: ['precisão', 'ponte', 'toque'],
    genre: 'arcade',
  }),
  withMetadata(balloonExample, {
    difficulty: 'beginner',
    concepts: ['voo', 'gravidade', 'toque'],
    genre: 'arcade',
  }),
  withMetadata(cameraAdventureExample, {
    difficulty: 'intermediate',
    concepts: ['câmera', 'mundo', 'movimento'],
    genre: 'exploração',
  }),
] as const satisfies readonly ExtensionExample[]
