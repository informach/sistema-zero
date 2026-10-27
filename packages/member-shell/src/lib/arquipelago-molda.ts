import type { MoldaCompletionControl } from '@sistemazero/molda'
import type { CreationsCloud } from './creations-cloud'

/** Compara a versão salva pelo editor com a versão realmente recebida pela conta. */
export async function concluirMolda(
  controle: MoldaCompletionControl,
  nuvem: Pick<CreationsCloud, 'confirm' | 'download'>,
): Promise<string | null> {
  const criacao = await controle.flush()
  if (!criacao) return null
  await nuvem.confirm(criacao.id, { timeoutMs: 15_000 })
  const guardado = await nuvem.download(criacao.id)
  if (!guardado || guardado.json !== criacao.json)
    throw new Error('A versão da criação ainda não foi confirmada na conta')
  return criacao.id
}
