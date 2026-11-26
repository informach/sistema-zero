import { createHash } from 'node:crypto'

/** A promoção pode nomear o recurso pela identidade, não pelo hash dos bytes da imagem. */
export async function capaDaParteConfere(
  posterUrl: string,
  sha256Esperado: string,
  buscar: (url: string, opcoes?: RequestInit) => Promise<Response> = fetch,
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(sha256Esperado)) throw new Error('Hash da capa inválido')
  if (posterUrl.includes(sha256Esperado)) return true
  // A capa gravada na aula pode ser um caminho relativo (`/admin/...`, gravada por outra ferramenta):
  // sem origem não há o que baixar, e o `new URL` cru caía com "Invalid URL", sem dizer qual capa.
  let endereco: URL
  try {
    endereco = new URL(posterUrl)
  } catch {
    throw new Error(
      `A capa gravada na aula não é um endereço completo (${posterUrl}); confira a capa da parte no Admin`,
    )
  }
  if (endereco.protocol !== 'https:') throw new Error('A capa publicada precisa usar HTTPS')
  const resposta = await buscar(posterUrl, { signal: AbortSignal.timeout(60_000) })
  if (!resposta.ok)
    throw new Error(`Não foi possível conferir a capa publicada: ${resposta.status}`)
  const bytes = new Uint8Array(await resposta.arrayBuffer())
  return createHash('sha256').update(bytes).digest('hex') === sha256Esperado
}
