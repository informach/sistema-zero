import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { AVATAR_CATALOG, drawAvatar } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import { useEffect } from 'react'
import { criarControle, ligarTeclado } from '../controles/controle'
import { ligarGamepad } from '../controles/gamepad'
import { Contexto, type ContextoDoJogo, criarMovimento } from '../estado/contexto'
import { criarLoja } from '../estado/loja'
import { criarRegistro } from '../mundo/interativos'
import { criarPlataformaFalsa } from '../plataforma/falsa'
import { CORPO } from '../sistemas/corpo'
import { ARQUIPELAGO } from '../sistemas/geografia-do-arquipelago'
import { estadoHerdado } from './apoio'

export function criarContextoDoEnsaio(altura: (x: number, z: number) => number): ContextoDoJogo {
  const partida = { x: 0, y: altura(0, 149) + CORPO.doCentroAoPe + 0.12, z: 149 }
  const loja = criarLoja({
    salvamento: { ...criarSalvamentoInicial(new Date()), posicao: partida },
    jornada: 1,
    quarto: { theme: 'padrao', placedItems: [], pet: null },
    avatar: { slots: drawAvatar(AVATAR_CATALOG, 'plataforma-falsa') },
    acesso: { liberado: true, motivo: null, limiteDiarioMinutos: null, usadoHojeSegundos: 0 },
    aoMudar: () => {},
  })
  loja.setState({ dentroDeCasa: false })
  return {
    loja,
    gerenteTempo: null,
    plataforma: criarPlataformaFalsa({ persistir: false }),
    controle: criarControle(),
    interativos: criarRegistro(),
    rastro: {
      ...partida,
      giro: 0,
      inclinacao: 0.3,
      direcao: Math.PI,
      velocidade: 0,
      zappy: { x: 0, y: 0, z: 0 },
    },
    ambiente: { luz: 1, noite: false },
    pedidos: { teleporte: null, chaoChegando: new Set(), olharPara: null, conversa: null },
    movimento: criarMovimento(),
  }
}
export function ContextoDoCenario({
  contexto,
  doc,
  ativo,
  children,
}: {
  contexto: ContextoDoJogo
  doc: DocumentoDeCenario
  ativo: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    contexto.ambiente.noite = doc.iluminacao.noite
    contexto.movimento.aguas = doc.aguas
      .filter((a) => !estadoHerdado(doc, a).oculto)
      .map((a) => ({
        id: a.id,
        x: a.centro.x,
        z: a.centro.z,
        raioX: Math.max(...a.contorno.map((p) => Math.abs(p.x))) * a.escala,
        raioZ: Math.max(...a.contorno.map((p) => Math.abs(p.z))) * a.escala,
        giro: a.giro,
        y: a.nivel,
        contorno: a.contorno.map((p) => ({ x: p.x * a.escala, z: p.z * a.escala })),
      }))
    contexto.movimento.rodasDeNado = ARQUIPELAGO.map((i) => ({ ...i.centro, livre: i.raio + 12 }))
  }, [contexto, doc])
  useEffect(() => {
    if (!ativo) return
    const a = ligarTeclado(contexto.controle),
      b = ligarGamepad(contexto.controle, () =>
        contexto.loja.getState().abrirMenu(!contexto.loja.getState().menuAberto),
      )
    return () => {
      a()
      b()
      Object.assign(contexto.controle, criarControle())
    }
  }, [contexto, ativo])
  return <Contexto.Provider value={contexto}>{children}</Contexto.Provider>
}
