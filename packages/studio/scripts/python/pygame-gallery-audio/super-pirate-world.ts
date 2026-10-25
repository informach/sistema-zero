/** Super Pirate World: coin, sword, jump, damage, the shell's pearl, the end screens and a sea shanty. */

import { type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

const bar = (text: string, times = 1) => Array(times).fill(text).join(' ')

/** A jaunty shanty in D minor, in 6/8 (three steps per beat). */
const shanty: Song = {
  bpm: 104,
  division: 3,
  repeat: 2,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.12,
      vibrato: [0.006, 5],
      steps: [
        'A4 - D5 - D5 E5',
        'F5 - E5 D5 - C5',
        'A4 - A4 - G4 A4',
        'D5 D5~ D5~ - - -',
        'A4 - D5 - D5 E5',
        'F5 - G5 A5 - F5',
        'E5 - C#5 A4 - C#5',
        'D5 D5~ D5~ - - -',
        'F5 - F5 - E5 F5',
        'G5 - F5 E5 - D5',
        'C5 - A4 - C5 - ',
        'F5 F5~ F5~ - - E5',
        'D5 - E5 - F5 D5',
        'E5 - C#5 A4 - G4',
        'F4 - E4 D4 - C#4',
        'D4 D4~ D4~ - - -',
      ].join(' '),
    },
    {
      wave: 'square',
      volume: 0.05,
      gate: 0.5,
      steps: [
        bar('- F4 A4 - F4 A4'),
        bar('- D4 F4 - D4 F4'),
        bar('- A4 C5 - A4 C5'),
        bar('- C#4 E4 - C#4 E4'),
        bar('- F4 A4 - F4 A4'),
        bar('- D4 F4 - D4 F4'),
        bar('- C#4 E4 - C#4 E4'),
        bar('- F4 A4 - F4 A4'),
        bar('- A4 C5 - A4 C5'),
        bar('- D4 G4 - D4 G4'),
        bar('- F4 A4 - F4 A4'),
        bar('- A4 C5 - A4 C5'),
        bar('- F4 A4 - F4 A4'),
        bar('- C#4 E4 - C#4 E4'),
        bar('- D4 F4 - C#4 E4'),
        bar('- F4 A4 - - -'),
      ].join(' '),
    },
    {
      wave: 'triangle',
      volume: 0.24,
      gate: 0.8,
      steps: [
        'D2 - - A2 - -',
        'Bb1 - - F2 - -',
        'F2 - - C3 - -',
        'A1 - - E2 - -',
        'D2 - - A2 - -',
        'Bb1 - - F2 - -',
        'A1 - - E2 - -',
        'D2 - - A2 - -',
        'F2 - - C3 - -',
        'G2 - - D3 - -',
        'F2 - - C3 - -',
        'F2 - - A2 - -',
        'Bb1 - - F2 - -',
        'A1 - - E2 - -',
        'D2 - - A1 - -',
        'D2 - - D2 - -',
      ].join(' '),
    },
  ],
  drums: bar('k - h s - h', 16),
  drumVolume: 0.26,
}

export const audio: GameAudio = {
  'coin.wav': {
    wav: () =>
      soundWav([
        { wave: 'square', from: 1175, ms: 60, volume: 0.2 },
        { wave: 'square', from: 1568, ms: 180, at: 55, volume: 0.2, release: 160 },
        { wave: 'triangle', from: 3136, ms: 120, at: 55, volume: 0.08, release: 110 },
      ]),
  },
  'attack.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 12000,
          to: 2500,
          ms: 170,
          volume: 0.35,
          lowpass: 0.55,
          release: 150,
          seed: 31,
        },
        { wave: 'saw', from: 900, to: 300, ms: 90, volume: 0.08, release: 80 },
      ]),
  },
  'jump.wav': {
    wav: () =>
      soundWav([{ wave: 'square', from: 280, to: 640, ms: 160, volume: 0.18, release: 110 }]),
  },
  'damage.wav': {
    wav: () =>
      soundWav([
        { wave: 'square', from: 260, to: 70, ms: 280, volume: 0.28, release: 240 },
        {
          wave: 'noise',
          from: 6000,
          to: 800,
          ms: 200,
          volume: 0.32,
          release: 180,
          lowpass: 0.4,
          seed: 7,
        },
      ]),
  },
  'pearl.wav': {
    wav: () =>
      soundWav([
        { wave: 'sine', from: 900, to: 260, ms: 140, volume: 0.35, release: 110 },
        { wave: 'noise', from: 3000, ms: 50, volume: 0.15, lowpass: 0.3, seed: 19 },
      ]),
  },
  'game_over.wav': {
    wav: () =>
      soundWav(
        ['A4', 'F4', 'D4', 'A3'].flatMap((_, index) => [
          {
            wave: 'square' as const,
            from: [440, 349, 294, 220][index]!,
            ms: index === 3 ? 700 : 220,
            at: index * 240,
            volume: 0.18,
            release: index === 3 ? 600 : 120,
            vibrato: [0.01, 6] as [number, number],
          },
          {
            wave: 'triangle' as const,
            from: [110, 87, 73, 55][index]!,
            ms: index === 3 ? 700 : 220,
            at: index * 240,
            volume: 0.25,
          },
        ]),
      ),
  },
  'victory.wav': {
    wav: () =>
      soundWav(
        [294, 370, 440, 587, 440, 587].map((from, index) => ({
          wave: 'pulse' as const,
          from,
          ms: index === 5 ? 600 : 140,
          at: index < 4 ? index * 120 : 480 + (index - 4) * 180,
          volume: 0.2,
          release: index === 5 ? 500 : 80,
        })),
      ),
  },
  'pirate_theme.ogg': { song: shanty },
}
