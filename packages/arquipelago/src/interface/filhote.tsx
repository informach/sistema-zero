import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDoFilhote, PAINEL_DO_FILHOTE, useFilhote } from '../estado/filhote'
import {
  alimentarOFilhote,
  carinhoNoFilhote,
  cresceu,
  DIAS_PARA_CRESCER,
  nasceu,
  nomearOFilhote,
  type ResultadoDoFilhote,
} from '../sistemas/filhote-do-vale'
import { diaDe } from '../sistemas/moradores'

/**
 * O filhote do Vale (fase4-03), na caixa de baixo como o bicho adotado: primeiro o nome, depois a
 * comida e o carinho do dia. O jogo fica parado enquanto ela está aberta, e o Esc fecha.
 */
export function PainelDoFilhote() {
  const { loja } = useJogo()
  const painel = lojaDoFilhote(loja)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_FILHOTE)
  const filhote = useEstado((s) => s.salvamento.vale.filhote)
  const fala = useFilhote(painel, (s) => s.fala)
  const principal = useRef<HTMLButtonElement>(null)
  const temNome = filhote?.nome != null
  useEffect(() => {
    if (aberto && temNome) principal.current?.focus()
  }, [aberto, temNome])

  if (!aberto || !filhote || !nasceu(filhote)) return null
  const fechar = () => loja.getState().abrirPainel(null)
  const hoje = diaDe(new Date())

  function aoCuidar(r: ResultadoDoFilhote | null) {
    if (!r) return
    const s = loja.getState()
    const mudou = r.salvamento !== s.salvamento
    if (mudou) s.mudar(() => r.salvamento)
    painel.getState().responder(r.fala, mudou)
  }

  const nome = filhote.nome ?? 'Filhote de tricerátopo'
  const fase = cresceu(filhote)
    ? 'Tricerátopo crescido'
    : `Filhote, ${filhote.dias} de ${DIAS_PARA_CRESCER} dias cuidados`

  return (
    <div
      className="arq-capi arq-bicho"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arq-filhote-nome"
    >
      <div className="arq-capi-topo">
        <h2 id="arq-filhote-nome">
          <span aria-hidden="true">🦕</span> {nome}
        </h2>
        <span className="arq-bicho-fase">{fase}</span>
      </div>
      {filhote.nome === null ? (
        <DarONome />
      ) : (
        <>
          <p className="arq-capi-fala" aria-live="polite">
            {fala ?? `${nome} balança o rabo quando você chega perto.`}
          </p>
          <ul className="arq-filhote-hoje" aria-label="Os cuidados de hoje">
            <li className={filhote.comeuEm === hoje ? 'feito' : undefined}>
              <span aria-hidden="true">{filhote.comeuEm === hoje ? '✅' : '🥬'}</span>
              {filhote.comeuEm === hoje ? 'Já comeu hoje' : 'Ainda não comeu hoje'}
            </li>
            <li className={filhote.carinhoEm === hoje ? 'feito' : undefined}>
              <span aria-hidden="true">{filhote.carinhoEm === hoje ? '✅' : '💛'}</span>
              {filhote.carinhoEm === hoje ? 'Já ganhou carinho hoje' : 'Ainda sem carinho hoje'}
            </li>
          </ul>
          <div className="arq-menu-acoes">
            <button
              ref={principal}
              type="button"
              className="arq-botao leve"
              onClick={() => aoCuidar(alimentarOFilhote(loja.getState().salvamento, hoje))}
            >
              Dar comida
            </button>
            <button
              type="button"
              className="arq-botao leve"
              onClick={() => aoCuidar(carinhoNoFilhote(loja.getState().salvamento, hoje))}
            >
              Fazer carinho
            </button>
            <button type="button" className="arq-botao leve" onClick={fechar}>
              Voltar ao jogo
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DarONome() {
  const { loja } = useJogo()
  const [nome, setNome] = useState('')
  const [falta, setFalta] = useState(false)
  const id = useId()
  const idFalta = useId()
  const campo = useRef<HTMLInputElement>(null)
  useEffect(() => {
    campo.current?.focus()
  }, [])

  function aoDar(e: FormEvent) {
    e.preventDefault()
    const s = loja.getState()
    const novo = nomearOFilhote(s.salvamento, nome)
    if (novo === s.salvamento) {
      setFalta(true)
      return
    }
    s.mudar(() => novo)
    lojaDoFilhote(loja)
      .getState()
      .responder(
        `${novo.vale.filhote?.nome} adorou o nome. Ele come o que a horta dá e gosta de carinho.`,
        true,
      )
  }

  return (
    <form className="arq-capi-adotar" onSubmit={aoDar}>
      <p className="arq-capi-fala">O filhote acabou de nascer e está esperando um nome.</p>
      <label className="arq-capi-nome" htmlFor={id}>
        Nome
        <input
          ref={campo}
          id={id}
          value={nome}
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={falta ? true : undefined}
          aria-describedby={falta ? idFalta : undefined}
          onChange={(e) => {
            setNome(e.target.value)
            setFalta(false)
          }}
        />
      </label>
      {falta ? (
        <p id={idFalta} role="alert" className="arq-capi-falta">
          Escreva um nome com pelo menos uma letra.
        </p>
      ) : null}
      <div className="arq-menu-acoes">
        <button type="submit" className="arq-botao">
          Dar o nome
        </button>
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Depois
        </button>
      </div>
    </form>
  )
}
