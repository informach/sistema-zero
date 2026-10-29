/**
 * A câmera da foto (fase2-09): o canvas registra aqui como tirar a foto (`mundo/foto.tsx`, de
 * dentro do `<Canvas>`, onde estão o renderizador, a cena e a câmera) e o botão do modo foto
 * (`interface/foto.tsx`, fora dele) pede. Uma por montagem do jogo, pela loja (como as lojas à
 * parte dos desafios e das cartas).
 */
export interface CameraDaFoto {
  capturar: (() => Promise<Blob | null>) | null
}

const camerasDaFoto = new WeakMap<object, CameraDaFoto>()

export function cameraDaFoto(loja: object): CameraDaFoto {
  let c = camerasDaFoto.get(loja)
  if (!c) {
    c = { capturar: null }
    camerasDaFoto.set(loja, c)
  }
  return c
}
