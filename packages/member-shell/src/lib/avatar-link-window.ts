/**
 * A janela dos links assinados dos arquivos do avatar (esqueleto, peças e miniaturas).
 *
 * Todo pedido dentro da mesma janela de 6 horas é assinado com a hora do COMEÇO dela, então recebe
 * o MESMO link: o cache do navegador, que é pelo endereço, reaproveita a imagem e o modelo entre
 * recarregamentos e entre as telas. O link vale a janela mais 1 hora de folga, e o redirecionamento
 * fica guardado só até o fim da janela, então o navegador nunca segue um link vencido.
 */
export const AVATAR_LINK_WINDOW_SECONDS = 6 * 60 * 60
const FOLGA_SECONDS = 60 * 60
/** Perto do fim da janela, o redirecionamento ainda fica guardado um pouco (o link segue valendo). */
const REDIRECT_MIN_SECONDS = 60

export interface AvatarLinkWindow {
  /** A hora da assinatura: o começo da janela. */
  signingDate: Date
  /** Quanto o link vale a partir do começo da janela. */
  expiresInSeconds: number
  /** Quanto o navegador guarda o redirecionamento: até o fim da janela. */
  redirectMaxAgeSeconds: number
  /** O `Cache-Control` que o R2 devolve com o arquivo (o nome dele leva o hash do conteúdo). */
  fileCacheControl: string
}

export function avatarLinkWindow(nowMs: number): AvatarLinkWindow {
  const janelaMs = AVATAR_LINK_WINDOW_SECONDS * 1000
  const inicio = Math.floor(nowMs / janelaMs) * janelaMs
  const ateOFim = Math.floor((inicio + janelaMs - nowMs) / 1000)
  const validade = AVATAR_LINK_WINDOW_SECONDS + FOLGA_SECONDS
  return {
    signingDate: new Date(inicio),
    expiresInSeconds: validade,
    redirectMaxAgeSeconds: Math.max(REDIRECT_MIN_SECONDS, ateOFim),
    fileCacheControl: `private, max-age=${validade}, immutable`,
  }
}
