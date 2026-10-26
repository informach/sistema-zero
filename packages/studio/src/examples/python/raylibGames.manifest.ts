import type { ExampleExperience } from '../../core/example'
import type { ExtensionExampleDifficulty } from '../../extensions/types'
import type { PgzeroMusic } from './pgzeroGames.manifest'
import type { VisualReferenceSound } from './visualReferenceGames.manifest'

export interface RaylibGame {
  /** Folder in src/examples/python/raylib and the `python:<key>:blocks|code` gallery identity. */
  key: string
  /** camelCase prefix of the generated files. */
  stem: string
  name: string
  emoji: string
  description: string
  genre: string
  concepts: readonly string[]
  difficulty: ExtensionExampleDifficulty
  experience: ExampleExperience
  /** Which extension the game installs: Raylib 2D or Raylib 3D. */
  extension: '2d' | '3d'
  /** The lesson or game of the Clear Code course that inspired the mechanics (NOTICE.md). */
  inspiration: string
  howToPlay: string
  /** Small changes a child can try, in the README. */
  ideas: readonly string[]
  /** Sound effects, written to sounds/<path>. */
  sounds: readonly VisualReferenceSound[]
  /** Background music, written to music/<path> as OGG. */
  music: readonly PgzeroMusic[]
  /** Qualification receipt in docs/continuity/2026-10-24-python-raylib-games-evidence. */
  receipt: string
}

/**
 * The Raylib examples of the gallery: the Clear Code raylib course condensed into lessons, then
 * its games. Each one is an original implementation with original art (scripts/python/
 * raylib-art.ts) and sounds; nothing from the course is copied. Every game runs unchanged on
 * the desktop `raylib==6.0.1.0` (scripts/python/raylib-playtest).
 */
export const RAYLIB_GAMES = [
  {
    key: 'ola-raylib',
    stem: 'olaRaylib',
    name: 'Olá, Raylib',
    emoji: '👋',
    description:
      'O primeiro programa: formas, a mesma nave em três versões e texto com duas fontes.',
    genre: 'Primeiros passos',
    concepts: ['Blocos', 'Ponte', 'Código', 'Formas', 'Imagens', 'Texto', 'Mouse'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 1 (base)',
    howToPlay: 'Clique no círculo grande para trocar a cor dele.',
    ideas: [
      'Troque o texto de boas-vindas.',
      'Mude a cor do fundo em `clear_background`.',
      'Troque `images/nave.png` por um desenho seu do Pinta.',
    ],
    sounds: [],
    music: [],
    receipt: 'ola-raylib-r2.json.snapshot',
  },
  {
    key: 'nave-que-desliza',
    stem: 'naveQueDesliza',
    name: 'Nave que Desliza',
    emoji: '🚀',
    description:
      'Pilote a nave com as setas, pegue as estrelas e fuja da pedra que quica sozinha pela tela.',
    genre: 'Coleta',
    concepts: ['Blocos', 'Ponte', 'Código', 'Teclado', 'Tempo do quadro', 'Vetores', 'Colisão'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 2 e 3 (movimento e teclado)',
    howToPlay:
      'Use as setas para pilotar a nave e pegar as estrelas. Se a pedra encostar, a nave volta ao começo.',
    ideas: [
      'Deixe a pedra mais rápida mudando VELOCIDADE_PEDRA.',
      'Tire a linha do `vector2_normalize` e veja a diagonal ficar mais rápida.',
      'Coloque uma segunda pedra.',
    ],
    sounds: [],
    music: [],
    receipt: 'nave-que-desliza-r2.json.snapshot',
  },
  {
    key: 'encostou',
    stem: 'encostou',
    name: 'Encostou!',
    emoji: '🧱',
    description:
      'Um labirinto de paredes que seguram a caixa: pegue todas as moedas para a saída abrir.',
    genre: 'Labirinto',
    concepts: ['Blocos', 'Ponte', 'Código', 'Colisão', 'Listas', 'Mapa em texto', 'Funções'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 4 e 8 (colisões e resolução de colisão)',
    howToPlay:
      'Use as setas para andar pelo labirinto. Pegue todas as moedas; só então a saída fica verde e abre. Enter recomeça.',
    ideas: [
      'Desenhe um labirinto novo trocando as linhas de MAPA.',
      'Coloque mais moedas com a letra M.',
      'Deixe a caixa mais rápida em VELOCIDADE.',
    ],
    sounds: [],
    music: [],
    receipt: 'encostou-r2.json.snapshot',
  },
  {
    key: 'camera-que-segue',
    stem: 'cameraQueSegue',
    name: 'Câmera que Segue',
    emoji: '🎥',
    description:
      'Um mundo maior que a tela: a câmera segue a bola enquanto você caça gemas entre os planetas.',
    genre: 'Exploração',
    concepts: ['Blocos', 'Ponte', 'Código', 'Câmera 2D', 'Zoom', 'Sorteio', 'Listas'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 5 (câmera)',
    howToPlay:
      'As setas movem a bola. Q e W mudam o zoom, A e S giram a câmera e R deixa a câmera reta. Pegue as 12 gemas; Enter espalha de novo.',
    ideas: [
      'Aumente MUNDO para o mundo ficar maior.',
      'Troque o fundo da tela e as cores dos planetas.',
      'Mostre o zoom na tela com `camera.zoom`.',
    ],
    sounds: [],
    music: [],
    receipt: 'camera-que-segue-r2.json.snapshot',
  },
  {
    key: 'sprites-timer-animacao',
    stem: 'spritesTimerAnimacao',
    name: 'Sprites, Timer e Animação',
    emoji: '🍎',
    description:
      'O herói anda com animação e pega as maçãs que um cronômetro solta do céu. Três maçãs no chão e acabou.',
    genre: 'Coleta',
    concepts: ['Blocos', 'Ponte', 'Código', 'Classes', 'Herança', 'Cronômetro', 'Animação', 'Som'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'basics 6, 7, 9 e 10 (som, classes, timer e animação)',
    howToPlay:
      'As setas andam para os lados. Pegue as maçãs antes que caiam no chão: cada uma que cai custa uma vida. Enter recomeça.',
    ideas: [
      'Mude o 0.9 do cronômetro para as maçãs caírem mais depressa.',
      'Troque o 8 da animação para o herói mexer as pernas mais rápido.',
      'Desenhe o seu herói no Pinta numa animação de quatro quadros, traga para o jogo e troque `images/heroi.png` pelo caminho dele.',
    ],
    sounds: [
      { path: 'pegar.wav', notes: [784, 1047], noteMilliseconds: 60 },
      { path: 'perder.wav', notes: [330, 262, 196], noteMilliseconds: 110 },
    ],
    music: [],
    receipt: 'sprites-timer-animacao-r2.json.snapshot',
  },
  {
    key: 'dino-corredor',
    stem: 'dinoCorredor',
    name: 'Dino Corredor',
    emoji: '🦖',
    description:
      'O dino corre sozinho pelo deserto: pule os cactos e os passarinhos. Quanto mais longe, mais rápido.',
    genre: 'Corrida sem fim',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Gravidade',
      'Classes',
      'Animação',
      'Música',
      'Recorde',
    ],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '2d',
    inspiration: 'Dino runner',
    howToPlay:
      'Espaço ou a seta para cima pulam. Desvie dos cactos e dos passarinhos; ao bater, Enter corre de novo e o recorde fica guardado.',
    ideas: [
      'Mude PULO e GRAVIDADE e veja o pulo ficar mais alto ou mais baixo.',
      'Faça o jogo acelerar mais depressa trocando o 8 de `velocidade`.',
      'Desenhe o seu dino no Pinta com duas animações, primeiro correndo (dois quadros) e depois pulando (um quadro), e troque `images/dino.png`.',
    ],
    sounds: [
      { path: 'pulo.wav', notes: [523, 784], noteMilliseconds: 50 },
      { path: 'batida.wav', notes: [220, 165, 110], noteMilliseconds: 120 },
    ],
    music: [
      {
        path: 'tema.ogg',
        notes: [392, 494, 587, 494, 440, 523, 659, 523, 392, 494, 587, 784, 698, 587, 523, 494],
        noteMilliseconds: 180,
      },
    ],
    receipt: 'dino-corredor-r2.json.snapshot',
  },
  {
    key: 'chuva-de-meteoros',
    stem: 'chuvaDeMeteoros',
    name: 'Chuva de Meteoros',
    emoji: '☄️',
    description:
      'Meteoros girando caem do céu: pilote a nave, atire com o laser e veja quantos segundos você aguenta.',
    genre: 'Nave',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Classes',
      'Herança',
      'Colisão de círculos',
      'Animação',
      'Música',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '2d',
    inspiration: 'game 2D (space shooter)',
    howToPlay:
      'As setas pilotam a nave e o espaço atira. Um meteoro que encostar na nave acaba o voo; Enter voa de novo e o recorde fica guardado.',
    ideas: [
      'Mude TEMPO_ENTRE_METEOROS para chover mais ou menos meteoros.',
      'Faça o laser mais rápido em VELOCIDADE_LASER.',
      'Desenhe a sua nave no Pinta e troque `images/nave.png`.',
      'Desenhe uma explosão no Pinta numa animação de cinco quadros e troque `images/explosao.png`.',
    ],
    sounds: [
      { path: 'laser.wav', notes: [1568, 1175, 880], noteMilliseconds: 30 },
      { path: 'explosao.wav', notes: [196, 147, 110, 82], noteMilliseconds: 70 },
    ],
    music: [
      {
        path: 'tema.ogg',
        notes: [220, 262, 330, 262, 247, 294, 370, 294, 220, 262, 330, 440, 392, 330, 294, 247],
        noteMilliseconds: 200,
      },
    ],
    receipt: 'chuva-de-meteoros-r2.json.snapshot',
  },
  {
    key: 'batalha-de-monstrinhos',
    stem: 'batalhaDeMonstrinhos',
    name: 'Batalha de Monstrinhos',
    emoji: '⚔️',
    description:
      'Uma batalha por turnos: escolha golpes, troque de monstrinho e use a vantagem dos elementos.',
    genre: 'Batalha por turnos',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Dicionários',
      'Funções',
      'Cronômetro',
      'Menus',
      'Música',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '2d',
    inspiration: 'Pokemon-style Battle',
    howToPlay:
      'As setas para cima e para baixo escolhem, Enter confirma e ESC volta. Atacar mostra os golpes, Trocar chama outro da equipe, Defender diminui o próximo golpe e Fugir acaba a batalha. Água vence fogo, fogo vence planta, planta vence água e raio vence água.',
    ideas: [
      'Mude o dano dos golpes em GOLPES.',
      "Crie um monstrinho novo em MONSTROS, desenhe ele no Pinta e ponha o nome do arquivo em 'imagem'.",
      'Acrescente uma vantagem nova em VANTAGENS.',
    ],
    sounds: [
      { path: 'choque.wav', notes: [1319, 988, 1319, 988], noteMilliseconds: 40 },
      { path: 'jato.wav', notes: [523, 659, 784], noteMilliseconds: 50 },
      { path: 'chama.wav', notes: [196, 262, 330], noteMilliseconds: 60 },
      { path: 'folha.wav', notes: [880, 784, 698], noteMilliseconds: 50 },
      { path: 'arranhao.wav', notes: [1568, 1047], noteMilliseconds: 30 },
      { path: 'cura.wav', notes: [523, 659, 784, 1047], noteMilliseconds: 70 },
    ],
    music: [
      {
        path: 'batalha.ogg',
        notes: [330, 392, 440, 392, 330, 294, 330, 247, 330, 392, 494, 440, 392, 330, 294, 330],
        noteMilliseconds: 170,
      },
    ],
    receipt: 'batalha-de-monstrinhos-r2.json.snapshot',
  },
  {
    key: 'aventura-do-heroi',
    stem: 'aventuraDoHeroi',
    name: 'Aventura do Herói',
    emoji: '🗡️',
    description:
      'Explore a ilha com a espada: corte o mato, derrote as gosmas e não deixe os corações acabarem.',
    genre: 'Aventura',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Câmera 2D',
      'Mapa em texto',
      'Classes',
      'Ordem de desenho',
      'Música',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '2d',
    inspiration: 'Zelda-style Adventure',
    howToPlay:
      'As setas andam e o espaço balança a espada para onde o herói está olhando. As gosmas perseguem quem chega perto; cada encostão tira um coração. Derrote todas para limpar a ilha; Enter recomeça.',
    ideas: [
      'Desenhe uma ilha nova trocando as letras de MAPA.',
      'Dê mais corações ao herói em VIDAS.',
      'Faça as gosmas mais rápidas mudando o 70 em `Gosma.atualizar`.',
      'Desenhe o seu herói no Pinta com três animações de um quadro (baixo, lado e cima) e troque `images/heroi.png`.',
    ],
    sounds: [
      { path: 'espada.wav', notes: [1175, 880], noteMilliseconds: 40 },
      { path: 'acerto.wav', notes: [392, 262], noteMilliseconds: 60 },
      { path: 'dano.wav', notes: [294, 220, 175], noteMilliseconds: 90 },
    ],
    music: [
      {
        path: 'aventura.ogg',
        notes: [262, 330, 392, 523, 494, 392, 330, 294, 262, 330, 392, 440, 392, 330, 294, 262],
        noteMilliseconds: 220,
      },
    ],
    receipt: 'aventura-do-heroi-r2.json.snapshot',
  },
  // 🧊 Raylib 3D
  {
    key: 'primeira-cena-3d',
    stem: 'primeiraCena3d',
    name: 'Primeira Cena 3D',
    emoji: '🧊',
    description:
      'O primeiro mundo 3D: a câmera, uma grade no chão, um cilindro com degradê girando e uma bola que anda com as setas.',
    genre: 'Primeiros passos',
    concepts: ['Blocos', 'Ponte', 'Código', 'Câmera 3D', 'Formas 3D', 'Modelos', 'Teclado'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '3d',
    inspiration: 'basics_3D 1 (base)',
    howToPlay: 'A barra de espaço troca o sentido do giro do cilindro e as setas andam com a bola.',
    ideas: [
      'Mude a posição da câmera em `Camera3D` e veja a cena de outro lugar.',
      'Troque as cores do degradê em `gen_image_gradient_linear`.',
      'Desenhe mais formas: `draw_cylinder`, `draw_capsule` ou outro `draw_cube`.',
    ],
    sounds: [],
    music: [],
    receipt: 'primeira-cena-3d-r2.json.snapshot',
  },
  {
    key: 'modelos-do-molda',
    stem: 'modelosDoMolda',
    name: 'Modelos do Molda',
    emoji: '🗿',
    description:
      'Uma vitrine que gira os modelos prontos do Molda e deixa todos do mesmo tamanho pela caixa de cada um.',
    genre: 'Primeiros passos',
    concepts: ['Blocos', 'Ponte', 'Código', 'Modelos', 'Molda', 'Caixa do modelo', 'Listas'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '3d',
    inspiration: 'basics_3D 2 (imports)',
    howToPlay: 'As setas trocam o modelo que gira na mesa.',
    ideas: [
      'Faça um modelo no Molda, traga pelo "Trazer do Molda" (menu ⋯ → Materiais do jogo) e ponha o nome do arquivo na lista `arquivos`.',
      'Mude TAMANHO para os modelos ficarem maiores na mesa.',
      'Troque o eixo do giro em `draw_model_ex` para o modelo girar de outro jeito.',
    ],
    sounds: [],
    music: [],
    receipt: 'modelos-do-molda-r2.json.snapshot',
  },
  {
    key: 'caixas-que-se-encostam',
    stem: 'caixasQueSeEncostam',
    name: 'Caixas que se Encostam',
    emoji: '📦',
    description:
      'Ande com um cubo entre caixas vestidas com uma textura do Molda: a colisão resolvida eixo por eixo deixa deslizar encostado.',
    genre: 'Coleta',
    concepts: ['Blocos', 'Ponte', 'Código', 'Colisão 3D', 'Caixas', 'Texturas', 'Teclado'],
    difficulty: 'beginner',
    experience: 'game',
    extension: '3d',
    inspiration: 'basics_3D 3 (collision)',
    howToPlay:
      'As setas andam com o cubo vermelho. As caixas barram o caminho; pegue as moedas douradas.',
    ideas: [
      'Mude LUGARES para montar outro labirinto de caixas.',
      'Desenhe uma textura no Molda e troque `images/caixa.png`.',
      "Tire a linha `resolver('z', passo_z)` e veja o cubo atravessar as caixas de frente.",
    ],
    sounds: [],
    music: [],
    receipt: 'caixas-que-se-encostam-r2.json.snapshot',
  },
  {
    key: 'clarao-com-shader',
    stem: 'claraoComShader',
    name: 'Clarão com Shader',
    emoji: '✨',
    description:
      'Um shader escrito no próprio programa faz o personagem do Molda piscar de branco quando é clicado.',
    genre: 'Efeitos',
    concepts: ['Blocos', 'Ponte', 'Código', 'Shaders', 'Modelos', 'Raio do mouse', 'Molda'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '3d',
    inspiration: 'basics_3D 4 (shader)',
    howToPlay: 'Clique no personagem ou aperte a barra de espaço para ele piscar.',
    ideas: [
      'Troque `vec4(1.0, 1.0, 1.0, cor.a)` por `vec4(1.0, 0.0, 0.0, cor.a)` para o clarão ficar vermelho.',
      'Mude DURACAO_DO_CLARAO para o clarão durar mais.',
      'Traga um personagem seu do Molda e troque `models/personagem.glb`.',
    ],
    sounds: [],
    music: [],
    receipt: 'clarao-com-shader-r2.json.snapshot',
  },
  {
    key: 'corrida-infinita',
    stem: 'corridaInfinita',
    name: 'Corrida Infinita',
    emoji: '🏃',
    description:
      'Um corredor feito no Molda corre sem parar e pula robôs e cristais, com os movimentos que ele ganhou no Molda.',
    genre: 'Corrida',
    concepts: ['Blocos', 'Ponte', 'Código', 'Animações', 'Molda', 'Colisão 3D', 'Céu 360°', 'Sons'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '3d',
    inspiration: '3D runner',
    howToPlay: 'Barra de espaço ou seta para cima: pular. Depois de bater, Enter corre de novo.',
    ideas: [
      "No Molda, dê outro nome a um movimento do corredor e troque o nome em `movimento(..., 'Correr')`.",
      'Mude GRAVIDADE e PULO para o pulo ficar mais alto ou mais curto.',
      'Traga outro céu 360° do Molda e troque `images/ceu.png`.',
    ],
    sounds: [
      { path: 'pulo.wav', notes: [523, 784], noteMilliseconds: 50 },
      { path: 'batida.wav', notes: [220, 165, 110], noteMilliseconds: 120 },
    ],
    music: [],
    receipt: 'corrida-infinita-r2.json.snapshot',
  },
  {
    key: 'patrulha-espacial',
    stem: 'patrulhaEspacial',
    name: 'Patrulha Espacial',
    emoji: '🛸',
    description:
      'A nave do Molda atira nos meteoros que vêm do fundo; cada meteoro atingido pisca de branco com um shader.',
    genre: 'Nave',
    concepts: ['Blocos', 'Ponte', 'Código', 'Shaders', 'Colisão 3D', 'Texturas', 'Molda', 'Sons'],
    difficulty: 'intermediate',
    experience: 'game',
    extension: '3d',
    inspiration: 'raylib_intro game_3D',
    howToPlay:
      'Setas para os lados e barra de espaço para atirar. Depois de um choque, Enter joga de novo.',
    ideas: [
      'Mude TEMPO_ENTRE_METEOROS para chover mais ou menos meteoros.',
      'Pinte uma textura nova no Molda e troque `images/meteoro-roxo.png`.',
      'No shader, troque `vec4(1.0, 1.0, 1.0, cor.a)` por outra cor para mudar o clarão.',
    ],
    sounds: [
      { path: 'laser.wav', notes: [1568, 1175, 880], noteMilliseconds: 30 },
      { path: 'explosao.wav', notes: [196, 147, 110, 82], noteMilliseconds: 70 },
    ],
    music: [],
    receipt: 'patrulha-espacial-r2.json.snapshot',
  },
  {
    key: 'labirinto-dos-robos',
    stem: 'labirintoDosRobos',
    name: 'Labirinto dos Robôs',
    emoji: '🤖',
    description:
      'Ande por um labirinto de paredes do Molda e desligue os robôs com raios de energia, vendo tudo pelos olhos do jogador.',
    genre: 'Aventura',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Mouse travado',
      'Raio da mira',
      'Billboards',
      'Pinta',
      'Molda',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '3d',
    inspiration: 'Doom-style FPS',
    howToPlay:
      'Mexa o mouse (ou as setas para os lados) para olhar, W A S D para andar e clique ou barra de espaço para soltar o raio. Encostar num robô ligado gasta energia.',
    ideas: [
      'Mude as letras do MAPA para desenhar outro labirinto, com mais robôs (R).',
      'Redesenhe o robô no Pinta com as mesmas quatro linhas (parado, andando, atacando e desligado, até dois quadros em cada) e troque `images/robo.png`.',
      'Mude VIDA_DO_ROBO para os robôs aguentarem mais raios.',
    ],
    sounds: [
      { path: 'raio.wav', notes: [1760, 1319, 988], noteMilliseconds: 35 },
      { path: 'choque.wav', notes: [147, 156, 147], noteMilliseconds: 60 },
      { path: 'desliga.wav', notes: [784, 523, 392, 262], noteMilliseconds: 80 },
    ],
    music: [],
    receipt: 'labirinto-dos-robos-r2.json.snapshot',
  },
  {
    key: 'mundo-de-blocos',
    stem: 'mundoDeBlocos',
    name: 'Mundo de Blocos',
    emoji: '🧱',
    description:
      'Um mundo de cubos com texturas pintadas no Molda: a mira coloca um bloco encostado na face que você aponta, ou tira o bloco.',
    genre: 'Construção',
    concepts: [
      'Blocos',
      'Ponte',
      'Código',
      'Mouse travado',
      'Raio da mira',
      'Render texture',
      'Dicionários',
      'Molda',
    ],
    difficulty: 'advanced',
    experience: 'game',
    extension: '3d',
    inspiration: 'Minecraft-AI',
    howToPlay:
      'Mexa o mouse (ou as setas para os lados) para olhar, W A S D (ou as setas) para andar e espaço para pular. Clique ou C coloca um bloco, clique direito ou X tira, Q e E trocam o bloco.',
    ideas: [
      'Pinte uma textura nova no Molda, ponha em `images/` e acrescente o nome dela na lista NOMES.',
      'Mude TAMANHO_DO_MUNDO para um mundo maior (e mais pesado de desenhar).',
      'Mude PULO para pular por cima de dois blocos.',
    ],
    sounds: [],
    music: [],
    receipt: 'mundo-de-blocos-r2.json.snapshot',
  },
] as const satisfies readonly RaylibGame[]

export type RaylibGameKey = (typeof RAYLIB_GAMES)[number]['key']

/** Text files of every example, besides its media. */
export const RAYLIB_GAME_FILES = ['main.py', 'README.md', 'NOTICE.md', 'LICENSE'] as const
