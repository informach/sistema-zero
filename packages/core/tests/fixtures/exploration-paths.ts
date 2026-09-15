import type { SceneAction, SceneId } from '../../src/learning/scene'

/** Authored success journeys, expressed as child actions rather than state/result flags. */
export const scenePaths: Record<SceneId, SceneAction[]> = {
  // Um eixo por vez, e o terceiro passo volta a um x já visitado numa altura nova.
  coordinates: [
    { type: 'place', x: 300, y: 150 },
    { type: 'place', x: 300, y: 240 },
    { type: 'place', x: 110, y: 240 },
    { type: 'place', x: 110, y: 150 },
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
  ],
  'onion-skin': [
    { type: 'frame', index: 2 },
    { type: 'shift', offset: 52 },
    { type: 'onion', on: true },
    { type: 'shift', offset: 20 },
  ],
  symmetry: [
    { type: 'paint', column: 3 },
    { type: 'mirror', on: true, line: 6 },
    { type: 'paint', column: 4 },
    { type: 'mirror', on: true, line: 9 },
    { type: 'paint', column: 7 },
  ],
  'pixel-vector': [
    { type: 'inspect', kind: 'pixel', zoom: 6 },
    { type: 'inspect', kind: 'vector', zoom: 6 },
    { type: 'inspect', kind: 'vector', zoom: 1 },
  ],
  'sheet-vs-sprite': [
    { type: 'cut', cell: 1 },
    { type: 'cut', cell: 2 },
    { type: 'sprite', size: 80 },
  ],
  // O placar SOBE antes da primeira batida: sem ponto nenhum, "os pontos ficaram" nao teria
  // como ser visto.
  lives: [
    { type: 'connect', port: 'condition', enabled: true },
    { type: 'advance', seconds: 2 },
    { type: 'connect', port: 'life', enabled: true },
    { type: 'collide' },
    { type: 'collide' },
    { type: 'collide' },
  ],
  world: [{ type: 'create' }, { type: 'connect', port: 'draw', enabled: true }],
  layers: [{ type: 'layer', front: true }],
  gravity: [
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 0.5 },
    { type: 'connect', port: 'gravity', enabled: true },
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 1 },
  ],
  impulse: [
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 1 },
    { type: 'impulse', force: 14 },
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 2 },
  ],
  'jump-sound': [
    { type: 'jump', input: 'key' },
    { type: 'advance', seconds: 0.1 },
    { type: 'jump', input: 'key' },
    { type: 'connect', port: 'sound', enabled: true },
    { type: 'jump', input: 'key' },
    { type: 'advance', seconds: 1 },
    { type: 'jump', input: 'tap' },
    { type: 'advance', seconds: 1 },
    { type: 'jump', input: 'key' },
  ],
  spawn: [
    { type: 'advance', seconds: 2 },
    { type: 'connect', port: 'timer', enabled: true },
    { type: 'advance', seconds: 2 },
  ],
  cleanup: [
    { type: 'advance', seconds: 6 },
    { type: 'connect', port: 'cleanup', enabled: true },
    { type: 'advance', seconds: 2 },
  ],
  'game-state': [
    { type: 'advance', seconds: 1 },
    { type: 'connect', port: 'condition', enabled: true },
    { type: 'advance', seconds: 1 },
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
  restart: [
    { type: 'start', input: 'tap' },
    { type: 'move', distance: 25 },
    { type: 'connect', port: 'restart', enabled: true },
    { type: 'restart' },
  ],
  hitbox: [
    { type: 'move', distance: 25 },
    { type: 'move', distance: 60 },
    { type: 'resize', width: 100 },
  ],
  score: [
    { type: 'connect', port: 'condition', enabled: true },
    { type: 'advance', seconds: 1 },
    { type: 'start', input: 'key' },
    { type: 'advance', seconds: 3 },
    { type: 'collide' },
    { type: 'advance', seconds: 2 },
  ],
  random: [
    { type: 'sample', kind: 'position', unit: 0, guided: true },
    { type: 'sample', kind: 'position', unit: 1, guided: true },
    { type: 'sample', kind: 'velocity', unit: 0, guided: true },
    { type: 'sample', kind: 'velocity', unit: 1, guided: true },
  ],
  acceleration: [
    { type: 'sample', kind: 'velocity', unit: 0, guided: true },
    { type: 'connect', port: 'limit', enabled: true },
    { type: 'clock' },
    { type: 'clock' },
    { type: 'clock' },
    { type: 'clock' },
    { type: 'clock' },
    { type: 'sample', kind: 'velocity', unit: 1, guided: true },
  ],
  /* ── O núcleo do Iniciante 2D: o caminho que fecha cada uma ──────────────────────────── */
  velocity: [
    { type: 'velocity', vx: 5, vy: 0 },
    { type: 'advance', seconds: 1 },
    { type: 'velocity', vx: -5, vy: 0 },
    { type: 'advance', seconds: 1 },
    { type: 'velocity', vx: 0, vy: 0 },
    { type: 'advance', seconds: 1 },
  ],
  // ⚠️ Apertar ANTES de segurar: a comparação das duas raquetes só conta depois de a criança
  // ter feito as duas coisas, senão a diferença seria só "uma delas nunca andou".
  'hold-vs-press': [
    { type: 'press' },
    { type: 'hold', on: true },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
  ],
  variable: [
    { type: 'store', value: 10 },
    { type: 'change', by: 5 },
    { type: 'show', on: true },
  ],
  'group-loop': [
    { type: 'look', id: 1 },
    { type: 'look', id: 2 },
    { type: 'look', id: 3 },
    { type: 'choose', id: 2 },
    { type: 'connect', port: 'loop', enabled: true },
  ],
  'enemy-type': [
    { type: 'spawnOne' },
    { type: 'spawnOne' },
    { type: 'spawnOne' },
    { type: 'define', field: 'speed', value: 7 },
  ],
  camera: [
    { type: 'walk', x: 700 },
    { type: 'connect', port: 'camera', enabled: true },
    { type: 'walk', x: 900 },
  ],
  contact: [
    { type: 'approach', distance: 20 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'mode', kind: 'event' },
    { type: 'advance', seconds: 1 },
    // Afastar é metade do gesto: a descoberta é a vida cair DE NOVO quando ele volta.
    { type: 'approach', distance: 150 },
    { type: 'advance', seconds: 1 },
    { type: 'approach', distance: 20 },
    { type: 'advance', seconds: 1 },
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
  aim: [
    { type: 'target', x: 120, y: 220 },
    { type: 'connect', port: 'aim', enabled: true },
    { type: 'advance', seconds: 1 },
  ],
  diagonal: [
    { type: 'direction', x: 1, y: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'connect', port: 'even', enabled: true },
    { type: 'advance', seconds: 1 },
  ],
  tilemap: [
    { type: 'paint-tile', row: 3, col: 4, tile: '#' },
    { type: 'paint-tile', row: 3, col: 5, tile: '#' },
    { type: 'paint-tile', row: 3, col: 6, tile: '#' },
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
  ],
  'delta-time': [
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'count', kind: 'seconds' },
    { type: 'advance', seconds: 1 },
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
  'axis-z': [
    { type: 'place3d', x: 0, y: 0, z: 80 },
    { type: 'place3d', x: 0, y: 70, z: 80 },
  ],
  // ⚠️ Sai da vista de sempre ANTES de voltar: as três metas são sobre GIRAR.
  'camera-3d': [
    { type: 'orbit', yaw: 0, pitch: 1 },
    { type: 'orbit', yaw: 1, pitch: 1 },
    { type: 'orbit', yaw: 3, pitch: 2 },
    { type: 'recenter' },
  ],
  mesh: [
    { type: 'wireframe', on: true },
    { type: 'wireframe', on: false },
  ],
  // A segunda mira é a que ensina: ali há duas caixas alinhadas, e a reta para na da frente.
  'pick-ray': [
    { type: 'point', x: 110, y: 120 },
    { type: 'point', x: 330, y: 145 },
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
