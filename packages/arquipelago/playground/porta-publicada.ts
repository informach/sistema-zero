import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'

const pedir = async (url: string, signal?: AbortSignal) => {
  const r = await fetch(url, { signal, cache: 'no-store' })
  return { status: r.status, corpo: r.ok ? await r.json() : null }
}
/** Porta restrita do servidor loopback; não publica nem concede progresso. */
export const portaPublicadaDoEnsaio: CenariosPublicadosDoJogo = {
  perfil: (ilha, sinal) => pedir(`/api/cenarios/jogo/perfis/${encodeURIComponent(ilha)}`, sinal),
  arquivo: (publicacao, digest, sinal) =>
    pedir(
      `/api/cenarios/jogo/publicacoes/${encodeURIComponent(publicacao)}/arquivos/${encodeURIComponent(digest)}?como=endereco`,
      sinal,
    ),
}
