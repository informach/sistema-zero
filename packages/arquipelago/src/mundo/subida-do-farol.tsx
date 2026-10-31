import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import {
  type BordaViva,
  type EixoDeEquilibrio,
  type EscadaViva,
  useEstado,
  useJogo,
} from '../estado/contexto'
import { lojaDoFarol } from '../estado/farol'
import type { Ponto } from '../sistemas/cipo'
import { podeSubirOFarol } from '../sistemas/final-do-farol'
import {
  type DequeDoPercurso,
  PERCURSO_DO_FAROL,
  type PontosDoPercurso,
} from '../sistemas/percurso'
import { CORRENTE_DO_PICO, type CorrenteDeAr } from '../sistemas/planador'
import { VentoQueSobe } from './corrente-de-ar'
import { CORES_DO_VAGALUME, CorridaNaIlha } from './corrida-na-ilha'
import { useInterativo } from './interativos'
import { ALTURA_DA_TERRA, alturaDaIlha, FAROL } from './medidas'
import { ComReserva, MODELOS, useModelo } from './modelos'

/** As paradas da subida (`subida-farol-1` a `-6`, a última é a varanda) e os vagalumes. */
export const PARADAS_DO_FAROL = 6
export const VAGALUMES_DO_FAROL = 5
/** A escada da subida tem a largura da do Bosque. */
const LARGURA_DA_ESCADA = 0.6
/** O raio das paradas: deques estreitos e a varanda em volta da lanterna. */
const RAIO_DA_PARADA = 0.9
/** Os pés a menos disto do chão da ilha, pisando, contam como queda da subida. */
const CHAO_DO_FAROL = 0.3
/** O rótulo da entrada da sala pela varanda, no alto da subida por fora. */
export const ROTULO_DA_VARANDA = 'Entrar na sala do alto'
/** A varanda conta a esta distância no chão e a esta altura dela. */
const RAIO_DA_VARANDA = 2.2
const ALTURA_DA_VARANDA = 1.5

/** Uma âncora do `farol.glb` no mundo (o grupo do Farol fica no pé da torre, sem giro). */
function noMundo(p: Ponto): Ponto {
  return { x: FAROL.x + p.x, y: ALTURA_DA_TERRA + p.y, z: FAROL.z + p.z }
}

/** As peças da subida no mundo, lidas das âncoras do `farol.glb`; `null` se faltar alguma. */
export function subidaDoFarolNoMundo(raiz: Object3D): {
  pontos: PontosDoPercurso
  escadas: EscadaViva[]
  bordas: BordaViva[]
  equilibrios: EixoDeEquilibrio[]
  corrente: CorrenteDeAr | null
} | null {
  const a = (nome: string) => {
    const o = raiz.getObjectByName(nome)
    return o ? noMundo(o.position) : null
  }
  const largada = a('subida-farol-largada')
  const paradas = Array.from({ length: PARADAS_DO_FAROL }, (_, i) => a(`subida-farol-${i + 1}`))
  const vagalumes = Array.from({ length: VAGALUMES_DO_FAROL }, (_, i) =>
    a(`vagalume-farol-${i + 1}`),
  )
  const chegada = paradas.at(-1)
  if (!largada || !chegada || paradas.some((p) => !p) || vagalumes.some((p) => !p)) return null
  const ate = paradas.slice(0, -1) as Ponto[]
  const deques: DequeDoPercurso[] = ate.map((c, i) => {
    const seguinte = (paradas[i + 1] ?? chegada) as Ponto
    return {
      ...c,
      raio: RAIO_DA_PARADA,
      volta: { ...c },
      rumoDaVolta: Math.atan2(seguinte.x - c.x, seguinte.z - c.z),
    }
  })
  const primeiro = ate[0] ?? chegada
  const escadas: EscadaViva[] = []
  const bordas: BordaViva[] = []
  const equilibrios: EixoDeEquilibrio[] = []
  for (let i = 1; ; i++) {
    const base = a(`escada-${i}-base`)
    const topo = a(`escada-${i}-topo`)
    const saida = a(`escada-${i}-saida`)
    if (!base || !topo || !saida) break
    escadas.push({ id: `farol:escada-${i}`, base, topo, saida, largura: LARGURA_DA_ESCADA })
  }
  for (let i = 1; ; i++) {
    const pa = a(`borda-${i}-a`)
    const pb = a(`borda-${i}-b`)
    const fora = a(`borda-${i}-fora`)
    if (!pa || !pb || !fora) break
    bordas.push({ id: `farol:borda-${i}`, a: pa, b: pb, fora })
  }
  for (let i = 1; ; i++) {
    const pa = a(`equilibrio-${i}-a`)
    const pb = a(`equilibrio-${i}-b`)
    if (!pa || !pb) break
    equilibrios.push({ id: `farol:equilibrio-${i}`, a: pa, b: pb })
  }
  const base = a('corrente-de-ar')
  const topo = a('corrente-de-ar-topo')
  const corrente: CorrenteDeAr | null =
    base && topo
      ? {
          id: 'farol:corrente',
          x: base.x,
          z: base.z,
          raio: CORRENTE_DO_PICO.raio,
          base: base.y,
          topo: topo.y,
        }
      : null
  return {
    pontos: {
      largada,
      rumoDaLargada: Math.atan2(primeiro.x - largada.x, primeiro.z - largada.z),
      deques,
      chegada,
      vagalumes: vagalumes as Ponto[],
      centro: { x: FAROL.x, y: ALTURA_DA_TERRA, z: FAROL.z },
      raioDaIlha: 14,
    },
    escadas,
    bordas,
    equilibrios,
    corrente,
  }
}

/**
 * A subida final por fora do Farol (E04, a Lenda): o percurso `farol-subida` e os movimentos dele
 * (a escada, as quinas, o equilíbrio e o vento do planador) registrados para o personagem. Só na
 * Lenda e na sua própria ilha; o desenho e os colisores da subida aparecem junto (`farol.tsx`).
 */
export function SubidaDoFarol() {
  const lenda = useEstado((s) => podeSubirOFarol(s.jornada, s.visita !== null))
  if (!lenda) return null
  return (
    <ComReserva reserva={null}>
      <SubidaCarregada />
    </ComReserva>
  )
}

function SubidaCarregada() {
  const { movimento, loja, rastro } = useJogo()
  const raiz = useModelo(MODELOS.farol)
  const subida = useMemo(() => subidaDoFarolNoMundo(raiz), [raiz])
  useEffect(() => {
    if (!subida) return
    movimento.escadas.push(...subida.escadas)
    movimento.bordas.push(...subida.bordas)
    movimento.equilibrios.push(...subida.equilibrios)
    return () => {
      const tirar = <T,>(lista: T[], item: T) => {
        const i = lista.indexOf(item)
        if (i >= 0) lista.splice(i, 1)
      }
      for (const e of subida.escadas) tirar(movimento.escadas, e)
      for (const b of subida.bordas) tirar(movimento.bordas, b)
      for (const e of subida.equilibrios) tirar(movimento.equilibrios, e)
    }
  }, [movimento, subida])
  // Da varanda, a sala do alto fica a um passo (N4): o mesmo `entrar` da porta de baixo, sem
  // depender de a criança ter deixado aberto o resultado da subida.
  const varanda = subida?.pontos.chegada ?? null
  useInterativo('varanda-do-farol', {
    x: varanda?.x ?? 0,
    z: varanda?.z ?? 0,
    raio: varanda ? RAIO_DA_VARANDA : 0,
    rotulo: () => {
      if (!varanda || loja.getState().visita) return null
      const farol = lojaDoFarol(loja).getState()
      if (farol.etapa !== 'fora' || farol.corte !== null || !farol.entrar) return null
      return Math.abs(rastro.y - varanda.y) < ALTURA_DA_VARANDA ? ROTULO_DA_VARANDA : null
    },
    agir: () => void lojaDoFarol(loja).getState().entrar?.(),
  })
  if (!subida) return null
  return (
    <>
      <VentoQueSobe corrente={subida.corrente} cor="#ffe7a0" />
      <CorridaNaIlha
        ilhaId="farol"
        config={PERCURSO_DO_FAROL}
        pontos={subida.pontos}
        largada={subida.pontos.largada}
        alturaDoChao={alturaDaIlha(FAROL.x, FAROL.z) + CHAO_DO_FAROL}
        cores={CORES_DO_VAGALUME}
      />
    </>
  )
}
