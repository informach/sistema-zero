import type { PythonExampleEntry } from '../pythonCatalog'

/** Metadata only: source is fetched after selection, not when filtering the gallery. */
export const turtleRaceExample: PythonExampleEntry = {
  programmingLanguage: 'python',
  key: 'python:turtle-race-original',
  name: 'Corrida das Tartarugas',
  description:
    'Escolha uma favorita, acompanhe a largada e controle a corrida com teclas e cliques.',
  emoji: '🐢',
  experience: 'game',
  difficulty: 'intermediate',
  concepts: ['Eventos', 'Estado', 'Temporizadores', 'Aleatoriedade'],
  genre: 'Corrida',
  kind: 'pro',
  extensions: [{ id: 'python-turtle', version: '1.0.0' }],
  async load() {
    const { turtleRacePayload } = await import('./turtleRacePayload')
    return turtleRacePayload
  },
}
