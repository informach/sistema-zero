import { ILHA_DO_PEDIDO, type MoradorDoPedido } from '@sistemazero/arquipelago-contracts'
import { useEffect, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import {
  estadoDoPedidoDoEstudio,
  pedidoDoEstudio,
  TEXTOS_DO_PEDIDO_DO_ESTUDIO,
} from '../sistemas/pedido-do-estudio'

/**
 * O pedido do morador no Estúdio, na conversa (§6.28, A23): o título, a situação e o botão que
 * abre o Estúdio de desafio por cima do jogo. Sem pedido publicado para a ilha, nada aparece.
 */
export function PedidoDoEstudio({ quem }: { quem: MoradorDoPedido }) {
  const { loja, plataforma } = useJogo()
  const desafios = lojaDosDesafios(loja, plataforma)
  const dados = useDesafios(desafios, (s) => s.dados)
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const podeFazer = useEstado(
    (s) => !s.acesso.somenteLeitura && !s.visita && !s.tempoAcabou && !s.tempoPausado,
  )
  const [aviso, setAviso] = useState<string | null>(null)
  useEffect(() => {
    if (!desafios.getState().dados) void desafios.getState().carregar()
  }, [desafios])
  const pedido = pedidoDoEstudio(dados, ILHA_DO_PEDIDO[quem])
  if (!pedido) return null
  const aberto = pedido.situacao === 'disponivel' || pedido.situacao === 'concluido'

  async function fazer() {
    if (!pedido) return
    setAviso(null)
    const r = await desafios.getState().jogar(pedido.id, pedido.revisao)
    if (r === 'nao-abriu') setAviso(TEXTOS_DO_PEDIDO_DO_ESTUDIO.naoAbriu)
  }

  return (
    <div className={`arq-capi-pedido ${pedido.situacao === 'concluido' ? 'feito' : ''}`}>
      <b>{TEXTOS_DO_PEDIDO_DO_ESTUDIO.titulo}</b>
      <span>{pedido.titulo}</span>
      <span className="arq-capi-falta">{estadoDoPedidoDoEstudio(pedido)}</span>
      {aberto ? (
        <button
          type="button"
          className="arq-botao leve"
          disabled={ferramentaAberta || !podeFazer}
          onClick={() => void fazer()}
        >
          {pedido.situacao === 'concluido'
            ? TEXTOS_DO_PEDIDO_DO_ESTUDIO.refazer
            : TEXTOS_DO_PEDIDO_DO_ESTUDIO.fazer}
        </button>
      ) : null}
      {aviso ? <span role="status">{aviso}</span> : null}
    </div>
  )
}
