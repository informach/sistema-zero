import { useFrame } from '@react-three/fiber'
import type { IlhaComCabana } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import type { Object3D } from 'three'
import { lojaDaConstrucao, PAINEL_DE_CONSTRUIR, useConstrucao } from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'
import { type Lote, loteDaCabana, naArea, type Retangulo } from '../sistemas/construcao/lote'
import { ModoConstruir, type ReferencialDaObra } from './construir'
import { noModelo } from './medidas'
import { ObraNoMundo } from './obra'

/** O piso da cabana fica 2 cm acima do tampo (como o da casa, para não piscar contra o chão). */
const ACIMA_DO_TAMPO = 0.02
/** A quantos metros do lote o Construir já abre a cabana (e não a casa). */
export const PERTO_DO_LOTE = 3
/** De quanto em quanto tempo (s) o jogo confere se a pessoa está no lote. */
const CONFERIR_O_LOTE = 0.25

/** O lote da cabana lido das âncoras `lote-cabana-a` e `-b` do modelo (ou `null` sem elas). */
export function loteDoModelo(modelo: Object3D, ilha: IlhaComCabana = 'bosque'): Lote | null {
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

type PropsDaCabana = {
  modelo: Object3D
  meio: { x: number; y: number; z: number }
  giro: number
}

/** A cabana do Bosque (28/10/2026). */
export function CabanaDoBosque(props: PropsDaCabana) {
  return <CabanaDaIlha ilha="bosque" {...props} />
}

/**
 * A cabana que a criança constrói numa ilha (montada pela ilha ativa): registra o lote no
 * Construir, diz se a pessoa está perto dele (aí o Construir abre a cabana) e desenha a obra de
 * `construcao.cabanas[ilha]` girada com a ilha. O Bosque e o iglu do Pico (E04); sem as âncoras
 * do lote no modelo, nada aparece.
 */
export function CabanaDaIlha({
  ilha,
  modelo,
  meio,
  giro,
}: PropsDaCabana & { ilha: IlhaComCabana }) {
  const { loja, rastro } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const lote = useMemo(() => loteDoModelo(modelo, ilha), [modelo, ilha])
  const obra = useEstado((s) => s.salvamento.construcao.cabanas[ilha] ?? null)
  const construindo = useEstado((s) => s.painelAberto === PAINEL_DE_CONSTRUIR)
  const aqui = useConstrucao(construcao, (s) => s.onde === ilha)
  const altura = useMemo(() => alturaDoLote(modelo), [modelo])
  const base = useMemo<[number, number, number]>(
    () => [meio.x, meio.y + altura + ACIMA_DO_TAMPO, meio.z],
    [meio, altura],
  )
  const referencial = useMemo<ReferencialDaObra>(
    () => ({ x: meio.x, z: meio.z, giro }),
    [meio, giro],
  )

  useEffect(() => {
    if (!lote) return
    construcao.getState().registrarCabana({ lote, perto: false })
    return () => {
      const s = construcao.getState()
      if (s.cabana?.lote === lote) s.registrarCabana(null)
      // A ilha saiu com o Construir da cabana aberto: ele fecha.
      if (s.onde === ilha && loja.getState().painelAberto === PAINEL_DE_CONSTRUIR) s.fechar()
    }
  }, [lote, construcao, loja, ilha])

  const espera = useRef(0)
  useFrame((_, dt) => {
    if (!lote) return
    espera.current -= dt
    if (espera.current > 0) return
    espera.current = CONFERIR_O_LOTE
    const p = noModelo(rastro.x - meio.x, rastro.z - meio.z, giro)
    construcao.getState().definirPertoDaCabana(pertoDoLote(lote, p))
  })

  if (!lote || !obra) return null
  const construindoAqui = construindo && aqui
  return (
    <>
      <ObraNoMundo obra={obra} lote={lote} base={base} giro={giro} construindo={construindoAqui} />
      {construindoAqui ? (
        <ModoConstruir lote={lote} obra={obra} base={base[1]} referencial={referencial} />
      ) : null}
    </>
  )
}
