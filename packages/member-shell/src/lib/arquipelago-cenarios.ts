import type {
  CenariosPublicadosDoJogo,
  RespostaDoServico,
} from '@sistemazero/arquipelago-contracts'

/** A página conserva sessão/rotas; o jogo recebe apenas a porta de leitura publicada. */
export function criarPortaDeCenariosPublicados(
  perfilId: string,
  buscar: (url: string, init?: RequestInit) => Promise<RespostaDoServico>,
): CenariosPublicadosDoJogo {
  const ler = (caminho: string, sinal?: AbortSignal) =>
    buscar(`/api/cenarios/jogo/${caminho}`, {
      method: 'GET',
      signal: sinal,
      cache: 'no-store',
      headers: { 'x-sz-viewer': perfilId },
    })
  return {
    perfil: (ilha, sinal) => ler(`perfis/${encodeURIComponent(ilha)}`, sinal),
    arquivo: (publicacaoId, digest, sinal) =>
      ler(
        `publicacoes/${encodeURIComponent(publicacaoId)}/arquivos/${encodeURIComponent(digest)}?como=endereco`,
        sinal,
      ),
    arquivos: (publicacaoId, digests, sinal) =>
      ler(
        `publicacoes/${encodeURIComponent(publicacaoId)}/arquivos?digests=${digests.map(encodeURIComponent).join(',')}`,
        sinal,
      ),
  }
}
