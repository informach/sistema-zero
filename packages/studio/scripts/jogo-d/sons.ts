/**
 * Os sons do jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): efeitos curtos e duas
 * músicas, feitos por código (WAV mono de 22050 Hz, determinístico), no molde da galeria do
 * Pygame (`scripts/python/pygame-audio.ts`). Nada de amostra de fora.
 */
import { songWav, soundWav } from '../python/pygame-audio'

export function sons() {
  return {
    'jogo-d-som-moeda': soundWav([
      { wave: 'square', from: 988, ms: 60, volume: 0.22 },
      { wave: 'square', from: 1319, ms: 160, at: 60, volume: 0.22, release: 140 },
    ]),
    'jogo-d-som-bau': soundWav([
      { wave: 'triangle', from: 523, ms: 90, volume: 0.3 },
      { wave: 'triangle', from: 659, ms: 90, at: 90, volume: 0.3 },
      { wave: 'triangle', from: 784, ms: 240, at: 180, volume: 0.3, release: 200 },
    ]),
    'jogo-d-som-dano': soundWav([
      { wave: 'square', from: 240, to: 90, ms: 260, volume: 0.28, release: 220 },
      { wave: 'noise', from: 5000, ms: 160, volume: 0.3, release: 150, lowpass: 0.4, seed: 5 },
    ]),
    'jogo-d-som-porta': soundWav([
      { wave: 'sine', from: 330, to: 520, ms: 280, volume: 0.3, release: 200 },
      { wave: 'triangle', from: 660, to: 1040, ms: 200, at: 80, volume: 0.15 },
    ]),
    'jogo-d-som-dormir': soundWav([
      { wave: 'sine', from: 523, ms: 260, volume: 0.25 },
      { wave: 'sine', from: 392, ms: 260, at: 260, volume: 0.25 },
      { wave: 'sine', from: 330, ms: 520, at: 520, volume: 0.25, release: 480 },
    ]),
    'jogo-d-musica-mundo': songWav({
      bpm: 112,
      division: 2,
      repeat: 1,
      tracks: [
        {
          wave: 'square',
          volume: 0.12,
          gate: 0.8,
          steps:
            'E4 G4 A4 G4 E4 D4 C4 D4 E4 G4 A4 C5 B4 A4 G4 - E4 G4 A4 G4 E4 D4 C4 E4 D4 C4 D4 E4 C4 - - -',
        },
        {
          wave: 'triangle',
          volume: 0.18,
          steps: 'C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 - C3 - G3 - A2 - E3 - F2 - G2 - C3 - - -',
        },
      ],
      drums: 'k - h - s - h - k - h - s - h h k - h - s - h - k - h - s - h -',
      drumVolume: 0.18,
    }),
    'jogo-d-musica-caverna': songWav({
      bpm: 84,
      division: 2,
      repeat: 1,
      tracks: [
        {
          wave: 'triangle',
          volume: 0.16,
          vibrato: [0.01, 5],
          steps: 'A3 - C4 - E4 - D4 - C4 - B3 - A3 - - - G3 - B3 - D4 - C4 - B3 - G3 - A3 - - -',
        },
        {
          wave: 'sine',
          volume: 0.2,
          steps: 'A2~ A2~ A2~ A2~ F2~ F2~ F2~ F2~ G2~ G2~ G2~ G2~ E2~ E2~ E2~ E2~',
        },
      ],
    }),
  }
}
