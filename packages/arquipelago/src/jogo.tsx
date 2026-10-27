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
import { Contexto, type ContextoDoJogo } from './estado/contexto'
import { criarLoja } from './estado/loja'
import { Relogios } from './estado/relogios'
import { Hud } from './interface/hud'
import { TelaBloqueado, TelaCarregando, TelaDescanso, TelaErro } from './interface/telas'
import { Cena } from './mundo/cena'
import { criarRegistro } from './mundo/interativos'
import { criarFilaDeTempo } from './sistemas/fila-tempo'
import { criarFilaDeSalvamento, type FilaDeSalvamento } from './sistemas/salvar'

type Situacao =
  | { tipo: 'carregando' }
  | { tipo: 'bloqueado'; motivo: NonNullable<Acesso['motivo']> }
  | { tipo: 'descanso' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; contexto: ContextoDoJogo; fila: FilaDeSalvamento }

const QUARTO_VAZIO = { theme: 'padrao', placedItems: [], pet: null }

async function carregar(plataforma: Plataforma): Promise<Situacao> {
  const acessoResp = await plataforma.servico.buscar('/acesso')
  if (acessoResp.status !== 200) throw new Error(`acesso ${acessoResp.status}`)
  const acesso = AcessoSchema.parse(acessoResp.corpo)
  if (!acesso.liberado) return { tipo: 'bloqueado', motivo: acesso.motivo ?? 'desligado' }
  if (
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
  fila = criarFilaDeSalvamento({
    servico: plataforma.servico,
    revisaoInicial: guardado.revisao,
    aoAdotar: (g) => {
      loja.getState().adotar(g)
      loja.getState().dizer('O seu jogo foi atualizado com o que você fez em outro aparelho.')
    },
    aoErro: (e) => plataforma.relatarErro(e, 'salvamento'),
  })
  const filaTempo =
    plataforma.publico === 'kids'
      ? await criarFilaDeTempo({
          perfil: plataforma.perfil.id,
          servico: plataforma.servico,
          aoConfirmar: (tempo) =>
            loja.getState().registrarTempo(tempo.usadoHojeSegundos, tempo.acabou),
          aoErro: (erro) => {
            plataforma.relatarErro(erro, 'tempo-livre')
            loja.getState().definirTempoPausado(true)
          },
        }).catch((erro) => {
          fila?.parar()
          throw erro
        })
      : null
  // Um jogo novo só entra na fila depois que a recuperação do tempo termina.
  if (guardado.revisao === 0) fila.guardar(salvamento)
  const contexto: ContextoDoJogo = {
    loja,
    filaTempo,
    plataforma,
    controle: criarControle(),
    interativos: criarRegistro(),
    rastro: { x: 0, y: 0, z: 0, giro: 0, inclinacao: 0.5 },
    ambiente: { luz: 1, noite: false },
    pedidos: { teleporte: null },
  }
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
            void contexto.filaTempo
              ?.guardarEEnviar()
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
  fila: FilaDeSalvamento
  aoFalhar: (e: unknown) => void
}) {
  const tempoAcabou = useStore(contexto.loja, (s) => s.tempoAcabou)
  const tempoPausado = useStore(contexto.loja, (s) => s.tempoPausado)
  useEffect(() => ligarTeclado(contexto.controle), [contexto])
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void fila.salvarAgora()
    }
    document.addEventListener('visibilitychange', aoEsconder)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      void fila.salvarAgora().finally(() => fila.parar())
    }
  }, [fila])
  // A primeira fala do Zappy.
  useEffect(() => {
    const s = contexto.loja.getState()
    if (!s.salvamento.casa.portaNova) {
      s.dizer(
        `Oi, ${contexto.plataforma.perfil.primeiroNome}. Só o seu quarto ainda tem cor. Vamos abrir a porta nova e acender o resto?`,
      )
    }
  }, [contexto])

  return (
    <Contexto.Provider value={contexto}>
      <Barreira aoFalhar={aoFalhar}>
        <Cena aoFalhar={aoFalhar} />
      </Barreira>
      <Relogios />
      <Hud />
      {tempoPausado && !tempoAcabou ? <TelaTempoPausado contexto={contexto} /> : null}
      {tempoAcabou ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <TelaDescanso aoVoltar={() => contexto.plataforma.voltarParaPlataforma()} />
        </div>
      ) : null}
    </Contexto.Provider>
  )
}

export function Jogo({ plataforma }: { plataforma: Plataforma }) {
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'carregando' })
  const tentativa = useRef(0)

  const iniciar = useCallback(() => {
    const minha = ++tentativa.current
    setSituacao({ tipo: 'carregando' })
    carregar(plataforma)
      .then((s) => {
        if (minha === tentativa.current) setSituacao(s)
        else if (s.tipo === 'pronto') {
          void s.contexto.filaTempo?.encerrar().catch(() => {})
          s.fila.parar()
        }
      })
      .catch((e) => {
        plataforma.relatarErro(e, 'carregar')
        if (minha === tentativa.current) setSituacao({ tipo: 'erro' })
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
      return <TelaErro aoTentar={iniciar} aoVoltar={voltar} />
    case 'pronto':
      return <JogoPronto contexto={situacao.contexto} fila={situacao.fila} aoFalhar={aoFalhar} />
  }
}
