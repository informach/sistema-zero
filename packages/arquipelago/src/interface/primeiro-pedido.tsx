import { useEffect, useState } from 'react'
import { useEstado } from '../estado/contexto'
import { primeiroPedido } from '../sistemas/primeiro-pedido'

/** Orientação do começo, dentro do Diário. O mundo continua dono de todas as ações. */
export function PedidoDaIlha() {
  const salvamento = useEstado((s) => s.salvamento)
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])
  const pedido = primeiroPedido(salvamento, agora)
  if (!pedido) return null
  return (
    <section className="arq-caderno-secao" aria-labelledby="arq-primeiro-pedido">
      <h3 id="arq-primeiro-pedido" className="arq-menu-titulo">
        Seu primeiro pedido
      </h3>
      <p>
        O Zappy quer ajudar você a cuidar da ilha. Plante, regue e colha um alimento na sua horta.
      </p>
      <p>
        <strong>{pedido.texto}</strong>
      </p>
      <p className="arq-caderno-explica">
        A primeira colheita traz o projeto azul da geladeira. Ela funciona mesmo antes de ganhar uma
        aparência. O pedido continua aqui quando você voltar. Não precisa comprar nada.
      </p>
    </section>
  )
}
