import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  criarSnapshotDePublicacao,
  PedidoDePublicacaoSchema,
  PerfilDePublicacaoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import type { DestinoDaPublicacao } from './publicacoes'

/** Captura metadados antes de awaits; ambos os hosts publicam o mesmo manifesto canônico. */
export async function prepararPacoteDaPublicacao(
  pacote: PacoteCompilado,
  destino: DestinoDaPublicacao,
  sinal?: AbortSignal,
) {
  sinal?.throwIfAborted()
  const perfil = PerfilDePublicacaoSchema.parse(destino.perfil),
    versaoEsperada = destino.versaoEsperada,
    operacaoId = destino.operacaoId,
    cena = lerCenaCompilada(pacote.cena)
  const manifesto = new TextEncoder().encode(JSON.stringify(cena))
  const pedido = PedidoDePublicacaoSchema.parse({
    perfil,
    versaoEsperada,
    operacaoId,
    fonte: cena.fonte,
    manifesto: { digest: await digestDosBytes(manifesto), bytes: manifesto.length },
  })
  sinal?.throwIfAborted()
  const snapshot = await criarSnapshotDePublicacao(pedido, manifesto)
  sinal?.throwIfAborted()
  return { manifesto, snapshot }
}
