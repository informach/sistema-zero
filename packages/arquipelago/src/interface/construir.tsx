import {
  CATALOGO_DE_OBJETOS,
  COMODOS_DA_IRIS,
  type ComodoDaIris,
  MOVEIS,
  OBJETOS_DA_CASA,
  type PisoDaCasa,
  type PisoDoQuintal,
} from '@sistemazero/arquipelago-contracts'
import { useState } from 'react'
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
import {
  chaveDoComodo,
  comodoDaFerramenta,
  comodoDaJanela,
  comodoDoPiso,
  liberado,
  quantasChaves,
  TEXTOS_DAS_CHAVES,
} from '../sistemas/chaves-da-casa'
import {
  CATEGORIAS_DOS_MOVEIS,
  type CategoriaDoMovel,
  DADOS_DO_MOVEL,
  ehDeParede,
} from '../sistemas/construcao/moveis'
import { PainelDeAconchego } from './aconchego'
import { Icone } from './icones'
import {
  MINIATURA_DA_JANELA,
  MINIATURA_DO_CAMINHO,
  MINIATURA_DO_MOVEL,
  MINIATURA_DO_OBJETO,
  MINIATURA_DO_PISO,
} from './miniaturas'

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
    id: 'movel',
    nome: 'Móveis',
    emoji: '🛋️',
    dica: 'Escolha um móvel e toque num cômodo novo. Os de parede vão na parede mais perto do toque.',
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
    dica: 'Arraste por cima de paredes e cercas para apagar. Um toque tira o objeto, o móvel, a porta, a janela, o caminho ou o canteiro vazio.',
  },
  {
    id: 'olhar',
    nome: 'Olhar',
    emoji: '✋',
    dica: 'Toque num cômodo para ver o aconchego. Arraste para andar pela obra; Q e E giram.',
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

const NOME_DA_CATEGORIA: Readonly<Record<CategoriaDoMovel, string>> = {
  cozinha: 'Cozinha',
  sala: 'Sala',
  banheiro: 'Banheiro',
}

const PISOS: ReadonlyArray<{ id: PisoDaCasa; nome: string }> = [
  { id: 'tabua', nome: 'Tábua' },
  { id: 'ladrilho', nome: 'Ladrilho' },
  { id: 'azulejo', nome: 'Azulejo' },
]

/** Uma escolha da ferramenta (tipo de janela, piso, caminho ou objeto): o desenho e o nome embaixo. */
function Escolha({
  nome,
  imagem,
  escolhida,
  nota,
  trancada = false,
  aoEscolher,
}: {
  nome: string
  imagem: string
  escolhida: boolean
  nota?: string
  /** Trancada pela chave de um cômodo (N11): continua tocável, e o Zappy diz qual chave falta. */
  trancada?: boolean
  aoEscolher: () => void
}) {
  return (
    <button
      type="button"
      className={`arq-obra-escolha${trancada ? ' trancada' : ''}`}
      aria-pressed={escolhida}
      aria-disabled={trancada || undefined}
      onClick={aoEscolher}
    >
      <img src={imagem} alt="" width={160} height={160} draggable={false} />
      <b>{nome}</b>
      {nota ? <small>{nota}</small> : null}
    </button>
  )
}

/**
 * Os modos Viver e Construir (proposta: "Viver Construir Mapa"; o Mapa é de outra fase). Aparece
 * depois que a porta nova abriu, quando nada mais está por cima do jogo.
 */
export function ModosDoJogo() {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const permitido = useEstado(podeConstruir)
  const painel = useEstado((s) => s.painelAberto)
  const noBarco = useEstado((s) => s.modo === 'barco' || s.modo === 'balao')
  if (!permitido || noBarco) return null
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
        <Icone nome="casa" tamanho={18} />
        Viver
      </button>
      <button
        type="button"
        className="arq-botao leve"
        aria-pressed={construindo}
        data-modo="construir"
        onClick={() => {
          if (!construindo) construcao.getState().abrir()
        }}
      >
        <Icone nome="martelo" tamanho={18} />
        Construir
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
  const aconchegoAberto = useConstrucao(construcao, (s) => s.aconchegoAberto)
  const janela = useConstrucao(construcao, (s) => s.janela)
  const piso = useConstrucao(construcao, (s) => s.piso)
  const caminho = useConstrucao(construcao, (s) => s.caminho)
  const objeto = useConstrucao(construcao, (s) => s.objeto)
  const movel = useConstrucao(construcao, (s) => s.movel)
  const [categoria, setCategoria] = useState<CategoriaDoMovel>('cozinha')
  const projetos = useEstado((s) => s.salvamento.projetos)
  const postos = useEstado((s) => s.salvamento.construcao.casa?.objetos ?? NENHUM_OBJETO)
  const ganhos = OBJETOS_DA_CASA.filter((id) => projetos[id])
  const podeDesfazer = useConstrucao(construcao, (s) => s.antes.length > 0)
  // Na cabana não vão canteiro, objeto nem móvel: a horta, os projetos azuis e os móveis são da casa.
  const naCabana = useConstrucao(construcao, (s) => s.onde !== 'casa')
  // O iglu do Pico (E04) não tem cerca nem caminho: o lote dele diz o que cabe.
  const limitesDaCabana = useConstrucao(construcao, (s) =>
    s.onde !== 'casa' ? (s.cabana?.lote.limites ?? null) : null,
  )
  const chaves = useEstado((s) => s.salvamento.chaves)
  const nota = (comodo: ComodoDaIris | null) =>
    liberado(chaves, comodo) || !comodo ? undefined : `🔑 ${chaveDoComodo(comodo).nome}`
  const ferramentas = naCabana
    ? FERRAMENTAS.filter(
        (f) =>
          f.id !== 'canteiro' &&
          f.id !== 'objeto' &&
          f.id !== 'movel' &&
          !(f.id === 'cerca' && limitesDaCabana?.trechosDeCerca === 0) &&
          !(f.id === 'caminho' && limitesDaCabana?.caminhos === 0),
      )
    : FERRAMENTAS
  if (!aberto) return null
  const s = () => construcao.getState()
  const dica = FERRAMENTAS.find((f) => f.id === atual)?.dica
  return (
    <section className="arq-obra" aria-label="Ferramentas de construir">
      {aconchegoAberto && <PainelDeAconchego />}
      <div className="arq-obra-dica-linha">
        <p className="arq-obra-dica" aria-live="polite">
          {dica}
        </p>
        {/* Na mesma linha da dica, para a barra não crescer (N11). */}
        {quantasChaves(chaves) < COMODOS_DA_IRIS.length ? (
          <p className="arq-obra-chaves">{TEXTOS_DAS_CHAVES.contagem(quantasChaves(chaves))}</p>
        ) : null}
      </div>
      {atual === 'janela' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Tipo de janela</legend>
          {JANELAS.map((j) => (
            <Escolha
              key={j.id}
              nome={j.nome}
              imagem={MINIATURA_DA_JANELA[j.id]}
              escolhida={janela === j.id}
              nota={nota(comodoDaJanela(j.id))}
              trancada={!liberado(chaves, comodoDaJanela(j.id))}
              aoEscolher={() => s().escolherJanela(j.id)}
            />
          ))}
        </fieldset>
      ) : null}
      {atual === 'piso' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Tipo de piso</legend>
          {PISOS.map((p) => (
            <Escolha
              key={p.id}
              nome={p.nome}
              imagem={MINIATURA_DO_PISO[p.id]}
              escolhida={piso === p.id}
              nota={nota(comodoDoPiso(p.id))}
              trancada={!liberado(chaves, comodoDoPiso(p.id))}
              aoEscolher={() => s().escolherPiso(p.id)}
            />
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
              <Escolha
                key={id}
                nome={CATALOGO_DE_OBJETOS[id].molde.nome}
                imagem={MINIATURA_DO_OBJETO[id]}
                escolhida={objeto === id}
                nota={postos.some((o) => o.id === id) ? 'já posta' : undefined}
                aoEscolher={() => s().escolherObjeto(id)}
              />
            ))
          )}
          {ganhos.length > 0 ? (
            <button type="button" className="arq-botao leve" onClick={() => s().girarObjeto()}>
              ⟳ Girar
            </button>
          ) : null}
        </fieldset>
      ) : null}
      {atual === 'movel' ? (
        <>
          <fieldset className="arq-obra-escolhas arq-obra-categorias">
            <legend className="arq-sr">Cômodo dos móveis</legend>
            {CATEGORIAS_DOS_MOVEIS.map((c) => (
              <button
                key={c}
                type="button"
                className="arq-botao leve"
                aria-pressed={categoria === c}
                onClick={() => setCategoria(c)}
              >
                {NOME_DA_CATEGORIA[c]}
              </button>
            ))}
            <button
              type="button"
              className="arq-botao leve arq-obra-girar"
              onClick={() => s().girarObjeto()}
            >
              ⟳ Girar
            </button>
          </fieldset>
          {/* Uma fileira só, que rola para o lado: a barra não cobre o cômodo (no celular, a tela). */}
          <fieldset className="arq-obra-escolhas rolar">
            <legend className="arq-sr">Móvel</legend>
            {MOVEIS.filter((id) => DADOS_DO_MOVEL[id].categoria === categoria).map((id) => (
              <Escolha
                key={id}
                nome={DADOS_DO_MOVEL[id].nome}
                imagem={MINIATURA_DO_MOVEL[id]}
                escolhida={movel === id}
                nota={ehDeParede(id) ? 'na parede' : undefined}
                aoEscolher={() => s().escolherMovel(id)}
              />
            ))}
          </fieldset>
        </>
      ) : null}
      {atual === 'caminho' ? (
        <fieldset className="arq-obra-escolhas">
          <legend className="arq-sr">Tipo de caminho</legend>
          {CAMINHOS.map((c) => (
            <Escolha
              key={c.id}
              nome={c.nome}
              imagem={MINIATURA_DO_CAMINHO[c.id]}
              escolhida={caminho === c.id}
              aoEscolher={() => s().escolherCaminho(c.id)}
            />
          ))}
        </fieldset>
      ) : null}
      <fieldset className="arq-obra-ferramentas">
        <legend className="arq-sr">Ferramenta</legend>
        {ferramentas.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`arq-ferramenta${liberado(chaves, comodoDaFerramenta(f.id)) ? '' : ' trancada'}`}
            data-ferramenta={f.id}
            aria-pressed={atual === f.id}
            aria-disabled={!liberado(chaves, comodoDaFerramenta(f.id)) || undefined}
            onClick={() => s().escolher(f.id)}
          >
            <span className="arq-ferramenta-icone" aria-hidden="true">
              {liberado(chaves, comodoDaFerramenta(f.id)) ? f.emoji : '🔑'}
            </span>
            <b>{f.nome}</b>
          </button>
        ))}
      </fieldset>
      <div className="arq-obra-acoes">
        <button
          type="button"
          className="arq-botao leve"
          aria-expanded={aconchegoAberto}
          aria-controls="arq-aconchego"
          onClick={() => {
            s().escolher('olhar')
            s().mostrarAconchego(!aconchegoAberto)
          }}
        >
          ☆ Aconchego
        </button>
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
        <button type="button" className="arq-botao arq-obra-pronto" onClick={() => s().fechar()}>
          Pronto
        </button>
      </div>
    </section>
  )
}
