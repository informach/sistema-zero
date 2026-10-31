import {
  type MontarArquipelago,
  VERSAO_CONTRATO_PLATAFORMA,
  versaoCompativel,
} from '@sistemazero/arquipelago-contracts'
import { createRoot } from 'react-dom/client'
import { ESTILOS } from './interface/estilos'
import { Jogo } from './jogo'

/**
 * A ÚNICA porta de entrada do jogo. A página da plataforma carrega este módulo publicado e
 * chama `montarArquipelago(elemento, plataforma)`. O jogo roda na própria raiz React, com o
 * próprio CSS dentro do elemento; `desmontar` limpa tudo e guarda o que estiver pendente.
 */
export const versaoContrato = VERSAO_CONTRATO_PLATAFORMA

export const montarArquipelago: MontarArquipelago = (elemento, plataforma) => {
  // A atual e a anterior valem (A35): o jogo e a plataforma podem subir em dias diferentes.
  if (!versaoCompativel(plataforma.versaoContrato)) {
    throw new Error(
      `Contrato da plataforma ${plataforma.versaoContrato} não é o deste jogo (${VERSAO_CONTRATO_PLATAFORMA})`,
    )
  }
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
