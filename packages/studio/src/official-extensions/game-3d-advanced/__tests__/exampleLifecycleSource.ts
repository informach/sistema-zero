import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import { parseJS } from '../../../parsers/js'

/**
 * Converte o fonte de referência antigo para o mesmo contrato de ciclo de vida
 * usado pelos exemplos atuais. O boot do motor desaparece e os statements são
 * ordenados pelas áreas Ao iniciar, Quando acontecer e Enquanto estiver rodando.
 */
export function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-3d-advanced' }],
  })

  // O parser representa alguns campos opcionais ausentes como `undefined`.
  // Uma IR persistida é JSON e, portanto, não guarda essas chaves.
  return JSON.parse(JSON.stringify(behaviorStatements(normalized))) as JSStatement[]
}
