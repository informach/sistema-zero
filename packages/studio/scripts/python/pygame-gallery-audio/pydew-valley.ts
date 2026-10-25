/** PyDew Valley: the axe, the hoe, planting, watering, the pick-up chime and a calm farm song. */

import { type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

/** A gentle waltz-like tune in F major (the original plays music in a loop all day). */
const farmSong: Song = {
  bpm: 96,
  division: 2,
  repeat: 2,
  tracks: [
    {
      wave: 'triangle',
      volume: 0.24,
      vibrato: [0.004, 5],
      steps:
        'C5 - A4 - C5 D5 C5 - A4 - F4 - G4 - A4 - ' +
        'Bb4 - D5 - C5 - A4 - G4 G4~ G4~ - - - ' +
        'C5 - A4 - C5 D5 C5 - A4 - F4 - G4 - A4 - ' +
        'Bb4 - G4 - E4 - G4 - F4 F4~ F4~ - - - ' +
        'A4 - C5 - F5 - E5 - D5 - C5 - Bb4 - A4 - ' +
        'G4 - Bb4 - D5 - C5 - Bb4 - A4 - G4 G4~ ' +
        'A4 - C5 - F5 - E5 - D5 - C5 - Bb4 - D5 - ' +
        'C5 - A4 - G4 - E4 - F4 F4~ F4~ - - -',
    },
    {
      wave: 'sine',
      volume: 0.16,
      gate: 0.8,
      steps:
        'F3 - A3 - C4 - A3 - F3 - A3 - C4 - A3 - ' +
        'Bb2 - D3 - F3 - D3 - C3 - E3 - G3 - E3 - ' +
        'F3 - A3 - C4 - A3 - F3 - A3 - C4 - A3 - ' +
        'Bb2 - D3 - C3 - E3 - F3 - A3 - C4 - A3 - ' +
        'F3 - A3 - C4 - A3 - Bb2 - D3 - F3 - D3 - ' +
        'G2 - Bb2 - D3 - Bb2 - C3 - E3 - G3 - E3 - ' +
        'F3 - A3 - C4 - A3 - Bb2 - D3 - F3 - D3 - ' +
        'C3 - E3 - G3 - E3 - F3 - A3 - C4 - -',
    },
  ],
  drums: Array(8).fill('k - h - h - k - h - h -').join(' '),
  drumVolume: 0.12,
}

export const audio: GameAudio = {
  // A dry chop on wood: a short knock and a crack.
  'axe.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 5000,
          to: 1200,
          ms: 120,
          volume: 0.55,
          release: 100,
          lowpass: 0.45,
          seed: 31,
        },
        { wave: 'square', from: 220, to: 110, ms: 90, volume: 0.35, release: 80 },
        { wave: 'sine', from: 130, to: 70, ms: 180, volume: 0.45, release: 160 },
      ]),
  },
  // The hoe in the earth: a muffled crunch.
  'hoe.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 2200,
          to: 600,
          ms: 160,
          volume: 0.6,
          release: 140,
          lowpass: 0.25,
          seed: 52,
        },
        {
          wave: 'noise',
          from: 3000,
          ms: 70,
          at: 90,
          volume: 0.35,
          release: 60,
          lowpass: 0.3,
          seed: 53,
        },
        { wave: 'sine', from: 95, to: 60, ms: 130, volume: 0.4, release: 110 },
      ]),
  },
  // A seed goes into the soil: a soft pop.
  'plant.wav': {
    wav: () =>
      soundWav([
        { wave: 'sine', from: 300, to: 620, ms: 90, volume: 0.45, release: 70 },
        {
          wave: 'noise',
          from: 1800,
          ms: 60,
          at: 40,
          volume: 0.2,
          release: 50,
          lowpass: 0.3,
          seed: 61,
        },
      ]),
  },
  // Picking something up: a happy two-note chime.
  'success.wav': {
    wav: () =>
      soundWav([
        { wave: 'triangle', from: 784, ms: 90, volume: 0.35 },
        { wave: 'triangle', from: 1175, ms: 220, at: 80, volume: 0.35, release: 200 },
        { wave: 'sine', from: 1568, ms: 200, at: 80, volume: 0.12, release: 190 },
      ]),
  },
  // Water pouring from the can: a soft hiss with little drops.
  'water.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 9000,
          ms: 700,
          volume: 0.32,
          attack: 80,
          release: 300,
          lowpass: 0.35,
          seed: 71,
        },
        ...[0, 140, 260, 410, 530].map((at, index) => ({
          wave: 'sine' as const,
          from: 900 + index * 120,
          to: 1500 + index * 100,
          ms: 50,
          at,
          volume: 0.18,
          release: 40,
        })),
      ]),
  },
  'music.ogg': { song: farmSong },
}
