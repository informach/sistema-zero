import type {
  BaseDeTerreno,
  ComandoDeCenario,
  DocumentoDeCenario,
  EstadoDoTerreno,
  RegioesDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import type { GestoDeTerreno, Palco } from '@sistemazero/molda-cenarios-motor'
import { prepararGravacaoDoTerreno } from './autoria'
import type { ControladorDaOficina } from './controlador'

/** Peças verificadas antes da cabeça otimista; envio e confirmação ficam na fila única. */
export async function gravarEstadoDoTerreno({
  controlador,
  palco,
  documentoDeOrigem,
  base,
  estado,
  regioes,
  sinal,
  antes = [],
  finalizar,
}: {
  controlador: ControladorDaOficina
  palco: Pick<
    Palco,
    'prepararRecursosDoTerreno' | 'finalizarEscultura' | 'descartarRecursosDoTerreno'
  >
  documentoDeOrigem: DocumentoDeCenario
  base: BaseDeTerreno
  estado: EstadoDoTerreno
  regioes: RegioesDeTerreno
  sinal?: AbortSignal
  antes?: readonly ComandoDeCenario[]
  /** Água usa sua própria prévia, conservando a mesma fila de binários e histórico. */
  finalizar?(cancelar: boolean): void
}): Promise<{ alterado: boolean; guardado: boolean }> {
  let enfileirado = false
  let preparados: string[] = []
  const conferirOrigem = () => {
    sinal?.throwIfAborted()
    if (controlador.getState().documento !== documentoDeOrigem)
      throw new DOMException('O cenário mudou durante a preparação', 'AbortError')
  }
  try {
    // A mesma preparação que o agente usa (`autoria.ts`): peças por hash e o `base.definir`.
    const { comandos, arquivos: novos } = await prepararGravacaoDoTerreno({
      documentoDeOrigem,
      edicao: { base, estado, regioes },
      antes,
      conferir: conferirOrigem,
    })
    if (!comandos.length) return { alterado: false, guardado: true }
    conferirOrigem()
    await palco.prepararRecursosDoTerreno(novos, sinal)
    preparados = novos.map((a) => a.digest)
    conferirOrigem()
    enfileirado = controlador.executar(comandos, novos)
    if (!enfileirado)
      throw new Error(controlador.getState().recusa ?? 'Não consegui guardar esta mudança')
    await controlador.terminar()
    return { alterado: true, guardado: controlador.getState().salvamento === 'guardado' }
  } finally {
    if (!enfileirado && preparados.length) palco.descartarRecursosDoTerreno(preparados)
    if (finalizar) finalizar(!enfileirado)
    else palco.finalizarEscultura(!enfileirado)
  }
}

export function guardarGestoDeTerreno(
  controlador: ControladorDaOficina,
  palco: Palco,
  gesto: GestoDeTerreno,
  sinal?: AbortSignal,
) {
  const base = gesto.documentoDeOrigem.base
  if (base.tipo !== 'terreno')
    return Promise.reject(new Error('Prepare o terreno antes de esculpir'))
  return gravarEstadoDoTerreno({
    controlador,
    palco,
    documentoDeOrigem: gesto.documentoDeOrigem,
    base,
    estado: gesto.estado,
    regioes: gesto.regioes,
    ...(sinal ? { sinal } : {}),
  })
}
