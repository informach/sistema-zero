/** Monster Battle: one sound per attack animation (the heal shares the leaves) and the battle music. */

import { type Song, soundWav, type Tone } from '../pygame-audio'
import type { GameAudio } from '../pygame-gallery-audio'

const battleSong: Song = {
  bpm: 150,
  division: 4,
  repeat: 2,
  tracks: [
    {
      wave: 'pulse',
      volume: 0.12,
      vibrato: [0.005, 5],
      steps:
        'E5 - E5 - D5 - E5 - G5 G5~ - - E5 - D5 - ' +
        'C5 - D5 - E5 - A4 - B4 B4~ - - - - - - ' +
        'E5 - E5 - D5 - E5 - A5 A5~ - - G5 - E5 - ' +
        'F5 - E5 - D5 - B4 - C5 C5~ C5~ - - - - - ' +
        'A5 - G5 - E5 - G5 - F5 F5~ - - E5 - D5 - ' +
        'E5 - F5 - G5 - E5 - D5 D5~ - - - - - - ' +
        'C5 - D5 - E5 - G5 - A5 - G5 - E5 - D5 - ' +
        'E5 E5~ E5~ E5~ - - B4 - C5 - D5 - E5 - - -',
    },
    {
      wave: 'square',
      volume: 0.05,
      gate: 0.5,
      steps: Array(8).fill('A4 C5 E5 C5 A4 C5 E5 C5 G4 B4 D5 B4 G4 B4 D5 B4').join(' '),
    },
    {
      wave: 'triangle',
      volume: 0.24,
      gate: 0.75,
      steps: [
        'A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2',
        'F2 F2 F3 F2 F2 F2 F3 F2 E2 E2 E3 E2 E2 E2 E3 E2',
        'A2 A2 A3 A2 A2 A2 A3 A2 G2 G2 G3 G2 G2 G2 G3 G2',
        'F2 F2 F3 F2 G2 G2 G3 G2 A2 A2 A3 A2 A2 A2 A3 A2',
        'F2 F2 F3 F2 F2 F2 F3 F2 C3 C3 C4 C3 C3 C3 C4 C3',
        'G2 G2 G3 G2 G2 G2 G3 G2 E2 E2 E3 E2 E2 E2 E3 E2',
        'F2 F2 F3 F2 F2 F2 F3 F2 G2 G2 G3 G2 G2 G2 G3 G2',
        'A2 A2 A3 A2 A2 A2 A3 A2 E2 E2 E3 E2 G#2 G#2 G#3 G#2',
      ].join(' '),
    },
  ],
  drums: Array(8).fill('k - h - s - h k k - h - s - h h').join(' '),
  drumVolume: 0.26,
}

/** Three quick claw swipes. */
const scratch = () =>
  soundWav(
    [0, 90, 180].flatMap((at, index): Tone[] => [
      {
        wave: 'noise',
        from: 14000,
        to: 5000,
        ms: 85,
        at,
        volume: 0.42,
        attack: 2,
        release: 70,
        seed: 31 + index,
      },
      { wave: 'saw', from: 1800 - index * 200, to: 700, ms: 70, at, volume: 0.08, release: 60 },
    ]),
  )

/** A whoosh of flame that crackles. */
const fire = () =>
  soundWav([
    {
      wave: 'noise',
      from: 1500,
      to: 6000,
      ms: 260,
      volume: 0.35,
      attack: 120,
      release: 100,
      lowpass: 0.35,
      seed: 3,
    },
    {
      wave: 'noise',
      from: 6000,
      to: 1200,
      ms: 600,
      at: 220,
      volume: 0.4,
      release: 520,
      lowpass: 0.3,
      seed: 4,
    },
    ...[260, 330, 420, 470, 560, 640].map(
      (at, index): Tone => ({
        wave: 'noise',
        from: 9000,
        ms: 18,
        at,
        volume: 0.35,
        release: 15,
        seed: 50 + index,
      }),
    ),
    { wave: 'saw', from: 110, to: 70, ms: 500, at: 200, volume: 0.12, release: 450 },
  ])

/** The nuke: a deep boom with a long rumble. */
const explosion = () =>
  soundWav([
    {
      wave: 'noise',
      from: 5000,
      to: 300,
      ms: 1100,
      volume: 0.65,
      attack: 3,
      release: 1000,
      lowpass: 0.22,
      seed: 23,
    },
    { wave: 'sine', from: 120, to: 32, ms: 700, volume: 0.6, release: 650 },
    { wave: 'square', from: 70, to: 30, ms: 300, volume: 0.15, release: 280 },
  ])

/** Water hitting the target, then bubbles. */
const splash = () =>
  soundWav([
    {
      wave: 'noise',
      from: 8000,
      to: 1200,
      ms: 420,
      volume: 0.5,
      attack: 4,
      release: 380,
      lowpass: 0.45,
      seed: 61,
    },
    { wave: 'sine', from: 300, to: 120, ms: 160, volume: 0.25, release: 140 },
    ...[200, 270, 330, 410, 460].map(
      (at, index): Tone => ({
        wave: 'sine',
        from: 500 + index * 110,
        to: 1300 + index * 150,
        ms: 55,
        at,
        volume: 0.18,
        release: 40,
      }),
    ),
  ])

/** Ice shards: a crack and a shower of glassy notes. */
const ice = () =>
  soundWav([
    { wave: 'noise', from: 16000, ms: 70, volume: 0.45, attack: 1, release: 60, seed: 71 },
    { wave: 'square', from: 2600, to: 1800, ms: 60, volume: 0.1, release: 50 },
    ...[2637, 3136, 2349, 3520, 2794, 3951, 3136].map(
      (from, index): Tone => ({
        wave: 'triangle',
        from,
        ms: 220,
        at: 60 + index * 55,
        volume: 0.16,
        attack: 2,
        release: 200,
      }),
    ),
  ])

/** Leaves swirling and a rising, healing arpeggio (used by the spiral attack and by heal). */
const green = () =>
  soundWav([
    {
      wave: 'noise',
      from: 3000,
      to: 5000,
      ms: 650,
      volume: 0.16,
      attack: 200,
      release: 400,
      lowpass: 0.4,
      seed: 81,
    },
    ...[523, 659, 784, 1047, 1319].map(
      (from, index): Tone => ({
        wave: 'triangle',
        from,
        ms: 200,
        at: index * 90,
        volume: 0.24,
        release: 160,
        vibrato: [0.01, 7],
      }),
    ),
    { wave: 'sine', from: 1568, ms: 360, at: 450, volume: 0.12, release: 330 },
  ])

export const audio: GameAudio = {
  'scratch.wav': { wav: scratch },
  'fire.wav': { wav: fire },
  'explosion.wav': { wav: explosion },
  'splash.wav': { wav: splash },
  'ice.wav': { wav: ice },
  'green.wav': { wav: green },
  'music.ogg': { song: battleSong },
}
