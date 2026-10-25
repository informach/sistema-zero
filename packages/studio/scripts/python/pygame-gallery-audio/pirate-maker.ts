/** Pirate Maker: coin, hit, jump, the editor theme (Explorer) and the level theme (SuperHero). */

import { type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

/** The editor: an easy-going sea shanty in D minor, for building at your own pace. */
const explorer: Song = {
  bpm: 108,
  division: 2,
  repeat: 3,
  tracks: [
    {
      wave: 'triangle',
      volume: 0.26,
      vibrato: [0.006, 5],
      steps:
        'D5 - A4 - D5 E5 F5 - E5 - D5 - C5 - A4 - ' +
        'Bb4 - D5 - F5 - E5 D5 C5 - A4 - - - - - ' +
        'D5 - A4 - D5 E5 F5 - G5 - A5 - G5 F5 E5 - ' +
        'F5 - E5 - D5 - C5 - E5 - D5 D5~ D5~ D5~ - -',
    },
    {
      wave: 'pulse',
      volume: 0.07,
      gate: 0.5,
      steps:
        'F4 A4 F4 A4 F4 A4 F4 A4 E4 G4 E4 G4 E4 G4 E4 G4 ' +
        'D4 F4 D4 F4 D4 F4 D4 F4 E4 A4 E4 A4 C#4 E4 C#4 E4 ' +
        'F4 A4 F4 A4 F4 A4 F4 A4 G4 Bb4 G4 Bb4 C4 E4 C4 E4 ' +
        'D4 F4 D4 F4 C4 E4 C4 E4 D4 F4 D4 F4 D4 A4 D4 A4',
    },
    {
      wave: 'sine',
      volume: 0.3,
      gate: 0.8,
      steps:
        'D3 - - - A2 - - - C3 - - - G2 - - - ' +
        'Bb2 - - - F2 - - - A2 - - - A2 - - - ' +
        'D3 - - - A2 - - - G2 - - - C3 - - - ' +
        'Bb2 - - - C3 - - - D3 - - - D3 - - -',
    },
  ],
  drums: Array(4).fill('k - h - s - h - k - h h s - h -').join(' '),
  drumVolume: 0.18,
}

/** The level: a bright, running adventure theme in C major. */
const superHero: Song = {
  bpm: 150,
  division: 4,
  repeat: 2,
  tracks: [
    {
      wave: 'square',
      volume: 0.11,
      vibrato: [0.004, 6],
      steps:
        'C5 - - E5 G5 - - C6 - - B5 - G5 - A5 - ' +
        'G5 - - E5 C5 - - E5 - - D5 - - - - - ' +
        'F5 - - A5 C6 - - A5 - - G5 - E5 - F5 - ' +
        'G5 - - - E5 - D5 - C5 - D5 - E5 - G5 - ' +
        'C5 - - E5 G5 - - C6 - - B5 - G5 - A5 - ' +
        'B5 - - A5 G5 - - E5 - - F5 - E5 - D5 - ' +
        'C5 - - E5 D5 - - G4 - - B4 - D5 - F5 - ' +
        'E5 E5~ E5~ E5~ D5 D5~ D5~ D5~ C5 C5~ C5~ C5~ - - - -',
    },
    {
      wave: 'pulse',
      volume: 0.07,
      gate: 0.45,
      steps: [
        'E4 G4 C5 G4',
        'E4 G4 C5 G4',
        'D4 G4 B4 G4',
        'D4 G4 B4 G4',
        'F4 A4 C5 A4',
        'F4 A4 C5 A4',
        'E4 G4 C5 G4',
        'D4 G4 B4 G4',
        'E4 G4 C5 G4',
        'E4 G4 C5 G4',
        'D4 G4 B4 G4',
        'C4 E4 A4 E4',
        'F4 A4 C5 A4',
        'D4 G4 B4 G4',
        'E4 G4 C5 G4',
        'E4 G4 C5 G4',
      ]
        .map((bar) => `${bar} ${bar}`)
        .join(' '),
    },
    {
      wave: 'triangle',
      volume: 0.24,
      gate: 0.7,
      steps: [
        'C3 C3 C4 C3',
        'C3 C3 C4 C3',
        'G2 G2 G3 G2',
        'G2 G2 G3 G2',
        'F2 F2 F3 F2',
        'F2 F2 F3 F2',
        'C3 C3 C4 C3',
        'G2 G2 G3 G2',
        'C3 C3 C4 C3',
        'C3 C3 C4 C3',
        'G2 G2 G3 G2',
        'A2 A2 A3 A2',
        'F2 F2 F3 F2',
        'G2 G2 G3 G2',
        'C3 C3 C4 C3',
        'C3 C3 C4 C3',
      ]
        .map((bar) => `${bar} ${bar}`)
        .join(' '),
    },
  ],
  drums: Array(8).fill('k - h - s - h k k - h - s - h h').join(' '),
  drumVolume: 0.26,
}

export const audio: GameAudio = {
  // a doubloon: two bright pings and a little shine
  'coin.wav': {
    wav: () =>
      soundWav([
        { wave: 'square', from: 1175, ms: 60, volume: 0.22, release: 40 },
        { wave: 'square', from: 1568, ms: 240, at: 60, volume: 0.22, release: 220 },
        {
          wave: 'triangle',
          from: 3136,
          ms: 180,
          at: 70,
          volume: 0.1,
          release: 170,
          vibrato: [0.02, 30],
        },
      ]),
  },
  // hit: a wooden thump and a falling buzz
  'hit.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 5000,
          to: 900,
          ms: 160,
          volume: 0.45,
          release: 150,
          lowpass: 0.45,
          seed: 31,
        },
        { wave: 'square', from: 330, to: 90, ms: 260, volume: 0.25, release: 240 },
        { wave: 'sine', from: 120, to: 50, ms: 200, volume: 0.4, release: 180 },
      ]),
  },
  // jump: a quick rising hop
  'jump.wav': {
    wav: () =>
      soundWav([
        { wave: 'square', from: 300, to: 820, ms: 170, volume: 0.2, release: 110 },
        { wave: 'triangle', from: 150, to: 410, ms: 170, volume: 0.25, release: 110 },
      ]),
  },
  // the level is complete: a little fanfare
  'win.wav': {
    wav: () =>
      soundWav([
        ...[523, 659, 784].map((from, index) => ({
          wave: 'square' as const,
          from,
          ms: 120,
          at: index * 110,
          volume: 0.18,
          release: 60,
        })),
        {
          wave: 'square',
          from: 1047,
          ms: 520,
          at: 330,
          volume: 0.2,
          release: 380,
          vibrato: [0.012, 6],
        },
        { wave: 'triangle', from: 262, ms: 850, at: 0, volume: 0.25, release: 500 },
      ]),
  },
  // game over: a sad slide down
  'lose.wav': {
    wav: () =>
      soundWav([
        ...[392, 370, 349].map((from, index) => ({
          wave: 'triangle' as const,
          from,
          ms: 220,
          at: index * 230,
          volume: 0.3,
          release: 120,
        })),
        {
          wave: 'triangle',
          from: 330,
          to: 196,
          ms: 700,
          at: 690,
          volume: 0.3,
          release: 500,
          vibrato: [0.02, 5],
        },
      ]),
  },
  'Explorer.ogg': { song: explorer },
  'SuperHero.ogg': { song: superHero },
}
