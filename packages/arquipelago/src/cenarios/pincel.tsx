// biome-ignore-all lint/a11y/noStaticElementInteractions: Pincel sobre malhas Three.js; parâmetros e comandos têm controles de teclado no host.
import type { ThreeEvent } from '@react-three/fiber'
import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core'
import type { EstadoDeViewport } from '@sistemazero/molda-cenarios-core/runtime'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

type Carimbo = DocumentoDeCenario['relevo'][number]
export function PincelDeTerreno({
  ativo,
  pincel,
  altura,
  gesto,
  previa,
  salvar,
  children,
}: {
  ativo: boolean
  pincel: EstadoDeViewport['pincel']
  altura: (x: number, z: number) => number
  gesto: (v: boolean) => void
  previa: (r: Carimbo[]) => void
  salvar: (r: Carimbo[]) => Promise<void>
  children: ReactNode
}) {
  const pintura = useRef<Carimbo[] | null>(null),
    [cursor, setCursor] = useState<{ x: number; z: number } | null>(null),
    callbacks = useRef({ gesto, previa })
  callbacks.current = { gesto, previa }
  const cancelar = useCallback(() => {
    if (!pintura.current) return
    pintura.current = null
    callbacks.current.previa([])
    callbacks.current.gesto(false)
  }, [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pintura.current) {
        e.stopImmediatePropagation()
        cancelar()
      }
    }
    window.addEventListener('keydown', esc, true)
    window.addEventListener('blur', cancelar)
    return () => {
      window.removeEventListener('keydown', esc, true)
      window.removeEventListener('blur', cancelar)
      cancelar()
    }
  }, [cancelar])
  const adicionar = (x: number, z: number) => {
    if (!pintura.current || pintura.current.length >= 400) return
    pintura.current.push({
      id: `pincel-${crypto.randomUUID()}`,
      tipo: pincel.tipo,
      centro: { x, z },
      raio: Math.max(4, pincel.raio),
      valor: pincel.valor,
      intensidade: pincel.intensidade,
    })
  }
  const mover = (e: ThreeEvent<PointerEvent>) => {
    if (!ativo) return
    setCursor({ x: e.point.x, z: e.point.z })
    const lista = pintura.current
    if (!lista) return
    e.stopPropagation()
    const a = lista.at(-1)!.centro,
      dx = e.point.x - a.x,
      dz = e.point.z - a.z,
      d = Math.hypot(dx, dz),
      passo = Math.max(1, pincel.raio / 3)
    if (d < passo) return
    const n = Math.min(64, Math.floor(d / passo))
    for (let i = 1; i <= n; i++) adicionar(a.x + (dx * i) / n, a.z + (dz * i) / n)
    previa([...lista])
  }
  return (
    <group
      onPointerDown={(e) => {
        if (!ativo || e.button !== 0) return
        e.stopPropagation()
        if (e.target instanceof Element) e.target.setPointerCapture(e.pointerId)
        pintura.current = []
        gesto(true)
        adicionar(e.point.x, e.point.z)
        previa([...pintura.current])
      }}
      onPointerMove={mover}
      onPointerUp={(e) => {
        const r = pintura.current
        if (!r) return
        e.stopPropagation()
        pintura.current = null
        if (e.target instanceof Element && e.target.hasPointerCapture(e.pointerId))
          e.target.releasePointerCapture(e.pointerId)
        gesto(false)
        void salvar(r)
          .finally(() => previa([]))
          .catch(() => {})
      }}
      onPointerCancel={cancelar}
      onPointerLeave={() => {
        if (!pintura.current) setCursor(null)
      }}
    >
      {children}
      {ativo && cursor && (
        <mesh
          position={[cursor.x, altura(cursor.x, cursor.z) + 0.08, cursor.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1000}
        >
          <ringGeometry args={[Math.max(4, pincel.raio) - 0.06, Math.max(4, pincel.raio), 64]} />
          <meshBasicMaterial color="#f5c959" transparent opacity={0.85} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}
