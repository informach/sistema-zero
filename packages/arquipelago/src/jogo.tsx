import {
  type Acesso,
  AcessoSchema,
  criarSalvamentoInicial,
  migrarSalvamento,
  type Plataforma,
  QuartoSchema,
  SalvamentoGuardadoSchema,
} from '@sistemazero/arquipelago-contracts'
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { criarControle, ligarTeclado } from './controles/controle'
import { ligarGamepad } from './controles/gamepad'
import { abrirAbertura, lerAberturaVista } from './estado/abertura'
import { Contexto, type ContextoDoJogo, criarMovimento } from './estado/contexto'
import { criarLoja } from './estado/loja'
import { Relogios } from './estado/relogios'
import { Hud } from './interface/hud'
import { SalvamentoDoJogo } from './interface/salvamento'
import { TelaBloqueado, TelaCarregando, TelaDescanso, TelaErro } from './interface/telas'
import { VOZ_KIDS, VozContexto, type VozDoJogo } from './interface/voz'
import { Cena } from './mundo/cena'
import { criarRegistro } from './mundo/interativos'
import { boasVindas, deveMostrarAbertura, PAINEL_DA_ABERTURA } from './sistemas/abertura'
import { criarArmazemDeSalvamento, JogoAbertoEmOutraAbaError } from './sistemas/armazem-salvamento'
import { criarFilaDeTempo } from './sistemas/fila-tempo'
import { criarGerenteTempo } from './sistemas/gerente-tempo'
import { salvamentoPausado } from './sistemas/pausa'
import { criarFilaDeSalvamento, type FilaDeSalvamento } from './sistemas/salvar'
import { criarSessaoTempo } from './sistemas/sessao-tempo'

type Situacao =
  | { tipo: 'carregando' }
  | { tipo: 'bloqueado'; motivo: NonNullable<Acesso['motivo']> }
  | { tipo: 'descanso' }
  | { tipo: 'erro'; mensagem?: string }
  | { tipo: 'pronto'; contexto: ContextoDoJogo; fila: FilaDeSalvamento | null }

const QUARTO_VAZIO = { theme: 'padrao', placedItems: [], pet: null }

async function carregar(plataforma: Plataforma): Promise<Situacao> {
  const acessoResp = await plataforma.servico.buscar('/acesso')
  if (acessoResp.status !== 200) throw new Error(`acesso ${acessoResp.status}`)
  const acesso = AcessoSchema.parse(acessoResp.corpo)
  if (!acesso.liberado) return { tipo: 'bloqueado', motivo: acesso.motivo ?? 'desligado' }
  if (
    acesso.contabilizaTempo !== false &&
    acesso.limiteDiarioMinutos !== null &&
    acesso.usadoHojeSegundos >= acesso.limiteDiarioMinutos * 60
  ) {
    return { tipo: 'descanso' }
  }

  // Avatar e quarto vêm da plataforma; se falharem, o jogo abre com o padrão (nunca trava).
  const [salvo, jornada, avatar, quarto] = await Promise.all([
    plataforma.servico.buscar('/salvamento'),
    plataforma.lerJornada(),
    plataforma.lerAvatar().catch((e) => {
      plataforma.relatarErro(e, 'avatar')
      return { slots: {} }
    }),
    plataforma.lerQuarto().catch((e) => {
      plataforma.relatarErro(e, 'quarto')
      return QUARTO_VAZIO
    }),
  ])
  if (salvo.status !== 200) throw new Error(`salvamento ${salvo.status}`)
  const guardado = SalvamentoGuardadoSchema.parse(salvo.corpo)
  const salvamento = migrarSalvamento(guardado.salvamento) ?? criarSalvamentoInicial(new Date())

  let fila: FilaDeSalvamento | null = null
  const loja = criarLoja({
    salvamento,
    jornada: jornada.posicao,
    quarto: QuartoSchema.safeParse(quarto).success ? quarto : QUARTO_VAZIO,
    avatar,
    acesso,
    aoMudar: (s) => fila?.guardar(s),
  })
  if (!acesso.somenteLeitura) {
    const armazem = await criarArmazemDeSalvamento(`${plataforma.publico}:${plataforma.perfil.id}`)
    let rascunhoInicial: Awaited<ReturnType<typeof armazem.ler>>
    try {
      rascunhoInicial = await armazem.ler()
    } catch (erro) {
      armazem.fechar()
      throw erro
    }
    fila = criarFilaDeSalvamento({
      servico: plataforma.servico,
      guardadoInicial: guardado,
      rascunhoInicial,
      armazem,
      aoAdotar: (g) => {
        loja.getState().adotar(g)
      },
      aoSituacao: (s) => loja.getState().definirSituacaoSalvamento(s),
      aoErro: (e) => plataforma.relatarErro(e, 'salvamento'),
    })
  }
  let gerenteTempo: ReturnType<typeof criarGerenteTempo> | null = null
  if (plataforma.publico === 'kids' && acesso.contabilizaTempo !== false) {
    try {
      // Antes de começar o novo protocolo, entrega o que uma versão anterior já guardou.
      const filaAntiga = await criarFilaDeTempo({
        perfil: plataforma.perfil.id,
        servico: plataforma.servico,
        aoConfirmar: (tempo) =>
          loja.getState().registrarTempo(tempo.usadoHojeSegundos, tempo.acabou),
        aoErro: (erro) => {
          plataforma.relatarErro(erro, 'tempo-livre')
          loja.getState().definirTempoPausado(true)
        },
      })
      await filaAntiga.encerrar()
      if (loja.getState().tempoAcabou) {
        await fila?.parar()
        return { tipo: 'descanso' }
      }
      const sessao = criarSessaoTempo({
        servico: plataforma.servico,
        aoConfirmar: (tempo) =>
          loja
            .getState()
            .registrarTempo(
              tempo.usadoHojeSegundos,
              tempo.situacao === 'limite',
              tempo.limiteDiarioMinutos,
            ),
      })
      // A sessão só começa quando a tela do jogo estiver montada e visível.
      loja.getState().definirTempoSincronizando(true)
      gerenteTempo = criarGerenteTempo({
        sessao,
        inicialmenteAtivo: false,
        sincronizando: (valor) => loja.getState().definirTempoSincronizando(valor),
        aoErro: (erro) => {
          plataforma.relatarErro(erro, 'tempo-livre')
          loja.getState().definirTempoPausado(true)
        },
      })
    } catch (erro) {
      await fila?.parar()
      throw erro
    }
  }
  // Um jogo novo só entra na fila depois que a recuperação do tempo termina.
  if (guardado.revisao === 0 && !fila?.temPendente()) fila?.guardar(salvamento)
  const contexto: ContextoDoJogo = {
    loja,
    gerenteTempo,
    plataforma,
    controle: criarControle(),
    interativos: criarRegistro(),
    rastro: {
      x: 0,
      y: 0,
      z: 0,
      giro: 0,
      inclinacao: 0.5,
      direcao: 0,
      velocidade: 0,
      zappy: { x: 0, y: 0, z: 0 },
    },
    ambiente: { luz: 1, noite: false },
    pedidos: { teleporte: null, chaoChegando: new Set(), olharPara: null, conversa: null },
    movimento: criarMovimento(),
  }
  // A abertura na primeira vez (uma vez por perfil no aparelho) já abre antes do primeiro quadro:
  // o HUD nem pisca por baixo dela.
  if (
    deveMostrarAbertura({
      vista: lerAberturaVista(plataforma.publico, plataforma.perfil.id),
      jogoNovo: guardado.revisao === 0,
      somenteLeitura: acesso.somenteLeitura === true,
    })
  )
    abrirAbertura(loja, 'primeira')
  return { tipo: 'pronto', contexto, fila }
}

class Barreira extends Component<
  { aoFalhar: (e: unknown) => void; children: ReactNode },
  { falhou: boolean }
> {
  state = { falhou: false }
  static getDerivedStateFromError() {
    return { falhou: true }
  }
  componentDidCatch(erro: unknown) {
    this.props.aoFalhar(erro)
  }
  render() {
    return this.state.falhou ? null : this.props.children
  }
}

function TelaTempoPausado({ contexto }: { contexto: ContextoDoJogo }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [tentando, setTentando] = useState(false)
  useEffect(() => {
    const atual = dialogo.current
    if (atual && !atual.open) atual.showModal()
    return () => {
      if (atual?.open) atual.close()
    }
  }, [])
  return (
    <dialog
      ref={dialogo}
      className="arq-tela"
      aria-labelledby="arq-tempo-titulo"
      onCancel={(evento) => evento.preventDefault()}
      style={{
        width: '100vw',
        height: '100dvh',
        maxWidth: 'none',
        maxHeight: 'none',
        margin: 0,
        border: 0,
      }}
    >
      <div>
        <div className="arq-zappy" />
        <h1 id="arq-tempo-titulo">Vamos tentar de novo</h1>
        <p>O jogo está pausado enquanto guardamos o tempo jogado.</p>
        <button
          type="button"
          className="arq-botao"
          disabled={tentando}
          onClick={() => {
            setTentando(true)
            void contexto.gerenteTempo
              ?.recuperar()
              .then(() => {
                contexto.loja.getState().definirTempoPausado(false)
              })
              .catch(() => {})
              .finally(() => setTentando(false))
          }}
        >
          {tentando ? 'Tentando…' : 'Tentar novamente'}
        </button>
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => contexto.plataforma.voltarParaPlataforma()}
        >
          Voltar para a plataforma
        </button>
      </div>
    </dialog>
  )
}

function JogoPronto({
  contexto,
  fila,
  aoFalhar,
}: {
  contexto: ContextoDoJogo
  fila: FilaDeSalvamento | null
  aoFalhar: (e: unknown) => void
}) {
  const tempoAcabou = useStore(contexto.loja, (s) => s.tempoAcabou)
  const tempoPausado = useStore(contexto.loja, (s) => s.tempoPausado)
  const tempoSincronizando = useStore(contexto.loja, (s) => s.tempoSincronizando)
  const naAbertura = useStore(contexto.loja, (s) => s.painelAberto === PAINEL_DA_ABERTURA)
  useEffect(() => ligarTeclado(contexto.controle), [contexto])
  // O Start do controle faz o que o Esc faz: fecha o painel aberto, senão abre ou fecha o menu.
  useEffect(
    () =>
      ligarGamepad(contexto.controle, () => {
        const s = contexto.loja.getState()
        if (salvamentoPausado(s.salvamentoSituacao)) return
        if (s.tempoPausado || s.ferramentaAberta) return
        if (s.painelAberto !== null) s.abrirPainel(null)
        else s.abrirMenu(!s.menuAberto)
      }),
    [contexto],
  )
  useEffect(() => {
    if (!fila) return
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void fila.salvarAgora()
    }
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      void fila.parar()
    }
  }, [fila])
  // A primeira fala do Zappy: depois da abertura (`interface/abertura.tsx`) ou, sem ela, ao abrir.
  useEffect(() => {
    const s = contexto.loja.getState()
    if (s.painelAberto !== PAINEL_DA_ABERTURA && !s.salvamento.casa.portaNova)
      s.dizer(boasVindas(contexto.plataforma.perfil.primeiroNome))
  }, [contexto])

  return (
    <Contexto.Provider value={contexto}>
      <Barreira aoFalhar={aoFalhar}>
        <Cena aoFalhar={aoFalhar} />
      </Barreira>
      <Relogios />
      <Hud />
      {fila ? <SalvamentoDoJogo fila={fila} /> : null}
      {tempoSincronizando && !tempoPausado && !tempoAcabou && !naAbertura ? (
        <div className="arq-dica" role="status" aria-live="polite">
          Preparando o jogo…
        </div>
      ) : null}
      {tempoPausado && !tempoAcabou ? <TelaTempoPausado contexto={contexto} /> : null}
      {tempoAcabou ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <TelaDescanso aoVoltar={() => contexto.plataforma.voltarParaPlataforma()} />
        </div>
      ) : null}
    </Contexto.Provider>
  )
}

type Pele = { voz: VozDoJogo; estilos: string | null }
const PELE_KIDS: Pele = { voz: VOZ_KIDS, estilos: null }

/**
 * A pele de cada público. O Kids já está no pedaço principal; o adulto baixa o pedaço dele
 * (`adulto/pele-adulta.ts`) antes da primeira tela. Se esse pedaço falhar, o jogo abre com a voz
 * e o desenho do Kids em vez de não abrir (o erro vai para `relatarErro`).
 */
function usePele(plataforma: Plataforma): Pele | null {
  const { publico } = plataforma
  const [adulta, setAdulta] = useState<Pele | null>(null)
  useEffect(() => {
    if (publico !== 'adulto') return
    let vivo = true
    import('./adulto/pele-adulta')
      .then((m) => {
        if (vivo) setAdulta({ voz: m.VOZ_ADULTA, estilos: m.ESTILOS_ADULTOS })
      })
      .catch((erro) => {
        plataforma.relatarErro(erro, 'pele-adulta')
        if (vivo) setAdulta(PELE_KIDS)
      })
    return () => {
      vivo = false
    }
  }, [publico, plataforma])
  return publico === 'adulto' ? adulta : PELE_KIDS
}

export function Jogo({ plataforma }: { plataforma: Plataforma }) {
  const pele = usePele(plataforma)
  return pele ? (
    <VozContexto.Provider value={pele.voz}>
      {pele.estilos ? <style>{pele.estilos}</style> : null}
      <JogoNaPele plataforma={plataforma} />
    </VozContexto.Provider>
  ) : (
    <div className="arq-tela" role="status" aria-busy="true" />
  )
}

function JogoNaPele({ plataforma }: { plataforma: Plataforma }) {
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'carregando' })
  const tentativa = useRef(0)

  const iniciar = useCallback(() => {
    const minha = ++tentativa.current
    setSituacao({ tipo: 'carregando' })
    carregar(plataforma)
      .then((s) => {
        if (minha === tentativa.current) setSituacao(s)
        else if (s.tipo === 'pronto') {
          void s.contexto.gerenteTempo?.encerrar().catch(() => {})
          void s.fila?.parar()
        }
      })
      .catch((e) => {
        plataforma.relatarErro(e, 'carregar')
        if (minha === tentativa.current)
          setSituacao({
            tipo: 'erro',
            mensagem: e instanceof JogoAbertoEmOutraAbaError ? e.message : undefined,
          })
      })
  }, [plataforma])

  useEffect(() => {
    iniciar()
    return () => {
      tentativa.current += 1
    }
  }, [iniciar])

  const aoFalhar = useCallback(
    (e: unknown) => {
      plataforma.relatarErro(e, 'cena')
      setSituacao({ tipo: 'erro' })
    },
    [plataforma],
  )
  const voltar = useMemo(() => () => plataforma.voltarParaPlataforma(), [plataforma])

  switch (situacao.tipo) {
    case 'carregando':
      return <TelaCarregando />
    case 'bloqueado':
      return <TelaBloqueado motivo={situacao.motivo} aoVoltar={voltar} />
    case 'descanso':
      return <TelaDescanso aoVoltar={voltar} />
    case 'erro':
      return <TelaErro aoTentar={iniciar} aoVoltar={voltar} mensagem={situacao.mensagem} />
    case 'pronto':
      return <JogoPronto contexto={situacao.contexto} fila={situacao.fila} aoFalhar={aoFalhar} />
  }
}
