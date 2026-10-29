import { useEffect, useState } from 'react'
import { useJogo } from '../estado/contexto'
import { lojaDosMinijogos, useMinijogos } from '../estado/minijogos'

export function MinijogosDoFliperama() {
  const { loja, plataforma } = useJogo()
  const fonte = lojaDosMinijogos(loja, plataforma)
  const lista = useMinijogos(fonte, (s) => s.lista)
  const situacao = useMinijogos(fonte, (s) => s.situacao)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    void fonte.carregar()
  }, [fonte])
  const jogar = async (desafioId: string) => {
    setOcupado(true)
    loja.getState().definirFerramentaAberta(true)
    try {
      const r = await plataforma.abrirFerramenta({
        ferramenta: 'estudio',
        proposito: 'minijogo',
        molde: { desafioId },
      })
      if (r.situacao === 'indisponivel')
        setAviso('O minijogo não abriu agora. Tente de novo daqui a pouco.')
    } catch {
      setAviso('O minijogo não abriu agora. Tente de novo daqui a pouco.')
    } finally {
      loja.getState().definirFerramentaAberta(false)
      setOcupado(false)
    }
  }
  return (
    <section aria-label="Seus minijogos">
      <h3 className="arq-menu-titulo">Seus minijogos</h3>
      {situacao === 'erro' ? (
        <p role="status">
          A lista não abriu agora.{' '}
          <button type="button" className="arq-botao leve" onClick={() => void fonte.carregar()}>
            Tentar de novo
          </button>
        </p>
      ) : lista.length === 0 ? (
        <p>
          {situacao === 'carregando'
            ? 'Abrindo a lista.'
            : 'Seus minijogos aprovados aparecem aqui.'}
        </p>
      ) : (
        <ul className="arq-objeto-itens">
          {lista.map((m) => (
            <li key={m.desafioId}>
              <button
                type="button"
                className="arq-botao"
                disabled={ocupado}
                onClick={() => void jogar(m.desafioId)}
              >
                Jogar {m.titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
      {aviso && <p role="status">{aviso}</p>}
    </section>
  )
}
