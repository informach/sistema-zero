import {
  type ArquivoDeTerreno,
  type BaseDeTerreno,
  baseComPecasEditadas,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  digestDosBytes,
  type EstadoDoTerreno,
  igual,
  prepararPecasEditadas,
  type RegioesDeTerreno,
  referenciasDoTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import type { GestoDeTerreno, Palco } from '@sistemazero/molda-cenarios-motor'
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
  palco: Pick<Palco, 'prepararRecursosDoTerreno' | 'finalizarEscultura'>
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
  const conferirOrigem = () => {
    sinal?.throwIfAborted()
    if (controlador.getState().documento !== documentoDeOrigem)
      throw new DOMException('O cenário mudou durante a preparação', 'AbortError')
  }
  try {
    conferirOrigem()
    const pecas = prepararPecasEditadas(base, estado, regioes),
      arquivos = new Map<string, ArquivoDeTerreno>()
    const conhecidas = new Set(
      documentoDeOrigem.base.tipo === 'terreno'
        ? referenciasDoTerreno(documentoDeOrigem.base).map((p) => p.digest)
        : [],
    )
    const referencias = []
    for (const peca of pecas) {
      conferirOrigem()
      const digest = peca.conteudo ? await digestDosBytes(peca.conteudo) : null
      if (digest && peca.conteudo && !conhecidas.has(digest))
        arquivos.set(digest, { digest, conteudo: peca.conteudo })
      referencias.push({ papel: peca.papel, coluna: peca.coluna, linha: peca.linha, digest })
    }
    const nova = baseComPecasEditadas(base, referencias)
    const mudouBase = !igual(nova, documentoDeOrigem.base)
    if (!mudouBase && !antes.length) return { alterado: false, guardado: true }
    conferirOrigem()
    const novos = [...arquivos.values()]
    await palco.prepararRecursosDoTerreno(novos, sinal)
    conferirOrigem()
    const comandos: ComandoDeCenario[] = [...antes]
    if (mudouBase) comandos.push({ tipo: 'base.definir', base: nova })
    enfileirado = controlador.executar(comandos, novos)
    if (!enfileirado)
      throw new Error(controlador.getState().recusa ?? 'Não consegui guardar esta mudança')
    await controlador.terminar()
    return { alterado: true, guardado: controlador.getState().salvamento === 'guardado' }
  } finally {
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
