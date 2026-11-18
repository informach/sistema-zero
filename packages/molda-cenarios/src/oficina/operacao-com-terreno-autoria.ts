import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  EstadoDoTerreno,
  RegioesDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import type { ControladorDaOficina } from './controlador'
import { gravarEstadoDoTerreno } from './terreno-autoria'

/** Água e caminhos usam a fila única e o mesmo contrato de recursos do terreno. */
export async function guardarOperacaoComTerreno({
  controlador,
  palco,
  documentoDeOrigem,
  comandos,
  terreno,
  regioes,
  finalizar,
  sinal,
  conferir,
}: {
  controlador: ControladorDaOficina
  palco: Pick<
    Palco,
    'prepararRecursosDoTerreno' | 'finalizarEscultura' | 'descartarRecursosDoTerreno'
  >
  documentoDeOrigem: DocumentoDeCenario
  comandos: readonly ComandoDeCenario[]
  terreno?: EstadoDoTerreno
  regioes: RegioesDeTerreno
  finalizar(cancelar: boolean): void
  sinal?: AbortSignal
  conferir?(): void
}) {
  let enfileirado = false,
    finalizado = false
  try {
    sinal?.throwIfAborted()
    if (controlador.getState().documento !== documentoDeOrigem)
      throw new DOMException('O cenário mudou durante a preparação', 'AbortError')
    conferir?.()
    if (terreno) {
      if (documentoDeOrigem.base.tipo !== 'terreno')
        throw Error('Prepare o relevo antes de moldar o terreno.')
      return await gravarEstadoDoTerreno({
        controlador,
        palco,
        documentoDeOrigem,
        base: documentoDeOrigem.base,
        estado: terreno,
        regioes,
        antes: comandos,
        ...(sinal ? { sinal } : {}),
        finalizar: (cancelar) => {
          finalizado = true
          finalizar(cancelar)
        },
      })
    }
    if (!comandos.length) return { alterado: false, guardado: true }
    enfileirado = controlador.executar([...comandos])
    if (!enfileirado)
      throw Error(controlador.getState().recusa ?? 'Não consegui guardar esta mudança.')
    await controlador.terminar()
    return { alterado: true, guardado: controlador.getState().salvamento === 'guardado' }
  } finally {
    if (!finalizado) finalizar(!enfileirado)
  }
}
