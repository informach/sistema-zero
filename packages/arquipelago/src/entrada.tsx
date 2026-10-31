import type { MontarArquipelago } from '@sistemazero/arquipelago-contracts'
import { createRoot } from 'react-dom/client'
import { conferirContrato } from './contrato-da-entrada'
import { ESTILOS } from './interface/estilos'
import { Jogo } from './jogo'

/**
 * A ÚNICA porta de entrada do jogo. A página da plataforma carrega este módulo publicado e
 * chama `montarArquipelago(elemento, plataforma)`. O jogo roda na própria raiz React, com o
 * próprio CSS dentro do elemento; `desmontar` limpa tudo e guarda o que estiver pendente.
 */
export { versaoContrato } from './contrato-da-entrada'

export const montarArquipelago: MontarArquipelago = (elemento, plataforma) => {
  // A atual e a anterior valem (A35); a recusa vem antes de tocar no elemento.
  conferirContrato(plataforma)
  const estilo = document.createElement('style')
  estilo.textContent = ESTILOS
  const raiz = document.createElement('div')
  // O CSS da pele adulta só vale dentro de `.arq-adulto` (ele chega com o pedaço do adulto).
  raiz.className = plataforma.publico === 'adulto' ? 'arq-raiz arq-adulto' : 'arq-raiz'
  elemento.append(estilo, raiz)
  const react = createRoot(raiz)
  react.render(<Jogo plataforma={plataforma} />)
  return {
    desmontar() {
      react.unmount()
      raiz.remove()
      estilo.remove()
    },
  }
}
