import {
  isRecord,
  MAP_TILES,
  MESH_LEVELS,
  type MeshLevel,
  SCENE_LIMITS,
  type SceneId,
  type SceneSetup,
  SHEET_CROP_WIDTHS,
} from './actions'
import { GESTOS_NO_PAPEL, MARCA_DO_PAPEL, MARCAS_NO_PAPEL, type MirrorAxis } from './atelie'
import {
  AIM_ORIGIN,
  CONTACT_HEARTS,
  COOLDOWN_SHOT,
  ENEMY_MAX_CACTI,
  HOLD_LANE,
  HUNT_BASE,
  TILEMAP_MARK,
  TILEMAP_MARKS_MAX,
} from './nucleo'

/**
 * O estado de uma cena, agrupado por assunto.
 *
 * Antes era uma struct PLANA de 44 campos, inicializada inteira para todas as cenas — cada
 * uma usava ~6 e ignorava 38. Pior: a validação na volta do servidor descobria os campos
 * por REFLEXÃO sobre o exemplar inicial, então qualquer campo novo de array caía num
 * `length <= 12 && every(finite)` genérico. Aqui cada grupo se valida sozinho e explicitamente.
 */

export interface SceneCactus {
  id: number
  x: number
  velocity: number
  /**
   * A base de onde a velocidade saiu, na `acceleration` (lote 5 do Raio-X): é o que deixa a fileira
   * escrever "base −9, sorteio −1" embaixo do cacto de −10. Opcional: as outras cenas não sorteiam.
   */
  base?: number
}

/** O retrato do mundo no instante em que a criança descobriu alguma coisa. É o que alimenta
 *  a comparação "antes e depois" e o relatório do professor. */
export interface SceneObservation {
  id: string
  label: string
  height: number
  force: number
  gravity: boolean
  front: boolean
  distance: number
  width: number
  collision: boolean
  points: number
  screen: MatchScreen
  stored: number
  visible: number
  base: number
  x: number
  velocity: number
}

export type MatchScreen = 'start' | 'playing' | 'end'

/** O que a criança fez e o que ela percebeu. É a única parte que a avaliação lê. */
export interface SceneEvidence {
  actions: number
  discoveries: string[]
  observations: SceneObservation[]
  hints: number
}
/** Existir e aparecer são coisas diferentes: `created` é o objeto, `drawn` é o desenho. */
export interface SceneWorld {
  created: boolean
  drawn: boolean
  front: boolean
}
/** O salto. `atForce`/`atGravity` congelam as condições do voo em curso, para que mexer nos
 *  controles no meio do ar não reescreva a trajetória que já começou. */
export interface SceneFlight {
  gravity: boolean
  force: number
  y: number
  time: number | null
  atForce: number
  atGravity: boolean
  peak: number
  /**
   * A altura de onde o TRECHO atual do voo partiu (lote 5 do Raio-X, `gravity`). Zero num salto que
   * sai do chão. ⚠️⚠️ Ligar ou desligar a gravidade NO AR recomeça o trecho daqui, com a velocidade
   * que o Dino tinha: é o que faz a criança ver a subida frear e virar queda, em vez do teletransporte
   * de antes ("Dino de volta à posição inicial").
   */
  base: number
  /**
   * A marca do salto ANTERIOR que pousou, e o impulso dele (lote 5, `impulse`). Zero antes de haver
   * um. É a marca azul que FICA no palco enquanto a laranja mostra o salto de agora; antes o `jump`
   * zerava o `peak` e a comparação que a instrução pedia não existia na tela.
   */
  before: number
  beforeForce: number
}
/** Um aperto na cena `jump-sound`: se virou pulo e se tocou som. É a linha do tempo do palco. */
export interface SceneSoundBeat {
  pulo: boolean
  som: boolean
}
export interface SceneSound {
  onJump: boolean
  count: number
  jumps: number
  /**
   * ⚠️ Os últimos apertos, em ordem (lote 5 do Raio-X). "Som sem pulo" era só a diferença entre dois
   * números pequenos no pé de um palco de altura; a linha do tempo desenha cada aperto com ↑ e ♪ lado
   * a lado. Com CORTE no motor (`SOUND_BEATS_MAX`): lista que cresce sem teto derruba o retrato.
   */
  beats: SceneSoundBeat[]
}
/** Quantos apertos a linha do tempo da `jump-sound` guarda. */
export const SOUND_BEATS_MAX = 8
/** Os cactos que nascem, andam e somem. */
export interface SceneCrowd {
  timer: boolean
  interval: number
  cleanup: boolean
  remainder: number
  born: number
  removed: number
  cacti: SceneCactus[]
  elapsed: number
  /**
   * O último trecho SEM relógio da `spawn`, guardado quando a criança leva Criar cacto para o
   * relógio (lote 5 do Raio-X): quantos nasceram e em quanto tempo. Zero antes de haver um. Ligar o
   * relógio recomeça a pista, e sem isto o "60 em 2 s" sumia na hora de comparar com o "2 em 2 s".
   */
  untimedBorn: number
  untimedSeconds: number
}
/** A partida: telas, pontos e as ligações que a fazem começar e recomeçar. */
export interface SceneMatch {
  guarded: boolean
  touch: boolean
  restartConnected: boolean
  screen: MatchScreen
  points: number
  clockRemainder: number
  scoreIdle: number
  /**
   * As últimas tentativas de começar na `controls`, a mais recente por último (lote 5 do Raio-X):
   * são os selos do palco ("✋ tocou: nada aconteceu", "⌨ Enter: começou"). Com corte no motor.
   */
  tries: SceneStartTry[]
  /**
   * O último placar VISTO em cada tela da `score`, na ordem Início, Jogando, Fim; −1 = a criança
   * ainda não passou por ela (lote 5 do Raio-X). É a fileira embaixo do palco ("Início 3 · Jogando 7
   * · Fim 7"), que deixa a comparação das três telas à vista sem depender de memória.
   */
  seen: number[]
  /**
   * Quantos cactos o último "Reiniciar o jogo" tirou da pista, na `restart` (lote 5); zera quando a
   * partida seguinte começa. É o que separa a pista limpa POR REINICIAR da pista vazia de quem só
   * apertou Recomeçar.
   */
  cleared: number
}
/** Uma tentativa de começar a partida: com qual entrada, e se a partida começou. */
export interface SceneStartTry {
  input: 'key' | 'tap'
  began: boolean
}
/** Quantas tentativas a `controls` guarda. */
export const START_TRIES_MAX = 3
export interface SceneContact {
  distance: number
  width: number
}
/** O endereço do sprite na tela, e de onde ele veio. O par anterior é o que permite comparar
 *  sem guardar de memória: a cena desenha o fantasma da posição de antes. */
export interface ScenePlace {
  /** O canto de CIMA, à esquerda, da caixa do sprite: o mesmo ponto que o Estúdio usa para desenhar. */
  x: number
  y: number
  fromX: number
  fromY: number
  /**
   * ⚠️ LEGADO (lote 5 do Raio-X, 16/09/2026): servia à meta "mesmo x, altura diferente", que caía
   * junto com "y maior leva para baixo" e saiu. O campo fica para o retrato guardado antes continuar
   * válido, e o motor não o escreve mais.
   */
  visitedX: number[]
  /**
   * A TELA do endereço (lote 5): 480 × 270 de fábrica, a do Corre Dino. Um caso a troca com a ação
   * `stage` (o Desafio abre em 800 × 480, a tela do jogo da criança), e o endereço fica preso nela.
   */
  width: number
  height: number
}
/** A tela que a criança prepara: o tamanho e a moldura que mostra onde ela acaba. */
export interface SceneStageSize {
  width: number
  height: number
  border: boolean
  /** Os formatos que ela já experimentou, para a cena saber que houve comparação. */
  tried: number
}
/** O laço de desenho: repetir a cada quadro e limpar antes. */
export interface SceneRender {
  loop: boolean
  erase: boolean
  /** Quadros que o relógio andou desde a abertura. */
  frames: number
  /** Quantos desenhos estão na tela (o rastro de quem não limpa). É sempre `drawn.length`. */
  trail: number
  /**
   * ⭐⭐ O x do Dino NOS BASTIDORES (lote 5 do Raio-X, 16/09/2026): ele anda uma casa a cada quadro,
   * desenhado ou não, e volta ao começo depois da última (`DRAW_LOOP_LANE`). É o número que a faixa
   * mostra: com o desenho só no começo o x anda e a tela não, e o "congela" vira um contraste que se
   * VÊ, em vez de uma tela parada que podia ser defeito.
   */
  x: number
  /**
   * Os x em que o Dino está DESENHADO na tela agora, do mais antigo para o mais novo. Sem limpar, os
   * desenhos de antes ficam (o rastro); limpando, a lista zera antes de desenhar de novo.
   * ⚠️ Uma casa só aparece uma vez: quando o rastro dá a volta, o desenho novo cobre o velho, e a
   * lista para em `DRAW_LOOP_LANE.places` (a tela cheia).
   */
  drawn: number[]
  /**
   * A tela está VAZIA: o relógio andou com a limpeza ligada e ninguém desenhou de novo.
   *
   * ⚠️⚠️ É o que o palco e a faixa leem para não mostrar um Dino que não está lá. Sem este campo a
   * cena desenhava o Dino inteiro e dizia "a tela continua igual" justamente no estado que a
   * pergunta do modelo pergunta ("E se limpar sem desenhar?"). Quantos Dinos desenhar:
   * `drawLoopOnScreen` (readout). Volta a `false` no primeiro quadro que desenha.
   */
  empty: boolean
}
/** A descrição do jogo e o que o leitor de tela leu em voz alta na última vez. */
export interface SceneDescription {
  text: string
  /** O que foi lido. Vazio antes do primeiro "ouvir". */
  heard: string
  /** Ela ouviu a tela SEM descrição, que é a descoberta que abre a cena. */
  heardEmpty: boolean
  /**
   * A última escuta COM frase (lote 5 do Raio-X). O painel do leitor mostra as duas escutas uma
   * embaixo da outra ("Imagem." e a frase dela), e sem este campo voltar a ouvir a tela vazia
   * apagava a frase do painel: o contraste que a cena existe para mostrar sumia.
   */
  said: string
  /**
   * Quantas vezes ela apertou "Ouvir a tela". ⚠️ É o gatilho da VOZ no palco: ouvir a mesma frase
   * duas vezes não muda `heard`, e a segunda escuta precisa falar também.
   */
  listens: number
}
/**
 * A pista do `draw-loop`, em unidades da tela do jogo (480 de largura, a do Corre Dino). O Dino anda
 * `step` a cada quadro, a partir de `start`, e depois de `places` casas volta ao começo.
 * ⚠️ `x` é o canto de cima da caixa do sprite (64), como no Estúdio e na `coordinates`: a última casa
 * (406) termina em 470, dentro da tela.
 */
export const DRAW_LOOP_LANE = { start: 10, step: 44, places: 10 } as const
/**
 * Os dois quadros do desenho: qual está na tela, a troca automática e o fantasma.
 *
 * ⚠️ Um grupo para DUAS cenas (`frames` e `onion-skin`), como `crowd` serve o nascimento e a
 * limpeza: elas são a mesma bancada de animação vista de dois ângulos, e separá-las faria a
 * criança trocar de mundo entre uma seção e a seguinte da mesma aula.
 */
export interface SceneAnimation {
  /** 1 ou 2. São dois desenhos INTEIROS, não um desenho com partes. */
  frame: number
  playing: boolean
  /** Trocas por segundo. */
  rate: number
  /** Quantas trocas o relógio já fez. */
  swaps: number
  elapsed: number
  /** O fantasma do quadro anterior, por baixo. Guia de desenho: não entra na animação. */
  onion: boolean
  /**
   * O quanto o fogo do quadro 2 CRESCE em relação ao do quadro 1 (`onionFireLength`, 4 por
   * quadradinho). ⚠️ Até o lote 5 do Raio-X era o quanto o desenho inteiro ANDAVA: o nome ficou.
   */
  shift: number
}
/** O espelho: onde ele está, o que já foi pintado e com que eixo. */
export interface SceneMirror {
  on: boolean
  /** A linha do espelho do papel de 12 colunas (antes do lote 5). ⚠️ Guardada, e sem uso no palco. */
  line: number
  /** As colunas do papel de 12 colunas (antes do lote 5). ⚠️ Guardadas, e sem uso no palco. */
  painted: number[]
  /** O eixo do último traço espelhado no papel de 12 colunas. 0 = nenhum ainda. */
  lastLine: number
  /**
   * ⭐ Lote 5 do Raio-X: QUAL espelho do Pinta está ligado (`x` lado a lado, `y` de cima e de
   * baixo, `xy` os dois: no Pinta são duas chaves independentes), sempre no meio da grade 16 × 16.
   * Com `on` desligado, guarda o último escolhido (`mirrorAxes` responde o que está ligado).
   */
  axis: MirrorAxis
  /** As marcas no papel, na ordem em que apareceram (`MARCA_DO_PAPEL`, em `atelie.ts`). */
  marks: string[]
  /**
   * Os GESTOS de pintar desde o papel em branco, e as cópias que os espelhos fizeram (consertos do
   * review da onda B do lote 5). ⚠️ As marcas não contam gesto: pintar a asa de novo não é marca
   * nova, e a faixa ficava em "você pintou 3" depois do quarto toque.
   */
  strokes: number
  copies: number
}
/** A lupa sobre as duas pedras: qual delas e de quão perto. */
export interface ScenePixels {
  kind: 'pixel' | 'vector'
  zoom: number
}
/** A folha de desenhos e o tamanho que o recorte tem dentro do jogo. */
export interface SceneSheet {
  /** Onde o recorte está: 1 a 4 com a largura 16, 1 a 2 com 32 e 1 com 64 (`sheetCropCell`). */
  cell: number
  /** O tamanho do sprite no jogo, em pixels. A folha NÃO muda com ele. */
  size: number
  /** As células que ela já recortou. */
  cuts: number[]
  /**
   * ⭐ Lote 5 do Raio-X: a LARGURA do recorte na folha de 64 × 32 da nave (16, 32 ou 64; a altura
   * fica 32). Nasce em 64.
   */
  width: number
  /**
   * O jogo já mostra algum recorte? (consertos do review da onda B do lote 5, A4). ⚠️⚠️ A cena ABRE
   * com o jogo VAZIO: aberta com a folha inteira, a demonstração da Aula 6 desenhava as duas naves
   * espremidas embaixo da previsão "se o jogo mostrar a folha inteira, o que aparece?", e a parte 1
   * não mudava um pixel. Escolher uma largura ou um quadro carrega. ⚠️ O padrão da HIDRATAÇÃO é
   * `true`: o retrato de antes mostrava o recorte, e reabrir não pode esvaziar o jogo de ninguém.
   */
  loaded: boolean
}
/** O placar e as vidas: duas contagens que mudam por motivos diferentes. */
export interface SceneLifeline {
  lives: number
  points: number
  /** O fio que faz a batida custar uma vida. */
  onHit: boolean
  /** O fio que soma ponto enquanto a nave está viva. */
  scoring: boolean
  hits: number
  /** O resto do segundo, para o ponto não depender do tamanho do passo do relógio. */
  remainder: number
  /** Os tiros que acertaram (lote 5 do Raio-X): no Desafio o ponto vem do ACERTO, não do tempo. */
  shots: number
  /** O último acontecimento, para o palco desenhar a causa dele (o tiro ou a batida). */
  last: 'nada' | 'tiro' | 'batida'
}
/* ── Os grupos do núcleo do Iniciante 2D (15/09/2026) ────────────────────────────────────── */
/** A velocidade: quanto o sprite anda em cada quadro, e onde ele está agora. */
export interface SceneDrive {
  vx: number
  vy: number
  x: number
  y: number
  /** Onde ele estava antes do último passo do relógio — é o fantasma que mostra o quanto andou. */
  fromX: number
  fromY: number
  /**
   * Onde o personagem estava quando a velocidade ATUAL foi escolhida (lote 1 do Raio-X, consertos).
   *
   * ⚠️⚠️ As metas de sentido (`moves`, `left`, `down`, `up`) medem o caminho desde AQUI, e não o
   * de uma fatia do relógio. Medindo por fatia, velocidade ±1 anda 0,5 px a cada 0,05 s do ▶ e
   * nenhuma meta caía: a nave cruzava 20 px da tela e a cena dizia que nada tinha acontecido. É
   * também daqui que a frase narra "foi de A para B", para ela contar o movimento que a criança
   * VIU inteiro, e não os dois últimos pixels de uma demonstração tocada em fatias.
   */
  anchorX: number
  anchorY: number
  ticks: number
  /**
   * Os pontinhos do rastro (lote 5 do Raio-X): onde o personagem esteve em cada quadro desde que a
   * velocidade ATUAL foi escolhida, a âncora primeiro. Até 6. São o "passos iguais" que a cena mostra.
   */
  trailX: number[]
  trailY: number[]
  /** O rastro da velocidade ANTERIOR, em cinza: é o que deixa comparar −5 com −6 lado a lado. */
  prevX: number[]
  prevY: number[]
  /** Quantos quadros andaram desde a âncora: a frase conta "4 quadros: o x foi de 400 para 380". */
  steps: number
}
/** O gesto que dispara uma vez contra o que vale enquanto durar. Duas raquetes, um só relógio. */
export interface SceneInput {
  holding: boolean
  presses: number
  /** A raquete ligada ao acontecimento "apertou". */
  pressX: number
  /** A raquete ligada à pergunta "está apertada?". */
  holdX: number
  ticks: number
  /**
   * ⭐ Onde cada raquete estava quando a tecla AFUNDOU (lote 5 do Raio-X): os fantasmas do palco. A
   * cena tinha dois botões, "Apertar uma vez" e "Segurar a tecla", e a criança saía achando que eram
   * duas teclas; hoje a MESMA tecla move as duas, e o fantasma é o ponto de partida do mesmo gesto.
   */
  pressFrom: number
  holdFrom: number
  /** Quantos passos cada raquete deu desde que a tecla afundou. É o que as metas comparam. */
  pressSteps: number
  holdSteps: number
}
/** A caixa que guarda um número. Guardar, mudar e mostrar são três coisas diferentes. */
export interface SceneBox {
  value: number
  shown: boolean
  changes: number
  /**
   * A caixa já foi CRIADA (lote 5 do Raio-X): "Criar variável pontos = 0" é o primeiro bloco do
   * jogo. É o que deixa guardar ZERO ser uma descoberta na criação, e o deslizante no batente (que
   * reenvia o mesmo número) não ser.
   */
  created: boolean
}
/** O laço sobre o grupo: quem já foi olhado e quem acabou escolhido. */
export interface SceneHunt {
  /** As distâncias dos três invasores, na ordem do grupo. */
  distances: number[]
  looked: number[]
  chosen: number
  /** O fio do laço que escolhe o mais perto sozinho. */
  auto: boolean
  ticks: number
  /**
   * A escolha foi feita SEM medir os três (lote 5 do Raio-X). É aceita, mas o palco a marca em âmbar:
   * antes a legenda elogiava o atalho que a cena existe para desaconselhar.
   */
  blind: boolean
  /**
   * Há quantos quadros o laço está LIGADO (consertos do review da onda B do lote 5). "A escolha mudou
   * sozinha" só conta depois de `HUNT_LOOP_SEEN_TICKS`: logo depois de ligar ela lia como o laço
   * trocando a escolha certa da criança.
   */
  loopTicks: number
  /**
   * O número que cada régua mostrou quando a criança MEDIU (0: ainda não medido), na ordem do grupo.
   * ⚠️⚠️ Medir é uma FOTO: sem o laço os cactos andam e a régua fica com o número de quando mediu
   * ("medido antes"); com o laço as três são medidas de novo em todo quadro. Antes as réguas seguiam os
   * cactos sozinhas, e o que o laço faz já acontecia sem ele.
   */
  measured: number[]
}
/** Um cacto que nasceu da ficha: onde está, e o que ele COPIOU da ficha ao nascer. */
export interface SceneTypedCactus {
  id: number
  x: number
  speed: number
  life: number
  /** A ordem do nascimento, comparada com a da última mudança da ficha (`editSeq`). */
  seq: number
}
/** A ficha do tipo de inimigo, e quantos nasceram dela. */
export interface SceneBlueprint {
  speed: number
  life: number
  born: number
  edits: number
  /**
   * ⭐⭐ Os cactos ANDAM (lote 5 do Raio-X): cada um com a posição e a cópia da ficha de quando nasceu.
   * Com o cacto parado e o número escrito embaixo, "a velocidade" era só um número, e o relógio só
   * trocava a legenda.
   */
  cacti: SceneTypedCactus[]
  /** "Copiar a ficha ao nascer": ligado, cada cacto anda com a CÓPIA dele, e não com a ficha. */
  copy: boolean
  ticks: number
  /** A contagem dos gestos na ficha (nascer e mudar), para saber quem nasceu depois de qual mudança. */
  seq: number
  editSeq: number
  /** Houve mudança na ficha que ainda não passou por um quadro do relógio. */
  pending: boolean
}
/** O mundo maior que a tela, e a janela que anda sobre ele. */
export interface SceneView {
  heroX: number
  follow: boolean
  /** Já saiu da tela alguma vez sem a câmera? É a dor que a cena existe para provocar. */
  wasLost: boolean
}
/** O contato: a pergunta contínua contra o acontecimento da batida. */
export interface SceneHit {
  distance: number
  mode: 'ask' | 'event'
  /** Quanto de vida já se foi. */
  damage: number
  /** Estava encostado no passo anterior? É o que separa "encostando" de "acabou de encostar". */
  touching: boolean
  /**
   * Já houve um passo do relógio com os dois LONGE, depois da primeira batida?
   *
   * ⚠️ É o que separa "afastar e voltar" de "ficar encostado": só liga num quadro com os dois LONGE
   * depois de `once`, e sem ele a encostada seguinte fechava `apart` sem o cacto ter se afastado.
   * O `mode` (ação legada) só grava `mode`: não zera nada, e nada lê o campo.
   */
  away: boolean
  /**
   * ⭐⭐ As DUAS regras ao mesmo tempo (lote 5 do Raio-X): os corações que restam na pista de cima
   * ("o Dino está encostando?") e na de baixo ("Quando o Dino começar a encostar"). Antes a criança
   * trocava a pergunta numa Escolha, a vida zerava, e o "3 perdidas" sumia no instante de comparar.
   */
  top: number
  bottom: number
  /** Há quantos quadros a encostada atual dura, e quanto cada pista perdeu NELA. */
  frames: number
  topTouch: number
  bottomTouch: number
  /** Quantas vezes o cacto começou a encostar. */
  touches: number
}
/** A arma e a recarga entre dois tiros. */
export interface SceneWeapon {
  /** Segundos de recarga. Zero é "sem recarga". */
  seconds: number
  /** Quanto falta para poder atirar de novo. */
  ready: number
  shots: number
  /** Tiros que a criança pediu enquanto a arma recarregava. */
  refused: number
  /**
   * ⭐⭐ Os tiros VOAM (lote 5 do Raio-X): o relógio da cena em segundos e o quanto cada tiro já andou
   * desde a boca da arma. Sem recarga eles saem colados; com recarga aparece o vão. Antes eram
   * bolinhas paradas igualmente espaçadas, e "juntos" e "espaçados" davam o MESMO desenho.
   */
  time: number
  bullets: number[]
  /** Quando saíram os últimos três tiros: "saíram colados" é três tiros dentro de 1 s. */
  shotTimes: number[]
  /** Quando o último aperto NÃO virou tiro (−1: nunca). O "✕ não saiu" some meio segundo depois. */
  refusedAt: number
}
/** A mira: onde está o alvo e para onde o tiro foi. */
export interface SceneSight {
  targetX: number
  targetY: number
  chasing: boolean
  /** O último tiro, guardado para a comparação: onde ele ACABOU (no alvo, ou onde saiu da tela). */
  shotX: number
  shotY: number
  /**
   * ⭐⭐ O tiro que VOA (lote 5 do Raio-X). Ele sai do Dino com o gesto "Atirar" e anda um trecho por
   * quadro: reto para a direita com a mira desligada, pela seta com ela ligada. Antes o relógio punha
   * uma bolinha JÁ em cima do alvo, e "foi na direção da seta" nunca era visto como caminho.
   */
  flying: boolean
  bulletX: number
  bulletY: number
  bulletVX: number
  bulletVY: number
  /** A mira estava ligada quando o tiro SAIU (mexer na chave com ele no ar não o desvia). */
  aimed: boolean
  result: 'nada' | 'acertou' | 'errou'
}
/** Onde o Dino parou numa andada de 1 segundo, de cada tipo: os fantasmas da comparação. */
export interface SceneStrideGhost {
  kind: 'reto' | 'diagonal' | 'corrigida'
  x: number
  y: number
}
/** As setas do teclado e a correção que iguala a diagonal. */
export interface SceneWalkPad {
  dx: number
  dy: number
  even: boolean
  /** O quanto o personagem andou de verdade no último passo. */
  distance: number
  /** A maior distância já andada num passo — é ela que denuncia a diagonal. */
  best: number
  /**
   * ⭐⭐ O Dino e o rastro (lote 5 do Raio-X): onde ele parou na última andada de 1 segundo, a partir
   * do começo (0, 0), e o último lugar de cada tipo de andada. Antes não havia personagem nem
   * caminho: a descoberta era um número com centésimos numa barra.
   */
  x: number
  y: number
  last: 'nada' | 'reto' | 'diagonal' | 'corrigida'
  ghosts: SceneStrideGhost[]
  strides: number
}
/** O mapa escrito em texto: seis linhas de dez casas. */
export interface SceneGrid {
  rows: string[]
  /** Casas que a criança trocou. */
  edits: number
  /**
   * As letras DISTINTAS que ela já escreveu. ⚠️ Só gravado: a meta `same-letter` lê `marks` (abaixo)
   * desde o lote 5, e nada mais lê este campo. Fica no retrato por compatibilidade (sessões gravadas o
   * trazem, e o validador o confere). ⚠️⚠️ Distintas, e não uma por troca: o mapa tem 60 casas e a
   * lista não pode passar do teto que o validador aceita, senão o retrato é recusado.
   */
  written: string[]
  /**
   * ⚠️⚠️ Em que LINHAS cada peça (`#` ou `o`) já foi escrita, como `"#3"` (lote 5 do Raio-X). "A mesma
   * letra vira a mesma peça" caía apagando duas casas (escrever "." duas vezes), e escrevendo "ooo"
   * numa linha só ela caía junto com a meta das moedas. Hoje pede a mesma PEÇA em duas linhas.
   * ⚠️⚠️ Consertos do review da onda B do lote 5: a marca é da CASA (`"#3:4"`, `tilemapMark`) e sai
   * quando a casa recebe outra letra; só contam as marcas VIVAS (`tilemapMarkedRows`). No máximo uma
   * por casa (60). A de antes (`"#3"`) continua lida.
   */
  marks: string[]
  /** A casa que acabou de ser escrita (−1: nenhuma). O palco a acende no texto E no desenho. */
  lastRow: number
  lastCol: number
}

/* ── Os grupos do motor, do 3D e do ateliê (15/09/2026) ──────────────────────────────────── */
/** O nascedouro: quantos existem, quantos foram CRIADOS e se o corpo é reaproveitado. */
export interface SceneNursery {
  alive: number
  /** O contador que só sobe — é ele que denuncia o vazamento. */
  created: number
  recycling: boolean
  /** Quadros desde a última troca da reciclagem: "parou de crescer" conta a partir dela. */
  ticks: number
  /**
   * ⭐ O NÚMERO pintado no cacto que está na tela, 0 antes do primeiro (lote 5 do Raio-X). Sem
   * reciclagem cada um que entra é o seguinte (`created`); reciclando, o mesmo número volta.
   */
  onScreen: number
  /** Quantos quadros o cacto da tela já andou na travessia, de 0 a `POOL_CROSSING − 1`. */
  progress: number
  /**
   * O que aconteceu na ÚLTIMA saída da tela: `novo` (foi para a pilha e entrou outro) ou `voltou`
   * (o mesmo saiu e entrou de novo). É o arco do palco e a frase da situação.
   */
  last: 'nada' | 'novo' | 'voltou'
}
/** O cérebro de cada personagem: em que estado ele está agora. */
export type BrainState = 'parado' | 'mirar' | 'atirar' | 'recarregar'
export interface SceneBrains {
  states: BrainState[]
  ticks: number
  /**
   * O estado MORA no jogo, um só para as três torres (lote 5 do Raio-X)? É a crença errada que a
   * cena deixa testar: com `true`, mandar uma torre atirar muda as três.
   */
  shared: boolean
}
/** Duas máquinas com o mesmo jogo: uma rápida e uma devagar. */
export interface SceneMachines {
  /** O que o jogo conta para medir o tempo. */
  mode: 'frames' | 'seconds'
  fastX: number
  slowX: number
  elapsed: number
  /**
   * Os quadros que cada computador já DESENHOU nesta corrida (lote 5 do Raio-X): as pegadas da pista.
   * O rápido desenha um por quadro da cena; o devagar, um a cada dois.
   */
  fastFrames: number
  slowFrames: number
}
/**
 * A travessia do cacto da `pool`, em quadros (lote 5 do Raio-X): a 10 por segundo, um cacto por
 * segundo. ⚠️ Mexeu aqui, mexa no palco (`scene-motor-stages`), que desenha a posição por ela.
 */
export const POOL_CROSSING = 10
/**
 * A corrida da `delta-time` (lote 5 do Raio-X): onde fica a chegada e quanto o Dino anda por quadro
 * desenhado. Andando "a cada quadro" o passo é o mesmo nos dois computadores (o rápido chega em 3 s e o
 * devagar fica na metade); "a cada segundo" o devagar dá o DOBRO do passo, e os dois chegam juntos.
 */
export const DELTA_RACE = { chegada: 120, passo: 4 } as const
/**
 * Quantos pontos tem o modelo low poly da `mesh` (lote 5 do Raio-X): o cristal de seis lados com uma
 * ponta em cima e outra embaixo. A faixa escreve o número; ⚠️ o palco (`scene-3d-stages`) desenha
 * EXATAMENTE estes, e o teste do member-shell confere.
 */
export const MESH_POINTS = 8
/** A colisão escrita à mão: dois centros e dois raios. */
export interface SceneCircles {
  distance: number
  a: number
  b: number
  /** Já encostaram alguma vez? */
  touched: boolean
}
/** O lugar no espaço. ⚠️ Aqui o y cresce para CIMA. */
export interface SceneSpace {
  x: number
  y: number
  z: number
  /** Os eixos que a criança já mexeu sozinhos, para a cena saber o que ela comparou. */
  moved: string[]
}
/** De onde a câmera olha, e quantas faces isso deixa ver. */
export interface SceneOrbit {
  yaw: number
  pitch: number
  /** Menor número de faces já visto de uma vez. */
  fewest: number
  /** Voltou à vista inicial depois de girar? */
  returned: boolean
}
/** O modelo: os pontos ligados por baixo da pele. */
export interface SceneModelView {
  /** A malha inteira, sem pele. ⚠️ Desde o lote 5 é o mesmo que `see === 'tudo'`, e anda junto. */
  wire: boolean
  yaw: number
  /** "Ver os pontos" em três degraus (lote 5 do Raio-X): só a pele, a pele transparente, só a malha. */
  see: MeshLevel
  /** Já passou pelo degrau do meio: é o que faz "a pele por cima dos mesmos pontos" ser vista. */
  sawHalf: boolean
}
/** A mira que sai da câmera e para na primeira coisa. */
export interface SceneRay {
  x: number
  y: number
  /** Qual caixa a reta acertou: 0 = nenhuma. */
  hit: number
  /** As caixas já acertadas, para a cena saber que ela mirou em mais de uma. */
  hits: number[]
}
/** O miolo e o contorno da mesma forma. */
export interface SceneInk {
  fill: boolean
  stroke: boolean
  /** Os arranjos que ela já viu: `fill`, `stroke`, `both`, `none`. */
  seen: string[]
}
/** A luz e a sombra que dão volume ao desenho chapado. */
export interface SceneLight {
  side: 'left' | 'right'
  shade: boolean
  /** Os lados de onde a luz já veio com a sombra pintada. */
  sides: string[]
}

export interface SceneSpeed {
  limited: boolean
  base: number
  ticks: number
  samples: { x: number; velocity: number; positions: number[]; velocities: number[] }
  /**
   * Quantas vezes cada lugar saiu no sorteio da `random` (lote 5 do Raio-X): 500, 510… 560, sete
   * lugares. É a marquinha "2×" da régua, a repetição à vista.
   */
  spots: number[]
}

/**
 * O relógio de quadro fixo (lote 4 do Raio-X): o tempo que já passou e ainda não fechou um quadro.
 *
 * ⚠️⚠️ É o que faz o ▶ em fatias de ~0,04 s, o "Um passo" e o roteiro de 1 s darem o MESMO mundo
 * para o mesmo tempo: a sobra de uma fatia entra na seguinte, em vez de cada `advance` valer um
 * quadro inteiro. O ritmo de cada cena mora em `SCENE_FRAME_RATE` (`actions.ts`). Zerada onde o
 * gesto é esquecido (`esquecerOGesto`: o caso não deixa meio quadro adiantado para a criança) e, nas
 * cenas de quadro longo, a cada gesto (`stepScene`).
 */
export interface SceneClock {
  /**
   * ⚠️⚠️ Em FRAÇÃO DE QUADRO, de 0 a 1, e nunca em segundos (review do lote 4): em segundos ela
   * dependia do ritmo de quando foi gravada, e subir o ritmo de uma cena soltaria vários quadros de
   * uma vez numa sessão salva. É também a largura da barra do quadro em andamento no player.
   */
  carry: number
}

export interface SceneState {
  evidence: SceneEvidence
  world: SceneWorld
  flight: SceneFlight
  sound: SceneSound
  crowd: SceneCrowd
  match: SceneMatch
  contact: SceneContact
  speed: SceneSpeed
  place: ScenePlace
  description: SceneDescription
  stage: SceneStageSize
  render: SceneRender
  animation: SceneAnimation
  mirror: SceneMirror
  pixels: ScenePixels
  sheet: SceneSheet
  lifeline: SceneLifeline
  drive: SceneDrive
  input: SceneInput
  box: SceneBox
  hunt: SceneHunt
  blueprint: SceneBlueprint
  view: SceneView
  hit: SceneHit
  weapon: SceneWeapon
  sight: SceneSight
  walkPad: SceneWalkPad
  grid: SceneGrid
  nursery: SceneNursery
  brains: SceneBrains
  machines: SceneMachines
  circles: SceneCircles
  space: SceneSpace
  orbit: SceneOrbit
  model: SceneModelView
  ray: SceneRay
  ink: SceneInk
  light: SceneLight
  clock: SceneClock
  caption: string
}

export interface SceneStart {
  scene: SceneId
  /** Só `gravity` e `impulse` aceitam; o professor escolhe a altura de partida do salto. */
  initialImpulse?: number
  /**
   * O caso desta atividade. ⚠️ `initialScene` NÃO o aplica: quem abre a cena de verdade é o
   * `openScene` do motor, porque aplicar o caso é rodar ações, e o motor mora em `engine.ts`.
   * Toda abertura de sessão passa por lá; aqui fica o mundo de fábrica.
   */
  setup?: SceneSetup
}

/** O padrão dos grupos que a cena ganhou depois que já havia retrato guardado por aí. */
const PLACE_PADRAO: ScenePlace = {
  x: 110,
  y: 150,
  fromX: 110,
  fromY: 150,
  visitedX: [110],
  width: 480,
  height: 270,
}
const DESCRIPTION_PADRAO: SceneDescription = {
  text: '',
  heard: '',
  heardEmpty: false,
  said: '',
  listens: 0,
}
// ⚠️ A tela nasce em 800 × 480, que é o que o bloco "Preparar o jogo" traz de fábrica — a
// Aula 1 pede para trocar por 480 × 270, e é essa troca que a cena existe para ensinar.
const STAGE_PADRAO: SceneStageSize = { width: 800, height: 480, border: false, tried: 0 }
// ⚠️ A cena abre com o Dino DESENHADO UMA VEZ, no começo (lote 5): é o "Desenhar o Dino: só no
// começo" da bancada, e é por isso que ele está na tela sem ninguém desenhar de novo.
const RENDER_PADRAO: SceneRender = {
  loop: false,
  erase: false,
  frames: 0,
  trail: 1,
  empty: false,
  x: DRAW_LOOP_LANE.start,
  drawn: [DRAW_LOOP_LANE.start],
}
// ⚠️ A troca nasce PARADA e o fantasma DESLIGADO: as duas cenas de animação começam no
// desenho parado, que é a coisa que elas querem que a criança veja primeiro.
const ANIMATION_PADRAO: SceneAnimation = {
  frame: 1,
  playing: false,
  rate: 4,
  swaps: 0,
  elapsed: 0,
  onion: false,
  // 40 é um fogo GRANDE de propósito (lote 5: passa da borda do quadro): sem o fantasma ela chuta,
  // e com ele vê que chutou.
  shift: 40,
}
const MIRROR_PADRAO: SceneMirror = {
  on: false,
  line: 6,
  painted: [],
  lastLine: 0,
  axis: 'x',
  marks: [],
  strokes: 0,
  copies: 0,
}
const PIXELS_PADRAO: ScenePixels = { kind: 'pixel', zoom: 1 }
// ⚠️ Lote 5 do Raio-X: a nave do Meu Jeito entra no jogo em 54 × 54, e a folha abre inteira (64).
const SHEET_PADRAO: SceneSheet = { cell: 1, size: 54, cuts: [], width: 64, loaded: true }
const LIFELINE_PADRAO: SceneLifeline = {
  lives: 3,
  points: 0,
  onHit: false,
  scoring: false,
  hits: 0,
  remainder: 0,
  shots: 0,
  last: 'nada',
}

/* Os padrões do núcleo do Iniciante 2D. */
const DRIVE_PADRAO: SceneDrive = {
  vx: 0,
  vy: 0,
  x: 60,
  y: 135,
  fromX: 60,
  fromY: 135,
  anchorX: 60,
  anchorY: 135,
  ticks: 0,
  trailX: [60],
  trailY: [135],
  prevX: [],
  prevY: [],
  steps: 0,
}
const INPUT_PADRAO: SceneInput = {
  holding: false,
  presses: 0,
  pressX: 40,
  holdX: 40,
  ticks: 0,
  pressFrom: 40,
  holdFrom: 40,
  pressSteps: 0,
  holdSteps: 0,
}
// ⚠️ Sem `displayed`: ele era escrito, validado e NUNCA lido. A tela mostra o valor VIVO (é o
// que a cena ensina), então um retrato do que ela mostrou não tinha leitor.
const BOX_PADRAO: SceneBox = { value: 0, shown: false, changes: 0, created: false }
// ⚠️ O do meio é o mais perto de propósito: escolher "o primeiro do grupo" dá errado, e é
// exatamente essa a dor que o laço existe para resolver.
// ⚠️⚠️ Lote 5 do Raio-X: distâncias PARECIDAS (eram 180, 90 e 140, e o olho resolvia sem medir).
const HUNT_PADRAO: SceneHunt = {
  distances: [...HUNT_BASE],
  looked: [],
  chosen: 0,
  auto: false,
  ticks: 0,
  blind: false,
  loopTicks: 0,
  measured: [0, 0, 0],
}
const BLUEPRINT_PADRAO: SceneBlueprint = {
  speed: 3,
  life: 2,
  born: 0,
  edits: 0,
  cacti: [],
  copy: false,
  ticks: 0,
  seq: 0,
  editSeq: 0,
  pending: false,
}
const VIEW_PADRAO: SceneView = { heroX: 200, follow: false, wasLost: false }
const HIT_PADRAO: SceneHit = {
  distance: 120,
  mode: 'ask',
  damage: 0,
  touching: false,
  away: false,
  top: CONTACT_HEARTS,
  bottom: CONTACT_HEARTS,
  frames: 0,
  topTouch: 0,
  bottomTouch: 0,
  touches: 0,
}
const WEAPON_PADRAO: SceneWeapon = {
  seconds: 0,
  ready: 0,
  shots: 0,
  refused: 0,
  time: 0,
  bullets: [],
  shotTimes: [],
  refusedAt: -1,
}
// ⚠️ O alvo abre EMBAIXO e à direita (lote 5 do Raio-X): a previsão pergunta para onde vai o tiro
// com o alvo lá embaixo e a mira desligada, e o tiro reto passa longe dele.
const SIGHT_PADRAO: SceneSight = {
  targetX: 380,
  targetY: 220,
  chasing: false,
  shotX: 0,
  shotY: 0,
  flying: false,
  bulletX: AIM_ORIGIN.x,
  bulletY: AIM_ORIGIN.y,
  bulletVX: 0,
  bulletVY: 0,
  aimed: false,
  result: 'nada',
}
const WALKPAD_PADRAO: SceneWalkPad = {
  dx: 0,
  dy: 0,
  even: false,
  distance: 0,
  best: 0,
  x: 0,
  y: 0,
  last: 'nada',
  ghosts: [],
  strides: 0,
}
// O mapa que a criança edita: chão embaixo, o resto vazio. `#` é bloco, `o` é moeda.
const GRID_PADRAO: SceneGrid = {
  rows: ['..........', '..........', '..........', '..........', '..........', '##########'],
  edits: 0,
  written: [],
  marks: [],
  lastRow: -1,
  lastCol: -1,
}

/* Os padrões do motor, do 3D e do ateliê. */
const NURSERY_PADRAO: SceneNursery = {
  alive: 0,
  created: 0,
  recycling: false,
  ticks: 0,
  onScreen: 0,
  progress: 0,
  last: 'nada',
}
const BRAINS_PADRAO: SceneBrains = {
  states: ['parado', 'parado', 'parado'],
  ticks: 0,
  shared: false,
}
// ⚠️ Os dois na LARGADA, em 0 (lote 5 do Raio-X): em 40 a faixa dizia "andou 40" sem ninguém ter andado.
const MACHINES_PADRAO: SceneMachines = {
  mode: 'frames',
  fastX: 0,
  slowX: 0,
  elapsed: 0,
  fastFrames: 0,
  slowFrames: 0,
}
const CIRCLES_PADRAO: SceneCircles = { distance: 140, a: 30, b: 30, touched: false }
// ⚠️ Nasce no chão e no meio: o y de partida é ZERO porque a cena existe para mostrar que
// subir é +y — e ela precisa começar de onde dá para subir.
const SPACE_PADRAO: SceneSpace = { x: 0, y: 0, z: 0, moved: [] }
const ORBIT_PADRAO: SceneOrbit = { yaw: 1, pitch: 1, fewest: 3, returned: false }
const MODEL_PADRAO: SceneModelView = { wire: false, yaw: 1, see: 'nada', sawHalf: false }
// ⚠️⚠️ A mira ABRE num lugar vazio, embaixo das caixas (lote 5 do Raio-X): em 240, 135 ela nascia
// DENTRO de uma caixa, e a faixa e a frase diziam "nada" até o primeiro toque acender a mesma caixa.
const RAY_PADRAO: SceneRay = { x: 240, y: 235, hit: 0, hits: [] }
const INK_PADRAO: SceneInk = { fill: true, stroke: true, seen: [] }
const LIGHT_PADRAO: SceneLight = { side: 'left', shade: false, sides: [] }
// ⚠️ Retrato de antes do relógio de quadro fixo (lote 4) volta sem sobra: o próximo quadro da cena
// cai no ritmo novo a partir dali, e nada do que a criança já viu muda.
const CLOCK_PADRAO: SceneClock = { carry: 0 }

/**
 * ⚠️⚠️ Um retrato guardado ANTES de a cena ganhar um grupo novo de estado continua válido.
 *
 * `place` e `description` nasceram em 14/09/2026, com as cenas `coordinates` e `screen-reader`.
 * Sem esta hidratação, `isSceneState` recusaria todo checkpoint gravado antes disso — e o
 * player trata recusa como "esta descoberta mudou, recomece": a criança abriria uma cena que
 * ela já tinha mexido e encontraria o trabalho apagado, com um recado de erro. A conclusão em
 * si não se perderia (o servidor nunca rebaixa um `passed:true`), mas a montagem e as
 * comparações guardadas, sim.
 *
 * Grupo novo daqui para a frente entra do mesmo jeito: padrão aqui, e não campo obrigatório na
 * leitura do que já está no banco.
 */
export function hydrateSceneState(value: unknown): unknown {
  if (!isRecord(value)) return value
  const grupos = [
    ['place', PLACE_PADRAO],
    ['description', DESCRIPTION_PADRAO],
    ['stage', STAGE_PADRAO],
    ['render', RENDER_PADRAO],
    ['animation', ANIMATION_PADRAO],
    ['mirror', MIRROR_PADRAO],
    ['pixels', PIXELS_PADRAO],
    ['sheet', SHEET_PADRAO],
    ['lifeline', LIFELINE_PADRAO],
    ['drive', DRIVE_PADRAO],
    ['input', INPUT_PADRAO],
    ['box', BOX_PADRAO],
    ['hunt', HUNT_PADRAO],
    ['blueprint', BLUEPRINT_PADRAO],
    ['view', VIEW_PADRAO],
    ['hit', HIT_PADRAO],
    ['weapon', WEAPON_PADRAO],
    ['sight', SIGHT_PADRAO],
    ['walkPad', WALKPAD_PADRAO],
    ['grid', GRID_PADRAO],
    ['nursery', NURSERY_PADRAO],
    ['brains', BRAINS_PADRAO],
    ['machines', MACHINES_PADRAO],
    ['circles', CIRCLES_PADRAO],
    ['space', SPACE_PADRAO],
    ['orbit', ORBIT_PADRAO],
    ['model', MODEL_PADRAO],
    ['ray', RAY_PADRAO],
    ['ink', INK_PADRAO],
    ['light', LIGHT_PADRAO],
    ['clock', CLOCK_PADRAO],
  ] as const
  const saida: Record<string, unknown> = { ...value }
  for (const [nome, padrao] of grupos) {
    const guardado = saida[nome]
    // ⚠️⚠️ CAMPO a campo, não só grupo a grupo. Um grupo que já existe pode ter nascido antes de
    // um campo novo (`hit.away`, `grid.written`), e o validador recusaria o retrato inteiro: a
    // sessão da criança deixaria de hidratar e ela voltaria ao começo sem saber por quê.
    // ⚠️ Cópia PROFUNDA dos arrays: a rasa deixava `BRAINS_PADRAO.states`, `GRID_PADRAO.rows` e
    // irmãos sendo a MESMA instância em todo retrato legado hidratado no processo do servidor.
    const base = copiaProfunda(padrao as unknown as Record<string, unknown>)
    saida[nome] = isRecord(guardado) ? { ...base, ...guardado } : base
  }
  // ⚠️⚠️ A âncora da velocidade NÃO pode vir do padrão de fábrica. Num retrato antigo com a nave
  // em x 200, uma âncora em 60 afirmaria 140 px de caminho que ninguém andou, e o próximo passo do
  // relógio fecharia "a posição mudou sozinha" com a velocidade em ZERO. Sem âncora guardada, ela
  // é o lugar onde o personagem já está: o caminho recomeça a contar dali.
  const drive = saida.drive as Record<string, unknown>
  const driveGuardado = isRecord(value.drive) ? value.drive : {}
  if (!('anchorX' in driveGuardado)) drive.anchorX = drive.x
  if (!('anchorY' in driveGuardado)) drive.anchorY = drive.y
  completarCorreDino(saida)
  completarATelaEOMundo(value, saida)
  completarCorreDinoSegundaMetade(value, saida)
  completarOMotorEO3D(value, saida)
  completarONucleo(value, saida)
  return saida
}

/**
 * Os campos que os consertos do review da onda B do lote 5 deram ao núcleo do Iniciante 2D, quando o
 * retrato é de antes deles. ⚠️ A foto medida de cada régua (`hunt.measured`) não pode vir do padrão
 * (zero = "não medido"): um retrato com os três já medidos abriria com as nuvens "?" de volta. Sem a
 * foto, o número medido é o de agora, que era o que a régua de antes mostrava.
 */
function completarONucleo(value: Record<string, unknown>, saida: Record<string, unknown>) {
  const hunt = saida.hunt as Record<string, unknown>
  const huntGuardado = isRecord(value.hunt) ? value.hunt : {}
  if ('measured' in huntGuardado) return
  const { distances, looked } = hunt
  if (!Array.isArray(distances) || !Array.isArray(looked)) return
  hunt.measured = distances.map((d, i) => (looked.includes(i + 1) && num(d) ? d : 0))
}

/**
 * Os campos que o lote 5 do Raio-X deu ao motor e ao 3D (`pool`, `delta-time`, `mesh`), quando o
 * retrato é de antes deles e o padrão de fábrica mentiria sobre o que já está lá.
 *
 * ⚠️ A `pool` de antes guardava só os contadores: o cacto da tela é o ÚLTIMO fabricado (sem ele, a
 * faixa diria "3 fabricados" com a pista vazia). A corrida de antes começava em 40 e não contava
 * quadros: as pegadas saem das posições guardadas, no passo "a cada quadro". O modelo de antes só
 * tinha o raio-X ligado ou desligado, que são os degraus `tudo` e `nada`.
 */
function completarOMotorEO3D(value: Record<string, unknown>, saida: Record<string, unknown>) {
  const { nursery, machines, model } = saida
  const nurseryGuardado = isRecord(value.nursery) ? value.nursery : {}
  if (isRecord(nursery) && !('onScreen' in nurseryGuardado))
    nursery.onScreen = typeof nursery.created === 'number' ? nursery.created : 0
  const machinesGuardado = isRecord(value.machines) ? value.machines : {}
  if (isRecord(machines) && !('fastFrames' in machinesGuardado)) {
    const quadros = (x: unknown) =>
      typeof x === 'number' && Number.isFinite(x)
        ? Math.max(0, Math.floor(x / DELTA_RACE.passo))
        : 0
    machines.fastFrames = quadros(machines.fastX)
    machines.slowFrames = quadros(machines.slowX)
  }
  const modelGuardado = isRecord(value.model) ? value.model : {}
  if (isRecord(model) && !('see' in modelGuardado))
    model.see = model.wire === true ? 'tudo' : 'nada'
}

/**
 * Os campos que o lote 5 do Raio-X deu às cenas da segunda metade do Corre Dino e dos números
 * (`restart`, `score`, `random`, `acceleration`, `velocity`, `variable`, `lives`).
 *
 * ⚠️ `match` e `speed` não passam pela lista de padrões (são grupos de nascença): campo a campo aqui.
 * ⚠️⚠️ O rastro da velocidade nasce onde o personagem JÁ está, como a âncora: o padrão de fábrica
 * (x 60) desenharia pontinhos num lugar onde ninguém passou. E a caixa de um retrato antigo já
 * existe quando guardou, somou ou mostrou alguma coisa: sem isso a cena abriria sem a caixa que a
 * criança acabou de encher.
 */
function completarCorreDinoSegundaMetade(
  value: Record<string, unknown>,
  saida: Record<string, unknown>,
): void {
  const { match, speed, drive, box } = saida
  if (isRecord(match)) {
    if (!('seen' in match)) match.seen = [...PLACAR_NAO_VISTO]
    if (!('cleared' in match)) match.cleared = 0
  }
  if (isRecord(speed) && !('spots' in speed)) speed.spots = [...LUGARES_NAO_SORTEADOS]
  const driveGuardado = isRecord(value.drive) ? value.drive : {}
  if (isRecord(drive) && !('trailX' in driveGuardado)) {
    drive.trailX = [drive.x]
    drive.trailY = [drive.y]
    drive.prevX = []
    drive.prevY = []
    drive.steps = 0
  }
  const boxGuardado = isRecord(value.box) ? value.box : {}
  if (isRecord(box) && !('created' in boxGuardado))
    box.created = box.value !== 0 || box.shown === true || box.changes !== 0
}

/**
 * Os campos que o lote 5 do Raio-X deu aos QUATRO grupos de nascença (`flight`, `sound`, `crowd`,
 * `match`), que não passam pela lista de padrões acima: eles existem desde a primeira cena e não têm
 * um padrão único (a gravidade de fábrica muda de cena para cena). Campo a campo, sem tocar no resto.
 * ⚠️ Retrato antigo NUNCA ganha história: sem marca de salto anterior, sem apertos na linha do
 * tempo, sem tentativas de começar. O que ele traz de mundo continua igual.
 */
function completarCorreDino(saida: Record<string, unknown>): void {
  const completar = (grupo: unknown, campos: Record<string, unknown>) => {
    if (!isRecord(grupo)) return
    for (const [campo, padrao] of Object.entries(campos))
      if (!(campo in grupo)) grupo[campo] = Array.isArray(padrao) ? [] : padrao
  }
  completar(saida.flight, { base: 0, before: 0, beforeForce: 0 })
  completar(saida.sound, { beats: [] })
  completar(saida.crowd, { untimedBorn: 0, untimedSeconds: 0 })
  completar(saida.match, { tries: [] })
}

/** O que o leitor de tela diz de uma tela SEM descrição. Motor, faixa e painel leem o mesmo texto. */
export const SCREEN_READER_EMPTY = 'Tela do jogo. Imagem.'

/**
 * Os campos que o lote 5 do Raio-X deu a `render` (`draw-loop`) e a `description` (`screen-reader`),
 * quando o retrato guardado é de antes deles e o padrão de fábrica mentiria sobre o que já está lá.
 */
function completarATelaEOMundo(value: Record<string, unknown>, saida: Record<string, unknown>) {
  // ⚠️ O `draw-loop` de antes guardava só QUANTOS Dinos havia na tela (`trail`, `empty`), e não
  // ONDE. O padrão (um Dino no começo) desmentiria um retrato com rastro ou com a tela vazia: a tela
  // sai com o mesmo número de desenhos, em casas seguidas a partir do começo, e o x no mais novo.
  const render = saida.render
  const renderGuardado = isRecord(value.render) ? value.render : {}
  if (isRecord(render) && !('drawn' in renderGuardado)) {
    const { start, step, places } = DRAW_LOOP_LANE
    const trilha =
      typeof render.trail === 'number' && Number.isFinite(render.trail) ? render.trail : 0
    const quantos = render.empty === true ? 0 : Math.min(places, Math.max(1, Math.floor(trilha)))
    const desenhos = Array.from({ length: quantos }, (_, i) => start + i * step)
    render.drawn = desenhos
    render.trail = desenhos.length
    if (!('x' in renderGuardado)) render.x = desenhos.at(-1) ?? start
  }
  // ⚠️ A escuta com frase de antes mora no `heard`: sem isto o painel perderia a frase dela.
  const description = saida.description
  const descriptionGuardada = isRecord(value.description) ? value.description : {}
  if (
    isRecord(description) &&
    !('said' in descriptionGuardada) &&
    typeof description.heard === 'string' &&
    description.heard !== '' &&
    description.heard !== SCREEN_READER_EMPTY
  )
    description.said = description.heard
}

/** Um grupo de estado com os arrays dele copiados — o padrão nunca sai daqui por referência. */
function copiaProfunda(grupo: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = { ...grupo }
  for (const [chave, valor] of Object.entries(saida)) {
    if (Array.isArray(valor)) saida[chave] = [...valor]
    // ⚠️ Recursivo: `speed.samples` é um objeto COM arrays dentro, e uma cópia de um nível só
    // devolveria o padrão compartilhado no dia em que ele entrasse na lista.
    else if (valor && typeof valor === 'object')
      saida[chave] = copiaProfunda(valor as Record<string, unknown>)
  }
  return saida
}

/** Onde estão os três cactos com que a `cleanup` abre (lote 5 do Raio-X). */
export const CACTOS_DA_LIMPEZA = [30, 130, 260] as const

export function initialScene({ scene, initialImpulse }: SceneStart): SceneState {
  // ⚠️ A `jump-sound` salta com impulso 14 (lote 5 do Raio-X): o salto de 9 dura 1 s, e apertar
  // Espaço DUAS vezes no mesmo pulo, que é a primeira descoberta, pedia pressa de adulto.
  const impulso = initialImpulse ?? (scene === 'jump-sound' ? SCENE_LIMITS.impulse.max : 9)
  return {
    evidence: { actions: 0, discoveries: [], observations: [], hints: 0 },
    // ⚠️ Duas cenas começam DESMONTADAS de propósito: em `world` a criança cria o Dino, e em
    // `gravity` ela liga a gravidade. Nas outras, isso já vem pronto para não roubar o foco.
    world: { created: scene !== 'world', drawn: scene !== 'world', front: false },
    flight: {
      gravity: scene !== 'gravity',
      force: impulso,
      y: 0,
      time: null,
      // ⚠️ O MESMO valor do `force`, e não um 9 cravado: antes do primeiro salto é o `atForce`
      // que o retrato de `observe` guarda, e com o impulso inicial em 14 a cena nascia dizendo
      // que o salto tinha sido de 9. Hoje nenhum teste morde esta linha — nas duas cenas de
      // salto toda observação acontece DEPOIS do salto, que carimba o `atForce` —, então é o
      // `impulso` compartilhado que impede os dois campos de divergirem de novo.
      atForce: impulso,
      atGravity: true,
      peak: 0,
      base: 0,
      before: 0,
      beforeForce: 0,
    },
    sound: { onJump: false, count: 0, jumps: 0, beats: [] },
    crowd: {
      timer: false,
      interval: 1,
      cleanup: false,
      remainder: 0,
      // ⚠️⚠️ A `cleanup` abre com três cactos já na pista (lote 5 do Raio-X): a pista vazia pedia ~5 s
      // de ▶ parado até o primeiro cacto sair, e é a saída que a cena existe para mostrar. O primeiro
      // sai em ~0,3 s, o segundo em ~1,3 s.
      born: scene === 'cleanup' ? CACTOS_DA_LIMPEZA.length : 0,
      removed: 0,
      cacti:
        scene === 'cleanup'
          ? CACTOS_DA_LIMPEZA.map((x, i) => ({ id: i + 1, x, velocity: -5 }))
          : [],
      elapsed: 0,
      untimedBorn: 0,
      untimedSeconds: 0,
    },
    match: {
      guarded: false,
      touch: false,
      restartConnected: false,
      screen: 'start',
      points: 0,
      clockRemainder: 0,
      scoreIdle: 0,
      tries: [],
      seen: [...PLACAR_NAO_VISTO],
      cleared: 0,
    },
    // ⚠️⚠️ A `hitbox` abre com a área GRANDE (lote 5 do Raio-X): 130% do desenho, como no jogo da
    // Aula 10 antes do conserto. É o que faz o BATEU aparecer com um vão entre os desenhos, a batida
    // injusta que a aula existe para consertar diminuindo a área até 80%.
    // ⚠️⚠️ E a DISTÂNCIA abre em 149 (consertos do review da onda A do lote 5): de 140, o botão − de 10 em
    // 10 fazia o BATEU aparecer em 50, com um vão de 10 (~8 px na tela) que parecia desenho encostado.
    // De 149 ele aparece em 59, com vão de 19. As outras cenas que leem `contact` seguem em 140.
    contact: {
      distance: scene === 'hitbox' ? 149 : 140,
      width: scene === 'hitbox' ? sceneAreaWidth(130) : 48,
    },
    speed: {
      // ⚠️ A `acceleration` abre com a condição LIGADA (lote 5): a base para em −9 primeiro, e
      // desligar a condição é a comparação que vem depois (sem ela a base passa de −9).
      limited: scene === 'acceleration',
      base: -5,
      ticks: 0,
      samples: { x: 500, velocity: -5, positions: [], velocities: [] },
      spots: [...LUGARES_NAO_SORTEADOS],
    },
    // ⚠️ x 110 e y 150 são os MESMOS números que a Aula 1 pede no bloco "Criar dinossauro".
    // A cena abre onde o projeto dela vai ficar, para o número ter a mesma cara nos dois lugares.
    place: { ...PLACE_PADRAO, visitedX: [...PLACE_PADRAO.visitedX] },
    description: { ...DESCRIPTION_PADRAO },
    stage: { ...STAGE_PADRAO },
    render: { ...RENDER_PADRAO, drawn: [...RENDER_PADRAO.drawn] },
    animation: { ...ANIMATION_PADRAO },
    mirror: { ...MIRROR_PADRAO, painted: [], marks: [] },
    pixels: { ...PIXELS_PADRAO },
    // ⚠️ O jogo abre VAZIO (A4 da onda B): o padrão `loaded: true` é só para o retrato antigo.
    sheet: { ...SHEET_PADRAO, cuts: [], loaded: false },
    lifeline: { ...LIFELINE_PADRAO },
    drive: {
      ...DRIVE_PADRAO,
      trailX: [...DRIVE_PADRAO.trailX],
      trailY: [...DRIVE_PADRAO.trailY],
      prevX: [],
      prevY: [],
    },
    input: { ...INPUT_PADRAO },
    box: { ...BOX_PADRAO },
    hunt: {
      ...HUNT_PADRAO,
      distances: [...HUNT_PADRAO.distances],
      looked: [],
      measured: [...HUNT_PADRAO.measured],
    },
    blueprint: { ...BLUEPRINT_PADRAO, cacti: [] },
    view: { ...VIEW_PADRAO },
    hit: { ...HIT_PADRAO },
    weapon: { ...WEAPON_PADRAO, bullets: [], shotTimes: [] },
    sight: { ...SIGHT_PADRAO },
    walkPad: { ...WALKPAD_PADRAO, ghosts: [] },
    grid: { ...GRID_PADRAO, rows: [...GRID_PADRAO.rows], written: [], marks: [] },
    nursery: { ...NURSERY_PADRAO },
    brains: { ...BRAINS_PADRAO, states: [...BRAINS_PADRAO.states] },
    machines: { ...MACHINES_PADRAO },
    circles: { ...CIRCLES_PADRAO },
    space: { ...SPACE_PADRAO, moved: [] },
    orbit: { ...ORBIT_PADRAO },
    model: { ...MODEL_PADRAO },
    ray: { ...RAY_PADRAO, hits: [] },
    ink: { ...INK_PADRAO, seen: [] },
    light: { ...LIGHT_PADRAO, sides: [] },
    clock: { ...CLOCK_PADRAO },
    caption: '',
  }
}

/**
 * Cópia de cada grupo e de cada lista: o motor é imutável e devolve um estado novo a cada ação.
 * ⚠️⚠️ Nada pode ficar COMPARTILHADO com o original: `stepScene` muta a cópia, e o Desfazer guarda o
 * original. Grupo ou lista novos entram aqui no mesmo commit (`copia-do-estado.test.ts` reprova).
 */
export function cloneScene(state: SceneState): SceneState {
  return {
    evidence: {
      ...state.evidence,
      discoveries: [...state.evidence.discoveries],
      // ⚠️ Cada observação também: a cópia não compartilha objeto nenhum com o estado que o Desfazer
      // guarda (`copia-do-estado.test.ts`, full review de 16/09/2026).
      observations: state.evidence.observations.map((o) => ({ ...o })),
    },
    world: { ...state.world },
    flight: { ...state.flight },
    sound: { ...state.sound, beats: state.sound.beats.map((b) => ({ ...b })) },
    crowd: { ...state.crowd, cacti: state.crowd.cacti.map((c) => ({ ...c })) },
    match: {
      ...state.match,
      tries: state.match.tries.map((t) => ({ ...t })),
      seen: [...state.match.seen],
    },
    contact: { ...state.contact },
    speed: {
      ...state.speed,
      samples: {
        ...state.speed.samples,
        positions: [...state.speed.samples.positions],
        velocities: [...state.speed.samples.velocities],
      },
      spots: [...state.speed.spots],
    },
    place: { ...state.place, visitedX: [...state.place.visitedX] },
    description: { ...state.description },
    stage: { ...state.stage },
    render: { ...state.render, drawn: [...state.render.drawn] },
    animation: { ...state.animation },
    mirror: {
      ...state.mirror,
      painted: [...state.mirror.painted],
      marks: [...state.mirror.marks],
    },
    pixels: { ...state.pixels },
    sheet: { ...state.sheet, cuts: [...state.sheet.cuts] },
    lifeline: { ...state.lifeline },
    drive: {
      ...state.drive,
      trailX: [...state.drive.trailX],
      trailY: [...state.drive.trailY],
      prevX: [...state.drive.prevX],
      prevY: [...state.drive.prevY],
    },
    input: { ...state.input },
    box: { ...state.box },
    hunt: {
      ...state.hunt,
      distances: [...state.hunt.distances],
      looked: [...state.hunt.looked],
      measured: [...state.hunt.measured],
    },
    blueprint: { ...state.blueprint, cacti: state.blueprint.cacti.map((c) => ({ ...c })) },
    view: { ...state.view },
    hit: { ...state.hit },
    weapon: {
      ...state.weapon,
      bullets: [...state.weapon.bullets],
      shotTimes: [...state.weapon.shotTimes],
    },
    sight: { ...state.sight },
    walkPad: { ...state.walkPad, ghosts: state.walkPad.ghosts.map((g) => ({ ...g })) },
    grid: {
      ...state.grid,
      rows: [...state.grid.rows],
      written: [...state.grid.written],
      marks: [...state.grid.marks],
    },
    nursery: { ...state.nursery },
    brains: { ...state.brains, states: [...state.brains.states] },
    machines: { ...state.machines },
    circles: { ...state.circles },
    space: { ...state.space, moved: [...state.space.moved] },
    orbit: { ...state.orbit },
    model: { ...state.model },
    ray: { ...state.ray, hits: [...state.ray.hits] },
    ink: { ...state.ink, seen: [...state.ink.seen] },
    light: { ...state.light, sides: [...state.light.sides] },
    clock: { ...state.clock },
    caption: state.caption,
  }
}

/**
 * Os cactos que estão NA TELA (de 0 a 480), e não os que já saíram e continuam no grupo.
 *
 * ⚠️ Um lugar só para a faixa, o retrato das descobertas e o palco: a faixa da `cleanup` contava
 * todos os vivos ("cactos na tela 17" com 8 desenhados), justo na cena que existe para separar o
 * que está na tela do que está guardado nos bastidores.
 */
export function sceneCactiOnScreen(crowd: SceneCrowd): number {
  return crowd.cacti.filter((c) => c.x >= 0 && c.x <= 480).length
}

/** A regra de contato, num lugar só. A v1 tinha esta conta escrita três vezes, em duas
 *  parametrizações diferentes (por escala e por largura), e elas já não batiam. */
export function sceneContact(contact: SceneContact): boolean {
  return contact.distance <= contact.width / 2 + 18
}

/**
 * A `hitbox` em PORCENTAGEM, como no Estúdio (lote 5 do Raio-X, 16/09/2026).
 *
 * ⚠️⚠️ A Aula 10 manda "área de colisão 80%, mantenha o tamanho do Dino em 64", e a cena falava em
 * largura absoluta (24 a 120): a criança nunca via o número que ia digitar. O motor continua
 * guardando a LARGURA (é o que a regra de contato mede e o que o `resize` do roteiro manda); a
 * porcentagem é a mesma largura dita como o Estúdio diz, sobre o desenho de 64.
 */
export const HITBOX_DINO_SIZE = 64
/** A distância em que os DESENHOS se encostam (a cabeça do Dino e o tronco do cacto). */
export const HITBOX_DRAWINGS_TOUCH = 40
/** O menor vão entre os desenhos que se VÊ no palco quando as áreas encostam. */
export const HITBOX_VISIBLE_GAP = 6
export const sceneAreaPercent = (width: number) => Math.round((width / HITBOX_DINO_SIZE) * 100)
export const sceneAreaWidth = (percent: number) => (percent * HITBOX_DINO_SIZE) / 100
/** O vão entre os dois DESENHOS (negativo quando eles já se misturam). */
export const sceneDrawingsGap = (contact: SceneContact) => contact.distance - HITBOX_DRAWINGS_TOUCH

/** A fileira do placar da `score` antes de a criança passar por alguma tela (lote 5). */
export const PLACAR_NAO_VISTO: readonly number[] = [-1, -1, -1]
/** Os sete lugares do sorteio da `random` (500 a 560, de 10 em 10), nenhum sorteado ainda. */
export const LUGARES_NAO_SORTEADOS: readonly number[] = [0, 0, 0, 0, 0, 0, 0]
/** O primeiro lugar do sorteio e o passo entre dois lugares. */
export const RANDOM_SPOTS = { first: 500, step: 10, count: 7 } as const
/** O rastro da `velocity` guarda até tantos pontinhos (a âncora e os quadros seguintes). */
export const VELOCITY_TRAIL_MAX = 6

/**
 * Registra uma descoberta e guarda o retrato do mundo naquele instante. Um id só entra uma vez em
 * cada lista.
 *
 * ⚠️⚠️ NÃO escreve a legenda (review do lote 2 do Raio-X, 16/09/2026). Escrevia, e o rótulo da meta
 * é a CONCLUSÃO ("Sem aplicar gravidade, o Dino continua subindo", "Saiu da tela, mas continua no
 * grupo dos bastidores"): a cada passo do relógio que chamava o `observe` de novo, a regra da cena
 * voltava para baixo do palco e ficava lá. O rótulo serve ao relatório do professor; quem narra o
 * gesto é o motor, com `state.caption`, e a descoberta é anunciada pela moldura do player.
 */
export function observe(state: SceneState, id: string, label: string, discovered = true): void {
  if (discovered && !state.evidence.discoveries.includes(id)) state.evidence.discoveries.push(id)
  if (!state.evidence.observations.some((o) => o.id === id))
    state.evidence.observations.push({
      id,
      label,
      height: state.flight.peak,
      force: state.flight.atForce,
      gravity: state.flight.atGravity,
      front: state.world.front,
      distance: state.contact.distance,
      width: state.contact.width,
      collision: sceneContact(state.contact),
      points: state.match.points,
      screen: state.match.screen,
      stored: state.crowd.born - state.crowd.removed,
      visible: sceneCactiOnScreen(state.crowd),
      base: state.speed.base,
      x: state.speed.samples.x,
      velocity: state.speed.samples.velocity,
    })
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const between = (v: unknown, min: number, max: number): v is number =>
  num(v) && v >= min && v <= max
const bool = (v: unknown): v is boolean => typeof v === 'boolean'
const strings = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((s) => typeof s === 'string' && s.length <= 80)
const numbers = (v: unknown, max: number): v is number[] =>
  Array.isArray(v) && v.length <= max && v.every(num)

/**
 * Valida um estado que voltou do servidor, grupo a grupo e campo a campo.
 *
 * ⚠️ Explícito de propósito. A versão anterior descobria os campos por reflexão sobre o
 * exemplar inicial, o que fazia qualquer array novo herdar em silêncio um limite genérico.
 * Aqui, campo que ninguém declarou não passa.
 */
export function isSceneState(value: unknown): value is SceneState {
  if (!isRecord(value)) return false
  const { evidence, world, flight, sound, crowd, match, contact, speed, place, description } = value
  const { stage, render, animation, mirror, pixels, sheet, lifeline } = value
  const { drive, input, box, hunt, blueprint, view, hit, weapon, sight, walkPad, grid } = value
  const { nursery, brains, machines, circles, space, orbit, model, ray, ink, light, clock } = value
  if (!isRecord(evidence) || !isRecord(world) || !isRecord(flight) || !isRecord(sound)) return false
  if (!isRecord(crowd) || !isRecord(match) || !isRecord(contact) || !isRecord(speed)) return false
  if (!isRecord(place) || !isRecord(description)) return false
  if (!isRecord(stage) || !isRecord(render)) return false
  if (!isRecord(animation) || !isRecord(mirror) || !isRecord(pixels)) return false
  if (!isRecord(sheet) || !isRecord(lifeline)) return false
  if (!isRecord(drive) || !isRecord(input) || !isRecord(box) || !isRecord(hunt)) return false
  if (!isRecord(blueprint) || !isRecord(view) || !isRecord(hit) || !isRecord(weapon)) return false
  if (!isRecord(sight) || !isRecord(walkPad) || !isRecord(grid)) return false
  if (!isRecord(nursery) || !isRecord(brains) || !isRecord(machines) || !isRecord(circles))
    return false
  if (!isRecord(space) || !isRecord(orbit) || !isRecord(model) || !isRecord(ray)) return false
  if (!isRecord(ink) || !isRecord(light)) return false
  if (typeof value.caption !== 'string' || value.caption.length > 500) return false
  if (!num(evidence.actions) || !num(evidence.hints)) return false
  if (!strings(evidence.discoveries, 40)) return false
  if (!Array.isArray(evidence.observations) || evidence.observations.length > 30) return false
  if (!evidence.observations.every(isSceneObservation)) return false
  if (!bool(world.created) || !bool(world.drawn) || !bool(world.front)) return false
  if (!bool(flight.gravity) || !bool(flight.atGravity)) return false
  if (!num(flight.force) || !num(flight.y) || !num(flight.atForce) || !num(flight.peak))
    return false
  if (flight.time !== null && !num(flight.time)) return false
  if (!bool(sound.onJump) || !num(sound.count) || !num(sound.jumps)) return false
  if (!isCorreDinoExtra(flight, sound, crowd, match)) return false
  if (!isCorreDinoSegundaMetade(value)) return false
  if (!isNucleoLote5(value)) return false
  if (!bool(crowd.timer) || !bool(crowd.cleanup)) return false
  // ⚠️ `interval` PRECISA de faixa, não só de ser finito: com 0 o motor faz
  // `Math.floor(x / 0) = Infinity` e o laço de nascimento trava a aba da criança até
  // estourar a memória. Pelo jogo o campo só chega pela ação `interval` (0,5 a 2), então
  // este validador é a única barreira para um checkpoint corrompido.
  if (!between(crowd.interval, SCENE_LIMITS.interval.min, SCENE_LIMITS.interval.max)) return false
  if (!between(crowd.remainder, 0, SCENE_LIMITS.interval.max)) return false
  if (!num(crowd.born) || !num(crowd.removed) || !num(crowd.elapsed)) return false
  // ⚠️ O teto precisa caber no que o motor PRODUZ. Na cena `spawn` sem o relógio ligado —
  // que é o estado inicial dela, e a lição "em cada quadro nasce outro cacto" — nasce um
  // cacto a cada 1/30 s: dois segundos de brincadeira já dão 60. O motor limpa em
  // `x >= -480`, o que limita o vivo a 288.
  if (!Array.isArray(crowd.cacti) || crowd.cacti.length > 320) return false
  if (!crowd.cacti.every((c) => isRecord(c) && num(c.id) && num(c.x) && num(c.velocity)))
    return false
  if (!bool(match.guarded) || !bool(match.touch) || !bool(match.restartConnected)) return false
  if (match.screen !== 'start' && match.screen !== 'playing' && match.screen !== 'end') return false
  if (!num(match.points) || !num(match.clockRemainder) || !num(match.scoreIdle)) return false
  if (!num(contact.distance) || !num(contact.width)) return false
  if (!bool(speed.limited) || !num(speed.base) || !num(speed.ticks)) return false
  if (!isRecord(speed.samples)) return false
  if (!num(speed.samples.x) || !num(speed.samples.velocity)) return false
  if (!numbers(speed.samples.positions, 12) || !numbers(speed.samples.velocities, 12)) return false
  // ⚠️ O endereço vem com FAIXA, não só finito: ele é desenhado direto no palco, e um x de um
  // milhão num checkpoint corrompido tiraria o sprite da tela sem erro nenhum.
  // ⚠️ Desde o lote 5 a faixa é a da TELA DO CASO (`place.width`/`height`), que vai até 800 × 480.
  const { stageWidth, stageHeight } = SCENE_LIMITS
  if (!between(place.width, stageWidth.min, stageWidth.max)) return false
  if (!between(place.height, stageHeight.min, stageHeight.max)) return false
  if (!between(place.x, 0, place.width) || !between(place.y, 0, place.height)) return false
  if (!between(place.fromX, 0, place.width)) return false
  if (!between(place.fromY, 0, place.height)) return false
  if (!numbers(place.visitedX, 24)) return false
  if (typeof description.text !== 'string' || description.text.length > SCENE_LIMITS.describe.max)
    return false
  if (typeof description.heard !== 'string' || description.heard.length > 260) return false
  if (typeof description.said !== 'string' || description.said.length > 260) return false
  if (!bool(description.heardEmpty) || !num(description.listens)) return false
  if (!between(stage.width, stageWidth.min, stageWidth.max)) return false
  if (!between(stage.height, stageHeight.min, stageHeight.max)) return false
  if (!bool(stage.border) || !num(stage.tried)) return false
  if (!bool(render.loop) || !bool(render.erase) || !bool(render.empty)) return false
  if (!num(render.frames) || !num(render.trail)) return false
  if (!between(render.x, 0, SCENE_LIMITS.placeX.max)) return false
  if (!numbers(render.drawn, DRAW_LOOP_LANE.places)) return false
  if (!isArtState(animation, mirror, pixels, sheet, lifeline)) return false
  if (!isCoreState({ drive, input, box, hunt, blueprint, view, hit, weapon, sight, walkPad, grid }))
    return false
  return isEngineState({
    nursery,
    brains,
    machines,
    circles,
    space,
    orbit,
    model,
    ray,
    ink,
    light,
    clock,
  })
}

/**
 * Os dez grupos do motor, do 3D e do ateliê, e o relógio. Mesma régua: campo a campo, com faixa.
 *
 * ⚠️ A sobra do relógio é uma FRAÇÃO de quadro: fora de [0, 1] é retrato adulterado, e uma sobra
 * enorme despejaria centenas de quadros no próximo passo. ⚠️ Um retrato gravado com a sobra em
 * SEGUNDOS (a primeira versão do lote 4, nunca publicada) continua valendo sem conversão: a sobra
 * dele é menor que `1 / fps`, então lida como fração ela só atrasa o próximo quadro, e uma vez.
 */
function isEngineState(g: Record<string, unknown>): boolean {
  const L = SCENE_LIMITS
  if (!isRecord(g.clock) || !between(g.clock.carry, 0, 1)) return false
  if (!isMotorE3DExtra(g)) return false
  const nursery = g.nursery as Record<string, unknown>
  if (!num(nursery.alive) || !num(nursery.created) || !num(nursery.ticks)) return false
  if (!bool(nursery.recycling)) return false
  const brains = g.brains as Record<string, unknown>
  const ESTADOS = ['parado', 'mirar', 'atirar', 'recarregar']
  if (!Array.isArray(brains.states) || brains.states.length !== 3) return false
  if (!brains.states.every((e) => typeof e === 'string' && ESTADOS.includes(e))) return false
  if (!num(brains.ticks)) return false
  const machines = g.machines as Record<string, unknown>
  if (machines.mode !== 'frames' && machines.mode !== 'seconds') return false
  if (!between(machines.fastX, L.machineX.min, L.machineX.max)) return false
  if (!between(machines.slowX, L.machineX.min, L.machineX.max)) return false
  if (!num(machines.elapsed)) return false
  const circles = g.circles as Record<string, unknown>
  if (!between(circles.distance, L.centers.min, L.centers.max)) return false
  if (!between(circles.a, L.radius.min, L.radius.max)) return false
  if (!between(circles.b, L.radius.min, L.radius.max)) return false
  if (!bool(circles.touched)) return false
  const space = g.space as Record<string, unknown>
  if (!between(space.x, L.spaceX.min, L.spaceX.max)) return false
  if (!between(space.y, L.spaceY.min, L.spaceY.max)) return false
  if (!between(space.z, L.spaceZ.min, L.spaceZ.max)) return false
  if (!strings(space.moved, 3)) return false
  const orbit = g.orbit as Record<string, unknown>
  if (!between(orbit.yaw, L.yaw.min, L.yaw.max)) return false
  if (!between(orbit.pitch, L.pitch.min, L.pitch.max)) return false
  if (!num(orbit.fewest) || !bool(orbit.returned)) return false
  const model = g.model as Record<string, unknown>
  if (!bool(model.wire) || !between(model.yaw, L.yaw.min, L.yaw.max)) return false
  const ray = g.ray as Record<string, unknown>
  if (!between(ray.x, L.pointX.min, L.pointX.max)) return false
  if (!between(ray.y, L.pointY.min, L.pointY.max)) return false
  if (!num(ray.hit) || !numbers(ray.hits, 6)) return false
  const ink = g.ink as Record<string, unknown>
  if (!bool(ink.fill) || !bool(ink.stroke) || !strings(ink.seen, 4)) return false
  const light = g.light as Record<string, unknown>
  if (light.side !== 'left' && light.side !== 'right') return false
  return bool(light.shade) && strings(light.sides, 2)
}

/**
 * Os onze grupos do núcleo do Iniciante 2D.
 *
 * ⚠️ Mesma régua dos outros: campo a campo, com FAIXA onde o número é desenhado no palco. Um
 * checkpoint corrompido com `heroX` de um milhão tiraria o herói do mapa sem erro nenhum.
 */
function isCoreState(g: Record<string, unknown>): boolean {
  const L = SCENE_LIMITS
  const drive = g.drive as Record<string, unknown>
  if (!between(drive.vx, L.velocity.min, L.velocity.max)) return false
  if (!between(drive.vy, L.velocity.min, L.velocity.max)) return false
  // ⚠️ Com FAIXA, e não só "é número": estes quatro são desenhados direto no palco, e é a
  // mesma justificativa que o arquivo já escreve para o `place` e para o `view.heroX`.
  // ⚠️ `driveX`/`driveY` (lote 5): a cena desenha a faixa FORA da tela, à direita e acima.
  if (!between(drive.x, L.driveX.min, L.driveX.max)) return false
  if (!between(drive.y, L.driveY.min, L.driveY.max)) return false
  if (!between(drive.fromX, L.driveX.min, L.driveX.max)) return false
  if (!between(drive.fromY, L.driveY.min, L.driveY.max)) return false
  if (!between(drive.anchorX, L.driveX.min, L.driveX.max)) return false
  if (!between(drive.anchorY, L.driveY.min, L.driveY.max)) return false
  if (!num(drive.ticks)) return false
  const input = g.input as Record<string, unknown>
  if (!bool(input.holding) || !num(input.presses)) return false
  if (!between(input.pressX, L.placeX.min, L.placeX.max)) return false
  if (!between(input.holdX, L.placeX.min, L.placeX.max)) return false
  if (!num(input.ticks)) return false
  const box = g.box as Record<string, unknown>
  if (!between(box.value, L.boxValue.min, L.boxValue.max) || !bool(box.shown)) return false
  if (!num(box.changes)) return false
  const hunt = g.hunt as Record<string, unknown>
  if (!numbers(hunt.distances, 3) || (hunt.distances as number[]).length !== 3) return false
  if (!numbers(hunt.looked, 3) || !num(hunt.chosen) || !bool(hunt.auto) || !num(hunt.ticks))
    return false
  const blueprint = g.blueprint as Record<string, unknown>
  if (!between(blueprint.speed, L.typeSpeed.min, L.typeSpeed.max)) return false
  if (!between(blueprint.life, L.typeLife.min, L.typeLife.max)) return false
  if (!num(blueprint.born) || !num(blueprint.edits)) return false
  const view = g.view as Record<string, unknown>
  if (!between(view.heroX, L.worldX.min, L.worldX.max)) return false
  if (!bool(view.follow) || !bool(view.wasLost)) return false
  const hit = g.hit as Record<string, unknown>
  if (!between(hit.distance, L.approach.min, L.approach.max)) return false
  if (hit.mode !== 'ask' && hit.mode !== 'event') return false
  if (!num(hit.damage) || !bool(hit.touching) || !bool(hit.away)) return false
  const weapon = g.weapon as Record<string, unknown>
  if (!between(weapon.seconds, L.recharge.min, L.recharge.max)) return false
  if (!num(weapon.ready) || !num(weapon.shots) || !num(weapon.refused)) return false
  const sight = g.sight as Record<string, unknown>
  if (!between(sight.targetX, L.aimX.min, L.aimX.max)) return false
  if (!between(sight.targetY, L.aimY.min, L.aimY.max)) return false
  if (!bool(sight.chasing) || !num(sight.shotX) || !num(sight.shotY)) return false
  const walkPad = g.walkPad as Record<string, unknown>
  if (![-1, 0, 1].includes(walkPad.dx as number)) return false
  if (![-1, 0, 1].includes(walkPad.dy as number)) return false
  if (!bool(walkPad.even) || !num(walkPad.distance) || !num(walkPad.best)) return false
  const grid = g.grid as Record<string, unknown>
  if (!Array.isArray(grid.rows) || grid.rows.length !== 6) return false
  if (!grid.rows.every((r) => typeof r === 'string' && /^[.#o]{10}$/.test(r))) return false
  // A lista guarda LETRAS distintas, e o alfabeto do mapa tem três.
  return num(grid.edits) && strings(grid.written, MAP_TILES.length)
}

/**
 * Os campos do lote 5 do Raio-X no motor e no 3D (`pool`, `entity-state`, `delta-time`, `mesh`). Em
 * função própria pela mesma razão do `isArtState`. ⚠️ A travessia com FAIXA: o palco desenha o cacto
 * pela fração dela, e um número fora punha o cacto fora da tela sem erro nenhum.
 */
function isMotorE3DExtra(g: Record<string, unknown>): boolean {
  const nursery = g.nursery as Record<string, unknown>
  if (!num(nursery.onScreen) || nursery.onScreen < 0) return false
  if (!between(nursery.progress, 0, POOL_CROSSING - 1)) return false
  if (!['nada', 'novo', 'voltou'].includes(nursery.last as string)) return false
  const brains = g.brains as Record<string, unknown>
  if (!bool(brains.shared)) return false
  const machines = g.machines as Record<string, unknown>
  if (!num(machines.fastFrames) || machines.fastFrames < 0) return false
  if (!num(machines.slowFrames) || machines.slowFrames < 0) return false
  const model = g.model as Record<string, unknown>
  return MESH_LEVELS.some((n) => n === model.see) && bool(model.sawHalf)
}

/**
 * Os campos do lote 5 do Raio-X na segunda metade do Corre Dino e nos números. Em função própria pela
 * mesma razão do `isArtState`. ⚠️ Listas com o MESMO tamanho que o motor produz: a fileira do placar
 * tem 3 telas, o sorteio 7 lugares e o rastro até `VELOCITY_TRAIL_MAX` pontinhos.
 */
function isCorreDinoSegundaMetade(g: Record<string, unknown>): boolean {
  const L = SCENE_LIMITS
  const match = g.match as Record<string, unknown>
  if (!numbers(match.seen, 3) || match.seen.length !== 3 || !num(match.cleared)) return false
  const speed = g.speed as Record<string, unknown>
  if (!numbers(speed.spots, RANDOM_SPOTS.count) || speed.spots.length !== RANDOM_SPOTS.count)
    return false
  const crowd = g.crowd as Record<string, unknown>
  if (!Array.isArray(crowd.cacti)) return false
  if (!crowd.cacti.every((c) => !isRecord(c) || c.base === undefined || num(c.base))) return false
  const lifeline = g.lifeline as Record<string, unknown>
  if (!num(lifeline.shots) || !['nada', 'tiro', 'batida'].includes(lifeline.last as string))
    return false
  const box = g.box as Record<string, unknown>
  if (!bool(box.created)) return false
  const drive = g.drive as Record<string, unknown>
  if (!num(drive.steps)) return false
  const naFaixa = (lista: unknown, min: number, max: number) =>
    numbers(lista, VELOCITY_TRAIL_MAX) && lista.every((v) => v >= min && v <= max)
  return (
    naFaixa(drive.trailX, L.driveX.min, L.driveX.max) &&
    naFaixa(drive.trailY, L.driveY.min, L.driveY.max) &&
    naFaixa(drive.prevX, L.driveX.min, L.driveX.max) &&
    naFaixa(drive.prevY, L.driveY.min, L.driveY.max)
  )
}

/**
 * Os campos do lote 5 do Raio-X no núcleo do Iniciante 2D (`hold-vs-press`, `group-loop`,
 * `enemy-type`, `contact`, `cooldown`, `aim`, `diagonal`, `tilemap`). Em função própria pela mesma
 * razão do `isArtState`. ⚠️ Com FAIXA onde o número é desenhado, e listas com o MESMO teto que o
 * motor corta (`ENEMY_MAX_CACTI`, `COOLDOWN_SHOT.max`, três fantasmas, uma marca por casa do mapa).
 */
function isNucleoLote5(g: Record<string, unknown>): boolean {
  const L = SCENE_LIMITS
  const input = g.input as Record<string, unknown>
  const pista = HOLD_LANE.start + (HOLD_LANE.places - 1) * HOLD_LANE.step
  if (!between(input.pressFrom, 0, pista) || !between(input.holdFrom, 0, pista)) return false
  if (!num(input.pressSteps) || !num(input.holdSteps)) return false
  const hunt = g.hunt as Record<string, unknown>
  if (!bool(hunt.blind)) return false
  // Consertos do review da onda B do lote 5: o laço conta quadros, e cada régua guarda a foto medida.
  if (!num(hunt.loopTicks) || !numbers(hunt.measured, 3) || hunt.measured.length !== 3) return false
  const blueprint = g.blueprint as Record<string, unknown>
  if (!bool(blueprint.copy) || !bool(blueprint.pending)) return false
  if (!num(blueprint.ticks) || !num(blueprint.seq) || !num(blueprint.editSeq)) return false
  if (!Array.isArray(blueprint.cacti) || blueprint.cacti.length > ENEMY_MAX_CACTI) return false
  const cactoValido = (c: unknown) =>
    isRecord(c) &&
    num(c.id) &&
    num(c.seq) &&
    between(c.x, -60, 540) &&
    between(c.speed, L.typeSpeed.min, L.typeSpeed.max) &&
    between(c.life, L.typeLife.min, L.typeLife.max)
  if (!blueprint.cacti.every(cactoValido)) return false
  const hit = g.hit as Record<string, unknown>
  for (const campo of ['top', 'bottom', 'topTouch', 'bottomTouch'])
    if (!between(hit[campo], 0, CONTACT_HEARTS)) return false
  if (!num(hit.frames) || !num(hit.touches)) return false
  const weapon = g.weapon as Record<string, unknown>
  if (!num(weapon.time) || !num(weapon.refusedAt)) return false
  if (!numbers(weapon.bullets, COOLDOWN_SHOT.max)) return false
  if (!weapon.bullets.every((b) => b >= 0 && b <= COOLDOWN_SHOT.end)) return false
  if (!numbers(weapon.shotTimes, 3)) return false
  const sight = g.sight as Record<string, unknown>
  if (!bool(sight.flying) || !bool(sight.aimed)) return false
  if (!between(sight.bulletX, -40, L.aimX.max + 40)) return false
  if (!between(sight.bulletY, -40, L.aimY.max + 40)) return false
  if (!num(sight.bulletVX) || !num(sight.bulletVY)) return false
  if (!['nada', 'acertou', 'errou'].includes(sight.result as string)) return false
  const walkPad = g.walkPad as Record<string, unknown>
  if (!between(walkPad.x, -60, 60) || !between(walkPad.y, -60, 60)) return false
  if (!['nada', 'reto', 'diagonal', 'corrigida'].includes(walkPad.last as string)) return false
  if (!num(walkPad.strides) || !Array.isArray(walkPad.ghosts) || walkPad.ghosts.length > 3)
    return false
  const fantasmaValido = (f: unknown) =>
    isRecord(f) &&
    ['reto', 'diagonal', 'corrigida'].includes(f.kind as string) &&
    between(f.x, -60, 60) &&
    between(f.y, -60, 60)
  if (!walkPad.ghosts.every(fantasmaValido)) return false
  const grid = g.grid as Record<string, unknown>
  // ⚠️ A marca é da CASA desde os consertos do review da onda B do lote 5 (`#3:4`, uma por casa); a
  // de antes (`#3`) continua aceita, senão uma sessão guardada deixaria de abrir.
  if (!strings(grid.marks, TILEMAP_MARKS_MAX) || !grid.marks.every((m) => TILEMAP_MARK.test(m)))
    return false
  return between(grid.lastRow, -1, L.mapRow.max) && between(grid.lastCol, -1, L.mapCol.max)
}

/**
 * Os campos do lote 5 do Raio-X nos grupos de nascença (Corre Dino, primeira metade). Em função
 * própria pela mesma razão do `isArtState`. ⚠️ As listas com o MESMO teto que o motor corta
 * (`SOUND_BEATS_MAX`, `START_TRIES_MAX`): teto maior aqui deixaria um retrato adulterado crescer, e
 * menor recusaria o que o próprio motor produz.
 */
function isCorreDinoExtra(
  flight: Record<string, unknown>,
  sound: Record<string, unknown>,
  crowd: Record<string, unknown>,
  match: Record<string, unknown>,
): boolean {
  if (!num(flight.base) || !num(flight.before) || !num(flight.beforeForce)) return false
  if (!Array.isArray(sound.beats) || sound.beats.length > SOUND_BEATS_MAX) return false
  if (!sound.beats.every((b) => isRecord(b) && bool(b.pulo) && bool(b.som))) return false
  if (!num(crowd.untimedBorn) || !num(crowd.untimedSeconds)) return false
  if (!Array.isArray(match.tries) || match.tries.length > START_TRIES_MAX) return false
  return match.tries.every(
    (t) => isRecord(t) && (t.input === 'key' || t.input === 'tap') && bool(t.began),
  )
}

/**
 * Os cinco grupos de desenho e de vidas. Em função própria porque `isSceneState` já estava no
 * limite de tamanho que o Biome aceita, e porque eles entram e saem juntos.
 */
function isArtState(
  animation: Record<string, unknown>,
  mirror: Record<string, unknown>,
  pixels: Record<string, unknown>,
  sheet: Record<string, unknown>,
  lifeline: Record<string, unknown>,
): boolean {
  const L = SCENE_LIMITS
  // ⚠️ O quadro é 1 ou 2, e não "um número qualquer": o palco desenha o que estiver aqui, e
  // um 7 vindo de um retrato adulterado deixaria a cena sem desenho nenhum.
  if (animation.frame !== 1 && animation.frame !== 2) return false
  if (!bool(animation.playing) || !bool(animation.onion)) return false
  if (!between(animation.rate, L.rate.min, L.rate.max)) return false
  if (!between(animation.shift, L.shift.min, L.shift.max)) return false
  if (!num(animation.swaps) || !num(animation.elapsed)) return false
  if (!bool(mirror.on) || !between(mirror.line, L.mirrorLine.min, L.mirrorLine.max)) return false
  if (!numbers(mirror.painted, 24) || !num(mirror.lastLine)) return false
  if (!mirror.painted.every((c) => c >= L.column.min && c <= L.column.max)) return false
  if (pixels.kind !== 'pixel' && pixels.kind !== 'vector') return false
  if (!between(pixels.zoom, L.zoom.min, L.zoom.max)) return false
  if (!between(sheet.cell, L.cell.min, L.cell.max)) return false
  if (!between(sheet.size, L.sprite.min, L.sprite.max)) return false
  // ⚠️ Os VALORES, e não só a quantidade: o mesmo que `mirror.painted` já fazia. Um recorte 99
  // vindo de retrato adulterado não desenha nada na folha de quatro pedaços.
  if (!numbers(sheet.cuts, 4)) return false
  if (!sheet.cuts.every((c) => c >= L.cell.min && c <= L.cell.max)) return false
  if (!isAtelieExtra(mirror, sheet)) return false
  if (!bool(lifeline.onHit) || !bool(lifeline.scoring)) return false
  if (!between(lifeline.lives, 0, 3)) return false
  if (!num(lifeline.points) || !num(lifeline.hits)) return false
  return between(lifeline.remainder, 0, 1)
}

/**
 * Os campos do ateliê do lote 5 do Raio-X (`mirror.axis`, `mirror.marks`, `sheet.width`). ⚠️ As
 * marcas pela MESMA régua que o palco desenha (`MARCA_DO_PAPEL`) e com o MESMO teto que o motor corta
 * (`MARCAS_NO_PAPEL`): uma marca que ninguém sabe desenhar não entra no retrato.
 */
function isAtelieExtra(mirror: Record<string, unknown>, sheet: Record<string, unknown>): boolean {
  if (mirror.axis !== 'x' && mirror.axis !== 'y' && mirror.axis !== 'xy') return false
  if (!strings(mirror.marks, MARCAS_NO_PAPEL)) return false
  if (!mirror.marks.every((m) => MARCA_DO_PAPEL.test(m))) return false
  for (const contador of [mirror.strokes, mirror.copies])
    if (!between(contador, 0, GESTOS_NO_PAPEL) || !Number.isInteger(contador)) return false
  if (typeof sheet.loaded !== 'boolean') return false
  return SHEET_CROP_WIDTHS.some((w) => w === sheet.width)
}

function isSceneObservation(value: unknown): value is SceneObservation {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.length > 80) return false
  if (typeof value.label !== 'string' || value.label.length > 500) return false
  if (value.screen !== 'start' && value.screen !== 'playing' && value.screen !== 'end') return false
  if (!bool(value.gravity) || !bool(value.front) || !bool(value.collision)) return false
  return (
    num(value.height) &&
    num(value.force) &&
    num(value.distance) &&
    num(value.width) &&
    num(value.points) &&
    num(value.stored) &&
    num(value.visible) &&
    num(value.base) &&
    num(value.x) &&
    num(value.velocity)
  )
}
