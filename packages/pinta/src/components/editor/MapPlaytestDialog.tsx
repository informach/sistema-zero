import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import {
  moveSceneCharacter,
  sceneObjects,
  sceneSpawn,
} from '@sistemazero/core/studio/pinta-scene-runtime'
import { type JSX, useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type { PintaAsset, TilemapAsset } from '../../core/project'
import { exportPintaScene } from '../../export/scene'
import { drawScene, loadSceneImages } from '../../export/sceneDrawing'
import { objectContains } from '../../tiles/objectGeometry'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

type Prepared = { scene: PintaScene; images: Map<string, HTMLImageElement> }
export function MapPlaytestDialog({
  map,
  assets,
  onClose,
}: {
  map: TilemapAsset
  assets: readonly PintaAsset[]
  onClose: () => void
}): JSX.Element {
  const [prepared, setPrepared] = useState<Prepared | null>(null),
    [position, setPosition] = useState({ x: 0, y: 0 }),
    [error, setError] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null),
    positionRef = useRef(position),
    maps = useRef(new Map<string, Prepared>())
  positionRef.current = position
  useEffect(() => {
    let current = true
    const byId = new Map(assets.map((a) => [a.id, a]))
    byId.set(map.id, map)
    const queue = [map],
      seen = new Set<string>()
    async function prepare(): Promise<void> {
      for (const source of queue) {
        if (seen.has(source.id)) continue
        if (seen.size >= 16) throw new Error(COPY.scene.oTesteAceitaAte16MapasLigados)
        seen.add(source.id)
        const scene = await exportPintaScene(source, (id) => byId.get(id) ?? null),
          images = await loadSceneImages(scene),
          value = { scene, images }
        if (!current) return
        maps.current.set(source.id, value)
        maps.current.set(source.name, value)
        if (source.id === map.id) {
          setPrepared(value)
          setPosition(sceneSpawn(scene))
        }
        for (const o of sceneObjects(scene))
          if (o.role === 'door') {
            const raw = o.properties.destino ?? o.properties.destination,
              key = typeof raw === 'object' ? raw.value : raw
            const target = assets.find((a) => a.id === key || a.name === key)
            if (target?.kind === 'tilemap' && !seen.has(target.id)) queue.push(target)
          }
      }
    }
    void prepare().catch((e) => {
      if (current) setError(e instanceof Error ? e.message : String(e))
    })
    return () => {
      current = false
      maps.current.clear()
    }
  }, [map, assets])
  useEffect(() => {
    if (!prepared) return
    let frame = 0
    const paint = (time: number): void => {
      const ctx = canvas.current?.getContext('2d')
      if (ctx) {
        const p = positionRef.current,
          s = prepared.scene
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, 640, 480)
        ctx.imageSmoothingEnabled = false
        const camera = {
          x: Math.max(0, Math.min(s.cols * s.tileSize - 640, p.x - 320)),
          y: Math.max(0, Math.min(s.rows * s.tileSize - 480, p.y - 240)),
        }
        ctx.translate(-camera.x, -camera.y)
        drawScene(ctx, s, prepared.images, 'back', time, camera)
        ctx.fillStyle = '#4ade80'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, s.tileSize / 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        drawScene(ctx, s, prepared.images, 'front', time, camera)
      }
      frame = requestAnimationFrame(paint)
    }
    frame = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(frame)
  }, [prepared])
  function move(dx: number, dy: number): void {
    if (!prepared) return
    const s = prepared.scene,
      p = moveSceneCharacter(s, positionRef.current, (dx * s.tileSize) / 3, (dy * s.tileSize) / 3)
    for (const o of sceneObjects(s))
      if (o.role === 'door' && objectContains(o, p.x, p.y)) {
        const raw = o.properties.destino ?? o.properties.destination,
          key = typeof raw === 'object' ? raw.value : raw,
          next = typeof key === 'string' ? maps.current.get(key) : null
        if (next) {
          setPrepared(next)
          const spawn = sceneSpawn(next.scene)
          positionRef.current = spawn
          setPosition(spawn)
          return
        }
      }
    positionRef.current = p
    setPosition(p)
  }
  const area = prepared
    ? sceneObjects(prepared.scene).filter(
        (o) =>
          (o.role === 'door' || o.role === 'trigger' || o.role === 'danger') &&
          objectContains(o, position.x, position.y),
      )
    : []
  return (
    <Dialog open title={COPY.scene.testarMeuMapa} onClose={onClose} wide>
      <p className="mb-2 text-sm text-pin-muted">{COPY.scene.useAsSetasOuOsBotoesAs}</p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !prepared ? (
        <p role="status">{COPY.scene.preparandoOMapa}</p>
      ) : (
        <>
          <button
            type="button"
            aria-label={COPY.scene.testeComOPersonagem}
            className="pin-checkerboard block w-full overflow-hidden rounded-xl border-2 border-pin-border"
            onKeyDown={(e) => {
              const d: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              }
              const delta = d[e.key]
              if (delta) {
                e.preventDefault()
                move(...delta)
              }
            }}
          >
            <canvas
              ref={canvas}
              width={640}
              height={480}
              className="block max-h-96 w-full object-contain"
              aria-label={COPY.scene.cenarioComPersonagemFundoEFrente}
            />
          </button>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {(
              [
                [-1, 0, '←'],
                [0, -1, '↑'],
                [0, 1, '↓'],
                [1, 0, '→'],
              ] as const
            ).map(([x, y, label]) => (
              <Button
                key={label}
                variant="barOutline"
                aria-label={COPY.scene.dynamicMover(label)}
                onClick={() => move(x, y)}
              >
                {label}
              </Button>
            ))}
            <Button variant="barOutline" onClick={() => setPosition(sceneSpawn(prepared.scene))}>
              {COPY.scene.recomecar}
            </Button>
          </div>
          <p role="status" className="mt-2 text-sm">
            {prepared.scene.name} ·{' '}
            {area.map((o) => o.name || o.role).join(' · ') ||
              COPY.scene.dynamicPosicao(Math.round(position.x), Math.round(position.y))}
          </p>
        </>
      )}
    </Dialog>
  )
}
