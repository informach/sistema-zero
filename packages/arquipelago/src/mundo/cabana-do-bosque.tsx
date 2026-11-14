import type { Obra } from '@sistemazero/arquipelago-contracts'
import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { Suspense } from 'react'
import type { Object3D } from 'three'
import type { FonteDaObra } from '../estado/construcao'
import { useJogo } from '../estado/contexto'
import { casaMoradaStore } from '../estado/morada'
import {
  type IdDoLote,
  type Lote,
  loteDaCabana,
  naArea,
  type Retangulo,
} from '../sistemas/construcao/lote'
import { useInterativo } from './interativos'
export const PERTO_DO_LOTE = 3
export function loteDoModelo(
  modelo: Object3D,
  ilha: Exclude<IdDoLote, 'casa'> = 'bosque',
): Lote | null {
  const a = modelo.getObjectByName('lote-cabana-a')?.position
  const b = modelo.getObjectByName('lote-cabana-b')?.position
  if (!a || !b) return null
  const area: Retangulo = {
    x0: Math.round(Math.min(a.x, b.x)),
    z0: Math.round(Math.min(a.z, b.z)),
    x1: Math.round(Math.max(a.x, b.x)),
    z1: Math.round(Math.max(a.z, b.z)),
  }
  return loteDaCabana(ilha, area)
}

/** A altura do chão do lote no modelo (a da âncora; a do Bosque é o tampo, 1 m). */
export function alturaDoLote(modelo: Object3D): number {
  return modelo.getObjectByName('lote-cabana-a')?.position.y ?? 1
}

/** A pessoa (no referencial do modelo) está no lote ou a `PERTO_DO_LOTE` dele. */
export function pertoDoLote(lote: Lote, p: { x: number; z: number }): boolean {
  const { x0, z0, x1, z1 } = lote.area
  const perto = {
    x0: x0 - PERTO_DO_LOTE,
    z0: z0 - PERTO_DO_LOTE,
    x1: x1 + PERTO_DO_LOTE,
    z1: z1 + PERTO_DO_LOTE,
  }
  return naArea(perto, { x: Math.floor(p.x), z: Math.floor(p.z) })
}

type PropsDaCabana = { modelo: Object3D; meio: { x: number; y: number; z: number }; giro: number }
export function CabanaDoBosque(props: PropsDaCabana) {
  return <CabanaDaIlha ilha="bosque" {...props} />
}
/** Os abrigos antigos levam ao mesmo lote Morada. Não criam outra cópia da casa. */
export function CabanaDaIlha({
  ilha,
  modelo,
  meio,
  giro,
}: PropsDaCabana & {
  ilha: Exclude<IdDoLote, 'casa'>
  fonte?: FonteDaObra
  obraDeFora?: Obra | null
}) {
  const { loja, plataforma } = useJogo()
  const lote = loteDoModelo(modelo, ilha)
  const local = lote
    ? { x: (lote.area.x0 + lote.area.x1) / 2, z: (lote.area.z0 + lote.area.z1) / 2 }
    : { x: 0, z: 0 }
  const x = meio.x + local.x * Math.cos(giro) + local.z * Math.sin(giro)
  const z = meio.z - local.x * Math.sin(giro) + local.z * Math.cos(giro)
  useInterativo(`abrigo-morada-${ilha}`, {
    x,
    z,
    raio: lote ? 3 : 0,
    rotulo: () => (lote ? 'Entrar na sua casa' : null),
    agir: () => void casaMoradaStore(loja, plataforma).getState().enter(),
  })
  if (!lote) return null
  return (
    <Suspense fallback={null}>
      <MoradaPieceView
        instance={{
          id: `portal-${ilha}`,
          pieceId: 'construcao/arco_2m',
          position: [x - 1, meio.y + alturaDoLote(modelo), z],
          rotation: giro,
        }}
      />
    </Suspense>
  )
}
