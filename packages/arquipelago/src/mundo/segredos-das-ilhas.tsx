import { useMemo } from 'react'
import modeloDoBau from '../assets/itens/bau.glb'
import { useEstado, useJogo } from '../estado/contexto'
import type { EstadoDoJogo } from '../estado/loja'
import type { Ponto } from '../sistemas/cipo'
import { CORPO } from '../sistemas/corpo'
import { jogoPausado } from '../sistemas/pausa'
import { temPlanador } from '../sistemas/planador'
import {
  ALCANCE_DO_BAU,
  abrirSegredo,
  falaDoSegredo,
  falaDoSegredoDoMovimento,
  falaDoVento,
  type Segredo,
  type SegredoDoMovimento,
  type SegredoQualquer,
  segredoAchado,
  TEXTOS_DOS_SEGREDOS,
  VENTO_DO_SEGREDO,
} from '../sistemas/segredos'
import { VentoQueSobe } from './corrente-de-ar'
import { useInterativo } from './interativos'
import { peDoSegredo, ventoDoSegredo } from './lugares-dos-segredos'
import { ComReserva, useModelo } from './modelos'

function podeMexer(s: EstadoDoJogo): boolean {
  return !s.acesso.somenteLeitura && !s.visita && !jogoPausado(s)
}

function Bau({
  segredo,
  bau,
  escala = 1.6,
  acima = -0.35,
  giro = 0,
}: {
  segredo: SegredoQualquer
  bau: Ponto
  escala?: number
  /** Do ponto do baú à base do modelo (no alto do vento, o meio dele). */
  acima?: number
  giro?: number
}) {
  const modelo = useModelo(new URL(modeloDoBau, import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  return (
    <group
      name={`bau-${segredo.id}`}
      position={[bau.x, bau.y + acima, bau.z]}
      rotation-y={giro}
      scale={escala}
    >
      <primitive object={copia} dispose={null} />
    </group>
  )
}

/**
 * Um segredo (N12): o vento dourado que sobe, o baú da Íris no alto e as duas conversas, a do pé
 * do vento (como subir) e a do alto (abrir o baú). Achado, o vento e o baú somem.
 */
export function SegredoNoAlto({
  segredo,
  meio,
  giro = 0,
}: {
  segredo: Segredo
  meio?: Ponto
  giro?: number
}) {
  const { loja, rastro } = useJogo()
  const achado = useEstado((s) => segredoAchado(s.salvamento.segredos, segredo))
  const { corrente, bau } = useMemo(
    () => ventoDoSegredo(segredo, peDoSegredo(segredo, meio, giro)),
    [segredo, meio, giro],
  )
  const noAlto = () =>
    Math.hypot(rastro.x - bau.x, rastro.y - bau.y, rastro.z - bau.z) <= ALCANCE_DO_BAU
  const noPe = () =>
    Math.hypot(rastro.x - corrente.x, rastro.z - corrente.z) <= corrente.raio + 1.2 &&
    rastro.y - CORPO.doCentroAoPe < corrente.base + 1
  useInterativo(`segredo:${segredo.id}`, {
    x: corrente.x,
    z: corrente.z,
    raio: corrente.raio + VENTO_DO_SEGREDO.bauAoLado + 1,
    noAr: true,
    rotulo() {
      const s = loja.getState()
      if (!podeMexer(s) || segredoAchado(s.salvamento.segredos, segredo)) return null
      if (noAlto()) return TEXTOS_DOS_SEGREDOS.abrir
      if (noPe()) return TEXTOS_DOS_SEGREDOS.olhar
      return null
    },
    agir() {
      const s = loja.getState()
      if (!podeMexer(s) || segredoAchado(s.salvamento.segredos, segredo)) return
      if (noAlto()) {
        s.mudar((v) => abrirSegredo(v, segredo))
        if (segredoAchado(loja.getState().salvamento.segredos, segredo))
          s.dizer(falaDoSegredo(segredo))
        return
      }
      if (noPe()) s.dizer(falaDoVento(temPlanador(s.salvamento)))
    },
  })
  if (achado) return null
  return (
    <>
      <VentoQueSobe corrente={corrente} cor="#ffd86b" />
      <ComReserva reserva={null}>
        <Bau segredo={segredo} bau={bau} />
      </ComReserva>
    </>
  )
}

/** Do pé ao baú no chão, para abrir (o corpo de pé ao lado dele, nadando ou no balão). */
export const ALCANCE_DO_BAU_NO_CHAO = 2.4

/**
 * O baú de um segredo dos movimentos (B11): no chão do lugar que só aquele movimento alcança (a
 * âncora `segredo-<movimento>`, já no mundo). Abre de perto, medindo também a altura, porque o
 * lugar fica acima (o deque do cipó, a nuvem do balão) ou abaixo (a gruta) de onde se passa por
 * baixo ou por cima. Na gruta abre nadando (`submerso`). Achado, o baú some.
 */
export function BauDoSegredo({
  segredo,
  lugar,
  giro = 0,
  submerso = false,
}: {
  segredo: SegredoDoMovimento
  lugar: Ponto
  giro?: number
  submerso?: boolean
}) {
  const { loja, rastro } = useJogo()
  const achado = useEstado((s) => segredoAchado(s.salvamento.segredos, segredo))
  const perto = () =>
    Math.hypot(rastro.x - lugar.x, rastro.y - CORPO.doCentroAoPe - lugar.y, rastro.z - lugar.z) <=
    ALCANCE_DO_BAU_NO_CHAO
  useInterativo(`segredo:${segredo.id}`, {
    x: lugar.x,
    z: lugar.z,
    raio: ALCANCE_DO_BAU_NO_CHAO,
    submerso,
    rotulo() {
      const s = loja.getState()
      if (!podeMexer(s) || segredoAchado(s.salvamento.segredos, segredo) || !perto()) return null
      return TEXTOS_DOS_SEGREDOS.abrir
    },
    agir() {
      const s = loja.getState()
      if (!podeMexer(s) || segredoAchado(s.salvamento.segredos, segredo) || !perto()) return
      s.mudar((v) => abrirSegredo(v, segredo))
      if (segredoAchado(loja.getState().salvamento.segredos, segredo))
        s.dizer(falaDoSegredoDoMovimento(segredo))
    },
  })
  if (achado) return null
  return (
    <ComReserva reserva={null}>
      <Bau segredo={segredo} bau={lugar} escala={1.2} acima={0} giro={giro} />
    </ComReserva>
  )
}
