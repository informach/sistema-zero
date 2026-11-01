import {
  type DesafioNaLista,
  type DesafiosDoJogador,
  ILHA_IDS,
  type IlhaId,
  ilha as ilhaDoContrato,
  QUADROS_POR_ILHA,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { falaDaCorDaSuaIlha } from '../sistemas/cor-da-sua-ilha'
import {
  desafioDeHoje,
  ondeAprender,
  oQueFalta,
  type Quadro,
  quadroSugeridoNoFarol,
  quadrosDaIlha,
} from '../sistemas/quadro-das-cores'
import { receitaPeloId } from '../sistemas/receitas'

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
  // O prêmio-objeto do extra (A25) vem junto das moedas do extra.
  const receita = r.receitaDoExtra ? receitaPeloId(r.receitaDoExtra)?.nome.toLowerCase() : null
  const doExtra = [
    r.moedasExtra > 0 ? `mais ${r.moedasExtra}` : null,
    receita ? `a receita de ${receita}` : null,
  ].filter(Boolean)
  const extra = doExtra.length > 0 ? ` O desafio extra vale ${doExtra.join(' e ')}.` : ''
  return partes ? <p className="arq-quadro-premio">{`Prêmio: ${partes}.${extra}`}</p> : null
}

/** As cores das seis manchas do cavalete, na ordem dos quadros. */
const CORES_DAS_MANCHAS = [
  '#ff7a6b',
  '#ffc93c',
  '#7fd36b',
  '#4fc3e8',
  '#7b61ff',
  '#ff8fc8',
] as const
/** Onde cada mancha fica na tela do cavalete (centro x, y e raio). */
const MANCHAS = [
  [40, 30, 11],
  [70, 26, 10],
  [98, 32, 11],
  [44, 58, 10],
  [74, 56, 12],
  [100, 60, 10],
] as const

/**
 * "Como funciona" (retorno de quem testou, 01/11/2026): o cavalete com as seis manchas, as da
 * ilha já pintadas, e a explicação em uma frase. Abre sozinho até o primeiro desafio feito;
 * depois fica recolhido num botão.
 */
function ComoFunciona({ pintadas, aberto }: { pintadas: readonly number[]; aberto: boolean }) {
  return (
    <details className="arq-quadro-como" open={aberto}>
      <summary>Como funciona</summary>
      <div className="arq-quadro-como-corpo">
        <svg viewBox="0 0 140 120" width="112" height="96" aria-hidden="true">
          <path
            d="M40 112 62 14M100 112 78 14M70 20v96"
            stroke="#8a5a2b"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="22"
            y="12"
            width="96"
            height="66"
            rx="6"
            fill="#fffaf0"
            stroke="#8a5a2b"
            strokeWidth="4"
          />
          {MANCHAS.map(([x, y, r], i) => (
            <circle
              key={x * 1000 + y}
              cx={x}
              cy={y}
              r={r}
              fill={pintadas.includes(i + 1) ? CORES_DAS_MANCHAS[i] : '#d9d6cc'}
            />
          ))}
        </svg>
        <p>
          Cada quadro é um minijogo para programar no Estúdio. Fez um, uma mancha do cavalete ganha
          cor e um pedaço da ilha também.
        </p>
      </div>
    </details>
  )
}

function CartaoDoQuadro({
  q,
  corConquistada,
  sugerido = false,
  ocupado,
  aoJogar,
}: {
  q: Quadro
  corConquistada: boolean
  /** No Farol, a variante da linguagem mais nova que já abriu (A29). */
  sugerido?: boolean
  ocupado: boolean
  aoJogar: (q: Quadro) => void
}) {
  const d = q.desafio
  const titulo = d ? d.titulo : corConquistada ? 'Cor conquistada' : 'Ainda sem desafio'
  return (
    <li className={`arq-quadro-cartao ${corConquistada ? 'feito' : q.estado}`}>
      <span className="arq-quadro-numero" aria-hidden="true">
        {corConquistada ? '✓' : q.numero}
      </span>
      <div className={`arq-quadro-corpo ${d?.imagem ? 'com-imagem' : ''}`}>
        {/* A miniatura "Como fica": o jogo resolvido pelo gabarito (01/11/2026). */}
        {d?.imagem ? <img className="arq-quadro-mini" src={d.imagem} alt="" /> : null}
        {sugerido ? (
          <span className="arq-quadro-hoje-selo">Na linguagem que você aprendeu por último</span>
        ) : null}
        <b>{titulo}</b>
        {d?.resumo ? <span className="arq-quadro-resumo">{d.resumo}</span> : null}
        {corConquistada ? <span className="arq-quadro-estado">Cor de volta</span> : null}
        {q.estado === 'feito' && !corConquistada ? (
          <span className="arq-quadro-estado">Desafio concluído</span>
        ) : null}
        {q.estado === 'disponivel' ? (
          <span className="arq-quadro-estado">Pronto para fazer</span>
        ) : null}
        {q.estado === 'disponivel' && d && ondeAprender(d) ? (
          <span className="arq-quadro-aprenda">{ondeAprender(d)}</span>
        ) : null}
        {q.estado === 'vazio' ? (
          <span className="arq-quadro-estado">
            {corConquistada
              ? 'Esta cor continua aqui.'
              : 'A equipe ainda vai pendurar este desafio'}
          </span>
        ) : null}
        {q.estado === 'trancado' && d ? <Falta d={d} /> : null}
        {q.estado === 'disponivel' || q.estado === 'feito' ? <Premio d={d} /> : null}
        {d?.revisaoHumana ? <RevisaoDaEquipe r={d.revisaoHumana} /> : null}
      </div>
      {q.estado === 'disponivel' || q.estado === 'feito' ? (
        <button
          type="button"
          className={`arq-botao ${q.estado === 'feito' ? 'leve' : ''}`}
          disabled={ocupado}
          onClick={() => aoJogar(q)}
        >
          {q.estado !== 'feito'
            ? 'Fazer o desafio'
            : d?.recompensa.extraNaVersao2 && !d.extraFeito
              ? 'Fazer a versão 2'
              : 'Fazer de novo'}
        </button>
      ) : null}
    </li>
  )
}

/**
 * A revisão humana do jogo autoral (lacunas, 01/11/2026): depois do envio aprovado, a equipe joga
 * e manda um retorno. O acesso ao jogo e às criações continua enquanto isso.
 */
function RevisaoDaEquipe({ r }: { r: NonNullable<DesafioNaLista['revisaoHumana']> }) {
  if (r.estado === 'aguardando')
    return (
      <span className="arq-quadro-estado">
        A equipe vai jogar o seu jogo e mandar um retorno.
        {r.retorno ? ` O último retorno foi: ${r.retorno}` : ''}
      </span>
    )
  return (
    <span className="arq-quadro-estado">
      {r.estado === 'conferido'
        ? `A equipe jogou o seu jogo. ${r.retorno ?? ''}`
        : `A equipe jogou o seu jogo e sugeriu uma melhora. ${r.retorno ?? ''} Mude o jogo e envie de novo.`}
    </span>
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
  if (falta.faltaCurso)
    return (
      <span className="arq-quadro-estado">
        {falta.cursos.length > 0
          ? `Abre depois do curso ${falta.cursos.join(', ')}`
          : 'Abre depois do curso deste posto'}
      </span>
    )
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
  const cores = useDesafios(desafios, (s) => s.cores)
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
    // O Farol não pinta (C03b): a festa é do jogo pronto. A sua ilha pinta uma parte por quadro
    // desde as lacunas de 01/11/2026.
    loja
      .getState()
      .dizer(
        festa.ilha === 'farol'
          ? 'Seu jogo ficou pronto. Ele vai para o fliperama da sua casa.'
          : festa.ilha === 'sua-ilha'
            ? falaDaCorDaSuaIlha(festa.quadros)
            : festa.quadros.length > 1
              ? `Mais cores voltaram para o ${nome}.`
              : `Mais uma cor voltou para o ${nome}. Olhe o quadro.`,
      )
    const t = setTimeout(() => desafios.getState().festaVista(), FESTA_MS)
    return () => clearTimeout(t)
  }, [festa, loja, desafios])

  if (!ilhaId) return null
  const nome = ilhaDoContrato(ilhaId).nome
  const quadros = dados ? quadrosDaIlha(dados.desafios, ilhaId) : null
  const sugerido = quadros && ilhaId === 'farol' ? quadroSugeridoNoFarol(quadros) : null
  const feitos = cores.ilhas.find((i) => i.id === ilhaId)?.quadros.length ?? 0

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
          {ilhaId === 'farol'
            ? 'Um jogo todo seu, com os critérios na lista. Escolha a linguagem entre as que você já aprendeu e faça quando quiser.'
            : quadros || feitos > 0
              ? `${nome}: ${feitos} de ${QUADROS_POR_ILHA} cores de volta.`
              : `Cada desafio feito devolve um pedaço da cor do ${nome}.`}
        </p>
        {ilhaId !== 'farol' && quadros ? (
          <ComoFunciona
            pintadas={cores.ilhas.find((i) => i.id === ilhaId)?.quadros ?? []}
            aberto={!cores.ilhas.some((i) => i.quadros.length > 0)}
          />
        ) : null}
        {dados && quadros ? (
          <CartaoDeHoje
            dados={dados}
            ocupado={ferramentaAberta || carregando}
            aoJogar={(d) => void jogar(d)}
          />
        ) : null}
        {quadros ? (
          <ol className="arq-quadro-lista">
            {/* O Farol tem um projeto autoral só (C03b): os quadros vazios não aparecem. */}
            {quadros
              .filter((q) => ilhaId !== 'farol' || q.estado !== 'vazio')
              .map((q) => (
                <CartaoDoQuadro
                  key={q.numero}
                  q={q}
                  // O Farol não pinta (C03b): o quadro feito é só "Desafio concluído".
                  corConquistada={
                    ilhaId !== 'farol' &&
                    (cores.ilhas.find((i) => i.id === ilhaId)?.quadros.includes(q.numero) ?? false)
                  }
                  sugerido={ilhaId === 'farol' && q.numero === sugerido}
                  ocupado={ferramentaAberta || carregando}
                  aoJogar={(x) => void jogar(x.desafio)}
                />
              ))}
          </ol>
        ) : fechado === 'desligado' ? (
          <p className="arq-aviso atencao">
            {feitos > 0
              ? 'Os desafios não estão disponíveis agora. Suas cores continuam aqui.'
              : 'Os desafios desta ilha ainda não abriram. O Zappy avisa quando chegarem.'}
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
