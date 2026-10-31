import { estagio, ILHAS, type Semente } from '@sistemazero/arquipelago-contracts'
import { useCallback, useEffect, useRef, useState } from 'react'
import zappyNoQuarto from '../assets/abertura/zappy.webp'
import { type Controle, ultimaEntrada } from '../controles/controle'
import { lojaDaConstrucao, PAINEL_DE_CONSTRUIR } from '../estado/construcao'
import { type ContextoDoJogo, type Rastro, useEstado, useJogo } from '../estado/contexto'
import type { EstadoDoJogo } from '../estado/loja'
import { useToque } from '../estado/preferencias'
import {
  type EstadoDosPassos,
  guiaDoZappy,
  lerMarcaDosPassos,
  lojaDosPassos,
  PAINEL_DOS_PASSOS,
  usePassos,
} from '../estado/primeiros-passos'
import type { RegistroDeInterativos } from '../mundo/interativos'
import { ilhasEmVolta } from '../mundo/medidas'
import { ID_DA_LANTERNA } from '../sistemas/borroes'
import { planta } from '../sistemas/construcao/comodos'
import { entradaDaObra, frenteDaEntrada } from '../sistemas/construcao/entrada'
import { LOTE_DA_CASA_GRANDE } from '../sistemas/construcao/lote'
import { type ContextoDaDica, DICAS, type Dica, type Fala } from '../sistemas/dicas'
import { ilhaMaisPerto, NECESSIDADE_BAIXA } from '../sistemas/hud'
import { quantidade } from '../sistemas/itens'
import { primeiroPedido } from '../sistemas/primeiro-pedido'
import {
  ANDAR_PARA_CONTAR,
  anelDoPasso,
  carimbosDoFim,
  deveComecarSozinho,
  type Entrada,
  type Guia,
  type Leitura,
  PASSOS,
  type Passo,
} from '../sistemas/primeiros-passos'
import { diferencaDeAngulo } from '../sistemas/zappy'
import { useVoz } from './voz'

/** O rosto do Zappy no cartão: o recorte do próprio modelo, da última cena da abertura. */
const ROSTO_DO_ZAPPY = new URL(zappyNoQuarto, import.meta.url).href
/** De quanto em quanto tempo o tutorial confere o jogo (andar, porta, horta, menu). */
const CONFERIR_MS = 250
/** Depois de prender o primeiro Lumi, a fala de Lumi novo vem antes da dica. */
const ESPERA_DA_DICA_DO_LUMI_MS = 4000

const ANEL_DE_ILHAS = ilhasEmVolta().map((i) => ({ id: i.ilha.id, ...i.centro }))
const POSICAO_DA_VILA = ILHAS.find((i) => i.id === 'vila-doce')?.posicao ?? 3

/** O jeito de jogar da vez: o último dispositivo que pediu algo; antes disso, o aparelho. */
function qualEntrada(toque: boolean, controle: Controle): Entrada {
  const u = ultimaEntrada(controle)
  if (u === 'gamepad') return 'controle'
  if (u === 'teclado') return 'teclado'
  if (u === 'toque') return 'toque'
  return toque ? 'toque' : 'teclado'
}

/** A planta da horta (a primeira semente plantada), para a fala dizer qual cresce. */
function sementeDaHorta(s: EstadoDoJogo): Semente | null {
  return s.salvamento.horta.find((c) => c.semente)?.semente ?? null
}

/** O que a regra precisa saber, lido do jogo agora. */
function lerJogo(
  s: EstadoDoJogo,
  p: EstadoDosPassos,
  rastro: Rastro,
  controle: Controle,
  construindo: boolean,
  agora: number,
): Leitura {
  const salv = s.salvamento
  const obra = salv.construcao.casa
  const passo = PASSOS[p.indice]?.id
  // A planta da obra só é calculada nos passos da obra (é a conta mais cara daqui).
  const precisaDaPlanta =
    passo === 'parede' ||
    passo === 'porta-do-comodo' ||
    passo === 'objetos' ||
    passo === 'construir'
  const b = p.base
  return {
    portaNova: salv.casa.portaNova,
    pedido: primeiroPedido(salv, agora)?.etapa ?? null,
    temGeladeira: Boolean(salv.projetos.geladeira),
    geladeiraPosta: obra?.objetos.some((o) => o.id === 'geladeira') ?? false,
    comodoNovo:
      precisaDaPlanta && obra
        ? planta(obra, LOTE_DA_CASA_GRANDE).comodos.some((c) => !c.quarto)
        : false,
    // Uma porta além da porta de entrada (a entrada pode ter mudado de lugar, 31/10/2026).
    portaNoComodo:
      precisaDaPlanta && obra
        ? obra.aberturas.some(
            (a, i) => a.tipo === 'porta' && i !== entradaDaObra(obra, LOTE_DA_CASA_GRANDE)?.indice,
          )
        : false,
    construindo,
    menuAberto: s.menuAberto,
    alvo: s.alvo?.id ?? null,
    andou: b ? Math.hypot(rastro.x - b.x, rastro.z - b.z) : 0,
    girou: b ? b.girou : 0,
    pulou: b ? controle.pulos - b.pulos : 0,
    obra: p.obra,
  }
}

/** Para onde o Zappy voa: o interativo do lugar que a fala mostra. */
function pontoDoGuia(
  guia: Guia,
  s: EstadoDoJogo,
  interativos: RegistroDeInterativos,
  agora: number,
): { x: number; z: number } | null {
  const de = (id: string) => {
    const it = interativos.get(id)
    return it ? { x: it.x, z: it.z } : null
  }
  if (guia === 'porta' || guia === 'casa') {
    // Na casa construída a porta nova sai de cena: o Zappy aponta a porta de entrada da obra.
    const obra = s.salvamento.construcao.casa
    const e = obra ? entradaDaObra(obra, LOTE_DA_CASA_GRANDE) : null
    return e ? frenteDaEntrada(e, 0.6) : de('porta-nova')
  }
  if (guia === 'geladeira') return de('objeto-geladeira')
  for (const c of s.salvamento.horta) {
    const f = estagio(c, agora, s.salvamento.projetos.geladeira?.ganhoEm ?? null)
    const serve =
      guia === 'canteiro-vazio'
        ? f === 'vazio'
        : guia === 'canteiro-maduro'
          ? f === 'maduro'
          : f !== 'vazio' && f !== 'maduro'
    if (serve) return de(`canteiro-${c.id}`)
  }
  return null
}

/** Nada por cima do jogo que esconda a fala (ela volta sozinha depois). */
function semNadaPorCima(s: EstadoDoJogo): boolean {
  return (
    !s.visita &&
    !s.acesso.somenteLeitura &&
    !s.tempoPausado &&
    !s.tempoAcabou &&
    !s.ferramentaAberta &&
    s.resultado === null &&
    s.corrida === null &&
    s.modo !== 'balao' &&
    s.modo !== 'barco' &&
    !s.menuAberto
  )
}

function cartaoDoPassoPodeAparecer(s: EstadoDoJogo, passo: Passo, l: Leitura): boolean {
  if (!semNadaPorCima(s)) return false
  const painel = s.painelAberto
  if (painel !== null && painel !== PAINEL_DE_CONSTRUIR && painel !== PAINEL_DOS_PASSOS)
    return false
  return passo.esperar ? passo.esperar(l) : true
}

function cartaoDaDicaPodeAparecer(s: EstadoDoJogo, dica: Dica): boolean {
  if (!semNadaPorCima(s)) return false
  const painel = s.painelAberto
  if (painel === null || painel === PAINEL_DE_CONSTRUIR) return true
  return Boolean(dica.sobrePainel && painel.startsWith('quadro:'))
}

/** Lê o jogo agora, para os botões (fechar, escolher, começar) que mudam o tutorial. */
function useLeitura(): () => Leitura {
  const { loja, plataforma, rastro, controle } = useJogo()
  return useCallback(() => {
    const s = loja.getState()
    const construindo =
      s.painelAberto === PAINEL_DE_CONSTRUIR && lojaDaConstrucao(loja).getState().onde === 'casa'
    return lerJogo(
      s,
      lojaDosPassos(loja, plataforma).getState(),
      rastro,
      controle,
      construindo,
      Date.now(),
    )
  }, [loja, plataforma, rastro, controle])
}

/** Tira o foco do botão clicado: com ele focado, o teclado não anda (`controles/controle.ts`). */
const soltarFoco = (e: { currentTarget: HTMLElement }) => e.currentTarget.blur()

/** O que a tela mostra agora (recalculado a cada conferência). */
interface Vista {
  passo: boolean
  dica: boolean
  entrada: Entrada
  semente: Semente | null
}

/**
 * Os primeiros passos e as dicas de primeira vez na HUD: confere o jogo, avança o tutorial,
 * dispara as dicas, manda o Zappy e o facho para o lugar e mostra o cartão do Zappy.
 */
export function PrimeirosPassos() {
  const { loja, plataforma, controle, rastro, interativos, ambiente } = useJogo()
  const passos = lojaDosPassos(loja, plataforma)
  const voz = useVoz()
  const toque = useToque()
  const ler = useLeitura()
  const toqueAgora = useRef(toque)
  toqueAgora.current = toque
  const falaDoCurso = useRef(voz.passos.curso)
  falaDoCurso.current = voz.passos.curso
  const [vista, setVista] = useState<Vista>({
    passo: false,
    dica: false,
    entrada: toque ? 'toque' : 'teclado',
    semente: null,
  })
  const contextoDaDica = useRef<{ id: string; ctx: ContextoDaDica } | null>(null)

  useEffect(() => {
    const guia = guiaDoZappy(loja)
    const construcao = lojaDaConstrucao(loja)
    const antes = {
      noite: null as boolean | null,
      lanterna: quantidade(loja.getState().salvamento.inventario, ID_DA_LANTERNA),
      lumis: Object.values(loja.getState().salvamento.lumis).reduce((a, n) => a + (n ?? 0), 0),
      modo: loja.getState().modo,
      dicaDoLumiEm: null as number | null,
      abriuOFim: false,
    }
    const conferir = () => {
      const s = loja.getState()
      const agora = Date.now()
      const construindo =
        s.painelAberto === PAINEL_DE_CONSTRUIR && construcao.getState().onde === 'casa'
      let p = passos.getState()
      const andandoAntes = p.situacao === 'andando'
      // A base do passo: andar, olhar e pular contam a partir de onde a fala apareceu.
      if (p.situacao === 'andando' && !p.base)
        p.definirBase({
          x: rastro.x,
          z: rastro.z,
          giro: rastro.giro,
          pulos: controle.pulos,
          girou: 0,
        })
      else if (p.base)
        p.base.girou = Math.max(p.base.girou, Math.abs(diferencaDeAngulo(p.base.giro, rastro.giro)))
      p = passos.getState()
      const l = lerJogo(s, p, rastro, controle, construindo, agora)
      p.relogio(l, agora)
      p = passos.getState()
      // Escolheu "Depois": a obra da geladeira volta quando o Construir da casa abrir.
      if (
        p.situacao !== 'andando' &&
        p.obraPendente &&
        construindo &&
        !l.geladeiraPosta &&
        !s.visita
      )
        p.retomarObra(l)
      p = passos.getState()
      const passo = PASSOS[p.indice]
      const naTela =
        p.situacao === 'andando' && passo !== undefined && cartaoDoPassoPodeAparecer(s, passo, l)

      // O fim: o cartão "O que você já sabe" por cima do jogo parado; o Esc fecha tudo.
      if (p.situacao !== 'andando' || passo?.id !== 'fim') antes.abriuOFim = false
      if (naTela && passo?.id === 'fim') {
        if (s.painelAberto === null && !antes.abriuOFim) {
          antes.abriuOFim = true
          s.abrirPainel(PAINEL_DOS_PASSOS)
        } else if (antes.abriuOFim && s.painelAberto !== PAINEL_DOS_PASSOS) {
          antes.abriuOFim = false
          p.fechar(l)
        }
      }

      // As dicas de primeira vez: o que a criança encontrou agora.
      if (!s.visita && !s.acesso.somenteLeitura) {
        const alvo = s.alvo?.id ?? ''
        if (alvo.startsWith('quadro-')) p.pedirDica('quadro')
        if (alvo.startsWith('barco-')) p.pedirDica('barco')
        if (alvo.startsWith('borrao-')) p.pedirDica('borrao')
        if (s.painelAberto?.startsWith('quadro:')) p.pedirDica('quadro-painel')
        const lanterna = quantidade(s.salvamento.inventario, ID_DA_LANTERNA)
        if (antes.lanterna === 0 && lanterna > 0) p.pedirDica('lanterna')
        antes.lanterna = lanterna
        const lumis = Object.values(s.salvamento.lumis).reduce((a, n) => a + (n ?? 0), 0)
        if (antes.lumis === 0 && lumis > 0) antes.dicaDoLumiEm = agora + ESPERA_DA_DICA_DO_LUMI_MS
        antes.lumis = lumis
        if (antes.dicaDoLumiEm !== null && agora >= antes.dicaDoLumiEm) {
          antes.dicaDoLumiEm = null
          p.pedirDica('lumi')
        }
        const ilha = ilhaMaisPerto(rastro, ANEL_DE_ILHAS)
        if (antes.modo === 'barco' && s.modo !== 'barco' && ilha !== 'sua-ilha')
          p.pedirDica('barco-chegada')
        antes.modo = s.modo
        // A primeira noite: se ela chega no meio dos primeiros passos, a dica espera a próxima.
        if (ambiente.noite && antes.noite !== true && !andandoAntes) p.pedirDica('noite')
        antes.noite = ambiente.noite
      }

      p = passos.getState()
      const atual = p.fila[0]
      const dica =
        atual !== undefined &&
        !naTela &&
        (atual.rever || p.situacao !== 'andando') &&
        cartaoDaDicaPodeAparecer(s, DICAS[atual.id])
      const entrada = qualEntrada(toqueAgora.current, controle)
      if (dica && atual && contextoDaDica.current?.id !== atual.id) {
        contextoDaDica.current = {
          id: atual.id,
          ctx: {
            entrada,
            barcoDeCasa: ilhaMaisPerto(rastro, ANEL_DE_ILHAS) === 'sua-ilha',
            vilaAberta: s.jornada >= POSICAO_DA_VILA,
            temLanterna: quantidade(s.salvamento.inventario, ID_DA_LANTERNA) > 0,
            energiaBaixa: s.salvamento.necessidades.energia < NECESSIDADE_BAIXA,
            temCama: interativos.get('cama')?.rotulo() != null,
            falaDoCurso: falaDoCurso.current,
          },
        }
      }

      // O Zappy, o facho e o anel mostram o lugar só com a fala na tela.
      guia.alvo = naTela && passo?.guia ? pontoDoGuia(passo.guia, s, interativos, agora) : null
      guia.circulo =
        naTela && passo?.id === 'andar' && p.base
          ? { x: p.base.x, z: p.base.z, raio: ANDAR_PARA_CONTAR }
          : null
      const falaDaDica: Fala | undefined =
        dica && atual && contextoDaDica.current
          ? DICAS[atual.id].falas(contextoDaDica.current.ctx)[p.falaDaDica]
          : undefined
      // A fala do mapa mora no menu aberto: o anel vai para o mapa dele.
      const noMenu = p.situacao === 'andando' && passo?.noMenu === true && s.menuAberto
      const anel =
        (naTela || noMenu) && passo && p.aberta && p.fase !== 'isso'
          ? anelDoPasso(passo, entrada)
          : (falaDaDica?.anel ?? null)
      p.definirTela({ anel, dica: dica && !naTela, cartao: (naTela && p.aberta) || dica })
      const semente = sementeDaHorta(s)
      setVista((v) =>
        v.passo === naTela && v.dica === dica && v.entrada === entrada && v.semente === semente
          ? v
          : { passo: naTela, dica, entrada, semente },
      )
    }
    conferir()
    const t = setInterval(conferir, CONFERIR_MS)
    return () => {
      clearInterval(t)
      guia.alvo = null
      guia.circulo = null
      passos.getState().definirTela({ anel: null, dica: false, cartao: false })
    }
  }, [loja, passos, rastro, controle, interativos, ambiente])

  // Enter fecha a fala (sem roubar o Enter de um botão ou campo com foco).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest?.('button, a, input, textarea, select, [contenteditable=true]')) return
      const p = passos.getState()
      if (!p.tela.cartao || loja.getState().menuAberto) return
      e.preventDefault()
      fecharAgora()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const situacao = usePassos(passos, (s) => s.situacao)
  const indice = usePassos(passos, (s) => s.indice)
  const fase = usePassos(passos, (s) => s.fase)
  const aberta = usePassos(passos, (s) => s.aberta)
  const confirmandoPular = usePassos(passos, (s) => s.confirmandoPular)
  const atual = usePassos(passos, (s) => s.fila[0] ?? null)
  const falaDaDica = usePassos(passos, (s) => s.falaDaDica)
  const confirmandoDesligar = usePassos(passos, (s) => s.confirmandoDesligar)
  const noFim = useEstado((s) => s.painelAberto === PAINEL_DOS_PASSOS)
  const geladeiraPosta = useEstado(
    (s) => s.salvamento.construcao.casa?.objetos.some((o) => o.id === 'geladeira') ?? false,
  )
  const recado = useRecado(passos)

  const mostrarPasso = vista.passo && aberta && situacao === 'andando'
  const mostrarDica = !mostrarPasso && vista.dica && atual !== null
  const falasDaDica =
    mostrarDica && atual && contextoDaDica.current?.id === atual.id
      ? DICAS[atual.id].falas(contextoDaDica.current.ctx)
      : []

  function fecharAgora() {
    const p = passos.getState()
    if (p.tela.dica) {
      const ctx = contextoDaDica.current?.ctx
      const head = p.fila[0]
      p.proximaFalaDaDica(head && ctx ? DICAS[head.id].falas(ctx).length : 1)
      return
    }
    p.fechar(ler())
  }

  if (mostrarPasso) {
    const passo = PASSOS[indice]
    if (!passo) return null
    const contexto = {
      entrada: vista.entrada,
      nome: plataforma.perfil.primeiroNome.trim() || 'você',
      semente: vista.semente,
      falaDoMapa: voz.passos.mapa,
    }
    return (
      <>
        {noFim && passo.id === 'fim' ? <ResumoDosPassos geladeiraPosta={geladeiraPosta} /> : null}
        <CartaoDoZappy
          tipo="passos"
          capitulo={passo.capitulo}
          texto={
            confirmandoPular
              ? 'Tudo bem pular. Quando quiser, me chame no menu, em Primeiros passos.'
              : passo.fala(contexto)
          }
          recado={recado}
          fase={fase}
          tarefa={confirmandoPular ? undefined : passo.tarefa}
          entrada={vista.entrada}
          escolha={
            passo.escolha && !confirmandoPular && fase === 'fala'
              ? (o) => passos.getState().escolherObra(o, ler())
              : undefined
          }
          aoFechar={fecharAgora}
          rodape={
            confirmandoPular ? (
              <div className="arq-guia-botoes">
                <button
                  type="button"
                  className="arq-botao leve"
                  onClick={(e) => {
                    soltarFoco(e)
                    passos.getState().perguntarPular(false)
                  }}
                >
                  Continuar comigo
                </button>
                <button
                  type="button"
                  className="arq-botao"
                  onClick={(e) => {
                    soltarFoco(e)
                    passos.getState().pular()
                  }}
                >
                  Pular
                </button>
              </div>
            ) : passo.id === 'fim' ? null : (
              <div className="arq-guia-rodape">
                <button
                  type="button"
                  className="arq-guia-link"
                  onClick={(e) => {
                    soltarFoco(e)
                    passos.getState().perguntarPular(true)
                  }}
                >
                  Pular o tutorial
                </button>
                {vista.entrada === 'teclado' ? <small>Enter também fecha</small> : null}
              </div>
            )
          }
        />
      </>
    )
  }

  if (mostrarDica && atual && falasDaDica.length > 0) {
    const fala = falasDaDica[Math.min(falaDaDica, falasDaDica.length - 1)]
    return (
      <CartaoDoZappy
        tipo="dica"
        texto={
          confirmandoDesligar
            ? 'As dicas ficam desligadas. Dá para ligar de novo em Conforto e controles.'
            : (fala?.texto ?? '')
        }
        recado={recado}
        fase="fala"
        entrada={vista.entrada}
        aoFechar={fecharAgora}
        rodape={
          confirmandoDesligar ? (
            <div className="arq-guia-botoes">
              <button
                type="button"
                className="arq-botao leve"
                onClick={(e) => {
                  soltarFoco(e)
                  passos.getState().perguntarDesligar(false)
                }}
              >
                Continuar com as dicas
              </button>
              <button
                type="button"
                className="arq-botao"
                onClick={(e) => {
                  soltarFoco(e)
                  passos.getState().ligarDicas(false)
                }}
              >
                Desligar
              </button>
            </div>
          ) : (
            <div className="arq-guia-rodape">
              <span className="arq-guia-conta">
                <span className="arq-guia-pontos" aria-hidden="true">
                  {falasDaDica.map((f, i) => (
                    <i
                      key={f.texto}
                      className={i === falaDaDica ? 'agora' : i < falaDaDica ? 'vista' : undefined}
                    />
                  ))}
                </span>
                {`${Math.min(falaDaDica, falasDaDica.length - 1) + 1} de ${falasDaDica.length}`}
              </span>
              {atual.rever ? null : (
                <button
                  type="button"
                  className="arq-guia-link"
                  onClick={(e) => {
                    soltarFoco(e)
                    passos.getState().perguntarDesligar(true)
                  }}
                >
                  Desligar as dicas
                </button>
              )}
            </div>
          )
        }
      />
    )
  }
  return null
}

/**
 * Uma fala solta do jogo (o "Você colheu", a mochila cheia) com o cartão do Zappy na tela: entra
 * nele por alguns segundos, para os dois cartões não se cobrirem.
 */
function useRecado(passos: ReturnType<typeof lojaDosPassos>): string | null {
  const dica = useEstado((s) => s.dica)
  const naTela = usePassos(passos, (s) => s.tela.cartao)
  const [recado, setRecado] = useState<{ id: number; texto: string } | null>(null)
  useEffect(() => {
    if (!dica || !passos.getState().tela.cartao) return
    const restante = dica.expiraEm - Date.now()
    if (restante <= 0) {
      setRecado(null)
      return
    }
    setRecado(dica)
    const t = setTimeout(() => setRecado((r) => (r?.id === dica.id ? null : r)), restante)
    return () => clearTimeout(t)
  }, [dica, passos])
  return naTela ? (recado?.texto ?? null) : null
}

/** Uma tarefa: as teclas desenhadas, o complemento e o que fazer. */
function LinhaDaTarefa({
  tarefa,
  entrada,
}: {
  tarefa: NonNullable<Passo['tarefa']>
  entrada: Entrada
}) {
  const teclas = tarefa.teclas?.[entrada] ?? []
  const extra = tarefa.extra?.[entrada]
  return (
    <div className="arq-guia-tarefa">
      {teclas.map((t) => (
        <kbd key={t}>{t}</kbd>
      ))}
      {extra ? <span className="arq-guia-extra">{extra}</span> : null}
      <b>{tarefa.rotulo}</b>
    </div>
  )
}

/**
 * O cartão do Zappy dos primeiros passos e das dicas: o rosto, quem fala, os capítulos (ou a
 * etiqueta "Primeira vez"), a fala, a tarefa e o X. Não toma o foco: com o foco num botão, o
 * Espaço apertaria o botão e o teclado não andaria.
 */
export function CartaoDoZappy({
  tipo,
  capitulo,
  texto,
  recado,
  fase,
  tarefa,
  entrada,
  escolha,
  aoFechar,
  rodape,
  noMenu,
}: {
  tipo: 'passos' | 'dica'
  capitulo?: number
  texto: string
  recado: string | null
  fase: EstadoDosPassos['fase']
  tarefa?: Passo['tarefa']
  entrada: Entrada
  escolha?: (obra: 'agora' | 'depois') => void
  aoFechar: () => void
  rodape: React.ReactNode
  noMenu?: boolean
}) {
  return (
    <section
      className={`arq-guia ${tipo}${noMenu ? ' no-menu' : ''}`}
      aria-label={tipo === 'passos' ? 'Primeiros passos com o Zappy' : 'Dica do Zappy'}
    >
      {recado ? (
        <p className="arq-guia-recado" role="status">
          {recado}
        </p>
      ) : null}
      <div className="arq-guia-topo">
        <span className="arq-guia-rosto" aria-hidden="true">
          <img src={ROSTO_DO_ZAPPY} alt="" draggable={false} />
        </span>
        <div className="arq-guia-meio">
          <div className="arq-guia-quem">
            <b>Zappy</b>
            {tipo === 'passos' && capitulo ? (
              <span
                className="arq-guia-capitulos"
                role="img"
                aria-label={`Capítulo ${capitulo} de 6`}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <i
                    key={n}
                    className={n < capitulo ? 'feito' : n === capitulo ? 'agora' : undefined}
                  />
                ))}
              </span>
            ) : tipo === 'dica' ? (
              <span className="arq-guia-selo">Primeira vez</span>
            ) : null}
          </div>
          <p className="arq-guia-fala" aria-live="polite">
            {texto}
          </p>
        </div>
        <button
          type="button"
          className="arq-guia-x"
          aria-label="Fechar a fala do Zappy"
          onClick={(e) => {
            soltarFoco(e)
            aoFechar()
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {fase === 'isso' ? (
        <p className="arq-guia-isso">Isso. Feito.</p>
      ) : fase === 'lembrete' ? (
        <p className="arq-guia-isso lembrete">Você já fez isso.</p>
      ) : escolha ? (
        <div className="arq-guia-botoes">
          <button
            type="button"
            className="arq-botao"
            onClick={(e) => {
              soltarFoco(e)
              escolha('agora')
            }}
          >
            Fazer agora
          </button>
          <button
            type="button"
            className="arq-botao leve"
            onClick={(e) => {
              soltarFoco(e)
              escolha('depois')
            }}
          >
            Depois
          </button>
        </div>
      ) : tarefa ? (
        <LinhaDaTarefa tarefa={tarefa} entrada={entrada} />
      ) : null}
      {rodape}
    </section>
  )
}

/** O cartão do fim, por cima do jogo parado: o que a criança já sabe. Fecha com o X da fala. */
function ResumoDosPassos({ geladeiraPosta }: { geladeiraPosta: boolean }) {
  return (
    <div
      className="arq-passos-fim"
      role="dialog"
      aria-modal="false"
      aria-labelledby="arq-passos-fim"
    >
      <div className="arq-passos-fim-cartao">
        <span className="arq-guia-rosto grande" aria-hidden="true">
          <img src={ROSTO_DO_ZAPPY} alt="" draggable={false} />
        </span>
        <small>Primeiros passos</small>
        <h2 id="arq-passos-fim">O que você já sabe</h2>
        <ul>
          {carimbosDoFim(geladeiraPosta).map((c) => (
            <li key={c}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10.5l4 4 8-9"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {c}
            </li>
          ))}
        </ul>
        <p>
          Daqui para frente, o Agora mostra o que dá para fazer: a fome, a horta, o desafio de hoje.
        </p>
      </div>
    </div>
  )
}

/** A fala dos passos que moram no menu (o mapa), no espaço livre do meio dele. */
export function FalaDosPassosNoMenu() {
  const { loja, plataforma } = useJogo()
  const passos = lojaDosPassos(loja, plataforma)
  const voz = useVoz()
  const toque = useToque()
  const ler = useLeitura()
  const situacao = usePassos(passos, (s) => s.situacao)
  const indice = usePassos(passos, (s) => s.indice)
  const fase = usePassos(passos, (s) => s.fase)
  const passo = PASSOS[indice]
  if (situacao !== 'andando' || !passo?.noMenu) return null
  const entrada: Entrada = toque ? 'toque' : 'teclado'
  return (
    <CartaoDoZappy
      tipo="passos"
      noMenu
      capitulo={passo.capitulo}
      texto={passo.fala({
        entrada,
        nome: plataforma.perfil.primeiroNome,
        semente: null,
        falaDoMapa: voz.passos.mapa,
      })}
      recado={null}
      fase={fase}
      entrada={entrada}
      aoFechar={() => passos.getState().fechar(ler())}
      rodape={null}
    />
  )
}

/**
 * No menu de pausa, em Início: onde a criança parou nos primeiros passos, continuar ou começar de
 * novo, e as dicas de primeira vez que ela já viu, para ler de novo.
 */
export function CartaoDosPassosNoMenu() {
  const { loja, plataforma } = useJogo()
  const passos = lojaDosPassos(loja, plataforma)
  const ler = useLeitura()
  const visita = useEstado((s) => s.visita !== null)
  const situacao = usePassos(passos, (s) => s.situacao)
  const indice = usePassos(passos, (s) => s.indice)
  const vistas = usePassos(passos, (s) => s.dicas.vistas)
  if (visita) return null
  const capitulo = PASSOS[indice]?.capitulo ?? 1
  const titulo =
    situacao === 'feito'
      ? 'Você já sabe o começo'
      : situacao === 'andando'
        ? `Capítulo ${capitulo} de 6`
        : situacao === 'pulado'
          ? `Você parou no capítulo ${capitulo}`
          : 'O Zappy mostra o começo'
  const ir = (de: 'continuar' | 'recomecar') => {
    loja.getState().abrirMenu(false)
    passos.getState().comecar(ler(), de)
  }
  return (
    <section className="arq-passos-menu" aria-labelledby="arq-passos-menu-titulo">
      <span className="arq-guia-rosto" aria-hidden="true">
        <img src={ROSTO_DO_ZAPPY} alt="" draggable={false} />
      </span>
      <div className="arq-passos-menu-texto">
        <span className="arq-pausa-rotulo">Primeiros passos</span>
        <b id="arq-passos-menu-titulo">{titulo}</b>
        <span className="arq-guia-capitulos largos" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <i
              key={n}
              className={
                situacao === 'feito' || n < capitulo
                  ? 'feito'
                  : n === capitulo && situacao !== 'parado'
                    ? 'agora'
                    : undefined
              }
            />
          ))}
        </span>
      </div>
      <div className="arq-passos-menu-acoes">
        {situacao === 'pulado' || (situacao === 'parado' && indice > 0) ? (
          <button type="button" className="arq-botao" onClick={() => ir('continuar')}>
            Continuar
          </button>
        ) : null}
        <button
          type="button"
          className={
            situacao === 'feito' || situacao === 'andando' || indice === 0
              ? 'arq-botao'
              : 'arq-botao leve'
          }
          onClick={() => ir('recomecar')}
        >
          {situacao === 'feito'
            ? 'Rever os primeiros passos'
            : situacao === 'parado' && indice === 0
              ? 'Começar'
              : 'Começar de novo'}
        </button>
      </div>
      {vistas.length > 0 ? (
        <div className="arq-passos-menu-dicas">
          <span>Dicas que você já viu</span>
          {vistas.map((id) => (
            <button
              key={id}
              type="button"
              className="arq-botao leve"
              onClick={() => {
                loja.getState().abrirMenu(false)
                passos.getState().reverDica(id)
              }}
            >
              {DICAS[id].nome}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

/**
 * A linha do tutorial no "Agora": com a fala recolhida pelo X, a tarefa fica aqui, com o rosto do
 * Zappy, e tocar nela abre a fala de novo. Ela toma o lugar da linha do primeiro pedido.
 */
export function useLinhaDosPassos(): { texto: string; reabrir: () => void } | null | 'andando' {
  const { loja, plataforma } = useJogo()
  const passos = lojaDosPassos(loja, plataforma)
  const situacao = usePassos(passos, (s) => s.situacao)
  const aberta = usePassos(passos, (s) => s.aberta)
  const indice = usePassos(passos, (s) => s.indice)
  if (situacao !== 'andando') return null
  const passo = PASSOS[indice]
  if (aberta || !passo) return 'andando'
  const texto = passo.escolha ? 'Fazer o cômodo da geladeira' : passo.tarefa?.rotulo
  if (!texto) return 'andando'
  return { texto, reabrir: () => passos.getState().reabrir() }
}

/** No Diário, ao lado de "Rever a abertura": os primeiros passos de novo, do começo. */
export function ReverOsPrimeirosPassos() {
  const { loja, plataforma } = useJogo()
  const ler = useLeitura()
  const visita = useEstado((s) => s.visita !== null)
  if (visita) return null
  return (
    <button
      type="button"
      className="arq-botao leve arq-diario-abertura"
      onClick={() => {
        loja.getState().abrirPainel(null)
        lojaDosPassos(loja, plataforma).getState().comecar(ler(), 'recomecar')
      }}
    >
      Rever os primeiros passos
    </button>
  )
}

/** Rostinho do Zappy em linha (o mesmo recorte do cartão). */
export function RostoDoZappy() {
  return (
    <span className="arq-guia-rosto mini" aria-hidden="true">
      <img src={ROSTO_DO_ZAPPY} alt="" draggable={false} />
    </span>
  )
}

/**
 * Começa sozinho, se for a vez (`deveComecarSozinho`): ao abrir o jogo sem abertura e quando a
 * abertura da primeira vez fecha. Devolve se o tutorial está andando (aí ele faz as boas-vindas).
 */
export function comecarPassosSozinho(
  c: Pick<ContextoDoJogo, 'loja' | 'plataforma' | 'rastro' | 'controle'>,
  jogoNovo: boolean,
): boolean {
  const s = c.loja.getState()
  const passos = lojaDosPassos(c.loja, c.plataforma)
  if (passos.getState().situacao === 'andando') return true
  const vez = deveComecarSozinho({
    marca: lerMarcaDosPassos(c.plataforma.publico, c.plataforma.perfil.id),
    temGeladeira: Boolean(s.salvamento.projetos.geladeira),
    jogoNovo,
    somenteLeitura: s.acesso.somenteLeitura === true,
    visitando: s.visita !== null,
  })
  if (!vez) return false
  passos
    .getState()
    .comecar(lerJogo(s, passos.getState(), c.rastro, c.controle, false, Date.now()), 'continuar')
  return true
}
