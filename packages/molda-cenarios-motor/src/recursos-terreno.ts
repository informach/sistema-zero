import {
  type BaseDeTerreno,
  digestDosBytes,
  lerRecursoDeTerreno,
  MAX_BYTES_RECURSO_TERRENO,
  metadadosDoTerrenoCorrespondem,
  type RecursoDeTerreno,
  referenciasDoTerreno,
} from '@sistemazero/molda-cenarios-core/v2'

/** Concorrência limitada, cancelável; cada arquivo é conferido antes de entrar no palco. */
export async function carregarPecasDeTerreno(
  base: BaseDeTerreno,
  carregar: (digest: string, sinal: AbortSignal) => Promise<ArrayBuffer>,
  sinal: AbortSignal,
  anteriores: ReadonlyMap<string, RecursoDeTerreno> = new Map(),
): Promise<ReadonlyMap<string, RecursoDeTerreno>> {
  const referencias = referenciasDoTerreno(base)
  const porDigest = new Map<string, typeof referencias>()
  for (const referencia of referencias) {
    const lista = porDigest.get(referencia.digest) ?? []
    lista.push(referencia)
    porDigest.set(referencia.digest, lista)
  }
  const digests = [...porDigest.keys()]
  const controle = new AbortController()
  const combinado = AbortSignal.any([sinal, controle.signal])
  const dados = new Map<string, RecursoDeTerreno>()
  let proximo = 0
  await Promise.all(
    Array.from({ length: Math.min(4, digests.length) }, async () => {
      try {
        while (proximo < digests.length) {
          combinado.throwIfAborted()
          const digest = digests[proximo++]!
          const anterior = anteriores.get(digest)
          if (anterior) {
            if (
              porDigest
                .get(digest)!
                .some((p) => !metadadosDoTerrenoCorrespondem(anterior.metadados, p.esperado))
            )
              throw new Error('A peça anterior não corresponde ao terreno')
            dados.set(digest, anterior)
            continue
          }
          const bytes = new Uint8Array(await carregar(digest, combinado))
          combinado.throwIfAborted()
          if (
            bytes.byteLength > MAX_BYTES_RECURSO_TERRENO ||
            (await digestDosBytes(bytes)) !== digest
          )
            throw new Error('O conteúdo recebido não corresponde à peça de terreno')
          combinado.throwIfAborted()
          const peca = lerRecursoDeTerreno(bytes)
          if (
            porDigest
              .get(digest)!
              .some((p) => !metadadosDoTerrenoCorrespondem(peca.metadados, p.esperado))
          )
            throw new Error('A peça não corresponde ao formato ou intervalo do terreno')
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
