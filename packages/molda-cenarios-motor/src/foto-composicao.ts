import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { criarPalco } from './Palco'
import type { OpcoesDoPalco, Palco } from './tipos'

let fila: Promise<unknown> = Promise.resolve()

/** Usa o próprio palco, com recursos isolados e liberados inclusive em falha/cancelamento. */
export function fotografarComposicao(
  documento: DocumentoDeCenario,
  opcoes: Pick<OpcoesDoPalco, 'carregarModelo' | 'carregarTextura'>,
  sinal?: AbortSignal,
): Promise<Blob> {
  const snapshot = structuredClone(documento)
  const fotografar = async () => {
    sinal?.throwIfAborted()
    const caixa = document.createElement('div')
    caixa.setAttribute('aria-hidden', 'true')
    caixa.style.cssText =
      'position:fixed;left:0;top:0;width:256px;height:256px;opacity:0;pointer-events:none;z-index:-1'
    const canvas = document.createElement('canvas')
    canvas.tabIndex = -1
    canvas.style.cssText = 'width:256px;height:256px'
    caixa.append(canvas)
    document.body.append(caixa)
    let palco: Palco | undefined
    try {
      palco = criarPalco(canvas, { ...opcoes, fotografia: true, movimentoReduzido: true })
      palco.definirDocumento(snapshot)
      await palco.aguardarRecursos(sinal)
      palco.enquadrar()
      const foto = await palco.capturar(256)
      sinal?.throwIfAborted()
      if (!foto || foto.size > 256 * 1024)
        throw new Error('Não consegui gerar um retrato válido do conjunto')
      return foto
    } finally {
      palco?.destruir()
      caixa.remove()
    }
  }
  const vez = fila.then(fotografar, fotografar)
  fila = vez.catch(() => undefined)
  return vez
}
