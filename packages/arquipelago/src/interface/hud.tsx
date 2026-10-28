import type { FerramentaDaPlataforma } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { restanteDeHoje } from '../estado/loja'
import { useToque } from '../estado/preferencias'
import { ITENS, itensVisiveis, remover } from '../sistemas/itens'
import { comer } from '../sistemas/necessidades'
import { formatarTempo, PERCURSO_DAS_COPAS, tempoDaCorrida } from '../sistemas/percurso'
import { momentoDoDia, relogio } from '../sistemas/tempo-do-dia'
import { ControlesDeToque } from './toque'

function Necessidades() {
  const n = useEstado((s) => s.salvamento.necessidades)
  const linhas = [
    { emoji: '🍎', nome: 'Fome', v: n.fome, cor: '#e0584f' },
    { emoji: '⚡', nome: 'Energia', v: n.energia, cor: '#ffc93c' },
    { emoji: '🎈', nome: 'Diversão', v: n.diversao, cor: '#2fb39a' },
  ]
  return (
    <div className="arq-necessidades arq-cartao">
      {linhas.map((l) => (
        <div key={l.nome} className="arq-nec" title={`${l.nome}: ${Math.round(l.v)} de 100`}>
          <span aria-hidden="true">{l.emoji}</span>
          <div className="arq-barra" aria-hidden="true">
            <i style={{ width: `${l.v}%`, background: l.cor }} />
          </div>
          <span className="arq-sr">{`${l.nome}: ${Math.round(l.v)} de 100`}</span>
        </div>
      ))}
    </div>
  )
}

function Relogio() {
  const criadoEm = useEstado((s) => Date.parse(s.salvamento.criadoEm))
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const m = momentoDoDia(agora, criadoEm)
  return (
    <span className="arq-pilula">
      {m.noite ? '🌙' : '☀️'} Dia {m.dia} · {relogio(m)}
    </span>
  )
}

function TempoLivre() {
  const restante = useEstado(restanteDeHoje)
  if (restante === null) return null
  return <span className="arq-pilula">Hoje: {restante} min</span>
}

function Dica() {
  const dica = useEstado((s) => s.dica)
  const [visivel, setVisivel] = useState<number | null>(null)
  useEffect(() => {
    if (!dica) return
    setVisivel(dica.id)
    const t = setTimeout(() => setVisivel((v) => (v === dica.id ? null : v)), 7000)
    return () => clearTimeout(t)
  }, [dica])
  if (!dica || visivel !== dica.id) return null
  return (
    <div className="arq-dica" role="status" aria-live="polite" key={dica.id}>
      <span className="arq-zappy" aria-hidden="true" />
      <span>{dica.texto}</span>
    </div>
  )
}

function Inventario() {
  const { loja } = useJogo()
  const inv = useEstado((s) => s.salvamento.inventario)
  const itens = itensVisiveis(inv)
  if (itens.length === 0) return null
  return (
    <section className="arq-inventario" aria-label="Mochila">
      {itens.map(({ item, qtd }) =>
        item.comida ? (
          <button
            key={item.id}
            type="button"
            className="arq-item comida"
            title={`Comer ${item.nome.toLowerCase()}`}
            aria-label={`Comer ${item.nome.toLowerCase()} (${qtd})`}
            onClick={() => {
              const s = loja.getState()
              s.mudar((sv) => {
                const resto = remover(sv.inventario, item.id)
                const comida = ITENS[item.id]
                return resto && comida
                  ? { ...sv, inventario: resto, necessidades: comer(sv.necessidades, comida) }
                  : sv
              })
              s.dizer(`Hum. ${item.nome} deu energia para continuar.`)
            }}
          >
            <span aria-hidden="true">{item.emoji}</span>
            <b>{qtd}</b>
          </button>
        ) : (
          <span key={item.id} className="arq-item" title={item.nome}>
            <span aria-hidden="true">{item.emoji}</span>
            <span className="arq-sr">{item.nome}</span>
            <b>{qtd}</b>
          </span>
        ),
      )}
    </section>
  )
}

/** A tecla (ou, no toque, o botão) da ação perto, e o que fazer no cipó e no tronco. */
function Acao() {
  const alvo = useEstado((s) => s.alvo)
  const modo = useEstado((s) => s.modo)
  const toque = useToque()
  if (modo === 'cipo') {
    return (
      <div className="arq-acao">
        <span className="arq-tecla">{toque ? 'Soltar' : 'Espaço'}</span>
        Soltar do cipó
        <span className="arq-tecla">{toque ? '◎' : 'W S'}</span>
        Balançar
      </div>
    )
  }
  if (modo === 'escalada') {
    return (
      <div className="arq-acao">
        <span className="arq-tecla">{toque ? '◎' : 'W S'}</span>
        Subir e descer
        <span className="arq-tecla">{toque ? 'Pular' : 'Espaço'}</span>
        Pular do tronco
      </div>
    )
  }
  if (!alvo) return null
  return (
    <div className="arq-acao">
      <span className="arq-tecla">{toque ? 'Usar' : 'E'}</span>
      {alvo.rotulo}
    </div>
  )
}

/** O cronômetro discreto do percurso, só durante a corrida (o tempo anda fora do React). */
function Cronometro() {
  const { movimento } = useJogo()
  const corrida = useEstado((s) => s.corrida)
  const texto = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!corrida) return
    let quadro = 0
    const mostrar = () => {
      const c = movimento.corrida
      if (c && texto.current) {
        texto.current.textContent = formatarTempo(tempoDaCorrida(c, performance.now()))
      }
      quadro = requestAnimationFrame(mostrar)
    }
    mostrar()
    return () => cancelAnimationFrame(quadro)
  }, [corrida, movimento])
  if (!corrida) return null
  return (
    <div className="arq-cronometro" role="timer" aria-label="Percurso nas copas">
      <span className="arq-pilula">
        ⏱ <span ref={texto}>0:00,0</span>
      </span>
      <span className="arq-pilula" title="Vagalumes pegos">
        ✨ {corrida.vagalumes}/{corrida.totalDeVagalumes}
      </span>
      <button
        type="button"
        className="arq-botao leve"
        onClick={() => {
          movimento.pedidoDoPercurso = 'parar'
        }}
      >
        Parar
      </button>
    </div>
  )
}

/** A tela curta do fim do percurso: estrelas, tempo, melhor tempo e correr de novo. */
function Resultado() {
  const { loja, movimento } = useJogo()
  const r = useEstado((s) => s.resultado)
  const continuar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (r) continuar.current?.focus()
  }, [r])
  if (!r) return null
  const estrelas = [
    { ganhou: r.estrelas.chegada, texto: 'Chegou ao fim' },
    {
      ganhou: r.estrelas.tempo,
      texto: `Em até ${Math.round(PERCURSO_DAS_COPAS.tempoAlvoMs / 1000)} segundos`,
    },
    { ganhou: r.estrelas.vagalumes, texto: `Os ${r.totalDeVagalumes} vagalumes` },
  ]
  const fechar = () => loja.getState().mostrarResultado(null)
  return (
    <div className="arq-sobre">
      <div
        className="arq-resultado arq-cartao"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-resultado-titulo"
        onKeyDown={(e) => {
          // Fechar o resultado não abre o menu (o Esc do menu escuta a janela).
          if (e.key === 'Escape') {
            e.stopPropagation()
            fechar()
          }
        }}
      >
        <h2 id="arq-resultado-titulo">Percurso nas copas</h2>
        <ul className="arq-estrelas">
          {estrelas.map((e, i) => (
            <li
              key={e.texto}
              className={e.ganhou ? 'ganhou' : ''}
              style={{ animationDelay: `${i * 0.18}s` }}
            >
              <span aria-hidden="true">{e.ganhou ? '★' : '☆'}</span>
              <small>{e.texto}</small>
              <span className="arq-sr">{e.ganhou ? 'estrela ganha' : 'estrela que falta'}</span>
            </li>
          ))}
        </ul>
        <dl className="arq-tempos">
          <div>
            <dt>Tempo</dt>
            <dd>{formatarTempo(r.tempoMs)}</dd>
          </div>
          <div>
            <dt>Melhor tempo</dt>
            <dd>
              {formatarTempo(r.melhor.melhorTempoMs)}
              {r.recorde ? <b className="arq-recorde">Recorde novo</b> : null}
            </dd>
          </div>
          <div>
            <dt>Vagalumes</dt>
            <dd>
              {r.vagalumes} de {r.totalDeVagalumes}
            </dd>
          </div>
        </dl>
        <div className="arq-menu-acoes">
          <button
            type="button"
            className="arq-botao"
            onClick={() => {
              movimento.pedidoDoPercurso = 'recomecar'
            }}
          >
            Correr de novo
          </button>
          <button ref={continuar} type="button" className="arq-botao leve" onClick={fechar}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

/** O corte suave da volta ao deque: escurece e clareia a cada número novo de `corte`. */
function Corte() {
  const corte = useEstado((s) => s.corte)
  if (corte === 0) return null
  return (
    <div
      key={corte}
      className="arq-corte"
      aria-hidden="true"
      style={{
        animationDuration: `${PERCURSO_DAS_COPAS.corteSaiMs + PERCURSO_DAS_COPAS.corteVoltaMs}ms`,
      }}
    />
  )
}

/** As ferramentas da plataforma que o jogo abre por cima dele (as de verdade, nunca cópias). */
const FERRAMENTAS: ReadonlyArray<{
  id: FerramentaDaPlataforma
  nome: string
  faz: string
  emoji: string
}> = [
  { id: 'pinta', nome: 'Pinta', faz: 'Desenhar', emoji: '🎨' },
  { id: 'molda', nome: 'Molda', faz: 'Modelar em 3D', emoji: '🧊' },
  { id: 'estudio', nome: 'Estúdio', faz: 'Programar', emoji: '🧩' },
]

type Aviso = { tom: 'ok' | 'atencao'; texto: string } | null

function Menu() {
  const { loja, plataforma } = useJogo()
  const aberto = useEstado((s) => s.menuAberto)
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const [aviso, setAviso] = useState<Aviso>(null)
  async function abrirFerramenta(ferramenta: FerramentaDaPlataforma) {
    if (loja.getState().ferramentaAberta) return
    setAviso(null)
    loja.getState().definirFerramentaAberta(true)
    try {
      const resultado = await plataforma.abrirFerramenta({
        ferramenta,
        proposito: 'criar no Arquipélago',
      })
      if (resultado.situacao === 'pronto')
        setAviso({ tom: 'ok', texto: 'A sua criação foi guardada na sua conta.' })
      if (resultado.situacao === 'indisponivel')
        setAviso({
          tom: 'atencao',
          texto:
            resultado.motivo === 'acesso-necessario'
              ? 'Esta ferramenta ainda não abriu para você. Ela chega com a sua jornada.'
              : 'Não deu para abrir esta ferramenta agora. Tente de novo daqui a pouco.',
        })
    } catch (erro) {
      plataforma.relatarErro(erro, 'abrir-ferramenta')
      setAviso({ tom: 'atencao', texto: 'Não consegui abrir a ferramenta agora. Tente de novo.' })
    } finally {
      loja.getState().definirFerramentaAberta(false)
    }
  }
  if (!aberto) return null
  return (
    <div className="arq-sobre">
      <div className="arq-menu arq-cartao" role="dialog" aria-label="Menu do jogo">
        <h2>Arquipélago Vagalume</h2>
        <ul>
          <li>Andar: W A S D ou as setas (no tablet, o círculo da esquerda)</li>
          <li>Correr: Shift · Pular: espaço</li>
          <li>Usar o que está perto: E</li>
          <li>Cipó: Espaço solta · Tronco: W e S sobem e descem, Espaço pula</li>
          <li>Girar a câmera: arraste na tela · Aproximar: roda do mouse</li>
        </ul>
        <h3 className="arq-menu-titulo">Criar com as ferramentas</h3>
        <div className="arq-ferramentas">
          {FERRAMENTAS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="arq-ferramenta"
              disabled={ferramentaAberta}
              onClick={() => void abrirFerramenta(f.id)}
            >
              <span className="arq-ferramenta-icone" aria-hidden="true">
                {f.emoji}
              </span>
              <b>{f.nome}</b>
              <small>{f.faz}</small>
            </button>
          ))}
        </div>
        {aviso ? (
          <p role="status" className={`arq-aviso ${aviso.tom}`}>
            {aviso.texto}
          </p>
        ) : null}
        <div className="arq-menu-acoes">
          <button
            type="button"
            className="arq-botao"
            disabled={ferramentaAberta}
            onClick={() => loja.getState().abrirMenu(false)}
          >
            Continuar jogando
          </button>
          <button
            type="button"
            className="arq-botao leve"
            disabled={ferramentaAberta}
            onClick={() => plataforma.voltarParaPlataforma()}
          >
            Voltar para a plataforma
          </button>
        </div>
      </div>
    </div>
  )
}

export function Hud() {
  const { loja } = useJogo()
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const s = loja.getState()
      if (e.code === 'Escape' && !s.tempoPausado && !s.ferramentaAberta && !s.resultado)
        s.abrirMenu(!s.menuAberto)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [loja])
  return (
    <div className="arq-hud">
      <Necessidades />
      <div className="arq-topo-dir">
        <Relogio />
        <TempoLivre />
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirMenu(true)}
          aria-label="Abrir o menu"
        >
          ☰ Menu
        </button>
      </div>
      <Cronometro />
      <Dica />
      <div className="arq-baixo">
        <Acao />
        <Inventario />
      </div>
      <ControlesDeToque />
      <Menu />
      <Resultado />
      <Corte />
    </div>
  )
}
