import {
  type DocumentoDeCenario,
  documentoDaOperacaoDeCaminho,
  igual,
  type OperacaoDeCaminhoPreparada,
} from '@sistemazero/molda-cenarios-core/v2'
import type { Palco } from '@sistemazero/molda-cenarios-motor'
import type { ControladorDaOficina } from './controlador'
import { guardarOperacaoComTerreno } from './operacao-com-terreno-autoria'

/** O eixo e o relevo moldado formam uma única operação, inclusive após falha de envio. */
export function guardarCaminho({
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
    | 'descartarRecursosDoTerreno'
    | 'finalizarEscultura'
    | 'finalizarPreviaDeCaminho'
  >
  documentoDeOrigem: DocumentoDeCenario
  operacao: OperacaoDeCaminhoPreparada
  sinal?: AbortSignal
}) {
  const anterior = documentoDeOrigem.caminhos.find((c) => c.id === operacao.caminho.id)
  return guardarOperacaoComTerreno({
    controlador,
    palco,
    documentoDeOrigem,
    comandos: [
      ...(operacao.modelos ?? []).map((modelo) => ({ tipo: 'modelo.definir' as const, modelo })),
      ...(operacao.texturas ?? []).map((textura) => ({
        tipo: 'textura.definir' as const,
        textura,
      })),
      ...(igual(anterior, operacao.caminho)
        ? []
        : [{ tipo: 'caminho.definir' as const, caminho: operacao.caminho }]),
    ],
    conferir: () => {
      documentoDaOperacaoDeCaminho(documentoDeOrigem, operacao)
    },
    ...(operacao.terreno ? { terreno: operacao.terreno } : {}),
    regioes: operacao.regioes,
    finalizar: (cancelar) => palco.finalizarPreviaDeCaminho(cancelar),
    ...(sinal ? { sinal } : {}),
  })
}
