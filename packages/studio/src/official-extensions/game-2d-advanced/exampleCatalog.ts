import {
  arenaGoblinsExample,
  aventuraProfissionalExample,
  batalhaEmEquipeExample,
  batalhaProfissionalExample,
  bichinhosDoQuintalExample,
  cacaMoedasExample,
  chuvaProfissionalExample,
  cobrinhaExample,
  corridaTabuleiroExample,
  defesaDoReinoExample,
  dinoProfissionalExample,
  dueloDeCartasExample,
  dueloDeHeroisProfissionalExample,
  dueloDosBonecosExample,
  escaladaProfissionalExample,
  fazendaFelizProfissionalExample,
  florestaNinjaExample,
  heroiQueEvoluiProfissionalExample,
  invasaoDosOvnisExample,
  jogoDaMemoriaExample,
  meuPrimeiroJogoExample,
  mundoPirataProfissionalExample,
  muralhaProfissionalExample,
  oChefaoExample,
  oChefaoFichaExample,
  pongProfissionalExample,
  portasDoCasteloProfissionalExample,
  quebraBlocosExample,
  reinoAbertoExample,
  reinoZeroProExample,
  safariDeMonstrosProfissionalExample,
  saltoNaFlorestaExample,
  snowDescentAdvancedExample,
  sobreviventeProfissionalExample,
  treinadorDeCriaturasExample,
  valeEnsolaradoExample,
  vilaDoDragaoExample,
  vilaNinjaExample,
} from './examples'
import { advancedRecipeExamples } from './examples/recipes/generated'

interface Metadata {
  difficulty: import('#extensions').ExtensionExampleDifficulty
  concepts: string[]
  genre: string
  recommendedOrder?: number
  featured?: boolean
}

function withMetadata(example: import('#extensions').ExtensionExample, metadata: Metadata) {
  return Object.assign(example, metadata)
}

/** Percurso editorial: conhecer → fechar um jogo → ampliar → explorar os kits e receitas. */
export const GAME_KIT_EXAMPLE_SECTIONS = {
  demos: [
    withMetadata(meuPrimeiroJogoExample, {
      difficulty: 'beginner',
      concepts: ['personagem', 'entrada', 'quadros', 'desenho'],
      genre: 'demonstração',
      recommendedOrder: 1,
      featured: true,
    }),
  ],
  simples: [
    withMetadata(cacaMoedasExample, {
      difficulty: 'intermediate',
      concepts: ['coleta', 'placar', 'estados', 'vitória', 'recomeçar'],
      genre: 'coleta',
      recommendedOrder: 2,
      featured: true,
    }),
    withMetadata(cobrinhaExample, {
      difficulty: 'intermediate',
      concepts: ['grade', 'listas', 'tempo', 'colisão'],
      genre: 'arcade',
      recommendedOrder: 3,
    }),
    withMetadata(quebraBlocosExample, {
      difficulty: 'intermediate',
      concepts: ['rebatida', 'grupos', 'placar'],
      genre: 'arcade',
      recommendedOrder: 4,
    }),
    withMetadata(pongProfissionalExample, {
      difficulty: 'intermediate',
      concepts: ['rebatida', 'placar', 'dois jogadores'],
      genre: 'arcade',
    }),
    withMetadata(jogoDaMemoriaExample, {
      difficulty: 'intermediate',
      concepts: ['cartas', 'listas', 'clique', 'pares'],
      genre: 'memória',
    }),
    withMetadata(corridaTabuleiroExample, {
      difficulty: 'intermediate',
      concepts: ['turnos', 'dado', 'caminho'],
      genre: 'tabuleiro',
    }),
  ],
  maiores: [
    arenaGoblinsExample,
    florestaNinjaExample,
    aventuraProfissionalExample,
    vilaNinjaExample,
    snowDescentAdvancedExample,
    sobreviventeProfissionalExample,
    fazendaFelizProfissionalExample,
    heroiQueEvoluiProfissionalExample,
    reinoZeroProExample,
  ].map((example) =>
    withMetadata(example, {
      difficulty: 'advanced',
      concepts: example.concepts ? [...example.concepts] : ['estados', 'moldes', 'regras de jogo'],
      genre: example.genre ?? 'aventura',
    }),
  ),
  kits: [
    vilaDoDragaoExample,
    batalhaProfissionalExample,
    saltoNaFlorestaExample,
    escaladaProfissionalExample,
    valeEnsolaradoExample,
    dinoProfissionalExample,
    chuvaProfissionalExample,
    mundoPirataProfissionalExample,
    safariDeMonstrosProfissionalExample,
    muralhaProfissionalExample,
    bichinhosDoQuintalExample,
    treinadorDeCriaturasExample,
    invasaoDosOvnisExample,
    dueloDosBonecosExample,
    dueloDeHeroisProfissionalExample,
    portasDoCasteloProfissionalExample,
    defesaDoReinoExample,
    reinoAbertoExample,
    batalhaEmEquipeExample,
    oChefaoExample,
    oChefaoFichaExample,
    dueloDeCartasExample,
  ].map((example) =>
    withMetadata(example, {
      difficulty: 'advanced',
      concepts: ['kit de gênero', 'estados', 'regras de jogo'],
      genre: 'kit',
    }),
  ),
  receitas: advancedRecipeExamples,
} as const

export const gameKitExamples = [
  ...GAME_KIT_EXAMPLE_SECTIONS.demos,
  ...GAME_KIT_EXAMPLE_SECTIONS.simples,
  ...GAME_KIT_EXAMPLE_SECTIONS.maiores,
  ...GAME_KIT_EXAMPLE_SECTIONS.kits,
  ...GAME_KIT_EXAMPLE_SECTIONS.receitas,
] as const
