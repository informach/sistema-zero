import {
  type BaseDeTerreno,
  BYTES_DA_PECA,
  digestDosBytes,
  lerPecaDeAlturas,
  type PecaDeAlturas,
} from '@sistemazero/molda-cenarios-core/v2'

/** Concorrência limitada, cancelável; cada arquivo é conferido antes de entrar no palco. */
export async function carregarPecasDeTerreno(
  base: BaseDeTerreno,
  carregar: (digest: string, sinal: AbortSignal) => Promise<ArrayBuffer>,
  sinal: AbortSignal,
): Promise<ReadonlyMap<string, PecaDeAlturas>> {
  const digests = [...new Set(base.pecas.map((p) => p.digest))]
  const controle = new AbortController()
  const combinado = AbortSignal.any([sinal, controle.signal])
  const dados = new Map<string, PecaDeAlturas>()
  let proximo = 0
  await Promise.all(
    Array.from({ length: Math.min(4, digests.length) }, async () => {
      try {
        while (proximo < digests.length) {
          combinado.throwIfAborted()
          const digest = digests[proximo++]!
          const bytes = new Uint8Array(await carregar(digest, combinado))
          combinado.throwIfAborted()
          if (bytes.byteLength !== BYTES_DA_PECA || (await digestDosBytes(bytes)) !== digest)
            throw new Error('O conteúdo recebido não corresponde à peça de terreno')
          combinado.throwIfAborted()
          const peca = lerPecaDeAlturas(bytes)
          if (peca.min !== base.min || peca.max !== base.max)
            throw new Error('A peça não corresponde ao intervalo do terreno')
          dados.set(digest, peca)
        }
      } catch (e) {
        controle.abort(e)
        throw e
      }
    }),
  )
  sinal.throwIfAborted()
  return dados
}
