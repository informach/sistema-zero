type Ponto = { x: number; y: number; z: number }

/**
 * Uma vista óptica que a câmera usa no lugar da dela (o perfil `luneta`): de onde olha, para onde,
 * e o campo de visão em graus. A luneta do mirante das Nuvens (fase4-07) escreve a dela em
 * `movimento.mira`, com o que os botões do visor pedem (−1 a 1, como o direcional) e a figura na
 * mira agora (−1 nenhuma; o verificador lê).
 */
export interface VistaDaLuneta {
  posicao: Ponto
  alvo: Ponto
  campo: number
  pedidoX: number
  pedidoZ: number
  naMira: number
}

export function criarVistaDaLuneta(campo: number): VistaDaLuneta {
  return {
    posicao: { x: 0, y: 0, z: 0 },
    alvo: { x: 0, y: 0, z: 1 },
    campo,
    pedidoX: 0,
    pedidoZ: 0,
    naMira: -1,
  }
}
