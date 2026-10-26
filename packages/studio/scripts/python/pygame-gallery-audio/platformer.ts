/** Platformer: the blaster shot, the hit on an enemy, getting hurt, the flag, game over and the music. */

import { type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

const gardenSong: Song = {
  bpm: 128,
  division: 4,
  repeat: 2,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.12,
      vibrato: [0.005, 5],
      steps:
        'C5 - E5 - G5 - E5 - A5 - G5 - E5 - D5 - ' +
        'C5 - E5 - G5 - C6 - B5 - G5 - A5 - - ' +
        'F5 - A5 - C6 - A5 - G5 - E5 - C5 - E5 - ' +
        'D5 - E5 - F5 - D5 - C5~ C5~ C5~ - - -',
    },
    {
      wave: 'square',
      volume: 0.05,
      gate: 0.5,
      steps:
        'E4 G4 E4 G4 E4 G4 E4 G4 F4 A4 F4 A4 F4 A4 F4 A4 ' +
        'E4 G4 E4 G4 E4 G4 E4 G4 D4 G4 D4 G4 D4 G4 D4 G4 ' +
        'F4 A4 F4 A4 F4 A4 F4 A4 E4 G4 E4 G4 E4 G4 E4 G4 ' +
        'D4 F4 D4 F4 D4 F4 D4 F4 E4 G4 E4 G4 E4 G4 E4 G4',
    },
    {
      wave: 'triangle',
      volume: 0.24,
      gate: 0.75,
      steps:
        'C3 - C3 G2 C3 - C3 G2 F2 - F2 C3 F2 - F2 C3 ' +
        'C3 - C3 G2 C3 - C3 G2 G2 - G2 D3 G2 - G2 B2 ' +
        'F2 - F2 C3 F2 - F2 C3 C3 - C3 G2 C3 - C3 G2 ' +
        'G2 - G2 D3 G2 - G2 D3 C3 - C3 G2 C3 - - -',
    },
  ],
  drums: Array(4).fill('k - h - s - h h k - h k s - h -').join(' '),
  drumVolume: 0.26,
}

export const audio: GameAudio = {
  // A short "pew" from the blaster.
  'shoot.wav': {
    wav: () =>
      soundWav([
        { wave: 'square', from: 1300, to: 420, ms: 130, volume: 0.22, release: 100 },
        {
          wave: 'noise',
          from: 8000,
          to: 2500,
          ms: 70,
          volume: 0.18,
          lowpass: 0.5,
          release: 60,
          seed: 31,
        },
      ]),
  },
  // The enemy pops when the shot lands.
  'impact.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 6000,
          to: 900,
          ms: 220,
          volume: 0.45,
          lowpass: 0.35,
          release: 200,
          seed: 77,
        },
        { wave: 'triangle', from: 520, to: 1040, ms: 90, volume: 0.25 },
        { wave: 'triangle', from: 780, to: 1560, ms: 90, at: 60, volume: 0.2 },
      ]),
  },
  // The explorer gets hurt: a bump and a falling buzz.
  'damage.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'square',
          from: 420,
          to: 110,
          ms: 320,
          volume: 0.28,
          release: 260,
          vibrato: [0.08, 22],
        },
        { wave: 'noise', from: 4000, ms: 160, volume: 0.3, lowpass: 0.3, release: 150, seed: 12 },
      ]),
  },
  // Reaching the flag: a rising fanfare.
  'victory.wav': {
    wav: () =>
      soundWav([
        ...[523, 659, 784, 1047, 784].map((from, index) => ({
          wave: 'pulse' as const,
          from,
          ms: 120,
          at: index * 110,
          volume: 0.22,
          release: 80,
        })),
        {
          wave: 'pulse',
          from: 1047,
          ms: 520,
          at: 550,
          volume: 0.22,
          release: 420,
          vibrato: [0.01, 6],
        },
        { wave: 'triangle', from: 262, ms: 1080, volume: 0.25, release: 500 },
      ]),
  },
  // Out of hearts: three falling notes.
  'game_over.wav': {
    wav: () =>
      soundWav([
        { wave: 'triangle', from: 392, ms: 260, volume: 0.3 },
        { wave: 'triangle', from: 330, ms: 260, at: 280, volume: 0.3 },
        { wave: 'triangle', from: 262, to: 196, ms: 700, at: 560, volume: 0.3, release: 600 },
        { wave: 'square', from: 131, to: 98, ms: 700, at: 560, volume: 0.08, release: 600 },
      ]),
  },
  'music.ogg': { song: gardenSong },
}
