import type { PythonExampleEntry } from '../pythonCatalog'

/** No source, media or runtime imports while browsing metadata. */
export const mazeLightsExample: PythonExampleEntry = {
  programmingLanguage: 'python',
  key: 'python:maze-lights',
  name: 'Labirinto das Luzes',
  description: 'Use as setas para recolher luzes e escapar dos drones. Esc encerra a partida.',
  emoji: '💡',
  experience: 'game',
  difficulty: 'advanced',
  concepts: ['Eventos', 'Colisões', 'Estado', 'Temporizadores', 'Som'],
  genre: 'Labirinto',
  kind: 'pro',
  extensions: [{ id: 'python-turtle', version: '1.0.0' }],
  requiredProvidedModules: [{ importName: 'sz_audio', version: '1.0.0' }],
  async load() {
    const { mazeLightsPayload } = await import('./mazeLightsPayload')
    return mazeLightsPayload
  },
}
