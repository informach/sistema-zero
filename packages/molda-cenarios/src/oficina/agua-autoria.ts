import {
  type DocumentoDeCenario,
  igual,
  type OperacaoDeAguaPreparada,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import type { ControladorDaOficina } from './controlador'
import { gravarEstadoDoTerreno } from './terreno-autoria'

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
  let enfileirado = false
  let finalizado = false
  try {
    sinal?.throwIfAborted()
    if (controlador.getState().documento !== documentoDeOrigem)
      throw new DOMException('O cenário mudou durante a preparação da água', 'AbortError')
    const anterior = documentoDeOrigem.aguas.find((a) => a.id === operacao.agua.id)
    const comandos = igual(anterior, operacao.agua)
      ? []
      : [{ tipo: 'agua.definir' as const, agua: operacao.agua }]
    if (operacao.terreno) {
      if (documentoDeOrigem.base.tipo !== 'terreno')
        throw Error('Prepare o relevo antes de escavar água.')
      // O helper encerra a prévia depois de saber se a fila assumiu os recursos.
      return await gravarEstadoDoTerreno({
        controlador,
        palco,
        documentoDeOrigem,
        base: documentoDeOrigem.base,
        estado: operacao.terreno,
        regioes: operacao.regioes,
        antes: comandos,
        ...(sinal ? { sinal } : {}),
        finalizar: (cancelar) => {
          finalizado = true
          palco.finalizarPreviaDeAgua(cancelar)
        },
      })
    }
    if (!comandos.length) return { alterado: false, guardado: true }
    enfileirado = controlador.executar(comandos)
    if (!enfileirado)
      throw Error(controlador.getState().recusa ?? 'Não consegui guardar esta água.')
    await controlador.terminar()
    return { alterado: true, guardado: controlador.getState().salvamento === 'guardado' }
  } finally {
    // O ramo com terreno já usa o mesmo encerramento no helper, sem finalizar escultura.
    if (!finalizado) palco.finalizarPreviaDeAgua(!enfileirado)
  }
}
