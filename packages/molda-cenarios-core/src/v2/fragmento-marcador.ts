import type { DocumentoDeCenario, MarcadorDeCenario } from './documento'
import { transformacaoDoMarcador } from './marcadores'
import type { FonteDeAlturas } from './terreno'

/** A pose copiada independe do campo de destino; os controles e alvos permanecem locais. */
export function capturarMarcador(
  doc: DocumentoDeCenario,
  marcador: MarcadorDeCenario,
  escolhidos: ReadonlySet<string>,
  fonte?: FonteDeAlturas,
): MarcadorDeCenario {
  return {
    ...structuredClone(marcador),
    posicao: transformacaoDoMarcador(doc, marcador, fonte).posicao,
    noChao: false,
    objeto: marcador.objeto && escolhidos.has(marcador.objeto) ? marcador.objeto : null,
  }
}
