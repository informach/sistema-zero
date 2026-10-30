import { useEffect } from 'react'
import { useStore } from 'zustand'
import { useJogo } from '../estado/contexto'
import { lojaDosFantasmas } from '../estado/fantasmas'

/** A vida da montagem é a vida dos pedidos. Retomar a aba reconfirma a permissão do irmão. */
export function EfeitoDosFantasmas() {
  const { loja, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  useEffect(() => {
    fantasmas.iniciar()
    const revalidar = () => {
      if (document.visibilityState !== 'hidden') void fantasmas.revalidar()
    }
    const retomar = () => {
      revalidar()
      if (document.visibilityState !== 'hidden') void fantasmas.tentarEnviar()
    }
    const timer = setInterval(revalidar, 15_000)
    document.addEventListener('visibilitychange', retomar)
    window.addEventListener('online', retomar)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', retomar)
      window.removeEventListener('online', retomar)
      fantasmas.parar()
    }
  }, [fantasmas])
  return null
}

export function EnvioDoFantasma() {
  const { loja, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const envio = useStore(fantasmas.estado, (s) => s.envio)
  if (envio !== 'pendente' && envio !== 'indisponivel') return null
  return (
    <div className="arq-recordes-recado" role="status">
      <p>O trajeto ainda precisa ser enviado. Isso não impede a próxima corrida.</p>
      <button
        type="button"
        className="arq-botao leve"
        onClick={() => void fantasmas.tentarEnviar()}
      >
        Tentar enviar o trajeto
      </button>
    </div>
  )
}

export function AvisoDoFantasma() {
  const { loja, plataforma, fila } = useJogo()
  const fantasmas = lojaDosFantasmas(loja, plataforma, fila)
  const referencia = useStore(fantasmas.estado, (s) => s.referencia)
  const recado = useStore(fantasmas.estado, (s) => s.recado)
  if (!referencia && !recado) return null
  return (
    <div className="arq-recordes-recado" role="status">
      {referencia ? (
        <>
          <p>
            Na próxima corrida, você pode seguir o trajeto de {referencia.nome}. A silhueta mostra o
            caminho, não a aparência de quem correu.
          </p>
          <button type="button" className="arq-botao leve" onClick={() => fantasmas.retirar()}>
            Correr sem trajeto
          </button>
        </>
      ) : (
        <p>{recado}</p>
      )}
    </div>
  )
}
