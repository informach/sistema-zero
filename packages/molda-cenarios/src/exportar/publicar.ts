import type { PreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'
import type { ProgressoDaCompilacao } from '@sistemazero/molda-cenarios-motor/compilar'
import type { CenariosHost } from '../oficina/portas'
import type { DestinoDaPublicacao, ProgressoDaPublicacao } from '../oficina/publicacoes'
import { compilarRevisaoDaOficina } from './compilar-revisao'
import { naFilaDeCompilacao } from './fila'

export function publicarRevisaoDaOficina(
  host: CenariosHost,
  preparo: PreparoDeExportacao,
  destino: DestinoDaPublicacao,
  sinal: AbortSignal,
  compilacao: (p: ProgressoDaCompilacao) => void,
  publicacao: (p: ProgressoDaPublicacao) => void,
) {
  const porta = host.publicacoes
  if (!porta || !preparo.contexto.equipe)
    throw Error('A publicação está disponível somente para a equipe.')
  const alvo = structuredClone(destino)
  return naFilaDeCompilacao(sinal, async () => {
    const pacote = await compilarRevisaoDaOficina(
      host,
      preparo,
      { juntar: true, tamanhoDaRegiao: 64 },
      sinal,
      compilacao,
    )
    sinal.throwIfAborted()
    return porta.publicar(pacote, alvo, sinal, publicacao)
  })
}
