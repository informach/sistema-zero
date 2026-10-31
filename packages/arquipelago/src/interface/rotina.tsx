import {
  CARTAS_LUMI,
  CASOS_DA_ESCOLHA,
  type CartaoDaRotina,
  CONDICOES_DA_ROTINA,
  type CondicaoDaRotina,
  descricaoDoTrabalhoLumi,
  LIMITES_DA_ROTINA,
  LUGARES_DA_ROTINA,
  LUMIS,
  type LugarDaRotina,
  type LumiId,
  type TipoDeCarta,
} from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { lojaDasCartas, useCartas } from '../estado/cartas'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaRotina, PAINEL_DA_ROTINA, useRotina } from '../estado/rotina'
import { ESPECIES_DE_LUMI } from '../sistemas/album'
import { editarRotinaNaPlataforma } from '../sistemas/ferramenta-da-rotina'
import {
  type Alvo,
  alvoExiste,
  apagarRotina,
  cartaoNovo,
  cartasNaMao,
  daRotinaDo,
  guardarRotina,
  limparRotina,
  moverCartao,
  mudarCartao,
  NOME_DA_CONDICAO,
  NOME_DO_CASO,
  NOME_DO_LUGAR,
  nomeDoCartao,
  porCartao,
  ROTINA_VAZIA,
  rodarRotina,
  tirarCartao,
  validarRotina,
} from '../sistemas/rotina'
import { MINIATURA_DO_LUMI } from './miniaturas-dos-lumis'

const ICONE: Record<TipoDeCarta, string> = { quando: '🌅', acao: '✨', controle: '🔁' }
const TIPO = Object.fromEntries(CARTAS_LUMI.map((c) => [c.id, c.tipo])) as Record<
  string,
  TipoDeCarta
>
const L = LIMITES_DA_ROTINA
const numeros = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i)
const mesmoAlvo = (a: Alvo, b: Alvo) =>
  a.length === b.length && a.every((p, i) => p.i === b[i]?.i && p.caso === b[i]?.caso)
const chaveDoAlvo = (a: Alvo) => a.map((p) => `${p.i}${p.caso ? `-${p.caso}` : ''}`).join('.')

interface Edicao {
  selecionado: Alvo
  selecionar(a: Alvo): void
  mudar(alvo: Alvo, i: number, novo: CartaoDaRotina): void
  tirar(alvo: Alvo, i: number): void
  mover(alvo: Alvo, i: number, para: -1 | 1): void
}

/** Os números e a condição de cada cartão (o que dá para trocar nele). */
function Ajustes({ c, mudar }: { c: CartaoDaRotina; mudar(novo: CartaoDaRotina): void }) {
  if (c.c === 'voar-ate')
    return (
      <select
        aria-label="Para onde"
        value={c.a}
        onChange={(e) => mudar({ ...c, a: e.target.value as LugarDaRotina })}
      >
        {LUGARES_DA_ROTINA.map((l) => (
          <option key={l} value={l}>
            {NOME_DO_LUGAR[l]}
          </option>
        ))}
      </select>
    )
  if (c.c === 'repetir' || c.c === 'esperar') {
    const r = c.c === 'repetir' ? L.vezes : L.segundos
    return (
      <select
        aria-label={c.c === 'repetir' ? 'Quantas vezes' : 'Quantos segundos'}
        value={c.n}
        onChange={(e) => mudar({ ...c, n: Number(e.target.value) })}
      >
        {numeros(r.min, r.max).map((n) => (
          <option key={n} value={n}>
            {c.c === 'repetir' ? `${n} vezes` : `${n} ${n === 1 ? 'segundo' : 'segundos'}`}
          </option>
        ))}
      </select>
    )
  }
  if (c.c === 'guardar-na-memoria')
    return (
      <select
        aria-label="O número"
        value={c.n}
        onChange={(e) => mudar({ ...c, n: Number(e.target.value) })}
      >
        {numeros(L.memoria.min, L.memoria.max).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    )
  if (c.c === 'se' || c.c === 'enquanto')
    return (
      <>
        <select
          aria-label="A condição"
          value={c.se}
          onChange={(e) => {
            const se = e.target.value as CondicaoDaRotina
            mudar(
              se === 'lembra-menos-que'
                ? { c: c.c, se, n: c.n ?? 3, d: c.d }
                : { c: c.c, se, d: c.d },
            )
          }}
        >
          {CONDICOES_DA_ROTINA.map((x) => (
            <option key={x} value={x}>
              {NOME_DA_CONDICAO[x]}
            </option>
          ))}
        </select>
        {c.se === 'lembra-menos-que' ? (
          <select
            aria-label="O número da condição"
            value={c.n ?? 3}
            onChange={(e) => mudar({ ...c, n: Number(e.target.value) })}
          >
            {numeros(1, L.memoria.max).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : null}
      </>
    )
  return null
}

/** Uma lista de cartões (a de cima ou a de dentro de um controle), com os de dentro também. */
function ListaDeCartoes({
  lista,
  alvo,
  edicao,
  rotulo,
}: {
  lista: readonly CartaoDaRotina[]
  alvo: Alvo
  edicao: Edicao
  rotulo: string
}) {
  const aqui = mesmoAlvo(edicao.selecionado, alvo)
  return (
    <div className={`arq-rotina-lista${aqui ? ' alvo' : ''}`}>
      {alvo.length > 0 ? (
        <button
          type="button"
          className="arq-rotina-aqui"
          aria-pressed={aqui}
          onClick={() => edicao.selecionar(alvo)}
        >
          {aqui ? `Os cartões novos entram aqui: ${rotulo}` : `Pôr cartões aqui: ${rotulo}`}
        </button>
      ) : null}
      {lista.length === 0 ? <p className="arq-rotina-vazia">Nenhum cartão ainda.</p> : null}
      <ol>
        {lista.map((c, i) => {
          const nome = nomeDoCartao(c.c)
          return (
            <li
              // A posição é a identidade do cartão na rotina (a lista não tem id próprio).
              // biome-ignore lint/suspicious/noArrayIndexKey: subir e descer trocam a posição
              key={`${chaveDoAlvo(alvo)}-${i}-${c.c}`}
              className={`arq-rotina-cartao ${TIPO[c.c]}`}
            >
              <div className="arq-rotina-linha">
                <span aria-hidden="true">{ICONE[TIPO[c.c] ?? 'acao']}</span>
                <b>{nome}</b>
                <Ajustes c={c} mudar={(novo) => edicao.mudar(alvo, i, novo)} />
                <span className="arq-rotina-botoes">
                  <button
                    type="button"
                    aria-label={`Subir ${nome}`}
                    disabled={i === 0}
                    onClick={() => edicao.mover(alvo, i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${nome}`}
                    disabled={i === lista.length - 1}
                    onClick={() => edicao.mover(alvo, i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Tirar ${nome}`}
                    onClick={() => edicao.tirar(alvo, i)}
                  >
                    ✕
                  </button>
                </span>
              </div>
              {'d' in c ? (
                <ListaDeCartoes
                  lista={c.d}
                  alvo={[...alvo, { i }]}
                  edicao={edicao}
                  rotulo={`dentro do ${nome}`}
                />
              ) : null}
              {c.c === 'escolha'
                ? CASOS_DA_ESCOLHA.map((caso) => (
                    <ListaDeCartoes
                      key={caso}
                      lista={c.casos[caso] ?? []}
                      alvo={[...alvo, { i, caso }]}
                      edicao={edicao}
                      rotulo={NOME_DO_CASO[caso]}
                    />
                  ))
                : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

type Aviso = { tom: 'ok' | 'atencao'; texto: string } | null

/**
 * O painel "Rotina" (fase2-07): escolher o Lumi, montar a sequência com os cartões que ela tem
 * (os de controle aninham outros), "Testar" (o Lumi faz agora, na horta) e "Guardar" (ele faz
 * sozinho quando o QUANDO acontecer). Abre pelo caderno ou perto de um Lumi.
 */
export function PainelDaRotina() {
  const { loja, plataforma } = useJogo()
  const rotina = lojaDaRotina(loja)
  const cartas = lojaDasCartas(loja, plataforma)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DA_ROTINA)
  const lumis = useEstado((s) => s.salvamento.lumis)
  const guardadas = useEstado((s) => s.salvamento.rotinas)
  const escolhido = useRotina(rotina, (s) => s.lumi)
  const ultimas = useRotina(rotina, (s) => s.ultimas)
  const dados = useCartas(cartas, (s) => s.dados)
  const fechado = useCartas(cartas, (s) => s.fechado)
  const presos = LUMIS.filter((id) => lumis[id])
  const lumi: LumiId | null = escolhido && lumis[escolhido] ? escolhido : (presos[0] ?? null)
  const [rascunho, setRascunho] = useState<CartaoDaRotina[]>([...ROTINA_VAZIA])
  const [alvo, setAlvo] = useState<Alvo>([])
  const [editando, setEditando] = useState(false)
  const abertura = useRef(0)
  const editandoRef = useRef(false)
  useEffect(() => {
    abertura.current++
    editandoRef.current = false
    setEditando(false)
    if (!aberto || !lumi) return
    return () => {
      abertura.current++
    }
  }, [aberto, lumi])
  const [aviso, setAviso] = useState<Aviso>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  const naMao = useMemo(() => cartasNaMao(dados), [dados])

  // Cada abertura lê os cartões de novo (como o caderno) e começa da rotina guardada do Lumi.
  useEffect(() => {
    if (!aberto) return
    fechar.current?.focus({ preventScroll: true })
    void cartas.getState().carregar()
    return () => cartas.getState().cancelar()
  }, [aberto, cartas])
  useEffect(() => {
    if (!aberto || !lumi) return
    setRascunho([...(loja.getState().salvamento.rotinas[lumi] ?? ROTINA_VAZIA)])
    setAlvo([])
    setAviso(null)
  }, [aberto, lumi, loja])

  if (!aberto) return null
  const recusa = validarRotina(rascunho, naMao)
  const ultima = lumi ? ultimas[lumi] : undefined
  const edicao: Edicao = {
    selecionado: alvo,
    selecionar: setAlvo,
    mudar: (a, i, novo) => setRascunho((r) => mudarCartao(r, a, i, novo)),
    tirar: (a, i) => {
      setRascunho((r) => tirarCartao(r, a, i))
      // Tirou o controle onde os cartões entravam: volta para a lista de cima.
      setAlvo((atual) => (atual.length > a.length ? [] : atual))
    },
    mover: (a, i, para) => {
      setRascunho((r) => moverCartao(r, a, i, para))
      setAlvo((atual) => (atual.length > a.length ? [] : atual))
    },
  }
  const por = (id: CartaoDaRotina['c']) => {
    setAviso(null)
    // Um QUANDO troca o começo da rotina (ela só tem um).
    if (id === 'quando-amanhecer' || id === 'quando-anoitecer') {
      setRascunho((r) =>
        r[0] && (r[0].c === 'quando-amanhecer' || r[0].c === 'quando-anoitecer')
          ? [{ c: id }, ...r.slice(1)]
          : [{ c: id }, ...r],
      )
      return
    }
    setRascunho((r) => porCartao(r, alvoExiste(r, alvo) ? alvo : [], cartaoNovo(id)))
  }
  const testar = () => {
    if (!lumi || recusa) return
    // A prévia no mesmo instante: se a rotina pararia no meio, o motivo fica aqui, sem o Lumi sair.
    const previa = rodarRotina(lumi, rascunho, loja.getState().salvamento, new Date(), naMao)
    if (previa.erro) {
      setAviso({ tom: 'atencao', texto: `No teste, a rotina pararia: ${previa.erro}` })
      return
    }
    rotina.getState().pedir({ lumi, cartoes: limparRotina(rascunho), origem: 'testar' })
    loja.getState().abrirPainel(null)
  }
  const abrirBlocos = async () => {
    if (!lumi || editandoRef.current || loja.getState().ferramentaAberta) return
    const minha = abertura.current
    editandoRef.current = true
    setEditando(true)
    // Como as outras ferramentas (hud.tsx): o jogo e o tempo livre param com os blocos abertos.
    loja.getState().definirFerramentaAberta(true)
    try {
      const r = await editarRotinaNaPlataforma({
        plataforma,
        jornada: loja.getState().jornada,
        lumi,
        rascunho,
        ler: () => loja.getState().salvamento,
        ativo: () =>
          abertura.current === minha && loja.getState().painelAberto === PAINEL_DA_ROTINA,
        guardar: (s) => loja.getState().mudar(() => s),
      })
      if (minha !== abertura.current) return
      if (r.rotina) {
        setRascunho(r.rotina)
        setAlvo([])
        setAviso({ tom: 'ok', texto: 'Rotina guardada. Use Testar para ver o Lumi na ilha.' })
      } else if (r.motivo) setAviso({ tom: 'atencao', texto: r.motivo })
    } finally {
      loja.getState().definirFerramentaAberta(false)
      if (minha === abertura.current) {
        editandoRef.current = false
        setEditando(false)
      }
    }
  }
  const guardar = () => {
    if (!lumi) return
    const r = guardarRotina(loja.getState().salvamento, lumi, rascunho, naMao)
    if ('motivo' in r) {
      setAviso({ tom: 'atencao', texto: r.motivo })
      return
    }
    loja.getState().mudar(() => r.salvamento)
    const quando =
      rascunho[0]?.c === 'quando-anoitecer' ? 'quando a noite chegar' : 'quando o dia nascer'
    setAviso({ tom: 'ok', texto: `Rotina guardada. O Lumi faz sozinho ${quando}.` })
  }
  const naMaoAgora = CARTAS_LUMI.filter((c) => naMao?.has(c.id))

  return (
    <div className="arq-sobre">
      <div
        className="arq-menu arq-cartao arq-quadro arq-caderno arq-rotina"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-rotina-titulo"
      >
        <h2 id="arq-rotina-titulo">Rotina</h2>
        {lumi ? (
          <button
            className="arq-botao"
            type="button"
            disabled={editando}
            onClick={() => void abrirBlocos()}
          >
            {editando ? 'Abrindo os blocos…' : 'Montar com blocos'}
          </button>
        ) : null}
        {presos.length === 0 ? (
          <p className="arq-quadro-sub">
            Você ainda não tem um Lumi. À noite, na Vila Doce, a lanterna acesa prende um borrão de
            névoa, e ele vira um Lumi.
          </p>
        ) : (
          <fieldset
            disabled={editando}
            aria-label="Rotina em cartões"
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <p className="arq-quadro-sub">
              Os cartões são blocos com outra roupa. A rotina começa com um Quando, e o Lumi faz o
              resto na horta da sua ilha.
            </p>
            <fieldset className="arq-rotina-lumis">
              <legend className="arq-menu-titulo">O Lumi</legend>
              {presos.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="arq-botao leve"
                  aria-pressed={id === lumi}
                  onClick={() => rotina.getState().escolher(id)}
                >
                  <img className="arq-album-lumi foto" src={MINIATURA_DO_LUMI[id]} alt="" />
                  {ESPECIES_DE_LUMI[id].nome}
                  {guardadas[id] ? <small> (com rotina)</small> : null}
                </button>
              ))}
            </fieldset>
            {lumi ? (
              <section className="arq-caderno-secao" aria-labelledby="arq-rotina-montada">
                <h3 id="arq-rotina-montada" className="arq-menu-titulo">
                  {`A rotina ${daRotinaDo(lumi)}`}
                </h3>
                <p>{descricaoDoTrabalhoLumi(lumi)}</p>
                <ListaDeCartoes lista={rascunho} alvo={[]} edicao={edicao} rotulo="a rotina" />
              </section>
            ) : null}
            <section className="arq-caderno-secao" aria-labelledby="arq-rotina-cartas">
              <h3 id="arq-rotina-cartas" className="arq-menu-titulo">
                Seus cartões
              </h3>
              <p className="arq-caderno-explica">
                {alvo.length > 0
                  ? 'Escolha um cartão para pôr dentro do controle escolhido.'
                  : 'Escolha um cartão para pôr no fim da rotina. Para pôr dentro de um controle, use "Pôr cartões aqui" nele.'}
              </p>
              {naMao === null ? (
                <p className="arq-aviso atencao">
                  {fechado === 'sem-acesso'
                    ? 'Os cartões ainda não abriram para você.'
                    : 'Lendo os seus cartões.'}
                </p>
              ) : (
                <div className="arq-rotina-paleta">
                  {naMaoAgora.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`arq-rotina-carta ${c.tipo}`}
                      title={c.efeito}
                      onClick={() => por(c.id as CartaoDaRotina['c'])}
                    >
                      <span aria-hidden="true">{ICONE[c.tipo]}</span> {c.nome}
                    </button>
                  ))}
                </div>
              )}
              <p className="arq-caderno-explica">
                Mais cartões chegam com os cursos: veja no Caderno dos Lumis.
              </p>
            </section>
            <p
              role="status"
              className={`arq-aviso ${aviso ? aviso.tom : recusa ? 'atencao' : 'ok'}`}
            >
              {aviso ? aviso.texto : recusa ? recusa.motivo : 'Pronta para testar.'}
            </p>
            {ultima ? (
              <details className="arq-rotina-ultima" open={Boolean(ultima.erro)}>
                <summary>
                  {ultima.origem === 'fechado'
                    ? ultima.erro
                      ? 'Enquanto você estava fora, a rotina parou no meio'
                      : 'Enquanto você estava fora, a rotina foi até o fim'
                    : ultima.erro
                      ? 'Da última vez, a rotina parou no meio'
                      : 'Da última vez, a rotina foi até o fim'}
                </summary>
                {ultima.erro ? <p className="arq-aviso atencao">{ultima.erro}</p> : null}
                <ol>
                  {ultima.registro.map((linha, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: o registro só cresce, na ordem
                    <li key={i}>{linha}</li>
                  ))}
                </ol>
              </details>
            ) : null}
          </fieldset>
        )}
        <div className="arq-menu-acoes arq-rotina-acoes">
          {lumi ? (
            <>
              <button
                type="button"
                className="arq-botao"
                disabled={editando || recusa !== null}
                onClick={testar}
              >
                Testar
              </button>
              <button
                type="button"
                className="arq-botao"
                disabled={editando || recusa !== null}
                onClick={guardar}
              >
                Guardar
              </button>
              {guardadas[lumi] ? (
                <button
                  type="button"
                  className="arq-botao leve"
                  disabled={editando}
                  onClick={() => {
                    loja.getState().mudar((s) => apagarRotina(s, lumi))
                    setRascunho([...ROTINA_VAZIA])
                    setAviso({ tom: 'ok', texto: 'A rotina guardada foi apagada.' })
                  }}
                >
                  Apagar a rotina
                </button>
              ) : null}
            </>
          ) : null}
          <button
            ref={fechar}
            type="button"
            className="arq-botao leve"
            onClick={() => loja.getState().abrirPainel(null)}
          >
            Voltar ao jogo
          </button>
        </div>
      </div>
    </div>
  )
}

/** No HUD, enquanto um Lumi faz a rotina: quem e o que faz agora, e "Parar". */
export function RotinaAndando() {
  const { loja } = useJogo()
  const rotina = lojaDaRotina(loja)
  const andando = useRotina(rotina, (s) => s.andando)
  if (!andando) return null
  return (
    <div className="arq-rotina-andando" role="status">
      <span className="arq-pilula">{`Rotina ${daRotinaDo(andando.lumi)}: ${andando.texto}`}</span>
      <button type="button" className="arq-botao leve" onClick={() => rotina.getState().parar()}>
        Parar
      </button>
    </div>
  )
}
