import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import { parseJS } from '../../../parsers/js'

/**
 * Converte um fonte de referência do Jogo 3D para o mesmo contrato de ciclo de
 * vida usado pelos exemplos embutidos: os statements são ordenados pelas áreas
 * Ao iniciar, Quando acontecer e Enquanto estiver rodando (espelho do helper
 * homônimo do game-3d-advanced, com o extensionId desta extensão).
 */
export function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-3d' }],
  })

  // O parser representa alguns campos opcionais ausentes como `undefined`.
  // Uma IR persistida é JSON e, portanto, não guarda essas chaves.
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}
