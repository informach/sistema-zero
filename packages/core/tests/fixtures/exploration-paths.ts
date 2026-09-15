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
}
