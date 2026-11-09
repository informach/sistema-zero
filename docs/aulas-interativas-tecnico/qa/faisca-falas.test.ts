import { expect, test } from 'bun:test'
import { discoverySpeechSteps } from '../../../packages/core/src/learning/scene'
import ilha from '../../aulas-interativas/faisca/a-ilha-do-farol/zappy-etapas.json'
import ponte from '../../aulas-interativas/faisca/poder-a-ponte-apressada/zappy-etapas.json'
import moedas from '../../aulas-interativas/faisca/poder-moedas-no-caminho/zappy-etapas.json'
import simbolos from '../../aulas-interativas/faisca/poder-o-bau-dos-simbolos/zappy-etapas.json'
import cabana from '../../aulas-interativas/faisca/poder-o-segredo-da-cabana/zappy-etapas.json'

const ordenar = (falas: { id: string; text: string }[]) =>
  [...falas].sort((a, b) => a.id.localeCompare(b.id))

for (const [nome, arquivo, prefixos] of [
  ['Ilha', ilha, ['island-view-', 'island-position-', 'island-contact-', 'door-not-']],
  ['Ponte', ponte, ['bridge-']],
  ['Moedas', moedas, ['coin-']],
  ['Símbolos', simbolos, ['symbols-']],
  ['Cabana', cabana, ['cabin-']],
] as const) {
  test(`${nome}: o arquivo de gravação contém todas as falas atuais, com o mesmo texto`, () => {
    const esperadas = discoverySpeechSteps().filter(({ id }) =>
      prefixos.some((prefixo) => id.startsWith(prefixo)),
    )
    const gravadas = Object.values(arquivo.experiences).flat()
    expect(ordenar(gravadas)).toEqual(ordenar(esperadas))
  })
}
