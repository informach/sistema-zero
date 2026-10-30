import type { FerramentaDaPlataforma, IlhaId } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PAINEL_DO_CADERNO } from '../estado/cartas'
import { useEstado, useJogo } from '../estado/contexto'
import { useFarol } from '../estado/farol'
import { albumDoSalvamento } from '../sistemas/album'
import { paginasDoDiario } from '../sistemas/diario'
import { PAINEL_DO_MAPA } from '../sistemas/mapa'
import { PAINEL_DA_FOTO } from '../sistemas/modo-foto'
import { PAINEL_DAS_VISITAS } from '../sistemas/visitas'
import { PAINEL_DOS_CONVIDADOS } from '../sistemas/visitas-dos-moradores'
import { PAINEL_DO_ALBUM } from './album'
import { ClimaDaSuaIlha } from './clima'
import { PreferenciasDeConforto } from './conforto'
import { PAINEL_DO_DIARIO } from './diario'
import { Icone, type NomeDoIcone } from './icones'
import { MapaPequeno, useIlhaAqui } from './mapa'
import { voltarDaVisita } from './visitas'
import { useVoz } from './voz'

/** As ferramentas da plataforma que o jogo abre por cima dele (as de verdade, nunca cópias). */
const FERRAMENTAS: ReadonlyArray<{
  id: FerramentaDaPlataforma
  nome: string
  faz: string
  icone: NomeDoIcone
}> = [
  { id: 'pinta', nome: 'Pinta', faz: 'Desenhar', icone: 'pinta' },
  { id: 'molda', nome: 'Molda', faz: 'Modelar em 3D', icone: 'molda' },
  { id: 'estudio', nome: 'Estúdio', faz: 'Programar', icone: 'estudio' },
]

type Aviso = { tom: 'ok' | 'atencao'; texto: string } | null
type Secao = 'inicio' | 'conforto'

/** Onde a pessoa está, com o artigo certo ("Na sua ilha", "No Bosque dos Bichos"). */
const NA_ILHA: Readonly<Record<IlhaId, string>> = {
  'sua-ilha': 'Na sua ilha',
  bosque: 'No Bosque dos Bichos',
  'vila-doce': 'Na Vila Doce',
  recife: 'No Recife Coral',
  pico: 'No Pico Gelado',
  'vale-dos-dinos': 'No Vale dos Dinos',
  nuvens: 'Na Ilha das Nuvens',
  farol: 'No Farol',
}

/**
 * O menu de pausa: à esquerda, os lugares do jogo (diário, álbum, caderno, mapa, família, conforto
 * e a saída); no meio, o começo (continuar, foto, o diário e as coleções, as ferramentas e o clima);
 * à direita, o mapa do arquipélago com a ilha onde a pessoa está. O jogo fica parado por baixo.
 */
export function Menu() {
  const { loja, plataforma, pedidos } = useJogo()
  const noFarol = useFarol(loja, (s) => s.etapa !== 'fora' || s.corte !== null)
  const voz = useVoz()
  const visitando = useEstado((s) => s.visita !== null)
  const aberto = useEstado((s) => s.menuAberto)
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const [secao, setSecao] = useState<Secao>('inicio')
  const [aviso, setAviso] = useState<Aviso>(null)
  const continuar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!aberto) return
    setSecao('inicio')
    continuar.current?.focus({ preventScroll: true })
  }, [aberto])
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
  const abrirPainel = (painel: string) => {
    loja.getState().abrirMenu(false)
    loja.getState().abrirPainel(painel)
  }
  const lugares: ReadonlyArray<{
    nome: string
    icone: NomeDoIcone
    fora?: boolean
    ir: () => void
  }> = [
    {
      nome: 'Moradores em casa',
      icone: 'familia',
      fora: visitando || noFarol,
      ir: () => abrirPainel(PAINEL_DOS_CONVIDADOS),
    },
    { nome: 'Diário', icone: 'diario', ir: () => abrirPainel(PAINEL_DO_DIARIO) },
    { nome: 'Álbum de coleções', icone: 'album', ir: () => abrirPainel(PAINEL_DO_ALBUM) },
    { nome: 'Caderno dos Lumis', icone: 'caderno', ir: () => abrirPainel(PAINEL_DO_CADERNO) },
    { nome: 'Mapa do arquipélago', icone: 'mapa', ir: () => abrirPainel(PAINEL_DO_MAPA) },
    // Família e irmãos são do Kids: a comunidade adulta não lê `/irmaos`.
    ...(plataforma.publico === 'kids'
      ? [
          {
            nome: visitando ? 'Voltar para a minha casa' : 'Visitar um irmão',
            icone: 'familia' as const,
            fora: noFarol,
            ir: () => {
              loja.getState().abrirMenu(false)
              if (loja.getState().visita) voltarDaVisita(loja, pedidos)
              else loja.getState().abrirPainel(PAINEL_DAS_VISITAS)
            },
          },
        ]
      : []),
  ]
  return (
    <div className="arq-sobre arq-pausa-fundo">
      <div className="arq-pausa" role="dialog" aria-modal="true" aria-label="Menu do jogo">
        <nav className="arq-pausa-nav" aria-label="Lugares do menu">
          <h2 className="arq-pausa-titulo">Arquipélago Vagalume</h2>
          <button
            type="button"
            className="arq-pausa-lugar"
            aria-current={secao === 'inicio' ? 'page' : undefined}
            onClick={() => setSecao('inicio')}
          >
            <Icone nome="inicio" />
            Início
          </button>
          {lugares.map((l) => (
            <button
              key={l.nome}
              type="button"
              className="arq-pausa-lugar"
              disabled={ferramentaAberta || l.fora}
              onClick={l.ir}
            >
              <Icone nome={l.icone} />
              {l.nome}
            </button>
          ))}
          <button
            type="button"
            className="arq-pausa-lugar"
            aria-current={secao === 'conforto' ? 'page' : undefined}
            onClick={() => setSecao('conforto')}
          >
            <Icone nome="conforto" />
            Conforto e controles
          </button>
          <button
            type="button"
            className="arq-pausa-lugar arq-pausa-sair"
            disabled={ferramentaAberta}
            onClick={() => plataforma.voltarParaPlataforma()}
          >
            <Icone nome="sair" />
            {voz.voltar}
          </button>
        </nav>
        <div className="arq-pausa-corpo">
          {secao === 'inicio' ? (
            <Inicio
              continuar={continuar}
              noFarol={noFarol}
              ferramentaAberta={ferramentaAberta}
              abrirPainel={abrirPainel}
              abrirFerramenta={(f) => void abrirFerramenta(f)}
              aviso={aviso}
            />
          ) : (
            <section className="arq-pausa-secao" aria-labelledby="arq-pausa-conforto">
              <h3 id="arq-pausa-conforto">Conforto e controles</h3>
              <ul className="arq-pausa-controles">
                <li>
                  Andar: W A S D ou as setas (no tablet, toque e arraste na esquerda de baixo)
                </li>
                <li>Correr: Shift · Pular: espaço</li>
                <li>Usar o que está perto: E</li>
                <li>Itens da mochila: 1 a 5</li>
                <li>Modo foto: F · Sair dele: Esc</li>
                <li>Cipó: Espaço solta · Tronco: W e S sobem e descem, Espaço pula</li>
                <li>
                  Girar a câmera: arraste na tela · Aproximar: roda do mouse · Câmera nas costas: C
                </li>
                <li>Com controle de videogame: analógicos andam e giram, botão de baixo pula</li>
              </ul>
              <PreferenciasDeConforto />
              <div className="arq-menu-acoes">
                <button
                  ref={continuar}
                  type="button"
                  className="arq-botao"
                  disabled={ferramentaAberta}
                  onClick={() => loja.getState().abrirMenu(false)}
                >
                  Continuar jogando
                </button>
              </div>
            </section>
          )}
        </div>
        <aside className="arq-pausa-mapa" aria-hidden="true">
          <MapaPequeno />
        </aside>
      </div>
    </div>
  )
}

function Inicio({
  continuar,
  noFarol,
  ferramentaAberta,
  abrirPainel,
  abrirFerramenta,
  aviso,
}: {
  continuar: React.RefObject<HTMLButtonElement | null>
  noFarol: boolean
  ferramentaAberta: boolean
  abrirPainel: (painel: string) => void
  abrirFerramenta: (f: FerramentaDaPlataforma) => void
  aviso: Aviso
}) {
  const { loja } = useJogo()
  const salvamento = useEstado((s) => s.salvamento)
  const visita = useEstado((s) => s.visita)
  const aqui = useIlhaAqui()
  const paginas = useMemo(() => paginasDoDiario(salvamento), [salvamento])
  const abertas = paginas.filter((p) => p.aberta).length
  const album = useMemo(() => albumDoSalvamento(salvamento), [salvamento])
  const colecoes = [
    { nome: 'Bichos', conta: album.bichos.conta },
    { nome: 'Receitas', conta: album.receitas.conta },
    { nome: 'Lumis', conta: album.lumis.conta },
    { nome: 'Percursos', conta: album.percursos.conta },
  ]
  return (
    <section className="arq-pausa-secao" aria-labelledby="arq-pausa-inicio">
      <div className="arq-pausa-heroi">
        <small>{visita ? 'De visita' : 'Onde você está'}</small>
        <h3 id="arq-pausa-inicio">{visita ? `Na casa de ${visita.nome}` : NA_ILHA[aqui]}</h3>
        <div className="arq-pausa-acoes">
          <button
            ref={continuar}
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
            disabled={ferramentaAberta || noFarol}
            onClick={() => abrirPainel(PAINEL_DA_FOTO)}
          >
            <Icone nome="foto" />
            Modo foto
          </button>
        </div>
      </div>
      <div className="arq-pausa-cartoes">
        <button
          type="button"
          className="arq-pausa-cartao arq-pausa-diario"
          disabled={ferramentaAberta}
          onClick={() => abrirPainel(PAINEL_DO_DIARIO)}
        >
          <span className="arq-pausa-rotulo">
            <Icone nome="diario" />
            Diário da Íris
          </span>
          <b>{`${abertas} de ${paginas.length} páginas`}</b>
          <span className="arq-pausa-barra" aria-hidden="true">
            <i style={{ width: `${(abertas / Math.max(1, paginas.length)) * 100}%` }} />
          </span>
        </button>
        <button
          type="button"
          className="arq-pausa-cartao"
          disabled={ferramentaAberta}
          onClick={() => abrirPainel(PAINEL_DO_ALBUM)}
        >
          <span className="arq-pausa-rotulo">
            <Icone nome="album" />
            Coleções
          </span>
          <dl>
            {colecoes.map((c) => (
              <div key={c.nome}>
                <dt>{c.nome}</dt>
                <dd>{`${c.conta.tem} de ${c.conta.total}`}</dd>
              </div>
            ))}
          </dl>
        </button>
      </div>
      <h4 className="arq-menu-titulo">Criar com as ferramentas</h4>
      <div className="arq-ferramentas">
        {FERRAMENTAS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="arq-ferramenta"
            disabled={ferramentaAberta}
            onClick={() => abrirFerramenta(f.id)}
          >
            <span className="arq-ferramenta-icone">
              <Icone nome={f.icone} tamanho={26} />
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
      <ClimaDaSuaIlha />
    </section>
  )
}
