import type { PintaCompletionControl } from '@sistemazero/pinta'
import { assetToJson } from '@sistemazero/pinta/assets'
import type { CreationsCloud } from './creations-cloud'

/** Devolve o desenho somente depois de confirmar que a MESMA versão está na conta. */
export async function concluirPinta(
  controle: PintaCompletionControl,
  nuvem: Pick<CreationsCloud, 'confirm' | 'download'>,
): Promise<string | null> {
  const desenho = await controle.flush()
  if (!desenho) return null
  await nuvem.confirm(desenho.id, { timeoutMs: 15_000 })
  const guardado = await nuvem.download(desenho.id)
  if (!guardado || guardado.json !== assetToJson(desenho))
    throw new Error('A versão do desenho ainda não foi confirmada na conta')
  return desenho.id
}
