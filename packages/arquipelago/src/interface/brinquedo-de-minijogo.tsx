import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { abrirJogo, lojaDosMinijogos, useMinijogos } from '../estado/minijogos'
import {
  BRINQUEDOS_DE_MINIJOGO,
  type IlhaComBrinquedo,
  ilhaDoPainel,
  minijogosDaIlha,
} from '../sistemas/brinquedos-de-minijogo'

/** A lista dos minijogos da ilha, aberta pela barraca da feira ou pelo quiosque do festival (B10). */
export function PainelDoBrinquedo() {
  const ilha = useEstado((s) => ilhaDoPainel(s.painelAberto))
  return ilha ? <BrinquedoAberto ilha={ilha} /> : null
}

function BrinquedoAberto({ ilha }: { ilha: IlhaComBrinquedo }) {
  const { loja, plataforma } = useJogo()
  const fonte = lojaDosMinijogos(loja, plataforma)
  const lista = useMinijogos(fonte, (s) => s.lista)
  const situacao = useMinijogos(fonte, (s) => s.situacao)
  const brinquedo = BRINQUEDOS_DE_MINIJOGO[ilha]
  const daIlha = minijogosDaIlha(lista, ilha)
  const titulo = useRef<HTMLHeadingElement>(null)
  const abrindo = useRef(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
    void fonte.carregar()
  }, [fonte])
  const jogar = async (id: string) => {
    if (abrindo.current) return
    abrindo.current = true
    setAviso('')
    setOcupado(true)
    try {
      if (!(await abrirJogo(loja, plataforma, id, false)))
        setAviso('O minijogo não abriu agora. Tente de novo daqui a pouco.')
    } finally {
      setOcupado(false)
      abrindo.current = false
    }
  }
  return (
    <div className="arq-sobre">
      <section
        className="arq-menu arq-cartao"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-brinquedo-titulo"
      >
        <h2 ref={titulo} tabIndex={-1} id="arq-brinquedo-titulo">
          {brinquedo.titulo}
        </h2>
        {situacao === 'erro' ? (
          <p role="status">
            A lista não abriu agora.{' '}
            <button type="button" className="arq-botao leve" onClick={() => void fonte.carregar()}>
              Tentar de novo
            </button>
          </p>
        ) : daIlha.length === 0 ? (
          <p>{situacao === 'carregando' ? 'Abrindo a lista.' : brinquedo.vazio}</p>
        ) : (
          <ul className="arq-objeto-itens">
            {daIlha.map((m) => (
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
        {aviso ? <p role="status">{aviso}</p> : null}
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Voltar
        </button>
      </section>
    </div>
  )
}
