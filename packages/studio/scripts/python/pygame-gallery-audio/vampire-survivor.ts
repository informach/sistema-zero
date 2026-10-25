/** Vampire Survivor: o tiro, o monstro atingido, o caçador ferido, o fim de jogo e a música. */

import { type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

/** Uma valsa sombria em ré menor: órgão de pulso, baixo de triângulo e bateria leve. */
const nightSong: Song = {
  bpm: 132,
  division: 2,
  repeat: 2,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.12,
      vibrato: [0.005, 5],
      steps:
        'D5 - F5 - A5 - G5 F5 E5 - C#5 - E5 - ' +
        'D5 - A4 - D5 F5 E5 - D5 - C#5~ C#5~ - - ' +
        'Bb4 - D5 - F5 - E5 D5 C5 - A4 - C5 - ' +
        'Bb4 - A4 - G4 Bb4 A4 - G4 - F4~ F4~ - - ' +
        'D5 - F5 - A5 - D6 C6 Bb5 - A5 - G5 - ' +
        'F5 - E5 - D5 F5 E5 - C#5 - D5~ D5~ D5~ -',
    },
    {
      wave: 'square',
      volume: 0.05,
      gate: 0.5,
      steps:
        'A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 ' +
        'F4 F4 F4 F4 F4 F4 F4 F4 E4 E4 E4 E4 E4 E4 E4 E4 ' +
        'F4 F4 F4 F4 F4 F4 F4 F4 G4 G4 G4 G4 G4 G4 G4 G4 ' +
        'D4 D4 D4 D4 D4 D4 D4 D4 C4 C4 C4 C4 C4 C4 C4 C4 ' +
        'A4 A4 A4 A4 A4 A4 A4 A4 D5 D5 D5 D5 D5 D5 D5 D5 ' +
        'Bb4 Bb4 Bb4 Bb4 Bb4 Bb4 Bb4 Bb4 A4 A4 A4 A4 A4 A4 A4 A4',
    },
    {
      wave: 'triangle',
      volume: 0.24,
      gate: 0.8,
      steps:
        'D3 - A2 - D3 - A2 - A2 - E3 - A2 - E3 - ' +
        'D3 - A2 - D3 - A2 - A2 - E3 - A2 - C#3 - ' +
        'Bb2 - F3 - Bb2 - F3 - C3 - G3 - C3 - G3 - ' +
        'G2 - D3 - G2 - D3 - F2 - C3 - F2 - C3 - ' +
        'D3 - A2 - D3 - A2 - Bb2 - F3 - Bb2 - F3 - ' +
        'G2 - D3 - G2 - D3 - A2 - E3 - A2 - A2 -',
    },
  ],
  drums: Array(6).fill('k - h - s - h - k - h k s - h h').join(' '),
  drumVolume: 0.22,
}

export const audio: GameAudio = {
  // Um estalo seco com o brilho prateado da bala.
  'shoot.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 7000,
          to: 2000,
          ms: 110,
          volume: 0.45,
          release: 100,
          lowpass: 0.55,
          seed: 61,
        },
        { wave: 'square', from: 900, to: 250, ms: 90, volume: 0.18, release: 80 },
        { wave: 'triangle', from: 1800, to: 2400, ms: 70, volume: 0.12, at: 10 },
      ]),
  },
  // O monstro atingido: um baque abafado e um gemido que cai.
  'impact.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 2500,
          to: 600,
          ms: 160,
          volume: 0.5,
          release: 150,
          lowpass: 0.3,
          seed: 67,
        },
        { wave: 'square', from: 320, to: 90, ms: 180, volume: 0.2, release: 160 },
      ]),
  },
  // O caçador ferido.
  'hurt.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'square',
          from: 520,
          to: 180,
          ms: 220,
          volume: 0.25,
          release: 180,
          vibrato: [0.08, 30],
        },
        { wave: 'noise', from: 4000, ms: 120, volume: 0.25, release: 110, lowpass: 0.4, seed: 71 },
      ]),
  },
  // Fim de jogo: três notas descendo devagar, com um sino grave.
  'game_over.wav': {
    wav: () =>
      soundWav([
        { wave: 'pulse', from: 587, ms: 320, volume: 0.24, release: 220, vibrato: [0.01, 6] },
        {
          wave: 'pulse',
          from: 466,
          ms: 320,
          at: 300,
          volume: 0.24,
          release: 220,
          vibrato: [0.01, 6],
        },
        {
          wave: 'pulse',
          from: 349,
          to: 340,
          ms: 900,
          at: 600,
          volume: 0.24,
          release: 800,
          vibrato: [0.015, 5],
        },
        { wave: 'triangle', from: 147, ms: 1500, at: 600, volume: 0.35, release: 1400 },
      ]),
  },
  'music.ogg': { song: nightSong },
}
