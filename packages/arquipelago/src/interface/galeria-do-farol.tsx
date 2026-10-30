import { chaveDaExposicao, type ExposicaoDoFarol } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { abrirJogo, lojaDosMinijogos, useMinijogos } from '../estado/minijogos'
import { lojaDoMural, useMural } from '../estado/mural'
import {
  aparenciaDaExposicao,
  type CriacaoParaExpor,
  criacoesParaExpor,
  exporNaVaga,
  FALA_DA_GALERIA_VAZIA,
  PAINEL_DA_GALERIA,
  tirarDaVaga,
  tituloDaExposicao,
  vagaDaExposicao,
  vagasDaGaleria,
} from '../sistemas/galeria-do-farol'

/** O valor de `painelAberto` de uma vaga da galeria (`galeria-do-farol:<vaga>`). */
export function painelDaVaga(vaga: number): string {
  return `${PAINEL_DA_GALERIA}:${vaga}`
}

function vagaDoPainel(painel: string | null): number | null {
  if (!painel?.startsWith(`${PAINEL_DA_GALERIA}:`)) return null
  const n = Number(painel.slice(PAINEL_DA_GALERIA.length + 1))
  return Number.isInteger(n) ? n : null
}

/** O painel de uma vaga da galeria do Farol: o que está exposto e o que dá para expor. */
export function PainelDaGaleria() {
  const vaga = useEstado((s) => vagaDoPainel(s.painelAberto))
  return vaga === null ? null : <VagaAberta vaga={vaga} />
}

const NOME_DO_TIPO: Readonly<Record<CriacaoParaExpor['tipo'], string>> = {
  aparencia: 'Pinta e Molda',
  minijogo: 'Minijogos',
  mural: 'Jogos do Mural',
}

function VagaAberta({ vaga }: { vaga: number }) {
  const { loja, plataforma } = useJogo()
  const salvamento = useEstado((s) => s.salvamento)
  const minijogos = lojaDosMinijogos(loja, plataforma)
  const mural = lojaDoMural(loja, plataforma)
  const listaDeMinijogos = useMinijogos(minijogos, (s) => s.lista)
  const listaDoMural = useMural(mural, (s) => s.lista)
  const fechar = useRef<HTMLButtonElement>(null)
  const [aviso, setAviso] = useState('')
  const abrindo = useRef(false)
  useEffect(() => {
    void minijogos.carregar()
    void mural.carregar()
    fechar.current?.focus({ preventScroll: true })
  }, [minijogos, mural])
  const exposta = vagasDaGaleria(salvamento)[vaga] ?? null
  const criacoes = criacoesParaExpor(salvamento, listaDeMinijogos, listaDoMural)
  const grupos = (['aparencia', 'minijogo', 'mural'] as const).map((tipo) => ({
    tipo,
    lista: criacoes.filter((c) => c.tipo === tipo),
  }))
  const mudar = (fazer: (s: typeof salvamento) => typeof salvamento) => loja.getState().mudar(fazer)
  const jogar = async (e: ExposicaoDoFarol) => {
    if (abrindo.current || e[0] === 'a') return
    abrindo.current = true
    setAviso('')
    try {
      if (!(await abrirJogo(loja, plataforma, e[1], e[0] === 'j')))
        setAviso('O jogo não abriu agora. Tente de novo daqui a pouco.')
    } finally {
      abrindo.current = false
    }
  }
  const expostaValida = exposta && (exposta[0] !== 'a' || aparenciaDaExposicao(salvamento, exposta))
  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-galeria-farol"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-galeria-farol-titulo"
      >
        <h2 id="arq-galeria-farol-titulo">{`Vaga ${vaga + 1} da galeria`}</h2>
        {exposta ? (
          <section aria-label="Criação exposta" className="arq-galeria-farol-exposta">
            <p>
              <b>{tituloDaExposicao(salvamento, exposta, listaDeMinijogos, listaDoMural)}</b>
            </p>
            <div className="arq-menu-acoes">
              {exposta[0] !== 'a' ? (
                <button type="button" className="arq-botao" onClick={() => void jogar(exposta)}>
                  Jogar
                </button>
              ) : null}
              <button
                type="button"
                className="arq-botao leve"
                onClick={() => mudar((s) => tirarDaVaga(s, vaga))}
              >
                Tirar daqui
              </button>
            </div>
            {expostaValida ? null : (
              <p className="arq-quadro-sub">
                Essa criação não está mais guardada. Escolha outra para esta vaga.
              </p>
            )}
          </section>
        ) : (
          <p className="arq-quadro-sub">{FALA_DA_GALERIA_VAZIA}</p>
        )}
        {aviso ? <p role="status">{aviso}</p> : null}
        {criacoes.length === 0 ? (
          <p>
            Suas criações aparecem aqui: o que você pinta no Pinta e molda no Molda para os objetos
            da casa, seus minijogos aprovados e seus jogos do Mural.
          </p>
        ) : (
          grupos
            .filter((g) => g.lista.length > 0)
            .map((g) => (
              <section key={g.tipo} aria-label={NOME_DO_TIPO[g.tipo]}>
                <h3 className="arq-menu-titulo">{NOME_DO_TIPO[g.tipo]}</h3>
                <ul className="arq-galeria-farol-lista">
                  {g.lista.map((c) => {
                    const onde = vagaDaExposicao(salvamento, c.exposicao)
                    const aqui = onde === vaga
                    return (
                      <li key={chaveDaExposicao(c.exposicao)}>
                        <span>
                          <b>{c.titulo}</b>
                          {onde >= 0 && !aqui ? <small>{`Na vaga ${onde + 1}`}</small> : null}
                        </span>
                        <button
                          type="button"
                          className="arq-botao leve"
                          disabled={aqui}
                          onClick={() => mudar((s) => exporNaVaga(s, vaga, c.exposicao))}
                        >
                          {aqui ? 'Exposta aqui' : 'Expor aqui'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
        )}
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
