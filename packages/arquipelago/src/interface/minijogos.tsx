import { useEffect, useRef, useState } from 'react'
import { useJogo } from '../estado/contexto'
import { lojaDosMinijogos, useMinijogos } from '../estado/minijogos'
import { lojaDoMural, useMural } from '../estado/mural'

export function MinijogosDoFliperama() {
  const { loja, plataforma } = useJogo()
  const fonte = lojaDosMinijogos(loja, plataforma)
  const lista = useMinijogos(fonte, (s) => s.lista)
  const situacao = useMinijogos(fonte, (s) => s.situacao)
  const mural = lojaDoMural(loja, plataforma)
  const publicados = useMural(mural, (s) => s.lista)
  const situacaoMural = useMural(mural, (s) => s.situacao)
  const abrindo = useRef(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    void fonte.carregar()
    void mural.carregar()
  }, [fonte, mural])
  const jogar = async (id: string, publicado = false) => {
    if (abrindo.current) return
    abrindo.current = true
    setAviso('')
    setOcupado(true)
    loja.getState().definirFerramentaAberta(true)
    try {
      const r = await plataforma.abrirFerramenta({
        ferramenta: 'estudio',
        proposito: publicado ? 'jogo-do-mural' : 'minijogo',
        molde: publicado ? { playId: id } : { desafioId: id },
      })
      if (r.situacao === 'indisponivel')
        setAviso('O minijogo não abriu agora. Tente de novo daqui a pouco.')
    } catch {
      setAviso('O minijogo não abriu agora. Tente de novo daqui a pouco.')
    } finally {
      loja.getState().definirFerramentaAberta(false)
      setOcupado(false)
      abrindo.current = false
      if (publicado) void mural.carregar()
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
      <h3 className="arq-menu-titulo">Seus jogos recentes do Mural</h3>
      {situacaoMural === 'erro' ? (
        <p role="status">
          A lista do Mural não abriu agora.{' '}
          <button
            type="button"
            className="arq-botao leve"
            disabled={ocupado}
            onClick={() => void mural.carregar()}
          >
            Tentar de novo
          </button>
        </p>
      ) : publicados.length === 0 ? (
        <p>
          {situacaoMural === 'carregando'
            ? 'Abrindo suas publicações.'
            : 'Seus jogos publicados e visíveis no Mural aparecem aqui.'}
        </p>
      ) : (
        <ul className="arq-objeto-itens">
          {publicados.map((jogo) => (
            <li key={jogo.playId}>
              <button
                type="button"
                className="arq-botao"
                disabled={ocupado}
                onClick={() => void jogar(jogo.playId, true)}
              >
                Jogar {jogo.titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
      {aviso && <p role="status">{aviso}</p>}
    </section>
  )
}
