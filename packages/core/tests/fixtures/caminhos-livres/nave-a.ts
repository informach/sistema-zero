import type { SceneAction, SceneId } from '../../../src/learning/scene'

/** `n` quadros a 4 por segundo (`once-vs-always` e `draw-loop`), em fatias de até 1 s. */
export const quadros = (n: number): SceneAction[] => {
  const fatias: SceneAction[] = []
  for (let resto = n; resto > 0; resto -= 4)
    fatias.push({ type: 'advance', seconds: Math.min(resto, 4) / 4 })
  return fatias
}

/**
 * Um caminho de sucesso por cena, para a fixture compartilhada (`free-exploration-paths.ts`). O da
 * `once-vs-always` serve aos três casos: a ficha que o caso não tem é recusada pelo motor (no-op).
 */
export const CAMINHOS_LIVRES_NAVE_A: Partial<Record<SceneId, SceneAction[]>> = {
  'once-vs-always': [
    // A nave que anda: uma vez, no começo; depois sempre, em todo quadro (até sair da tela).
    { type: 'place-in-area', card: 'move', area: 'start' },
    ...quadros(3),
    { type: 'place-in-area', card: 'move', area: 'loop' },
    ...quadros(24),
    // O tiro: esperando a tecla, a tecla, e sempre.
    { type: 'place-in-area', card: 'event', area: 'event' },
    ...quadros(3),
    { type: 'trigger' },
    { type: 'place-in-area', card: 'event', area: 'loop' },
    ...quadros(5),
    // As vidas: uma vez, no começo; depois sempre.
    { type: 'place-in-area', card: 'lives', area: 'start' },
    ...quadros(9),
    { type: 'place-in-area', card: 'lives', area: 'loop' },
    ...quadros(9),
  ],
  'draw-loop': [
    { type: 'advance', seconds: 0.25 },
    { type: 'loop', on: true },
    { type: 'advance', seconds: 0.25 },
    { type: 'erase', on: true },
    { type: 'advance', seconds: 0.25 },
  ],
  // Tirar da tela no fim: a pergunta extra ("deixa de existir?"), que a fala propõe depois das metas.
  world: [
    { type: 'create' },
    { type: 'connect', port: 'draw', enabled: true },
    { type: 'connect', port: 'draw', enabled: false },
  ],
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  coordinates: [
    { type: 'place', x: 440, y: 40 },
    { type: 'place', x: 440, y: 80 },
    { type: 'place', x: 0, y: 80 },
    { type: 'place', x: 0, y: 0 },
  ],
}
