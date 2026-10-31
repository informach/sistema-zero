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
  falaDoVento,
  type Segredo,
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

function Bau({ segredo, bau }: { segredo: Segredo; bau: Ponto }) {
  const modelo = useModelo(new URL(modeloDoBau, import.meta.url).href)
  const copia = useMemo(() => modelo.clone(true), [modelo])
  return (
    <group name={`bau-${segredo.id}`} position={[bau.x, bau.y - 0.35, bau.z]} scale={1.6}>
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
