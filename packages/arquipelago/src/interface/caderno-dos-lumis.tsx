import type { TipoDeCarta } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import { lojaDasCartas, PAINEL_DO_CADERNO, useCartas } from '../estado/cartas'
import { useEstado, useJogo } from '../estado/contexto'
import { abrirRotina } from '../estado/rotina'
import { type CartaDoCaderno, ondeAprender, secoesDoCaderno } from '../sistemas/caderno-dos-lumis'
import { JanelaDoPainel, useFecharPainel, useNoMenu } from './janela-do-painel'

const ICONE: Record<TipoDeCarta, string> = { quando: '🌅', acao: '✨', controle: '🔁' }

function Carta({ carta }: { carta: CartaDoCaderno }) {
  const curso = ondeAprender(carta)
  return (
    <li className={`arq-caderno-carta ${carta.conquistada ? 'pronta' : 'trancada'}`}>
      <span className="arq-caderno-icone" aria-hidden="true">
        {carta.conquistada ? ICONE[carta.tipo] : '🔒'}
      </span>
      <div className="arq-quadro-corpo">
        <b>{carta.nome}</b>
        <span className="arq-caderno-efeito">{carta.efeito}</span>
        <span className="arq-quadro-estado">
          {carta.conquistada
            ? 'Pronto para usar'
            : curso
              ? `Aprenda isso em: ${curso}`
              : 'Nenhum curso ensina este cartão por enquanto.'}
        </span>
      </div>
    </li>
  )
}

/**
 * O caderno dos Lumis: a coleção de cartões da rotina por tipo, os que a pessoa já tem prontos
 * para usar e os que faltam com o curso que ensina o bloco. Só mostra; a rotina se monta no painel
 * "Rotina" (fase2-07), aberto pelo botão daqui.
 */
export function CadernoDosLumis() {
  const { loja, plataforma } = useJogo()
  const fecharPainel = useFecharPainel()
  const cartas = lojaDasCartas(loja, plataforma)
  const noMenu = useNoMenu()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_CADERNO) || noMenu
  const dados = useCartas(cartas, (s) => s.dados)
  const carregando = useCartas(cartas, (s) => s.carregando)
  const fechado = useCartas(cartas, (s) => s.fechado)
  const fechar = useRef<HTMLButtonElement>(null)

  // Cada abertura lê de novo: um curso concluído no meio do jogo traz cartões novos.
  useEffect(() => {
    if (!aberto) return
    fechar.current?.focus()
    void cartas.getState().carregar()
    return () => cartas.getState().cancelar()
  }, [aberto, cartas])

  if (!aberto) return null
  const secoes = dados ? secoesDoCaderno(dados.cartas) : null
  const total = dados?.cartas.length ?? 0
  const prontas = dados?.cartas.filter((c) => c.conquistada).length ?? 0

  return (
    <JanelaDoPainel classes="arq-quadro arq-caderno" rotulo="arq-caderno-titulo">
      <h2 id="arq-caderno-titulo">Caderno dos Lumis</h2>
      <p className="arq-quadro-sub">
        {secoes
          ? `Você tem ${prontas} de ${total} cartões. Com eles você vai montar as rotinas dos Lumis.`
          : 'Os cartões que os Lumis usam nas rotinas.'}
      </p>
      {fechado === 'sem-acesso' ? (
        <p className="arq-aviso atencao">O caderno ainda não abriu para você.</p>
      ) : fechado === 'fora-do-ar' ? (
        <div className="arq-quadro-erro">
          <p className="arq-aviso atencao">
            Não consegui ler o caderno agora. Tente de novo daqui a pouco.
          </p>
          <button
            type="button"
            className="arq-botao leve"
            disabled={carregando}
            onClick={() => void cartas.getState().carregar()}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}
      {secoes
        ? secoes.map((s) => (
            <section
              key={s.tipo}
              className="arq-caderno-secao"
              aria-labelledby={`arq-caderno-${s.tipo}`}
            >
              <h3 id={`arq-caderno-${s.tipo}`} className="arq-menu-titulo">
                {`${s.titulo}: ${s.prontas} de ${s.cartas.length}`}
              </h3>
              <p className="arq-caderno-explica">{s.explica}</p>
              <ul className="arq-quadro-lista">
                {s.cartas.map((c) => (
                  <Carta key={c.id} carta={c} />
                ))}
              </ul>
            </section>
          ))
        : fechado === null && (
            <p role="status" className="arq-quadro-sub">
              Lendo o caderno.
            </p>
          )}
      <div className="arq-menu-acoes">
        <button type="button" className="arq-botao" onClick={() => abrirRotina(loja, null)}>
          Montar a rotina de um Lumi
        </button>
        <button ref={fechar} type="button" className="arq-botao leve" onClick={fecharPainel}>
          Voltar ao jogo
        </button>
      </div>
    </JanelaDoPainel>
  )
}
