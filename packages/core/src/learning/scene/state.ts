import { isRecord, MAP_TILES, SCENE_LIMITS, type SceneId, type SceneSetup } from './actions'

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
}
export interface SceneSound {
  onJump: boolean
  count: number
  jumps: number
}
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
}
export interface SceneContact {
  distance: number
  width: number
}
/** O endereço do sprite na tela, e de onde ele veio. O par anterior é o que permite comparar
 *  sem guardar de memória: a cena desenha o fantasma da posição de antes. */
export interface ScenePlace {
  x: number
  y: number
  fromX: number
  fromY: number
  /** Os x já visitados, para reconhecer "mesmo x, altura diferente" sem guardar o histórico. */
  visitedX: number[]
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
  /** Quadros que o relógio andou desde a última troca de chave. */
  frames: number
  /** Desenhos acumulados na tela (o rastro de quem não limpa). */
  trail: number
}
/** A descrição do jogo e o que o leitor de tela leu em voz alta na última vez. */
export interface SceneDescription {
  text: string
  /** O que foi lido. Vazio antes do primeiro "ouvir". */
  heard: string
  /** Ela ouviu a tela SEM descrição, que é a descoberta que abre a cena. */
  heardEmpty: boolean
}
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
  /** O quanto o desenho do quadro 2 andou em relação ao do quadro 1. */
  shift: number
}
/** O espelho: onde ele está, o que já foi pintado e com que eixo. */
export interface SceneMirror {
  on: boolean
  /** A linha do espelho, entre colunas: 1 a 11 num papel de 12 colunas. */
  line: number
  /** As colunas pintadas, na ordem. */
  painted: number[]
  /** O eixo usado no último traço espelhado. 0 = nenhum ainda. */
  lastLine: number
}
/** A lupa sobre as duas pedras: qual delas e de quão perto. */
export interface ScenePixels {
  kind: 'pixel' | 'vector'
  zoom: number
}
/** A folha de desenhos e o tamanho que o recorte tem dentro do jogo. */
export interface SceneSheet {
  /** Qual das quatro células está recortada. */
  cell: number
  /** O tamanho do sprite no jogo, em pixels. A folha NÃO muda com ele. */
  size: number
  /** As células que ela já recortou. */
  cuts: number[]
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
  ticks: number
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
}
/** A caixa que guarda um número. Guardar, mudar e mostrar são três coisas diferentes. */
export interface SceneBox {
  value: number
  shown: boolean
  changes: number
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
}
/** A ficha do tipo de inimigo, e quantos nasceram dela. */
export interface SceneBlueprint {
  speed: number
  life: number
  born: number
  edits: number
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
   * ⚠️ É o que separa "afastar e voltar" de "trocar a pergunta". O `mode` zera o `touching` de
   * propósito (senão o acontecimento nunca dispararia no modo novo), e sem este campo alternar
   * os dois botões com o cacto parado em cima do Dino fechava a meta do afastamento.
   */
  away: boolean
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
}
/** A mira: onde está o alvo e para onde o tiro foi. */
export interface SceneSight {
  targetX: number
  targetY: number
  chasing: boolean
  /** O último tiro, guardado para a comparação. */
  shotX: number
  shotY: number
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
}
/** O mapa escrito em texto: seis linhas de dez casas. */
export interface SceneGrid {
  rows: string[]
  /** Casas que a criança trocou. */
  edits: number
  /**
   * As letras DISTINTAS que ela já escreveu.
   * ⚠️ "A MESMA letra virou sempre a mesma coisa" precisa da mesma letra em lugares
   * diferentes; contando só as trocas, escrever três letras DIFERENTES fechava a meta.
   * ⚠️⚠️ Distintas, e não uma por troca: o mapa tem 60 casas e a lista não pode crescer com
   * elas — passar do teto que o validador aceita faz o retrato ser recusado pelo leitor.
   */
  written: string[]
}

/* ── Os grupos do motor, do 3D e do ateliê (15/09/2026) ──────────────────────────────────── */
/** O nascedouro: quantos existem, quantos foram CRIADOS e se o corpo é reaproveitado. */
export interface SceneNursery {
  alive: number
  /** O contador que só sobe — é ele que denuncia o vazamento. */
  created: number
  recycling: boolean
  ticks: number
}
/** O cérebro de cada personagem: em que estado ele está agora. */
export type BrainState = 'parado' | 'mirar' | 'atirar' | 'recarregar'
export interface SceneBrains {
  states: BrainState[]
  ticks: number
}
/** Duas máquinas com o mesmo jogo: uma rápida e uma devagar. */
export interface SceneMachines {
  /** O que o jogo conta para medir o tempo. */
  mode: 'frames' | 'seconds'
  fastX: number
  slowX: number
  elapsed: number
}
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
/** O modelo: os pontos ligados por baixo da roupa. */
export interface SceneModelView {
  wire: boolean
  yaw: number
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
const PLACE_PADRAO: ScenePlace = { x: 110, y: 150, fromX: 110, fromY: 150, visitedX: [110] }
const DESCRIPTION_PADRAO: SceneDescription = { text: '', heard: '', heardEmpty: false }
// ⚠️ A tela nasce em 800 × 480, que é o que o bloco "Preparar o jogo" traz de fábrica — a
// Aula 1 pede para trocar por 480 × 270, e é essa troca que a cena existe para ensinar.
const STAGE_PADRAO: SceneStageSize = { width: 800, height: 480, border: false, tried: 0 }
const RENDER_PADRAO: SceneRender = { loop: false, erase: false, frames: 0, trail: 0 }
// ⚠️ A troca nasce PARADA e o fantasma DESLIGADO: as duas cenas de animação começam no
// desenho parado, que é a coisa que elas querem que a criança veja primeiro.
const ANIMATION_PADRAO: SceneAnimation = {
  frame: 1,
  playing: false,
  rate: 4,
  swaps: 0,
  elapsed: 0,
  onion: false,
  // 40 é um passo GRANDE de propósito: sem o fantasma ela chuta, e com ele vê que chutou.
  shift: 40,
}
const MIRROR_PADRAO: SceneMirror = { on: false, line: 6, painted: [], lastLine: 0 }
const PIXELS_PADRAO: ScenePixels = { kind: 'pixel', zoom: 1 }
const SHEET_PADRAO: SceneSheet = { cell: 1, size: 48, cuts: [] }
const LIFELINE_PADRAO: SceneLifeline = {
  lives: 3,
  points: 0,
  onHit: false,
  scoring: false,
  hits: 0,
  remainder: 0,
}

/* Os padrões do núcleo do Iniciante 2D. */
const DRIVE_PADRAO: SceneDrive = { vx: 0, vy: 0, x: 60, y: 135, fromX: 60, fromY: 135, ticks: 0 }
const INPUT_PADRAO: SceneInput = { holding: false, presses: 0, pressX: 40, holdX: 40, ticks: 0 }
// ⚠️ Sem `displayed`: ele era escrito, validado e NUNCA lido. A tela mostra o valor VIVO (é o
// que a cena ensina), então um retrato do que ela mostrou não tinha leitor.
const BOX_PADRAO: SceneBox = { value: 0, shown: false, changes: 0 }
// ⚠️ O do meio é o mais perto de propósito: escolher "o primeiro do grupo" dá errado, e é
// exatamente essa a dor que o laço existe para resolver.
const HUNT_PADRAO: SceneHunt = {
  distances: [180, 90, 140],
  looked: [],
  chosen: 0,
  auto: false,
  ticks: 0,
}
const BLUEPRINT_PADRAO: SceneBlueprint = { speed: 3, life: 2, born: 0, edits: 0 }
const VIEW_PADRAO: SceneView = { heroX: 200, follow: false, wasLost: false }
const HIT_PADRAO: SceneHit = {
  distance: 120,
  mode: 'ask',
  damage: 0,
  touching: false,
  away: false,
}
const WEAPON_PADRAO: SceneWeapon = { seconds: 0, ready: 0, shots: 0, refused: 0 }
const SIGHT_PADRAO: SceneSight = { targetX: 360, targetY: 80, chasing: false, shotX: 0, shotY: 0 }
const WALKPAD_PADRAO: SceneWalkPad = { dx: 0, dy: 0, even: false, distance: 0, best: 0 }
// O mapa que a criança edita: chão embaixo, o resto vazio. `#` é bloco, `o` é moeda.
const GRID_PADRAO: SceneGrid = {
  rows: ['..........', '..........', '..........', '..........', '..........', '##########'],
  edits: 0,
  written: [],
}

/* Os padrões do motor, do 3D e do ateliê. */
const NURSERY_PADRAO: SceneNursery = { alive: 0, created: 0, recycling: false, ticks: 0 }
const BRAINS_PADRAO: SceneBrains = { states: ['parado', 'parado', 'parado'], ticks: 0 }
const MACHINES_PADRAO: SceneMachines = { mode: 'frames', fastX: 40, slowX: 40, elapsed: 0 }
const CIRCLES_PADRAO: SceneCircles = { distance: 140, a: 30, b: 30, touched: false }
// ⚠️ Nasce no chão e no meio: o y de partida é ZERO porque a cena existe para mostrar que
// subir é +y — e ela precisa começar de onde dá para subir.
const SPACE_PADRAO: SceneSpace = { x: 0, y: 0, z: 0, moved: [] }
const ORBIT_PADRAO: SceneOrbit = { yaw: 1, pitch: 1, fewest: 3, returned: false }
const MODEL_PADRAO: SceneModelView = { wire: false, yaw: 1 }
const RAY_PADRAO: SceneRay = { x: 240, y: 135, hit: 0, hits: [] }
const INK_PADRAO: SceneInk = { fill: true, stroke: true, seen: [] }
const LIGHT_PADRAO: SceneLight = { side: 'left', shade: false, sides: [] }

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
  return saida
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

export function initialScene({ scene, initialImpulse }: SceneStart): SceneState {
  const impulso = initialImpulse ?? 9
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
    },
    sound: { onJump: false, count: 0, jumps: 0 },
    crowd: {
      timer: false,
      interval: 1,
      cleanup: false,
      remainder: 0,
      born: 0,
      removed: 0,
      cacti: [],
      elapsed: 0,
    },
    match: {
      guarded: false,
      touch: false,
      restartConnected: false,
      screen: 'start',
      points: 0,
      clockRemainder: 0,
      scoreIdle: 0,
    },
    contact: { distance: 140, width: 48 },
    speed: {
      limited: false,
      base: -5,
      ticks: 0,
      samples: { x: 500, velocity: -5, positions: [], velocities: [] },
    },
    // ⚠️ x 110 e y 150 são os MESMOS números que a Aula 1 pede no bloco "Criar dinossauro".
    // A cena abre onde o projeto dela vai ficar, para o número ter a mesma cara nos dois lugares.
    place: { ...PLACE_PADRAO, visitedX: [...PLACE_PADRAO.visitedX] },
    description: { ...DESCRIPTION_PADRAO },
    stage: { ...STAGE_PADRAO },
    render: { ...RENDER_PADRAO },
    animation: { ...ANIMATION_PADRAO },
    mirror: { ...MIRROR_PADRAO, painted: [] },
    pixels: { ...PIXELS_PADRAO },
    sheet: { ...SHEET_PADRAO, cuts: [] },
    lifeline: { ...LIFELINE_PADRAO },
    drive: { ...DRIVE_PADRAO },
    input: { ...INPUT_PADRAO },
    box: { ...BOX_PADRAO },
    hunt: { ...HUNT_PADRAO, distances: [...HUNT_PADRAO.distances], looked: [] },
    blueprint: { ...BLUEPRINT_PADRAO },
    view: { ...VIEW_PADRAO },
    hit: { ...HIT_PADRAO },
    weapon: { ...WEAPON_PADRAO },
    sight: { ...SIGHT_PADRAO },
    walkPad: { ...WALKPAD_PADRAO },
    grid: { ...GRID_PADRAO, rows: [...GRID_PADRAO.rows], written: [] },
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
    caption: '',
  }
}

/** Cópia rasa por grupo — o motor é imutável e devolve um estado novo a cada ação. */
export function cloneScene(state: SceneState): SceneState {
  return {
    evidence: {
      ...state.evidence,
      discoveries: [...state.evidence.discoveries],
      observations: [...state.evidence.observations],
    },
    world: { ...state.world },
    flight: { ...state.flight },
    sound: { ...state.sound },
    crowd: { ...state.crowd, cacti: state.crowd.cacti.map((c) => ({ ...c })) },
    match: { ...state.match },
    contact: { ...state.contact },
    speed: {
      ...state.speed,
      samples: {
        ...state.speed.samples,
        positions: [...state.speed.samples.positions],
        velocities: [...state.speed.samples.velocities],
      },
    },
    place: { ...state.place, visitedX: [...state.place.visitedX] },
    description: { ...state.description },
    stage: { ...state.stage },
    render: { ...state.render },
    animation: { ...state.animation },
    mirror: { ...state.mirror, painted: [...state.mirror.painted] },
    pixels: { ...state.pixels },
    sheet: { ...state.sheet, cuts: [...state.sheet.cuts] },
    lifeline: { ...state.lifeline },
    drive: { ...state.drive },
    input: { ...state.input },
    box: { ...state.box },
    hunt: { ...state.hunt, distances: [...state.hunt.distances], looked: [...state.hunt.looked] },
    blueprint: { ...state.blueprint },
    view: { ...state.view },
    hit: { ...state.hit },
    weapon: { ...state.weapon },
    sight: { ...state.sight },
    walkPad: { ...state.walkPad },
    grid: { ...state.grid, rows: [...state.grid.rows], written: [...state.grid.written] },
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
    caption: state.caption,
  }
}

/** A regra de contato, num lugar só. A v1 tinha esta conta escrita três vezes, em duas
 *  parametrizações diferentes (por escala e por largura), e elas já não batiam. */
export function sceneContact(contact: SceneContact): boolean {
  return contact.distance <= contact.width / 2 + 18
}

/** Registra uma descoberta e guarda o retrato do mundo naquele instante. Um id só entra uma
 *  vez em cada lista; a legenda é sempre atualizada, porque é ela que a criança lê. */
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
      visible: state.crowd.cacti.filter((c) => c.x >= 0 && c.x <= 480).length,
      base: state.speed.base,
      x: state.speed.samples.x,
      velocity: state.speed.samples.velocity,
    })
  state.caption = label
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
  const { nursery, brains, machines, circles, space, orbit, model, ray, ink, light } = value
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
  const { placeX, placeY } = SCENE_LIMITS
  if (!between(place.x, placeX.min, placeX.max) || !between(place.y, placeY.min, placeY.max))
    return false
  if (!between(place.fromX, placeX.min, placeX.max)) return false
  if (!between(place.fromY, placeY.min, placeY.max)) return false
  if (!numbers(place.visitedX, 24)) return false
  if (typeof description.text !== 'string' || description.text.length > SCENE_LIMITS.describe.max)
    return false
  if (typeof description.heard !== 'string' || description.heard.length > 260) return false
  if (!bool(description.heardEmpty)) return false
  const { stageWidth, stageHeight } = SCENE_LIMITS
  if (!between(stage.width, stageWidth.min, stageWidth.max)) return false
  if (!between(stage.height, stageHeight.min, stageHeight.max)) return false
  if (!bool(stage.border) || !num(stage.tried)) return false
  if (!bool(render.loop) || !bool(render.erase)) return false
  if (!num(render.frames) || !num(render.trail)) return false
  if (!isArtState(animation, mirror, pixels, sheet, lifeline)) return false
  if (!isCoreState({ drive, input, box, hunt, blueprint, view, hit, weapon, sight, walkPad, grid }))
    return false
  return isEngineState({ nursery, brains, machines, circles, space, orbit, model, ray, ink, light })
}

/** Os dez grupos do motor, do 3D e do ateliê. Mesma régua: campo a campo, com faixa. */
function isEngineState(g: Record<string, unknown>): boolean {
  const L = SCENE_LIMITS
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
  if (!between(drive.x, L.placeX.min, L.placeX.max)) return false
  if (!between(drive.y, L.placeY.min, L.placeY.max)) return false
  if (!between(drive.fromX, L.placeX.min, L.placeX.max)) return false
  if (!between(drive.fromY, L.placeY.min, L.placeY.max)) return false
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
  if (!bool(lifeline.onHit) || !bool(lifeline.scoring)) return false
  if (!between(lifeline.lives, 0, 3)) return false
  if (!num(lifeline.points) || !num(lifeline.hits)) return false
  return between(lifeline.remainder, 0, 1)
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
