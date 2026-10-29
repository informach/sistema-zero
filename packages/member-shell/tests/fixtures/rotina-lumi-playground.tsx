import {
  cartasDaRotina,
  type MoldeDaRotina,
  type RespostaDoServico,
  type ResultadoDaFerramentaRotina,
} from '@sistemazero/arquipelago-contracts'
import { createRoot } from 'react-dom/client'
import { RotinaLumiEditor } from '../../src/components/arquipelago-rotina/RotinaLumiEditor'

/** Host local de QA. O bundle publicado do jogo não importa a plataforma. */
export async function abrirEditorLumiNoPlayground(
  molde: MoldeDaRotina,
  ler: () => Promise<RespostaDoServico>,
): Promise<ResultadoDaFerramentaRotina | null> {
  const estilo = document.createElement('link')
  estilo.rel = 'stylesheet'
  estilo.href = '/rotina-lumi.css'
  // O Blockly lê as cores na montagem. O host local precisa aguardar o CSS,
  // como o carregador da plataforma já faz com o bundle da ferramenta.
  await new Promise<void>((resolve, reject) => {
    estilo.onload = () => resolve()
    estilo.onerror = () => {
      estilo.remove()
      reject(new Error('Não deu para carregar o tema do mini estúdio.'))
    }
    document.head.append(estilo)
  })
  return new Promise((resolve) => {
    const elemento = document.createElement('div')
    document.body.append(elemento)
    const raiz = createRoot(elemento)
    raiz.render(
      <RotinaLumiEditor
        molde={molde}
        lerCartas={() => cartasDaRotina(ler)}
        onFinish={(resultado) => {
          resolve(resultado)
          queueMicrotask(() => {
            raiz.unmount()
            elemento.remove()
            estilo.remove()
          })
        }}
      />,
    )
  })
}
