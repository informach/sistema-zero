/** Space Shooter: laser, explosion, damage and the game music. */

import { SOUNDS, type Song, soundWav } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

const spaceSong: Song = {
  bpm: 140,
  division: 4,
  repeat: 2,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.13,
      vibrato: [0.004, 6],
      steps:
        'A4 - C5 - E5 - A5 - G5 - E5 - D5 - E5 - ' +
        'F5 - E5 - D5 - C5 - D5 - E5 - C5 - - ' +
        'A4 - C5 - E5 - A5 - B5 - A5 - G5 - E5 - ' +
        'F5 - G5 - A5 - G5 - E5~ E5~ E5~ - - -',
    },
    {
      wave: 'triangle',
      volume: 0.22,
      gate: 0.7,
      steps:
        'A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2 ' +
        'F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2 ' +
        'A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2 ' +
        'F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 G#2 G#2 G#3 G#2',
    },
  ],
  drums: Array(4).fill('k - h - s - h - k k h - s - h h').join(' '),
  drumVolume: 0.3,
}

export const audio: GameAudio = {
  'laser.wav': { wav: SOUNDS.laser },
  'explosion.wav': { wav: () => SOUNDS.explosion(17) },
  'damage.wav': {
    wav: () =>
      soundWav([
        {
          wave: 'noise',
          from: 4000,
          to: 300,
          ms: 900,
          volume: 0.65,
          release: 850,
          lowpass: 0.2,
          seed: 41,
        },
        { wave: 'square', from: 300, to: 40, ms: 700, volume: 0.3, release: 650 },
      ]),
  },
  'game_music.ogg': { song: spaceSong },
}
