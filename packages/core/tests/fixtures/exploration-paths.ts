import type { SceneAction, SceneId } from '../../src/learning/scene'

/**
 * Segundos de relógio como a criança os manda: em passos de no máximo 1 s. ⚠️ Desde o review do lote
 * 4 um `advance` de experimentação acima de 1 s é recusado (`SESSION_LIMITS.advanceSeconds`, o teto
 * de custo do servidor); o motor conta quadros, então o mundo é o mesmo de um `advance` inteiro.
 */
const tempo = (segundos: number): SceneAction[] =>
  Array.from({ length: segundos }, () => ({ type: 'advance', seconds: 1 }))

/** Authored success journeys, expressed as child actions rather than state/result flags. */
export const scenePaths: Record<SceneId, SceneAction[]> = {
  // Um eixo por vez, e o terceiro passo volta a um x já visitado numa altura nova.
  coordinates: [
    { type: 'place', x: 300, y: 150 },
    { type: 'place', x: 300, y: 240 },
    { type: 'place', x: 110, y: 240 },
    { type: 'place', x: 110, y: 150 },
    // Lote 5 (G1): a meta do canto, `origin`, pede x 0 e y 0.
    { type: 'place', x: 0, y: 0 },
  ],
  'stage-size': [
    { type: 'border', visible: true },
    { type: 'stage', width: 600, height: 300 },
    { type: 'stage', width: 480, height: 270 },
  ],
  // As três situações do laço, cada uma com o relógio andando: é o tempo que mostra a
  // diferença entre congelado, rastro e movimento.
  'draw-loop': [
    { type: 'advance', seconds: 0.5 },
    { type: 'loop', on: true },
    { type: 'advance', seconds: 0.5 },
    { type: 'advance', seconds: 0.5 },
    { type: 'erase', on: true },
    { type: 'advance', seconds: 0.5 },
  ],
  'screen-reader': [
    { type: 'listen' },
    { type: 'describe', text: 'Corra com o dino e pule os cactos apertando espaço' },
    { type: 'listen' },
  ],
  // Primeiro os dois quadros na mao (com a troca parada), depois devagar e depois rapido:
  // as duas ultimas descobertas sao a MESMA montagem em velocidades diferentes.
  frames: [
    { type: 'frame', index: 2 },
    { type: 'rate', perSecond: 1 },
    { type: 'play', on: true },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'rate', perSecond: 8 },
    { type: 'advance', seconds: 1 },
    // Lote 5 (G4): a prévia rápida PARA, e fica um quadro só na tela.
    { type: 'play', on: false },
  ],
  'onion-skin': [
    { type: 'frame', index: 2 },
    { type: 'shift', offset: 52 },
    { type: 'onion', on: true },
    { type: 'shift', offset: 20 },
  ],
  // Lote 5 (G4): os dois espelhos do Pinta, no meio da grade, e o de cima e de baixo por último.
  symmetry: [
    { type: 'trace', piece: 'asa' },
    { type: 'mirror-mode', mode: 'x' },
    { type: 'trace', piece: 'asa' },
    { type: 'mirror-mode', mode: 'y' },
    { type: 'trace', piece: 'ponta' },
  ],
  'pixel-vector': [
    { type: 'inspect', kind: 'pixel', zoom: 6 },
    { type: 'inspect', kind: 'vector', zoom: 6 },
    { type: 'inspect', kind: 'vector', zoom: 1 },
  ],
  // Lote 5 (G4): a largura do recorte na folha da nave, e o tamanho no jogo depois do 32.
  'sheet-vs-sprite': [
    { type: 'crop', width: 64 },
    { type: 'crop', width: 16 },
    { type: 'crop', width: 32 },
    { type: 'sprite', size: 80 },
  ],
  // O placar SOBE antes da primeira batida: sem ponto nenhum, "os pontos ficaram" nao teria
  // como ser visto.
  lives: [
    { type: 'connect', port: 'condition', enabled: true },
    ...tempo(2),
    { type: 'connect', port: 'life', enabled: true },
    { type: 'collide' },
    { type: 'collide' },
    { type: 'collide' },
  ],
  world: [{ type: 'create' }, { type: 'connect', port: 'draw', enabled: true }],
  // As duas missões e o arranjo do jogo no fim (lote 5 do Raio-X): o Dino aparece, esconde de novo
  // só com a ordem, e volta para a frente.
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  // A gravidade ligada NO AR (lote 5): o Dino passa de 360 sem gravidade e depois volta ao chão.
  gravity: [
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 0.5 },
    { type: 'connect', port: 'gravity', enabled: true },
    ...tempo(3),
  ],
  impulse: [
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 1 },
    { type: 'impulse', force: 14 },
    { type: 'jump', input: 'tap' },
    ...tempo(2),
  ],
  // Som sem pulo, pulo sem som, e um som em cada pulo pelos dois jeitos (lote 5). O salto desta cena
  // dura ~1,6 s (impulso 14).
  'jump-sound': [
    { type: 'jump', input: 'key' },
    { type: 'advance', seconds: 0.2 },
    { type: 'jump', input: 'key' },
    ...tempo(2),
    { type: 'jump', input: 'tap' },
    ...tempo(2),
    { type: 'connect', port: 'sound', enabled: true },
    { type: 'jump', input: 'key' },
    ...tempo(2),
    { type: 'jump', input: 'tap' },
  ],
  spawn: [...tempo(2), { type: 'connect', port: 'timer', enabled: true }, ...tempo(2)],
  cleanup: [...tempo(6), { type: 'connect', port: 'cleanup', enabled: true }, ...tempo(2)],
  // "No início, nada nasceu" pede 2 s com a peça dentro do Se (lote 5 do Raio-X).
  'game-state': [
    { type: 'advance', seconds: 1 },
    { type: 'connect', port: 'condition', enabled: true },
    ...tempo(2),
    { type: 'start', input: 'tap' },
    { type: 'advance', seconds: 1 },
  ],
  controls: [
    { type: 'start', input: 'tap' },
    { type: 'connect', port: 'touch', enabled: true },
    { type: 'start', input: 'tap' },
    { type: 'home' },
    { type: 'start', input: 'key' },
  ],
  // Lote 5 do Raio-X: a partida até a batida, a volta ao início com os cactos na pista, e o Reiniciar
  // que limpa a pista (o toque na tela faz as três coisas, conforme a tela e a escolha).
  restart: [
    { type: 'start', input: 'tap' },
    ...tempo(3),
    { type: 'start', input: 'tap' },
    { type: 'start', input: 'tap' },
    ...tempo(1),
    { type: 'connect', port: 'restart', enabled: true },
    { type: 'start', input: 'tap' },
    { type: 'start', input: 'tap' },
  ],
  // A área grande bate com vão entre os desenhos em 50; em 80% (51,2 de largura) não bate mais.
  hitbox: [
    { type: 'move', distance: 50 },
    { type: 'resize', width: 51.2 },
  ],
  // A peça solta soma no início ANTES de entrar em Se jogando (lote 5): é a comparação obrigatória.
  score: [
    ...tempo(1),
    { type: 'connect', port: 'condition', enabled: true },
    ...tempo(1),
    { type: 'start', input: 'key' },
    ...tempo(3),
    { type: 'collide' },
    ...tempo(2),
  ],
  // Sorteio de verdade, com o número do gesto: 520, 550 e 520 de novo; depois −5 e −6.
  random: [
    { type: 'sample', kind: 'position', unit: 0.3, guided: false },
    { type: 'sample', kind: 'position', unit: 0.75, guided: false },
    { type: 'sample', kind: 'position', unit: 0.35, guided: false },
    { type: 'sample', kind: 'velocity', unit: 0.2, guided: false },
    { type: 'sample', kind: 'velocity', unit: 0.8, guided: false },
  ],
  // "Passar 5 segundos": a base para em −9 no quinto, o sexto tira −10, e sem a condição ela passa.
  acceleration: [
    ...Array.from({ length: 5 }, () => ({
      type: 'sample' as const,
      kind: 'velocity' as const,
      unit: 0,
      guided: false,
    })),
    { type: 'sample', kind: 'velocity', unit: 1, guided: false },
    { type: 'connect', port: 'limit', enabled: false },
    { type: 'sample', kind: 'velocity', unit: 0, guided: false },
  ],
  /* ── O núcleo do Iniciante 2D: o caminho que fecha cada uma ──────────────────────────── */
  // Os dois eixos, um de cada vez: o sinal decide o lado e também cima e baixo.
  velocity: [
    { type: 'velocity', vx: 5, vy: 0 },
    { type: 'advance', seconds: 1 },
    { type: 'velocity', vx: -5, vy: 0 },
    { type: 'advance', seconds: 1 },
    { type: 'velocity', vx: 0, vy: 5 },
    { type: 'advance', seconds: 1 },
    { type: 'velocity', vx: 0, vy: -5 },
    { type: 'advance', seconds: 1 },
    { type: 'velocity', vx: 0, vy: 0 },
    { type: 'advance', seconds: 1 },
  ],
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): UMA tecla. O toque rápido, e depois uma segurada de
  // 2 s que solta (a de cima com um passo só, a de baixo andando em cada quadro).
  'hold-vs-press': [
    { type: 'hold', on: true },
    { type: 'hold', on: false },
    { type: 'hold', on: true },
    ...tempo(2),
    { type: 'hold', on: false },
  ],
  variable: [
    { type: 'store', value: 10 },
    { type: 'change', by: 5 },
    { type: 'show', on: true },
  ],
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): o laço só vale quando TROCA a escolha com o tempo.
  'group-loop': [
    { type: 'look', id: 1 },
    { type: 'look', id: 2 },
    { type: 'look', id: 3 },
    { type: 'choose', id: 2 },
    { type: 'connect', port: 'loop', enabled: true },
    ...tempo(3),
  ],
  // ⚠️ Mudou de propósito (lote 5, G5): a mudança da ficha é vista no quadro seguinte, e a cópia ao nascer
  // só muda os novos.
  'enemy-type': [
    { type: 'spawnOne' },
    { type: 'spawnOne' },
    { type: 'spawnOne' },
    { type: 'define', field: 'speed', value: 7 },
    ...tempo(1),
    { type: 'connect', port: 'copy', enabled: true },
    { type: 'define', field: 'speed', value: 3 },
    { type: 'spawnOne' },
    ...tempo(1),
  ],
  camera: [
    { type: 'walk', x: 700 },
    { type: 'connect', port: 'camera', enabled: true },
    { type: 'walk', x: 900 },
  ],
  // ⚠️ Mudou de propósito (lote 5, G5): as duas pistas ao mesmo tempo, com o encosto em 0.
  contact: [
    { type: 'approach', distance: 0 },
    ...tempo(1),
    // Afastar é metade do gesto: a descoberta é o coração cair DE NOVO quando ele volta.
    { type: 'approach', distance: 150 },
    ...tempo(1),
    { type: 'approach', distance: 0 },
    ...tempo(1),
  ],
  cooldown: [
    { type: 'shoot' },
    { type: 'shoot' },
    { type: 'shoot' },
    { type: 'advance', seconds: 0.5 },
    { type: 'recharge', seconds: 1 },
    { type: 'shoot' },
    { type: 'shoot' },
    { type: 'advance', seconds: 1 },
    { type: 'shoot' },
  ],
  // ⚠️ Mudou de propósito (lote 5, G5): o tiro sai com "Atirar" e voa, reto e depois pela seta.
  aim: [
    { type: 'target', x: 120, y: 220 },
    { type: 'shoot' },
    ...tempo(1),
    { type: 'connect', port: 'aim', enabled: true },
    { type: 'shoot' },
    ...tempo(1),
  ],
  // ⚠️ Mudou de propósito (lote 5, G5): "Andar 1 segundo" no lugar do relógio, reto antes da diagonal.
  diagonal: [
    { type: 'direction', x: 1, y: 0 },
    { type: 'stride' },
    { type: 'direction', x: 1, y: 1 },
    { type: 'stride' },
    { type: 'connect', port: 'even', enabled: true },
    { type: 'stride' },
  ],
  // ⚠️ Mudou de propósito (lote 5, G5): as moedas no ar e a mesma peça em outra linha.
  tilemap: [
    { type: 'paint-tile', row: 3, col: 4, tile: '#' },
    { type: 'paint-tile', row: 2, col: 3, tile: 'o' },
    { type: 'paint-tile', row: 2, col: 4, tile: 'o' },
    { type: 'paint-tile', row: 2, col: 5, tile: 'o' },
    { type: 'paint-tile', row: 1, col: 7, tile: '#' },
  ],
  // O contador de criados sobe três vezes; só então a reciclagem entra e o relógio prova que ele
  // parou. Ligar o fio primeiro esconderia o vazamento que a cena existe para mostrar.
  pool: [
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'connect', port: 'recycle', enabled: true },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
  ],
  // ⚠️ Os TRÊS em estados diferentes: "cada um no seu" é o que a meta diz, e a independência
  // só se prova mudando um quando já havia diversidade para ficar parada.
  'entity-state': [
    { type: 'brain', id: 1, state: 'mirar' },
    { type: 'brain', id: 2, state: 'atirar' },
    { type: 'brain', id: 3, state: 'recarregar' },
    { type: 'advance', seconds: 1 },
    // Lote 5 (G6): mudar uma só depois do relógio, e o estado no jogo mudando as três.
    { type: 'brain', id: 3, state: 'parado' },
    { type: 'brain-scope', shared: true },
    { type: 'brain', id: 2, state: 'atirar' },
  ],
  // Lote 5 (G6): "chegaram juntos" é na CHEGADA, três segundos andando a cada segundo.
  'delta-time': [
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'count', kind: 'seconds' },
    ...tempo(3),
  ],
  // Encosta com o relógio e, com a distância PARADA, encolhe um raio: o mesmo lugar deixa de ser
  // uma batida, e é essa troca que prova que quem decide é a conta.
  'circle-collision': [
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'radius', which: 'a', value: 10 },
  ],
  // Lote 5 (G6): z negativo é o fundo, e a sombra ANDA no chão com o cubo no ar.
  'axis-z': [
    { type: 'place3d', x: 0, y: 0, z: -80 },
    { type: 'place3d', x: 0, y: 70, z: -80 },
    { type: 'place3d', x: 60, y: 70, z: -80 },
  ],
  // ⚠️ Sai da vista de sempre ANTES de voltar: as três metas são sobre GIRAR.
  'camera-3d': [
    { type: 'orbit', yaw: 0, pitch: 1 },
    { type: 'orbit', yaw: 1, pitch: 1 },
    { type: 'orbit', yaw: 3, pitch: 2 },
    { type: 'recenter' },
  ],
  // Lote 5 (G6): os pontos pela pele transparente, e a pele voltando por cima deles.
  mesh: [
    { type: 'see-points', level: 'metade' },
    { type: 'see-points', level: 'nada' },
  ],
  // A segunda mira é a que ensina: ali há duas caixas alinhadas, e a reta para na da frente.
  'pick-ray': [
    { type: 'point', x: 100, y: 125 },
    { type: 'point', x: 330, y: 155 },
  ],
  'fill-stroke': [
    { type: 'ink', part: 'stroke', on: false },
    { type: 'ink', part: 'fill', on: false },
    { type: 'ink', part: 'stroke', on: true },
    { type: 'ink', part: 'fill', on: true },
  ],
  shading: [
    { type: 'shade', on: true },
    { type: 'shade', on: false },
    { type: 'shade', on: true },
    { type: 'light', side: 'right' },
  ],
}
