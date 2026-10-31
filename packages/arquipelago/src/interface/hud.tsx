import { ILHAS } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PAINEL_DA_CHEGADA } from '../estado/chegada'
import { PAINEL_DE_CONSTRUIR } from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDosDesafios, useDesafios } from '../estado/desafios'
import { lojaDoFarol, useFarol } from '../estado/farol'
import { lojaDaGaleria, useGaleria } from '../estado/galeria'
import { restanteDeHoje } from '../estado/loja'
import { useToque } from '../estado/preferencias'
import { lojaDosPassos, usePassos } from '../estado/primeiros-passos'
import { useRetrato } from '../estado/retrato'
import { PAINEL_DA_ABERTURA } from '../sistemas/abertura'
import { BALAO } from '../sistemas/balao'
import { comLanterna, FALA_DE_ACENDER, FALA_DE_APAGAR, ID_DA_LANTERNA } from '../sistemas/borroes'
import { climaEfetivo, NOMES_DOS_CLIMAS } from '../sistemas/clima'
import { PAINEL_DAS_ESTRELAS } from '../sistemas/constelacoes'
import { PAINEL_DO_FINAL } from '../sistemas/final-do-farol'
import {
  comAtalhos,
  lembretesDeAgora,
  NECESSIDADE_BAIXA,
  progressoDoQuadro,
  teclaDoAtalho,
} from '../sistemas/hud'
import { ehIsca, falaDaIscaEscolhida, iscaValendo, NOME_NA_FALA } from '../sistemas/iscas'
import { ITENS, itensDaBarra, remover } from '../sistemas/itens'
import { PAINEL_DA_LUNETA } from '../sistemas/luneta'
import { hudEscondido, PAINEL_DA_FOTO, podeEntrarNaFoto } from '../sistemas/modo-foto'
import { comer, deveFalarDoHumor, falaDeComer, HUMOR_OTIMO, humor } from '../sistemas/necessidades'
import { comPatins, FALA_DE_CALCAR, FALA_DE_DESCALCAR, ID_DOS_PATINS } from '../sistemas/patins'
import { jogoPausado, salvamentoPausado } from '../sistemas/pausa'
import {
  coletaveisPegas,
  formatarTempo,
  PERCURSO_DAS_COPAS,
  PERCURSOS_DO_JOGO,
} from '../sistemas/percurso'
import { COMO_USAR_O_PLANADOR, ID_DO_PLANADOR } from '../sistemas/planador'
import { primeiroPedido } from '../sistemas/primeiro-pedido'
import { desafioDeHoje, quadrosDaIlha } from '../sistemas/quadro-das-cores'
import { momentoDoDia, relogio } from '../sistemas/tempo-do-dia'
import { Abertura } from './abertura'
import { Album, PAINEL_DO_ALBUM } from './album'
import { PainelDoBarco } from './barco'
import { PainelDoBento } from './bento'
import { PainelDoBicho } from './bicho'
import { PainelDoBrinquedo } from './brinquedo-de-minijogo'
import { CadernoDosLumis } from './caderno-dos-lumis'
import { PainelDaCapi } from './capi'
import { LegendaDaChegada } from './chegada'
import { BarraDeConstruir, ModosDoJogo } from './construir'
import { PainelDosConvidados } from './convidados'
import { Diario } from './diario'
import { VisorDasEstrelas } from './estrelas'
import { EnvioDoFantasma } from './fantasmas'
import { CorteDoFarol, PainelDaIris, PainelDoFarol } from './farol'
import { PainelDaFeira } from './feira'
import { PainelDoFilhote } from './filhote'
import { FogueiraDaFesta } from './fogueira-da-festa'
import { AtalhoDaFoto, ModoFoto } from './foto'
import { PainelDaGaleria } from './galeria-do-farol'
import { Icone } from './icones'
import { PainelDaIrie } from './irie'
import { PainelDaJade } from './jade'
import { PainelDoJardimDoCeu } from './jardim-do-ceu'
import { VisorDaLuneta } from './luneta'
import { PainelDoMapa, useIlhaAqui } from './mapa'
import { PainelDaMare, PainelDoFloco, PainelDoNico } from './mare'
import { Menu } from './menu'
import { PrimeirosPassos, RostoDoZappy, useLinhaDosPassos } from './primeiros-passos'
import { PainelDoObjeto } from './projeto-azul'
import { PainelDoQuadro } from './quadro-das-cores'
import { PainelDaBancada } from './receitas'
import { PAINEL_DO_RESUMO, PainelDoResumo, useFotoDoDia } from './resumo-do-dia'
import { PainelDaRotina, RotinaAndando } from './rotina'
import { ControlesDeToque } from './toque'
import { PainelDoTurno } from './turno'
import { FaixaDaVisita, PainelDasVisitas, RecordesDaFamilia } from './visitas'
import { PainelDasVisitasAdultas } from './visitas-adultas'
import { useVoz } from './voz'

/** As três necessidades, com o ícone e a cor fixa de cada uma (cor nunca é o único sinal). */
function Necessidades() {
  const { loja } = useJogo()
  const n = useEstado((s) => s.salvamento.necessidades)
  // O humor ótimo aparece (A20): o selo embaixo das barras e uma fala quando ele chega.
  const otimo = humor(n) === 'otimo'
  const antes = useRef<boolean | null>(null)
  const ultimaFala = useRef<number | null>(null)
  useEffect(() => {
    const agora = Date.now()
    if (deveFalarDoHumor(antes.current, otimo, ultimaFala.current, agora)) {
      ultimaFala.current = agora
      loja.getState().dizer(HUMOR_OTIMO.fala)
    }
    antes.current = otimo
  }, [otimo, loja])
  const linhas = [
    { icone: 'fome', nome: 'Fome', v: n.fome, cor: 'fome' },
    { icone: 'energia', nome: 'Energia', v: n.energia, cor: 'energia' },
    { icone: 'diversao', nome: 'Diversão', v: n.diversao, cor: 'diversao' },
  ] as const
  return (
    <div className="arq-necessidades">
      {linhas.map((l) => (
        <div
          key={l.nome}
          className={`arq-nec ${l.cor}${l.v < NECESSIDADE_BAIXA ? ' baixa' : ''}`}
          title={`${l.nome}: ${Math.round(l.v)} de 100`}
        >
          <Icone nome={l.icone} tamanho={16} />
          <div className="arq-barra" aria-hidden="true">
            <i style={{ width: `${l.v}%` }} />
          </div>
          <span className="arq-sr">{`${l.nome}: ${Math.round(l.v)} de 100`}</span>
        </div>
      ))}
      {otimo ? (
        <span className="arq-humor-otimo" title={HUMOR_OTIMO.explicacao}>
          {HUMOR_OTIMO.selo}
          <span className="arq-sr">{`. ${HUMOR_OTIMO.explicacao}`}</span>
        </span>
      ) : null}
    </div>
  )
}

/** O saldo de moedas da conta (o mesmo do avatar e do quarto), lido do serviço da galeria. */
function Moedas() {
  const { loja, plataforma } = useJogo()
  const galeria = lojaDaGaleria(loja, plataforma)
  const dados = useGaleria(galeria, (s) => s.dados)
  useEffect(() => {
    const g = galeria.getState()
    if (!g.dados && !g.carregando) void g.carregar()
  }, [galeria])
  // Sem leitura, nada de número inventado: a pílula só aparece com o saldo que o serviço deu.
  if (!dados || (dados.saldo === null && !dados.ilimitado)) return null
  return (
    <span className="arq-moedas" title="Moedas">
      <Icone nome="moeda" tamanho={16} />
      <b>{dados.ilimitado ? '∞' : dados.saldo}</b>
      <span className="arq-sr">{dados.ilimitado ? 'moedas sem limite' : 'moedas'}</span>
    </span>
  )
}

/**
 * Quem joga: o retrato do avatar no anel (o mesmo enquadramento da foto da plataforma, tirado no
 * jogo por `mundo/retrato-do-avatar.tsx`; a inicial até ele chegar), o marco da jornada, as
 * necessidades e as moedas.
 */
function QuemJoga() {
  const { loja, plataforma } = useJogo()
  const retrato = useRetrato(loja, (s) => s.imagem)
  const voz = useVoz()
  const jornada = useEstado((s) => s.jornada)
  const inicial = plataforma.perfil.primeiroNome.trim().charAt(0).toUpperCase() || '?'
  return (
    <section className="arq-quem arq-vidro" aria-label="Você">
      <span className="arq-quem-retrato" aria-hidden="true">
        {retrato ? <img src={retrato} alt="" /> : inicial}
      </span>
      <small className="arq-quem-marco" title={voz.marcoDaJornada(jornada)}>
        {voz.marcoDaJornada(jornada)}
      </small>
      <Necessidades />
      <Moedas />
    </section>
  )
}

/** A ilha onde a pessoa está e quanto do Quadro das Cores dela já acendeu. */
function IlhaAgora() {
  const { loja, plataforma } = useJogo()
  const aqui = useIlhaAqui()
  const dados = useDesafios(lojaDosDesafios(loja, plataforma), (s) => s.dados)
  const cores = useDesafios(lojaDosDesafios(loja, plataforma), (s) => s.cores)
  const progresso = useMemo(
    () =>
      progressoDoQuadro(
        dados ? quadrosDaIlha(dados.desafios, aqui) : [],
        cores.ilhas.find((i) => i.id === aqui)?.quadros ?? [],
      ),
    [dados, cores, aqui],
  )
  const nome = ILHAS.find((i) => i.id === aqui)?.nome ?? 'Arquipélago'
  return (
    <div className="arq-ilha-agora arq-vidro">
      <b>{nome}</b>
      {progresso ? (
        <span className="arq-ilha-quadro">
          <span className="arq-ilha-pontos" aria-hidden="true">
            {progresso.acesos.map((aceso, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: os seis quadros têm lugar fixo.
              <i key={i} className={aceso ? 'aceso' : undefined} />
            ))}
          </span>
          {`Quadro das Cores ${progresso.feitos} de ${progresso.total}`}
        </span>
      ) : null}
    </div>
  )
}

export const EXPLICACAO_DO_RELOGIO =
  'Um dia no Arquipélago dura 16 minutos. A horta e os pedidos dos moradores seguem o relógio de verdade.'

function Relogio() {
  const criadoEm = useEstado((s) => Date.parse(s.salvamento.criadoEm))
  const [agora, setAgora] = useState(() => Date.now())
  // O clima da sua ilha no relógio: o natural do dia antes das Nuvens, o escolhido depois.
  const clima = useEstado((s) => (s.visita ? null : climaEfetivo(s, agora)))
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const m = momentoDoDia(agora, criadoEm)
  const icone = clima === 'chuva' ? 'chuva' : m.noite ? 'lua' : (clima ?? 'sol')
  return (
    // Três relógios, um na tela (A14): o dia do jogo aqui; a horta e os pedidos, no de verdade.
    <div className="arq-relogio arq-vidro" title={EXPLICACAO_DO_RELOGIO}>
      <Icone nome={icone} tamanho={22} />
      <span>
        <b>{relogio(m)}</b>
        <small>{clima ? `Dia ${m.dia} · ${NOMES_DOS_CLIMAS[clima]}` : `Dia ${m.dia}`}</small>
      </span>
    </div>
  )
}

function TempoLivre() {
  const restante = useEstado(restanteDeHoje)
  if (restante === null) return null
  return (
    <span className="arq-tempo-livre arq-vidro">
      <Icone nome="ampulheta" tamanho={16} />
      Hoje: {restante} min
    </span>
  )
}

/** De quanto em quanto tempo o "Agora" confere a horta (ela cresce no tempo de verdade). */
const CONFERIR_O_AGORA_MS = 5000

/** O "Agora": até três lembretes do que já está esperando no jogo (`sistemas/hud.ts`). */
function Agora() {
  const { loja, plataforma } = useJogo()
  const portaNova = useEstado((s) => s.salvamento.casa.portaNova)
  const necessidades = useEstado((s) => s.salvamento.necessidades)
  const horta = useEstado((s) => s.salvamento.horta)
  const projetos = useEstado((s) => s.salvamento.projetos)
  const dados = useDesafios(lojaDosDesafios(loja, plataforma), (s) => s.dados)
  // Com os primeiros passos andando, a linha deles toma o lugar da do primeiro pedido.
  const passos = useLinhaDosPassos()
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), CONFERIR_O_AGORA_MS)
    return () => clearInterval(t)
  }, [])
  const lista = lembretesDeAgora({
    portaNova,
    necessidades,
    horta,
    agoraMs: agora,
    geladeiraEm: projetos.geladeira?.ganhoEm ?? null,
    desafioDeHoje: dados ? desafioDeHoje(dados).estado : null,
    primeiroPedido:
      passos === null
        ? primeiroPedido({ casa: { portaNova }, horta, projetos }, agora)?.texto
        : null,
  })
  const linha = passos !== null && passos !== 'andando' ? passos : null
  if (lista.length === 0 && !linha) return null
  return (
    <section className="arq-agora arq-vidro" aria-labelledby="arq-agora-titulo">
      <h2 id="arq-agora-titulo">Agora</h2>
      <ul>
        {linha ? (
          <li className="arq-agora-passos">
            <button
              type="button"
              aria-label={`${linha.texto}. Abrir de novo a fala do Zappy`}
              onClick={(e) => {
                e.currentTarget.blur()
                linha.reabrir()
              }}
            >
              <RostoDoZappy />
              <span>{linha.texto}</span>
            </button>
          </li>
        ) : null}
        {lista.slice(0, linha ? 2 : 3).map((l) => (
          <li key={l.id}>
            <span className="arq-agora-marca" aria-hidden="true" />
            {l.texto}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * A fala do Zappy, no cartão de baixo (some depois de 7 s). Com o cartão dos primeiros passos (ou
 * de uma dica) na tela, a fala entra nele (`interface/primeiros-passos.tsx`) e este não aparece.
 */
function Dica({ oculta = false }: { oculta?: boolean }) {
  const { loja, plataforma } = useJogo()
  const cartao = usePassos(lojaDosPassos(loja, plataforma), (s) => s.tela.cartao)
  const dica = useEstado((s) => s.dica)
  const [visivel, setVisivel] = useState<number | null>(null)
  useEffect(() => {
    if (!dica) return
    const restante = dica.expiraEm - Date.now()
    if (restante <= 0) {
      setVisivel(null)
      return
    }
    setVisivel(dica.id)
    const t = setTimeout(() => setVisivel((v) => (v === dica.id ? null : v)), restante)
    return () => clearTimeout(t)
  }, [dica])
  if (oculta || !dica || visivel !== dica.id || cartao) return null
  return (
    <div className="arq-dica" role="status" aria-live="polite" key={dica.id}>
      <span className="arq-zappy" aria-hidden="true" />
      <span className="arq-dica-texto">
        <b className="arq-dica-quem">Zappy</b>
        <span>{dica.texto}</span>
      </span>
    </div>
  )
}

/** Um lugar da mochila: o que ele mostra e o que fazer ao tocar (ou pela tecla de atalho). */
interface LugarDaMochila {
  id: string
  emoji: string
  rotulo: string
  titulo: string
  qtd: number | null
  pressionado?: boolean
  agir: (() => void) | null
}

function useLugaresDaMochila(): LugarDaMochila[] {
  const { loja } = useJogo()
  const ilhaAqui = useIlhaAqui()
  const inv = useEstado((s) => s.salvamento.inventario)
  const patins = useEstado((s) => comPatins(s.patins, s.salvamento.inventario))
  const lanterna = useEstado((s) => comLanterna(s.lanterna, s.salvamento.inventario))
  const isca = useEstado((s) => iscaValendo(s.isca, s.salvamento.inventario))
  return useMemo(() => {
    const resumo = itensDaBarra(inv)
    const lugares = resumo.itens.map(({ item, qtd }): LugarDaMochila => {
      if (item.comida)
        return {
          id: item.id,
          emoji: item.emoji,
          rotulo: `Comer ${item.nome.toLowerCase()} (${qtd})`,
          titulo: `Comer ${item.nome.toLowerCase()}`,
          qtd,
          agir: () => {
            const s = loja.getState()
            s.mudar((sv) => {
              const resto = remover(sv.inventario, item.id)
              const comida = ITENS[item.id]
              return resto && comida
                ? {
                    ...sv,
                    inventario: resto,
                    necessidades: comer(sv.necessidades, comida, ilhaAqui),
                  }
                : sv
            })
            s.dizer(falaDeComer(item, ilhaAqui))
          },
        }
      if (item.id === ID_DOS_PATINS) {
        const nome = patins ? 'Tirar os patins' : 'Calçar os patins'
        return {
          id: item.id,
          emoji: item.emoji,
          rotulo: nome,
          titulo: nome,
          qtd: null,
          pressionado: patins,
          agir: () => {
            const s = loja.getState()
            s.calcarPatins(!patins)
            s.dizer(patins ? FALA_DE_DESCALCAR : FALA_DE_CALCAR)
          },
        }
      }
      if (ehIsca(item.id)) {
        const escolhida = isca === item.id
        const nome = escolhida
          ? `Tirar ${NOME_NA_FALA[item.id]} do anzol`
          : `Usar ${NOME_NA_FALA[item.id]} na pesca`
        const id = item.id
        return {
          id,
          emoji: item.emoji,
          rotulo: `${nome} (${qtd})`,
          titulo: nome,
          qtd,
          pressionado: escolhida,
          agir: () => {
            const s = loja.getState()
            const nova = escolhida ? null : id
            s.escolherIsca(nova)
            s.dizer(falaDaIscaEscolhida(nova))
          },
        }
      }
      if (item.id === ID_DA_LANTERNA) {
        const nome = lanterna ? 'Apagar a lanterna' : 'Acender a lanterna'
        return {
          id: item.id,
          emoji: item.emoji,
          rotulo: nome,
          titulo: nome,
          qtd: null,
          pressionado: lanterna,
          agir: () => {
            const s = loja.getState()
            s.acenderLanterna(!lanterna)
            s.dizer(lanterna ? FALA_DE_APAGAR : FALA_DE_ACENDER)
          },
        }
      }
      if (item.id === ID_DO_PLANADOR)
        return {
          id: item.id,
          emoji: item.emoji,
          rotulo: 'Como usar o planador',
          titulo: 'Como usar o planador',
          qtd: null,
          agir: () => loja.getState().dizer(COMO_USAR_O_PLANADOR),
        }
      return {
        id: item.id,
        emoji: item.emoji,
        rotulo: item.nome,
        titulo: item.nome,
        qtd,
        agir: null,
      }
    })
    if (resumo.descobertas > 0)
      lugares.push({
        id: 'colecoes',
        emoji: '🐚',
        rotulo: 'Abrir o álbum de coleções',
        titulo: `Coleções: ${resumo.descobertas} de ${resumo.totalDeDescobertas} descobertas`,
        qtd: null,
        agir: () => loja.getState().abrirPainel(PAINEL_DO_ALBUM),
      })
    return lugares
  }, [inv, patins, lanterna, isca, loja, ilhaAqui])
}

/**
 * A mochila na barra de baixo: o que faz alguma coisa vem primeiro, com as teclas de 1 a 5; o
 * resto (sementes, colheita) só mostra quanto tem.
 */
function Mochila() {
  const { loja } = useJogo()
  const lugares = useLugaresDaMochila()
  const lista = comAtalhos(lugares, (l) => l.agir !== null)
  const atual = useRef(lista)
  atual.current = lista
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
      const n = teclaDoAtalho(e.code)
      if (n === null) return
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest?.('input, textarea, select, [contenteditable=true]')) return
      const s = loja.getState()
      if (jogoPausado(s) || s.corrida !== null || s.modo === 'balao') return
      const agir = atual.current.find((l) => l.tecla === n)?.item.agir
      if (!agir) return
      e.preventDefault()
      agir()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [loja])
  if (lista.length === 0) return null
  return (
    <section className="arq-inventario arq-vidro" aria-label="Mochila">
      {lista.map(({ item: l, tecla }) =>
        l.agir ? (
          <button
            key={l.id}
            type="button"
            className={`arq-item${l.qtd !== null ? ' comida' : ''}`}
            title={l.titulo}
            aria-label={l.rotulo}
            aria-pressed={l.pressionado}
            aria-keyshortcuts={tecla ? String(tecla) : undefined}
            onClick={(e) => {
              // Com o botão focado o teclado não anda nem usa (`controles/controle.ts`).
              e.currentTarget.blur()
              l.agir?.()
            }}
          >
            {tecla ? (
              <span className="arq-item-tecla" aria-hidden="true">
                {tecla}
              </span>
            ) : null}
            <span aria-hidden="true">{l.emoji}</span>
            {l.qtd !== null ? <b>{l.qtd}</b> : null}
          </button>
        ) : (
          <span key={l.id} className="arq-item" title={l.titulo}>
            <span aria-hidden="true">{l.emoji}</span>
            <span className="arq-sr">{l.rotulo}</span>
            {l.qtd !== null ? <b>{l.qtd}</b> : null}
          </span>
        ),
      )}
    </section>
  )
}

/** O botão do modo foto (a tecla F continua valendo, pelo `AtalhoDaFoto`). */
function BotaoDaFoto() {
  const { loja } = useJogo()
  const pode = useEstado(podeEntrarNaFoto)
  return (
    <button
      type="button"
      className="arq-botao-icone arq-vidro"
      aria-label="Modo foto"
      title="Modo foto (F)"
      disabled={!pode}
      onClick={() => {
        if (podeEntrarNaFoto(loja.getState())) loja.getState().abrirPainel(PAINEL_DA_FOTO)
      }}
    >
      <Icone nome="foto" tamanho={22} />
    </button>
  )
}

/** A altura do balão no voo, de 0 ao teto (`BALAO.teto`), e o fogo aceso. */
function AlturaDoBalao() {
  const { movimento } = useJogo()
  const voando = useEstado((s) => s.modo === 'balao')
  const barra = useRef<HTMLElement>(null)
  const fogo = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!voando) return
    let quadro = 0
    const mostrar = () => {
      const v = movimento.balao
      if (v && barra.current) {
        const f = Math.min(1, Math.max(0, (v.pe.y - v.tampo) / BALAO.teto))
        barra.current.style.height = `${f * 100}%`
        fogo.current?.toggleAttribute('data-aceso', v.fogo)
      }
      quadro = requestAnimationFrame(mostrar)
    }
    mostrar()
    return () => cancelAnimationFrame(quadro)
  }, [voando, movimento])
  if (!voando) return null
  return (
    <div className="arq-altura arq-vidro" aria-hidden="true">
      <small>Altura</small>
      <span className="arq-altura-trilho">
        <i ref={barra} />
      </span>
      <span ref={fogo} className="arq-altura-fogo">
        <Icone nome="energia" tamanho={18} />
      </span>
    </div>
  )
}

/**
 * Deitada na cama (fase2-13): a tela escurece um pouco em volta e uma barrinha mostra a energia
 * voltando. Não pega toque nem clique (é só um véu por cima do jogo).
 */
function Soneca() {
  const deitada = useEstado((s) => s.descanso === 'deitar')
  const energia = useEstado((s) => Math.round(s.salvamento.necessidades.energia))
  if (!deitada) return null
  return (
    <div className="arq-soneca">
      <div className="arq-soneca-cartao arq-cartao">
        <b>Soneca</b>
        <div
          className="arq-soneca-barra"
          role="progressbar"
          aria-label="Energia"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={energia}
        >
          <i style={{ width: `${energia}%` }} />
        </div>
      </div>
    </div>
  )
}

/**
 * Cochilando no lugar com a energia no zero (lacunas, 01/11/2026): a tela escurece ali mesmo, com o
 * Zzz, e ela acorda em casa. Não pega toque nem clique.
 */
function Cochilo() {
  const cochilando = useEstado((s) => s.cochilando)
  if (!cochilando) return null
  return (
    <div className="arq-soneca arq-cochilo" role="status">
      <div className="arq-soneca-cartao arq-cartao">
        <b>Cochilando</b>
        <span aria-hidden="true">Zzz</span>
      </div>
    </div>
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
  if (modo === 'descanso') {
    return (
      <div className="arq-acao">
        <span className="arq-tecla">{toque ? '◎' : 'W A S D'}</span>
        ou
        <span className="arq-tecla">{toque ? 'Usar' : 'E'}</span>
        para levantar
      </div>
    )
  }
  if (modo === 'montar') {
    return (
      <div className="arq-acao">
        <span className="arq-tecla">{toque ? '◎' : 'W A S D'}</span>
        Andar
        <span className="arq-tecla">{toque ? 'Pular' : 'Espaço'}</span>
        Pular
        <span className="arq-tecla">{toque ? 'Usar' : 'E'}</span>
        Descer do dino
      </div>
    )
  }
  if (modo === 'planar') {
    return (
      <div className="arq-acao">
        <span className="arq-tecla">{toque ? '◎' : 'W A S D'}</span>
        Guiar
        <span className="arq-tecla">{toque ? 'Fechar' : 'Espaço'}</span>
        Fechar o planador
        {/* O baú no alto do vento (N12) se abre planando. */}
        {alvo ? (
          <>
            <span className="arq-tecla">{toque ? 'Usar' : 'E'}</span>
            {alvo.rotulo}
          </>
        ) : null}
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
  if (modo === 'balao') {
    return (
      <div className="arq-acao">
        <span className="arq-tecla">{toque ? 'Subir' : 'Espaço'}</span>
        Segure para subir
        {/* No toque o joystick já mostra o lado; a dica fica curta para não cobrir o polegar. */}
        {toque ? null : (
          <>
            <span className="arq-tecla">W A S D</span>
            Para os lados
          </>
        )}
        {alvo ? (
          <>
            <span className="arq-tecla">{toque ? 'Usar' : 'E'}</span>
            {alvo.rotulo}
          </>
        ) : null}
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

/**
 * A barra da corrida, só durante ela: o nome, o tempo (que anda fora do React), um ponto por coisa
 * para pegar e o Parar.
 */
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
        texto.current.textContent = formatarTempo(c.tempoMs)
      }
      quadro = requestAnimationFrame(mostrar)
    }
    mostrar()
    return () => cancelAnimationFrame(quadro)
  }, [corrida, movimento])
  if (!corrida) return null
  const config = PERCURSOS_DO_JOGO[corrida.percurso]
  return (
    <div className="arq-cronometro arq-vidro" role="timer" aria-label={config.nome}>
      <span className="arq-cronometro-tempo">
        <small>{config.nome}</small>
        <span ref={texto}>0:00,0</span>
      </span>
      <span className="arq-cronometro-pegas" title={coletaveisPegas(config)}>
        <span className="arq-cronometro-pontos" aria-hidden="true">
          {Array.from({ length: corrida.totalDeVagalumes }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: um ponto por coisa, em ordem.
            <i key={i} className={i < corrida.vagalumes ? 'pego' : undefined} />
          ))}
        </span>
        <small>{`${config.coletavel.Varios} ${corrida.vagalumes} de ${corrida.totalDeVagalumes}`}</small>
      </span>
      <button
        type="button"
        className="arq-botao leve"
        onClick={() => {
          movimento.pedidoDoPercurso = { acao: 'parar', percurso: corrida.percurso }
        }}
      >
        Parar
      </button>
    </div>
  )
}

/** A tela curta do fim do percurso: estrelas, tempo, melhor tempo e correr de novo. */
function Resultado() {
  const { loja, movimento, plataforma } = useJogo()
  const r = useEstado((s) => s.resultado)
  // Antes do `return` sem resultado: os hooks rodam sempre na mesma ordem.
  const entrarNaSala = useFarol(loja, (f) => f.entrar)
  const continuar = useRef<HTMLButtonElement>(null)
  const entrar = useRef<HTMLButtonElement>(null)
  // No alto da subida por fora, o passo seguinte é a sala do alto: o foco vai para ele (N4).
  useEffect(() => {
    if (r) (entrar.current ?? continuar.current)?.focus()
  }, [r])
  if (!r) return null
  const config = PERCURSOS_DO_JOGO[r.percurso]
  const salaAFrente = r.percurso === 'farol-subida' && r.estrelas.chegada && entrarNaSala
  const estrelas = [
    { ganhou: r.estrelas.chegada, texto: 'Chegou ao fim' },
    {
      ganhou: r.estrelas.tempo,
      texto: `Em até ${Math.round(config.tempoAlvoMs / 1000)} segundos`,
    },
    {
      ganhou: r.estrelas.vagalumes,
      texto: `Achou ${config.escondido}`,
    },
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
        <h2 id="arq-resultado-titulo">{config.nome}</h2>
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
            <dt>{config.coletavel.Varios}</dt>
            <dd>
              {r.vagalumes} de {r.totalDeVagalumes}
            </dd>
          </div>
        </dl>
        {/* Família e irmãos são do Kids: a comunidade adulta não lê `/irmaos`. */}
        {plataforma.publico === 'kids' ? <RecordesDaFamilia percurso={r.percurso} /> : null}
        <EnvioDoFantasma />
        <div className="arq-menu-acoes">
          {/* No alto da subida por fora, o caminho segue para a sala do Farol (N4). */}
          {salaAFrente ? (
            <button
              ref={entrar}
              type="button"
              className="arq-botao"
              onClick={() => {
                fechar()
                entrarNaSala()
              }}
            >
              Entrar na sala do alto
            </button>
          ) : null}
          <button
            type="button"
            className={salaAFrente ? 'arq-botao leve' : 'arq-botao'}
            onClick={() => {
              movimento.pedidoDoPercurso = { acao: 'recomecar', percurso: r.percurso }
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

/** Quanto o HUD leva para entrar depois da abertura (ele aparece aos poucos, como no roteiro). */
const ENTRADA_DO_HUD_MS = 1400

export function Hud() {
  const { loja, plataforma } = useJogo()
  // O anel dos primeiros passos e das dicas: a parte da HUD que a fala mostra (`estilos.ts`).
  const anel = usePassos(lojaDosPassos(loja, plataforma), (s) => s.tela.anel)
  const anelDaDica = usePassos(lojaDosPassos(loja, plataforma), (s) => s.tela.dica)
  const noFarol = useFarol(loja, (s) => s.etapa !== 'fora' || s.corte !== null)
  const naAbertura = useEstado((s) => s.painelAberto === PAINEL_DA_ABERTURA)
  const naLuneta = useEstado((s) => s.painelAberto === PAINEL_DA_LUNETA)
  const naChegada = useEstado((s) => s.painelAberto === PAINEL_DA_CHEGADA)
  const nasEstrelas = useEstado((s) => s.painelAberto === PAINEL_DAS_ESTRELAS)
  const construindo = useEstado((s) => s.painelAberto === PAINEL_DE_CONSTRUIR)
  const naFoto = useEstado(hudEscondido)
  const visitando = useEstado((s) => s.visita !== null)
  // Na corrida e no balão o HUD fica só com o que importa para a atividade.
  const emAtividade = useEstado((s) => s.corrida !== null || s.modo === 'balao')
  const toque = useToque()
  const [entrando, setEntrando] = useState(false)
  const estavaNaAbertura = useRef(naAbertura)
  useEffect(() => {
    const saiu = estavaNaAbertura.current && !naAbertura
    estavaNaAbertura.current = naAbertura
    if (!saiu) return
    setEntrando(true)
    const t = setTimeout(() => setEntrando(false), ENTRADA_DO_HUD_MS)
    return () => clearTimeout(t)
  }, [naAbertura])
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const s = loja.getState()
      if (e.code !== 'Escape') return
      if (salvamentoPausado(s.salvamentoSituacao)) return
      const final = lojaDoFarol(loja).getState()
      if (
        final.etapa !== 'fora' &&
        (s.painelAberto === null || s.painelAberto === PAINEL_DO_FINAL) &&
        !s.menuAberto &&
        !s.tempoPausado &&
        !s.tempoAcabou &&
        !s.ferramentaAberta
      ) {
        final.sair?.()
        return
      }
      // Com o resultado na tela, o Esc fecha ele (mesmo com o foco fora da janela dele).
      if (s.resultado) s.mostrarResultado(null)
      else if (s.tempoPausado || s.ferramentaAberta) return
      // Com um painel aberto (o Quadro das Cores, a conversa com a Capi, o caderno, o diário, a
      // abertura), o Esc fecha.
      else if (s.painelAberto !== null) s.abrirPainel(null)
      else s.abrirMenu(!s.menuAberto)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [loja])
  // A abertura toma a tela inteira; o HUD entra devagar quando ela termina.
  if (naAbertura)
    return (
      <div className="arq-hud">
        <Abertura />
      </div>
    )
  if (naLuneta)
    return (
      <div className="arq-hud">
        <VisorDaLuneta />
      </div>
    )
  // A cena da subida de posto (N02): só a legenda e o Pular.
  if (naChegada)
    return (
      <div className="arq-hud">
        <LegendaDaChegada />
      </div>
    )
  if (nasEstrelas)
    return (
      <div className="arq-hud">
        <VisorDasEstrelas />
      </div>
    )
  // Modo foto: o HUD, a fala do Zappy e as dicas somem; só ficam "Tirar foto" e "Voltar".
  if (naFoto)
    return (
      <div className="arq-hud">
        <ModoFoto />
      </div>
    )
  const classes = ['arq-hud']
  if (emAtividade) classes.push('em-atividade')
  if (toque) classes.push('toque')
  if (entrando) classes.push('entrando')
  return (
    <div
      className={classes.join(' ')}
      data-anel={noFarol ? undefined : (anel ?? undefined)}
      data-anel-cor={!noFarol && anel && anelDaDica ? 'dica' : undefined}
    >
      <Soneca />
      <Cochilo />
      <QuemJoga />
      {/* Na casa do irmão, no lugar da ilha e do "Agora", de quem é a casa e a volta. */}
      {visitando || noFarol ? null : <IlhaAgora />}
      <div className="arq-topo-dir">
        <Relogio />
        <TempoLivre />
        <button
          type="button"
          className="arq-botao-icone arq-vidro arq-botao-menu"
          onClick={() => loja.getState().abrirMenu(true)}
          aria-label="Abrir o menu"
          title="Menu (Esc)"
        >
          <Icone nome="menu" tamanho={22} />
        </button>
      </div>
      <Cronometro />
      <AlturaDoBalao />
      {noFarol ? null : <RotinaAndando />}
      {/* No Construir o "Agora" sai: a fala do Zappy sobe para o lugar dele (os dois se cobriam). */}
      {visitando || construindo || noFarol ? null : <Agora />}
      <Dica oculta={noFarol} />
      {noFarol ? null : <PrimeirosPassos />}
      {!noFarol && visitando ? <FaixaDaVisita /> : null}
      {construindo ? (
        <BarraDeConstruir />
      ) : (
        <>
          {/* A zona de gesto fica atrás da HUD visível, sem interceptar seus botões. */}
          <ControlesDeToque />
          <div className="arq-baixo">
            <Acao />
            {noFarol ? null : <Mochila />}
          </div>
        </>
      )}
      {!noFarol && !visitando ? (
        <div className="arq-cantinho">
          <BotaoDaFoto />
          <ModosDoJogo />
        </div>
      ) : null}
      <PainelDoBarco />
      <PainelDoQuadro />
      <PainelDaFeira />
      <PainelDoBrinquedo />
      <PainelDoJardimDoCeu />
      <PainelDosConvidados />
      <PainelDaCapi />
      <PainelDoBento />
      <PainelDaMare />
      <PainelDoNico />
      <PainelDoFloco />
      <PainelDaJade />
      <PainelDaIrie />
      <PainelDaIris />
      <PainelDoFarol />
      <PainelDaGaleria />
      <PainelDaBancada />
      <FogueiraDaFesta />
      <PainelDoTurno />
      <PainelDoBicho />
      <PainelDoFilhote />
      <CadernoDosLumis />
      <PainelDaRotina />
      <PainelDoObjeto />
      <Diario />
      <PainelDasVisitas />
      <PainelDasVisitasAdultas />
      <Album />
      <PainelDoMapa />
      <ResumoAoDeitar />
      {!noFarol && <AtalhoDaFoto />}
      <CorteDoFarol />
      <Menu />
      <Resultado />
      <Corte />
    </div>
  )
}

/**
 * Ao deitar na cama, o resumo do dia (N06: "decora e dorme"): abre uma vez por deitada, e
 * "Continuar" volta ao jogo ainda deitada. Na visita não se deita.
 */
function ResumoAoDeitar() {
  const { loja } = useJogo()
  const foto = useFotoDoDia()
  const deitada = useEstado((s) => s.descanso === 'deitar')
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DO_RESUMO)
  useEffect(() => {
    if (!deitada) return
    const s = loja.getState()
    if (s.painelAberto === null && !s.visita) s.abrirPainel(PAINEL_DO_RESUMO)
  }, [deitada, loja])
  return aberto ? <PainelDoResumo foto={foto} /> : null
}
