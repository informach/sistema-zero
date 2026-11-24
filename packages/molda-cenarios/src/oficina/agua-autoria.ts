import {
  type DocumentoDeCenario,
  igual,
  type OperacaoDeAguaPreparada,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import type { ControladorDaOficina } from './controlador'
import { guardarOperacaoComTerreno } from './operacao-com-terreno-autoria'

/** A água e seu leito/barragem entram juntos na fila, inclusive na nova tentativa. */
export async function guardarAgua({
  controlador,
  palco,
  documentoDeOrigem,
  operacao,
  sinal,
}: {
  controlador: ControladorDaOficina
  palco: Pick<
    Palco,
    | 'prepararRecursosDoTerreno'
    | 'finalizarEscultura'
    | 'finalizarPreviaDeAgua'
    | 'descartarRecursosDoTerreno'
  >
  documentoDeOrigem: DocumentoDeCenario
  operacao: OperacaoDeAguaPreparada
  sinal?: AbortSignal
}) {
  const anterior = documentoDeOrigem.aguas.find((a) => a.id === operacao.agua.id)
  return guardarOperacaoComTerreno({
    controlador,
    palco,
    documentoDeOrigem,
    comandos: igual(anterior, operacao.agua) ? [] : [{ tipo: 'agua.definir', agua: operacao.agua }],
    ...(operacao.terreno ? { terreno: operacao.terreno } : {}),
    regioes: operacao.regioes,
    finalizar: (cancelar) => palco.finalizarPreviaDeAgua(cancelar),
    ...(sinal ? { sinal } : {}),
  })
}
