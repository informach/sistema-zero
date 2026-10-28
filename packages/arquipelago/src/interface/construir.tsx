import {
  CATALOGO_DE_OBJETOS,
  OBJETOS_DA_CASA,
  type PisoDaCasa,
  type PisoDoQuintal,
} from '@sistemazero/arquipelago-contracts'
import {
  CAMERA_DE_OBRA,
  type Ferramenta,
  lojaDaConstrucao,
  PAINEL_DE_CONSTRUIR,
  podeConstruir,
  type TipoDeJanela,
  useConstrucao,
} from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'

const FERRAMENTAS: ReadonlyArray<{ id: Ferramenta; nome: string; emoji: string; dica: string }> = [
  {
    id: 'parede',
    nome: 'Parede',
    emoji: '🧱',
    dica: 'Arraste no chão para esticar a parede. Paredes fechadas viram um cômodo.',
  },
  { id: 'porta', nome: 'Porta', emoji: '🚪', dica: 'Toque numa parede para pôr a porta.' },
  { id: 'janela', nome: 'Janela', emoji: '🪟', dica: 'Toque numa parede para pôr a janela.' },
  { id: 'piso', nome: 'Piso', emoji: '🟫', dica: 'Toque num cômodo para trocar o piso dele.' },
  {
    id: 'cerca',
    nome: 'Cerca',
    emoji: '🪵',
    dica: 'Arraste no quintal para esticar a cerca, como a parede.',
  },
  {
    id: 'caminho',
    nome: 'Caminho',
    emoji: '🪨',
    dica: 'Arraste no quintal para fazer o caminho, célula por célula.',
  },
  {
    id: 'objeto',
    nome: 'Objetos',
    emoji: '📦',
    dica: 'Escolha um objeto e toque onde ele vai. A geladeira fica num cômodo; a casinha, no quintal.',
  },
  {
    id: 'canteiro',
    nome: 'Canteiro',
    emoji: '🌱',
    dica: 'Toque no quintal para pôr um canteiro. Ele planta e rega como a horta.',
  },
  {
    id: 'apagar',
    nome: 'Apagar',
    emoji: '🧽',
    dica: 'Arraste por cima de paredes e cercas para apagar. Um toque tira a porta, a janela, o caminho ou o canteiro vazio.',
  },
  {
    id: 'olhar',
    nome: 'Olhar',
    emoji: '✋',
    dica: 'Arraste para andar pela obra. As setas e o W A S D também andam; Q e E giram.',
  },
]

const JANELAS: ReadonlyArray<{ id: TipoDeJanela; nome: string }> = [
  { id: 'janela-grande', nome: 'Grande' },
  { id: 'janela-arco', nome: 'Em arco' },
  { id: 'janela-redonda', nome: 'Redonda' },
]

/** Uma lista vazia só (o seletor da loja não pode criar uma nova a cada leitura). */
const NENHUM_OBJETO: readonly { id: string }[] = []

const CAMINHOS: ReadonlyArray<{ id: PisoDoQuintal; nome: string }> = [
  { id: 'pedra', nome: 'Pedra' },
  { id: 'grama', nome: 'Grama' },
]

const PISOS: ReadonlyArray<{ id: PisoDaCasa; nome: string }> = [
  { id: 'tabua', nome: 'Tábua' },
  { id: 'ladrilho', nome: 'Ladrilho' },
  { id: 'azulejo', nome: 'Azulejo' },
]

/**
 * Os modos Viver e Construir (proposta: "Viver Construir Mapa"; o Mapa é de outra fase). Aparece
 * depois que a porta nova abriu, quando nada mais está por cima do jogo.
 */
export function ModosDoJogo() {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const permitido = useEstado(podeConstruir)
  const painel = useEstado((s) => s.painelAberto)
  if (!permitido) return null
  const construindo = painel === PAINEL_DE_CONSTRUIR
  return (
    <fieldset className="arq-modos">
      <legend className="arq-sr">Modo do jogo</legend>
      <button
        type="button"
        className="arq-botao leve"
        aria-pressed={!construindo}
        onClick={() => construcao.getState().fechar()}
      >
        🏡 Viver
      </button>
      <button
        type="button"
        className="arq-botao leve"
        aria-pressed={construindo}
        onClick={() => {
          if (!construindo) construcao.getState().abrir()
        }}
      >
        🔨 Construir
      </button>
    </fieldset>
  )
}

/** A barra do Construir: as ferramentas, as escolhas de janela e piso, a câmera e o Desfazer. */
export function BarraDeConstruir() {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DE_CONSTRUIR)
  const atual = useConstrucao(construcao, (s) => s.ferramenta)
  const janela = useConstrucao(construcao, (s) => s.janela)
  const piso = useConstrucao(construcao, (s) => s.piso)
  const caminho = useConstrucao(construcao, (s) => s.caminho)
  const objeto = useConstrucao(construcao, (s) => s.objeto)
  const projetos = useEstado((s) => s.salvamento.projetos)
  const postos = useEstado((s) => s.salvamento.construcao.casa?.objetos ?? NENHUM_OBJETO)
  const ganhos = OBJETOS_DA_CASA.filter((id) => projetos[id])
  const podeDesfazer = useConstrucao(construcao, (s) => s.antes.length > 0)
  if (!aberto) return null
  const s = () => construcao.getState()
  const dica = FERRAMENTAS.find((f) => f.id === atual)?.dica
  return (
    <section className="arq-obra" aria-label="Ferramentas de construir">
      <p className="arq-obra-dica" aria-live="polite">
        {dica}
      </p>
      {atual === 'janela' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Tipo de janela</legend>
          {JANELAS.map((j) => (
            <button
              key={j.id}
              type="button"
              className="arq-botao leve"
              aria-pressed={janela === j.id}
              onClick={() => s().escolherJanela(j.id)}
            >
              {j.nome}
            </button>
          ))}
        </fieldset>
      ) : null}
      {atual === 'piso' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Tipo de piso</legend>
          {PISOS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="arq-botao leve"
              aria-pressed={piso === p.id}
              onClick={() => s().escolherPiso(p.id)}
            >
              {p.nome}
            </button>
          ))}
        </fieldset>
      ) : null}
      {atual === 'objeto' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Objeto</legend>
          {ganhos.length === 0 ? (
            <p className="arq-obra-dica">
              Os objetos chegam pelos pedidos e pelos desafios. Ainda não chegou nenhum.
            </p>
          ) : (
            ganhos.map((id) => (
              <button
                key={id}
                type="button"
                className="arq-botao leve"
                aria-pressed={objeto === id}
                onClick={() => s().escolherObjeto(id)}
              >
                {`${CATALOGO_DE_OBJETOS[id].molde.nome}${postos.some((o) => o.id === id) ? ' (já posta)' : ''}`}
              </button>
            ))
          )}
          {ganhos.length > 0 ? (
            <button type="button" className="arq-botao leve" onClick={() => s().girarObjeto()}>
              ⟳ Girar
            </button>
          ) : null}
        </fieldset>
      ) : null}
      {atual === 'caminho' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Tipo de caminho</legend>
          {CAMINHOS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="arq-botao leve"
              aria-pressed={caminho === c.id}
              onClick={() => s().escolherCaminho(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </fieldset>
      ) : null}
      <fieldset className="arq-obra-ferramentas">
        <legend className="arq-sr">Ferramenta</legend>
        {FERRAMENTAS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="arq-ferramenta"
            aria-pressed={atual === f.id}
            onClick={() => s().escolher(f.id)}
          >
            <span className="arq-ferramenta-icone" aria-hidden="true">
              {f.emoji}
            </span>
            <b>{f.nome}</b>
          </button>
        ))}
      </fieldset>
      <div className="arq-obra-acoes">
        <button
          type="button"
          className="arq-botao leve"
          disabled={!podeDesfazer}
          onClick={() => s().desfazer()}
        >
          ↶ Desfazer
        </button>
        <button
          type="button"
          className="arq-botao leve"
          aria-label="Girar para a esquerda"
          onClick={() => s().moverCamera({ giro: s().camera.giro + CAMERA_DE_OBRA.passoDoGiro })}
        >
          ⟲
        </button>
        <button
          type="button"
          className="arq-botao leve"
          aria-label="Girar para a direita"
          onClick={() => s().moverCamera({ giro: s().camera.giro - CAMERA_DE_OBRA.passoDoGiro })}
        >
          ⟳
        </button>
        <button
          type="button"
          className="arq-botao leve"
          aria-label="Aproximar"
          onClick={() =>
            s().moverCamera({
              distancia: Math.max(CAMERA_DE_OBRA.distanciaMinima, s().camera.distancia - 4),
            })
          }
        >
          ＋
        </button>
        <button
          type="button"
          className="arq-botao leve"
          aria-label="Afastar"
          onClick={() =>
            s().moverCamera({
              distancia: Math.min(CAMERA_DE_OBRA.distanciaMaxima, s().camera.distancia + 4),
            })
          }
        >
          －
        </button>
        <button type="button" className="arq-botao" onClick={() => s().fechar()}>
          Pronto
        </button>
      </div>
    </section>
  )
}
