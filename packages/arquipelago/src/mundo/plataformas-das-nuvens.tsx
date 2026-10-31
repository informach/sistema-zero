import { useFrame } from '@react-three/fiber'
import {
  type RapierRigidBody,
  RigidBody,
  RoundCylinderCollider,
  useBeforePhysicsStep,
} from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, type Object3D, Vector3 } from 'three'
import { useJogo } from '../estado/contexto'
import { jogoPausado } from '../sistemas/pausa'
import { avancarPlataformas, elevacaoDaPlataforma } from '../sistemas/plataformas-das-nuvens'
import { bordaQueCabe, type ColisorDaIlha } from './colisores-da-ilha'
import { gruposDoColisor } from './grupos'
import type { Troca } from './ilha-completa'
import { PASSO_DA_FISICA } from './medidas'

type Cilindro = Extract<ColisorDaIlha, { forma: 'cilindro' }>
export interface PlataformaDasNuvens {
  indice: number
  desenho: Object3D
  topo: Object3D
  yDesenho: number
  yTopo: number
  colisor: Cilindro
  /**
   * Quanto o tampo está acima da posição de baixo agora (escrito a cada passo da física): a volta
   * de uma queda nos saltos entre nuvens (fase4-07) vai para onde ele está.
   */
  elevacao: number
}

/** Antes da troca: recusa arte incompleta em vez de deixar um piso imóvel invisível. */
export function prepararPlataformasDasNuvens(
  modelo: Object3D,
  colisores: ColisorDaIlha[],
): PlataformaDasNuvens[] {
  return Array.from({ length: 4 }, (_, indice) => {
    const numero = indice + 1
    const desenho = modelo.getObjectByName(`plataforma-${numero}`)
    const topo = modelo.getObjectByName(`topo-plataforma-${numero}`)
    const colisor = colisores.find((c) => c.nome === `col-cil-plataforma-${numero}`)
    if (!desenho || !topo || colisor?.forma !== 'cilindro')
      throw new Error(`Plataforma ${numero} incompleta`)
    return {
      indice,
      desenho,
      topo,
      yDesenho: desenho.position.y,
      yTopo: topo.position.y,
      colisor,
      elevacao: 0,
    }
  })
}

/** Colisor e desenho leem o mesmo corpo cinemático, inclusive na interpolação a 30/144 Hz. */
export function PlataformasDasNuvens({
  plataformas,
  modelo,
  troca,
}: {
  plataformas: PlataformaDasNuvens[]
  modelo: Object3D
  troca: Troca
}) {
  const { loja } = useJogo()
  const tempo = useRef(0)
  const centro = useMemo(() => new Vector3(), [])
  const pecas = useMemo(
    () =>
      plataformas.map((p) => ({
        ...p,
        corpo: null as RapierRigidBody | null,
        visual: null as Group | null,
        alvo: new Vector3(),
        interpolado: new Vector3(),
      })),
    [plataformas],
  )
  useBeforePhysicsStep(() => {
    tempo.current = avancarPlataformas(
      tempo.current,
      PASSO_DA_FISICA,
      jogoPausado(loja.getState()) || troca.opacidade < 0.99,
    )
    modelo.getWorldPosition(centro)
    for (const [i, p] of pecas.entries()) {
      if (!p.corpo) continue
      const c = p.colisor
      const elevacao = elevacaoDaPlataforma(p.indice, tempo.current)
      const original = plataformas[i]
      if (original) original.elevacao = elevacao
      p.alvo.set(
        centro.x + c.posicao[0],
        centro.y + c.posicao[1] + elevacao,
        centro.z + c.posicao[2],
      )
      p.corpo.setNextKinematicTranslation(p.alvo)
    }
  })
  useFrame(() => {
    modelo.getWorldPosition(centro)
    for (const p of pecas) {
      if (!p.visual) continue
      p.visual.getWorldPosition(p.interpolado)
      const dy = p.interpolado.y - centro.y - p.colisor.posicao[1]
      p.desenho.position.y = p.yDesenho + dy
      p.topo.position.y = p.yTopo + dy
    }
  }, -0.5)
  useEffect(
    () => () => {
      for (const p of pecas) {
        p.desenho.position.y = p.yDesenho
        p.topo.position.y = p.yTopo
      }
    },
    [pecas],
  )
  return (
    <>
      {pecas.map((p) => {
        const c = p.colisor
        const b = bordaQueCabe(c.raio, c.meiaAltura)
        return (
          <RigidBody
            key={c.nome}
            ref={(r) => {
              p.corpo = r
            }}
            type="kinematicPosition"
            colliders={false}
            userData={{ plataformaDoMundo: true, nuvem: p.indice + 1 }}
            position={[
              c.posicao[0],
              c.posicao[1] + elevacaoDaPlataforma(p.indice, 0),
              c.posicao[2],
            ]}
            quaternion={c.rotacao}
          >
            <RoundCylinderCollider
              args={[c.meiaAltura - b, c.raio - b, b]}
              {...gruposDoColisor(false)}
            />
            <group
              ref={(r) => {
                p.visual = r
              }}
            />
          </RigidBody>
        )
      })}
    </>
  )
}
