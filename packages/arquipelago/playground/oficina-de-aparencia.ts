import type { PedidoDeFerramenta } from '@sistemazero/arquipelago-contracts'

/** Oficina de mentira, fora do jogo. A página real abre o Pinta ou o Molda completo. */
export function abrirOficinaDeExemplo(pedido: PedidoDeFerramenta): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.style.cssText =
      'border:0;border-radius:20px;padding:24px;max-width:300px;font:18px system-ui'
    const titulo = document.createElement('h2')
    titulo.textContent = pedido.ferramenta === 'molda' ? 'Exemplo do Molda' : 'Exemplo do Pinta'
    const texto = document.createElement('p')
    texto.textContent = 'Esta oficina de teste devolve uma aparência de exemplo.'
    const concluir = (valor: boolean) => {
      dialog.close()
      dialog.remove()
      resolve(valor)
    }
    for (const [nome, valor] of [
      ['Usar no jogo', true],
      ['Voltar ao jogo', false],
    ] as const) {
      const botao = document.createElement('button')
      botao.textContent = nome
      botao.style.cssText = 'min-height:44px;padding:10px;margin:4px;border-radius:12px'
      botao.onclick = () => concluir(valor)
      dialog.append(botao)
    }
    dialog.prepend(titulo, texto)
    dialog.oncancel = (e) => {
      e.preventDefault()
      concluir(false)
    }
    document.body.append(dialog)
    dialog.showModal()
  })
}
