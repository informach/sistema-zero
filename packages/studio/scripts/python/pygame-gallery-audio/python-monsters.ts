/**
 * Python Monsters: the overworld and battle music, the evolution fanfare, the "!" of a trainer
 * who spots you and the six attack sounds (one per attack animation).
 */

import { type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

const overworld: Song = {
  bpm: 112,
  division: 4,
  repeat: 2,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.12,
      vibrato: [0.004, 5],
      steps:
        'E5 - G5 - C6~ C6~ - - B5 - A5 - G5~ G5~ - - ' +
        'A5 - G5 - E5 - C5 - D5~ D5~ D5~ - - - - - ' +
        'E5 - G5 - C6~ C6~ - - D6 - C6 - B5 - A5 - ' +
        'G5 - A5 - B5 - D6 - C6~ C6~ C6~ C6~ - - - - ' +
        'F5 - A5 - C6 - A5 - G5 - E5 - C5~ C5~ - - ' +
        'D5 - F5 - A5 - G5 - E5~ E5~ E5~ - - - - - ' +
        'F5 - E5 - D5 - C5 - B4 - C5 - D5 - G5 - ' +
        'E5 - D5 - C5~ C5~ C5~ C5~ C5~ C5~ - - - - - - - -',
    },
    {
      wave: 'triangle',
      volume: 0.24,
      gate: 0.6,
      steps:
        'C3 - G3 - C3 - G3 - C3 - G3 - C3 - G3 - ' +
        'F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - ' +
        'C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - ' +
        'F2 - C3 - G2 - D3 - C3 - G3 - C3 - G3 - ' +
        'F2 - C3 - F2 - C3 - C3 - G3 - C3 - G3 - ' +
        'D3 - A3 - D3 - A3 - A2 - E3 - A2 - E3 - ' +
        'F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - ' +
        'C3 - G3 - C3 - G3 - C3 - G3 - C3 - -',
    },
  ],
  drums: Array(8).fill('k - h - s - h - k - h k s - h -').join(' '),
  drumVolume: 0.18,
}

const battle: Song = {
  bpm: 152,
  division: 4,
  repeat: 2,
  tracks: [
    {
      wave: 'square',
      volume: 0.1,
      steps:
        'A4 - - A4 C5 - E5 - D5 - C5 - B4 - G4 - ' +
        'A4 - - A4 C5 - E5 - G5~ G5~ F5 - E5~ E5~ - - ' +
        'F5 - - F5 E5 - D5 - C5 - D5 - E5 - A4 - ' +
        'B4 - C5 - D5 - B4 - E5~ E5~ E5~ E5~ G#5~ G#5~ - - ' +
        'A5 - - A5 G5 - E5 - F5 - E5 - D5 - C5 - ' +
        'D5 - - D5 E5 - F5 - G5~ G5~ A5 - G5~ G5~ - - ' +
        'F5 - E5 - D5 - C5 - B4 - C5 - D5 - E5 - ' +
        'A4~ A4~ A4~ A4~ - - E4 - A4~ A4~ A4~ A4~ - - - -',
    },
    {
      wave: 'triangle',
      volume: 0.26,
      gate: 0.55,
      steps: Array(2)
        .fill(
          'A2 A2 A3 A2 A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 ' +
            'F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2 ' +
            'D2 D2 D3 D2 D2 D2 D3 D2 C2 C2 C3 C2 C2 C2 C3 C2 ' +
            'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 G#2 G#2 G#3 G#2',
        )
        .join(' '),
    },
  ],
  drums: Array(8).fill('k - h k s - h - k k h - s - h s').join(' '),
  drumVolume: 0.26,
}

const evolution: Song = {
  bpm: 132,
  division: 4,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.14,
      vibrato: [0.006, 7],
      steps:
        'C5 E5 G5 C6 E5 G5 C6 E6 G5 C6 E6 G6~ G6~ G6~ - - ' +
        'F5 A5 C6 F6 G5 B5 D6 G6 C6~ C6~ E6~ E6~ G6~ G6~ G6~ G6~ ' +
        'C7~ C7~ C7~ C7~ C7~ C7~ C7~ C7~ - - - - - - - -',
    },
    {
      wave: 'triangle',
      volume: 0.26,
      steps:
        'C3~ C3~ C3~ C3~ E3~ E3~ E3~ E3~ G3~ G3~ G3~ G3~ C4~ C4~ C4~ C4~ ' +
        'F3~ F3~ F3~ F3~ G3~ G3~ G3~ G3~ C3~ C3~ C3~ C3~ C3~ C3~ C3~ C3~ ' +
        'C3~ C3~ C3~ C3~ C3~ C3~ C3~ C3~ - - - - - - - -',
    },
  ],
  drums:
    '- - - - - - - - - - - - k - - - - - - - - - - - k - s - k - s - k - - - - - - - - - - - - - - -',
  drumVolume: 0.3,
}

export const audio: GameAudio = {
  'overworld.ogg': { song: overworld },
  'battle.ogg': { song: battle },
  'evolution.ogg': { song: evolution },
  // A trainer sees you: a quick bright "ding-ding".
  'notice.ogg': {
    wav: () =>
      soundWav([
        { wave: 'square', from: 1319, ms: 70, volume: 0.22, release: 40 },
        { wave: 'square', from: 1760, ms: 160, at: 80, volume: 0.22, release: 140 },
      ]),
  },
  // Scratch: three fast slashes of filtered noise.
  'scratch.ogg': {
    wav: () =>
      soundWav(
        [0, 90, 180].map((at, index) => ({
          wave: 'noise' as const,
          from: 9000 - index * 1500,
          to: 2500,
          ms: 110,
          at,
          volume: 0.45,
          lowpass: 0.55,
          release: 100,
          seed: 31 + index,
        })),
      ),
  },
  // Fire: a whoosh that rises, with a crackle.
  'fire.ogg': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 1500,
          to: 6000,
          ms: 600,
          volume: 0.45,
          attack: 120,
          release: 380,
          lowpass: 0.3,
          seed: 41,
        },
        { wave: 'noise', from: 12000, ms: 500, at: 100, volume: 0.12, release: 400, seed: 42 },
        { wave: 'saw', from: 110, to: 220, ms: 500, volume: 0.12, release: 400 },
      ]),
  },
  // Green (heal and battle cry): a soft magic arpeggio.
  'green.ogg': {
    wav: () =>
      soundWav(
        [523, 659, 784, 1047, 1319].map((from, index) => ({
          wave: 'triangle' as const,
          from,
          ms: 260,
          at: index * 70,
          volume: 0.24,
          release: 220,
          vibrato: [0.01, 9] as [number, number],
        })),
      ),
  },
  // Ice: glassy chimes going down.
  'ice.ogg': {
    wav: () =>
      soundWav([
        ...[2637, 2349, 1976, 1760].map((from, index) => ({
          wave: 'sine' as const,
          from,
          ms: 300,
          at: index * 60,
          volume: 0.22,
          release: 280,
        })),
        { wave: 'noise', from: 14000, ms: 250, volume: 0.1, release: 240, seed: 51 },
      ]),
  },
  // Splash: a wet burst that falls.
  'splash.ogg': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 7000,
          to: 1200,
          ms: 520,
          volume: 0.45,
          attack: 10,
          release: 480,
          lowpass: 0.45,
          seed: 61,
        },
        { wave: 'sine', from: 600, to: 180, ms: 220, volume: 0.25, release: 200 },
      ]),
  },
  // Explosion: a deep boom.
  'explosion.ogg': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 3000,
          to: 300,
          ms: 900,
          volume: 0.65,
          release: 850,
          lowpass: 0.22,
          seed: 71,
        },
        { wave: 'sine', from: 110, to: 30, ms: 650, volume: 0.55, release: 600 },
      ]),
  },
}
