import {
  type DesafioNaLista,
  type DesafiosDoJogador,
  ILHA_IDS,
  type IlhaId,
  ilha as ilhaDoContrato,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { desafioDeHoje, oQueFalta, type Quadro, quadrosDaIlha } from '../sistemas/quadro-das-cores'

/** Quanto tempo a festa da cor fica na tela antes de o serviço guardar que foi vista. */
const FESTA_MS = 4000

function ilhaDoPainel(painel: string | null): IlhaId | null {
  if (!painel?.startsWith('quadro:')) return null
  const id = painel.slice('quadro:'.length)
  return (ILHA_IDS as readonly string[]).includes(id) ? (id as IlhaId) : null
}

function Premio({ d }: { d: DesafioNaLista | null }) {
  const r = d?.recompensa
  if (!r) return null
  const partes = [
    r.cor ? 'pinta um pedaço da ilha' : null,
    r.moedas > 0 ? `${r.moedas} moedas` : null,
  ]
    .filter(Boolean)
    .join(' e ')
  const extra = r.moedasExtra > 0 ? ` O desafio extra vale mais ${r.moedasExtra}.` : ''
  return partes ? <p className="arq-quadro-premio">{`Prêmio: ${partes}.${extra}`}</p> : null
}

function CartaoDoQuadro({
  q,
  ocupado,
  aoJogar,
}: {
  q: Quadro
  ocupado: boolean
  aoJogar: (q: Quadro) => void
}) {
  const d = q.desafio
  const titulo = d ? d.titulo : 'Ainda sem desafio'
  return (
    <li className={`arq-quadro-cartao ${q.estado}`}>
      <span className="arq-quadro-numero" aria-hidden="true">
        {q.estado === 'feito' ? '✓' : q.numero}
      </span>
      <div className="arq-quadro-corpo">
        <b>{titulo}</b>
        {q.estado === 'feito' ? <span className="arq-quadro-estado">Cor de volta</span> : null}
        {q.estado === 'disponivel' ? (
          <span className="arq-quadro-estado">Pronto para fazer</span>
        ) : null}
        {q.estado === 'vazio' ? (
          <span className="arq-quadro-estado">A equipe ainda vai pendurar este desafio</span>
        ) : null}
        {q.estado === 'trancado' && d ? <Falta d={d} /> : null}
        {q.estado === 'disponivel' || q.estado === 'feito' ? <Premio d={d} /> : null}
      </div>
      {q.estado === 'disponivel' || q.estado === 'feito' ? (
        <button
          type="button"
          className={`arq-botao ${q.estado === 'feito' ? 'leve' : ''}`}
          disabled={ocupado}
          onClick={() => aoJogar(q)}
        >
          {q.estado === 'feito' ? 'Fazer de novo' : 'Fazer o desafio'}
        </button>
      ) : null}
    </li>
  )
}

/**
 * O cartão "Desafio de hoje", em cima dos seis quadros: o desafio que o serviço guardou para a
 * pessoa hoje (de qualquer ilha já aberta), feito ou por fazer.
 */
function CartaoDeHoje({
  dados,
  ocupado,
  aoJogar,
}: {
  dados: DesafiosDoJogador
  ocupado: boolean
  aoJogar: (d: DesafioNaLista) => void
}) {
  const { estado, desafio } = desafioDeHoje(dados)
  return (
    <section className={`arq-quadro-cartao arq-quadro-hoje ${estado}`} aria-label="Desafio de hoje">
      <span className="arq-quadro-numero" aria-hidden="true">
        {estado === 'feito' ? '✓' : '★'}
      </span>
      <div className="arq-quadro-corpo">
        <span className="arq-quadro-hoje-selo">Desafio de hoje</span>
        {desafio ? <b>{desafio.titulo}</b> : null}
        {estado === 'pronto' && desafio ? (
          <span className="arq-quadro-estado">{ilhaDoContrato(desafio.ilha).nome}</span>
        ) : null}
        {estado === 'feito' ? (
          <span className="arq-quadro-estado">Feito hoje. Amanhã tem outro.</span>
        ) : null}
        {estado === 'nenhum' ? (
          <span className="arq-quadro-estado">Ainda não há desafio de hoje.</span>
        ) : null}
        {/* Banco recomeçado (já feito antes): refazer não paga de novo. */}
        {estado === 'pronto' && desafio?.situacao === 'concluido' ? (
          <p className="arq-quadro-premio">
            Você já fez este. Desta vez é para treinar, sem moedas.
          </p>
        ) : estado === 'pronto' ? (
          <Premio d={desafio} />
        ) : null}
      </div>
      {estado === 'pronto' && desafio ? (
        <button
          type="button"
          className="arq-botao"
          disabled={ocupado}
          onClick={() => aoJogar(desafio)}
        >
          Fazer o desafio
        </button>
      ) : null}
    </section>
  )
}

function Falta({ d }: { d: NonNullable<Quadro['desafio']> }) {
  const falta = oQueFalta(d)
  if (falta.ilhaFechada) return <span className="arq-quadro-estado">Abre quando a ilha abrir</span>
  if (falta.cursos.length === 0)
    return <span className="arq-quadro-estado">Faltam blocos que você ainda vai aprender</span>
  return (
    <span className="arq-quadro-estado">{`Aprenda primeiro em: ${falta.cursos.join(', ')}`}</span>
  )
}

/**
 * O painel do Quadro das Cores: os seis quadros da ilha, o que está pronto, o que falta (e em que
 * curso se aprende) e o botão que abre o Estúdio de desafio por cima do jogo.
 */
export function PainelDoQuadro() {
  const { loja, plataforma } = useJogo()
  const desafios = lojaDosDesafios(loja, plataforma)
  const painel = useEstado((s) => s.painelAberto)
  const ilhaId = ilhaDoPainel(painel)
  const dados = useDesafios(desafios, (s) => s.dados)
  const carregando = useDesafios(desafios, (s) => s.carregando)
  const fechado = useDesafios(desafios, (s) => s.fechado)
  const festa = useDesafios(desafios, (s) => s.festa)
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const [aviso, setAviso] = useState<string | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (ilhaId) fechar.current?.focus()
    else setAviso(null)
  }, [ilhaId])

  // A festa da cor: o Zappy comemora, e depois o serviço guarda que ela foi vista.
  useEffect(() => {
    if (!festa) return
    const nome = ilhaDoContrato(festa.ilha).nome
    loja
      .getState()
      .dizer(
        festa.quadros.length > 1
          ? `Mais cores voltaram para o ${nome}.`
          : `Mais uma cor voltou para o ${nome}. Olhe o quadro.`,
      )
    const t = setTimeout(() => desafios.getState().festaVista(), FESTA_MS)
    return () => clearTimeout(t)
  }, [festa, loja, desafios])

  if (!ilhaId) return null
  const nome = ilhaDoContrato(ilhaId).nome
  const quadros = dados ? quadrosDaIlha(dados.desafios, ilhaId) : null
  const feitos = quadros?.filter((q) => q.estado === 'feito').length ?? 0

  async function jogar(d: DesafioNaLista | null) {
    if (!d) return
    setAviso(null)
    const r = await desafios.getState().jogar(d.id, d.revisao)
    if (r === 'nao-abriu')
      setAviso('Não deu para abrir o desafio agora. Tente de novo daqui a pouco.')
    // Cor nova: o painel sai da frente para a pessoa ver a mancha colorir no quadro.
    if (r === 'feito' && desafios.getState().festa) loja.getState().abrirPainel(null)
  }

  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-quadro-titulo"
      >
        <h2 id="arq-quadro-titulo">Quadro das Cores</h2>
        <p className="arq-quadro-sub">
          {quadros
            ? `${nome}: ${feitos} de ${quadros.length} cores de volta.`
            : `Cada desafio feito devolve um pedaço da cor do ${nome}.`}
        </p>
        {dados && quadros ? (
          <CartaoDeHoje
            dados={dados}
            ocupado={ferramentaAberta || carregando}
            aoJogar={(d) => void jogar(d)}
          />
        ) : null}
        {quadros ? (
          <ol className="arq-quadro-lista">
            {quadros.map((q) => (
              <CartaoDoQuadro
                key={q.numero}
                q={q}
                ocupado={ferramentaAberta || carregando}
                aoJogar={(x) => void jogar(x.desafio)}
              />
            ))}
          </ol>
        ) : fechado === 'desligado' ? (
          <p className="arq-aviso atencao">
            Os desafios desta ilha ainda não abriram. O Zappy avisa quando chegarem.
          </p>
        ) : fechado === 'fora-do-ar' ? (
          <div className="arq-quadro-erro">
            <p className="arq-aviso atencao">
              Não consegui ler o quadro agora. Tente de novo daqui a pouco.
            </p>
            <button
              type="button"
              className="arq-botao leve"
              onClick={() => void desafios.getState().carregar()}
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <p role="status" className="arq-quadro-sub">
            Lendo o quadro.
          </p>
        )}
        {aviso ? (
          <p role="status" className="arq-aviso atencao">
            {aviso}
          </p>
        ) : null}
        <div className="arq-menu-acoes">
          <button
            ref={fechar}
            type="button"
            className="arq-botao leve"
            disabled={ferramentaAberta}
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}
