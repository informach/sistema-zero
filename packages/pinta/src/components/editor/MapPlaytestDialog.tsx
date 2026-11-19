/**
 * "Testar com personagem": a criança anda pelo próprio mapa. A conta de andar, bater, cair,
 * pular, portas e perigos mora em `mapTools/playtest.ts`; esta janela escuta as teclas e os
 * botões, roda o relógio (um passo por quadro da tela, pelo tempo que passou) e DESENHA.
 */
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import {
  sceneIntersectsBox,
  sceneMoveBox,
  scenePlatformLanding,
} from '@sistemazero/core/studio/pinta-scene-geometry'
import {
  sceneObjects,
  sceneSolidAt,
  sceneSpawn,
} from '@sistemazero/core/studio/pinta-scene-runtime'
import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type { PintaAsset, TilemapAsset } from '../../core/project'
import { exportPintaScene } from '../../export/scene'
import { drawScene, loadSceneImages } from '../../export/sceneDrawing'
import { objectContains } from '../../tiles/objectGeometry'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { artworkImage } from './MapObjectArtwork'
import { MAP_EDITOR_LIMITS } from './mapTools/mapEditorLimits'
import {
  type PlaytestArea,
  type PlaytestState,
  type PlaytestView,
  type PlaytestWorld,
  playtestBody,
  playtestCamera,
  playtestInput,
  playtestKey,
  playtestStart,
  stepPlaytest,
} from './mapTools/playtest'

type Prepared = { scene: PintaScene; images: Map<string, HTMLImageElement> }
/** A tela do teste, em pixels (o canvas estica por CSS). */
const SCREEN = { width: 640, height: 480 }
/** Quanto tempo o recado do lugar perigoso fica na tela. */
const MESSAGE_MS = 2500
const FIELD = 'min-h-11 rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm'

/** O destino de uma porta: a propriedade "destino" (texto, ou um valor com tipo). */
function doorTarget(properties: Record<string, unknown>): string | undefined {
  const raw = properties.destino ?? properties.destination
  const key = raw && typeof raw === 'object' ? (raw as { value?: unknown }).value : raw
  return typeof key === 'string' ? key : undefined
}

/** O mundo do teste a partir da cena exportada: paredes, começo, portas e perigos. */
export function playtestWorldFromScene(scene: PintaScene): PlaytestWorld {
  const objects = sceneObjects(scene)
  const area = (o: (typeof objects)[number]): PlaytestArea => ({
    id: o.id,
    name: o.name || o.type || '',
    contains: (x, y) => objectContains(o, x, y),
    target: doorTarget(o.properties),
  })
  return {
    tileSize: scene.tileSize,
    solidAt: (x, y) => sceneSolidAt(scene, x, y),
    intersectsSolid: (box) => sceneIntersectsBox(scene, box),
    moveSolid: (body, dx, dy) => sceneMoveBox(scene, body, dx, dy),
    platformLanding: (previous, desired) => scenePlatformLanding(scene, previous, desired),
    spawn: sceneSpawn(scene),
    doors: objects.filter((o) => o.role === 'door').map(area),
    hazards: objects.filter((o) => o.role === 'danger').map(area),
  }
}

/** O boneco simples do Pinta, para quando a galeria não tem personagem. */
function drawBuiltInFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  footY: number,
  height: number,
  facing: number,
  bob: number,
): void {
  const head = height * 0.32,
    bodyW = height * 0.5,
    bodyH = height - head * 1.6
  ctx.save()
  ctx.translate(x, footY - bob)
  ctx.lineWidth = Math.max(1, height / 12)
  ctx.strokeStyle = '#1f2937'
  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  ctx.rect(-bodyW / 2, -bodyH, bodyW, bodyH)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(0, -bodyH - head * 0.8, head * 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // O olho mostra para que lado ele olha.
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.arc(facing * head * 0.35, -bodyH - head * 0.9, Math.max(1, head * 0.14), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const prefersReducedMotion = (): boolean => {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  } catch {
    return false
  }
}

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
    [error, setError] = useState(''),
    [view, setView] = useState<PlaytestView>('top'),
    [characterId, setCharacterId] = useState(''),
    [message, setMessage] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null),
    gameArea = useRef<HTMLButtonElement>(null),
    maps = useRef(new Map<string, Prepared>()),
    held = useRef(new Set<string>()),
    player = useRef<PlaytestState | null>(null),
    sprite = useRef<{ image: HTMLImageElement; frameW: number; frameH: number } | null>(null)

  const characters = useMemo(
    () => assets.filter((a) => a.kind === 'pixel-sprite' || a.kind === 'vector-sprite'),
    [assets],
  )
  const world = useMemo(
    () => (prepared ? playtestWorldFromScene(prepared.scene) : null),
    [prepared],
  )

  // Prepara este mapa e os mapas ligados a ele por portas.
  useEffect(() => {
    let current = true
    const byId = new Map(assets.map((a) => [a.id, a]))
    byId.set(map.id, map)
    const queue = [map],
      seen = new Set<string>()
    async function prepare(): Promise<void> {
      for (const source of queue) {
        if (seen.has(source.id)) continue
        if (seen.size >= MAP_EDITOR_LIMITS.maxPlaytestMaps)
          throw new Error(COPY.scene.oTesteAceitaAte16MapasLigados)
        seen.add(source.id)
        const scene = await exportPintaScene(source, (id) => byId.get(id) ?? null),
          images = await loadSceneImages(scene),
          value = { scene, images }
        if (!current) return
        maps.current.set(source.id, value)
        maps.current.set(source.name, value)
        if (source.id === map.id) setPrepared(value)
        for (const o of sceneObjects(scene))
          if (o.role === 'door') {
            const key = doorTarget(o.properties)
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

  // Mapa novo (ou outro jeito de ver): o personagem volta para o começo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: trocar a vista também recomeça
  useEffect(() => {
    player.current = world ? playtestStart(world) : null
  }, [world, view])

  // O desenho do personagem escolhido (a folha dele, uma vez).
  useEffect(() => {
    sprite.current = null
    const asset = characters.find((a) => a.id === characterId)
    if (!asset || !('frameWidth' in asset)) return
    let current = true
    const byId = new Map(assets.map((a) => [a.id, a]))
    void artworkImage(asset, (id) => byId.get(id) ?? null).then((result) => {
      if (!current || !result) return
      const image = new Image()
      image.onload = () => {
        if (current) sprite.current = { image, frameW: asset.frameWidth, frameH: asset.frameHeight }
      }
      image.src = result.dataUrl
    })
    return () => {
      current = false
    }
  }, [characterId, characters, assets])

  // O recado some sozinho depois de um instante.
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [message])

  // O relógio do jogo: um passo por quadro da tela, pelo tempo que passou de verdade.
  useEffect(() => {
    if (!prepared || !world) return
    const scene = prepared.scene
    const still = prefersReducedMotion()
    let frame = 0,
      last = 0
    const tick = (time: number): void => {
      const state = player.current
      if (state) {
        const out = stepPlaytest(
          state,
          playtestInput(held.current, view),
          last ? time - last : 0,
          world,
          view,
        )
        player.current = out.state
        if (out.event?.kind === 'hazard') setMessage(COPY.scene.lugarPerigoso)
        if (out.event?.kind === 'door') {
          const next = out.event.area.target ? maps.current.get(out.event.area.target) : null
          if (next && next !== prepared) {
            held.current.clear()
            setPrepared(next)
          }
        }
      }
      last = time
      const ctx = canvas.current?.getContext('2d')
      const p = player.current
      if (ctx && p) {
        const { hh } = playtestBody(scene.tileSize, view)
        const camera = playtestCamera(p, SCREEN, {
          width: scene.cols * scene.tileSize,
          height: scene.rows * scene.tileSize,
        })
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, SCREEN.width, SCREEN.height)
        ctx.imageSmoothingEnabled = false
        ctx.translate(-camera.x, -camera.y)
        drawScene(ctx, scene, prepared.images, 'back', time, camera)
        const footY = p.y + hh
        const chosen = sprite.current
        if (chosen) {
          // Do tamanho do desenho, mas nunca maior que duas peças de altura.
          const scale = Math.min(1, (scene.tileSize * 2) / chosen.frameH)
          const w = chosen.frameW * scale,
            h = chosen.frameH * scale
          ctx.save()
          ctx.translate(p.x, footY)
          ctx.scale(p.facing, 1)
          ctx.drawImage(chosen.image, 0, 0, chosen.frameW, chosen.frameH, -w / 2, -h, w, h)
          ctx.restore()
        } else {
          // O balanço ao andar é enfeite: quem pediu menos movimento vê o boneco parado.
          const walking = !still && (p.vx !== 0 || (view === 'top' && p.vy !== 0))
          const bob = walking ? Math.abs(Math.sin(time / 90)) * scene.tileSize * 0.08 : 0
          drawBuiltInFigure(ctx, p.x, footY, scene.tileSize * 1.2, p.facing, bob)
        }
        drawScene(ctx, scene, prepared.images, 'front', time, camera)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [prepared, world, view])

  // As teclas: valem na área do jogo ou fora de qualquer botão ou campo (o espaço num botão
  // continua apertando o botão).
  useEffect(() => {
    const keys = held.current
    function gameKey(event: KeyboardEvent): string | null {
      if (event.ctrlKey || event.metaKey || event.altKey) return null
      const target = event.target instanceof Element ? event.target : null
      const control = target?.closest('button, select, input, textarea, a')
      if (control && control !== gameArea.current) return null
      return playtestKey(event.key)
    }
    function onKeyDown(event: KeyboardEvent): void {
      const key = gameKey(event)
      if (!key) return
      event.preventDefault()
      keys.add(key)
    }
    function onKeyUp(event: KeyboardEvent): void {
      const key = playtestKey(event.key)
      if (key) keys.delete(key)
    }
    const release = (): void => keys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', release)
      keys.clear()
    }
  }, [])

  /** Um botão de segurar (para o dedo): vale enquanto estiver apertado. */
  function holdButton(key: string, label: string, text: string): JSX.Element {
    const press = (): void => {
      held.current.add(key)
    }
    const release = (): void => {
      held.current.delete(key)
    }
    return (
      <Button
        key={key}
        variant="barOutline"
        className="min-h-11 min-w-11 select-none"
        style={{ touchAction: 'none' }}
        aria-label={label}
        data-hold-key={key}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onClick={(event) => {
          // Enter ou espaço no botão (sem ponteiro): um passinho curto.
          if (event.detail !== 0) return
          press()
          setTimeout(release, 160)
        }}
      >
        {text}
      </Button>
    )
  }

  function restart(): void {
    if (world) player.current = playtestStart(world)
    setMessage('')
    gameArea.current?.focus()
  }

  return (
    <Dialog open title={COPY.scene.testarMeuMapa} onClose={onClose} wide>
      <p className="mb-2 text-sm text-pin-muted">{COPY.scene.comoAndarNoTeste}</p>
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs font-bold text-pin-muted">
          {COPY.scene.personagemDoTeste}
          <select
            className={FIELD}
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
          >
            <option value="">{COPY.scene.bonecoDoPinta}</option>
            {characters.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex gap-1">
          <legend className="text-xs font-bold text-pin-muted">{COPY.scene.vistaDoTeste}</legend>
          {(
            [
              ['top', COPY.scene.vistaDeCima],
              ['side', COPY.scene.vistaDeLado],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={view === value ? 'barPrimary' : 'barOutline'}
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {label}
            </Button>
          ))}
        </fieldset>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : !prepared ? (
        <p role="status">{COPY.scene.preparandoOMapa}</p>
      ) : (
        <>
          <button
            ref={gameArea}
            type="button"
            aria-label={COPY.scene.testeComOPersonagem}
            className="pin-checkerboard block w-full overflow-hidden rounded-xl border-2 border-pin-border"
          >
            <canvas
              ref={canvas}
              width={SCREEN.width}
              height={SCREEN.height}
              className="block max-h-96 w-full object-contain"
              aria-label={COPY.scene.cenarioComPersonagemFundoEFrente}
            />
          </button>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {holdButton('arrowleft', COPY.scene.andarParaAEsquerda, '←')}
            {view === 'top'
              ? holdButton('arrowup', COPY.scene.andarParaCima, '↑')
              : holdButton(' ', COPY.scene.pular, COPY.scene.pular)}
            {view === 'top' ? holdButton('arrowdown', COPY.scene.andarParaBaixo, '↓') : null}
            {holdButton('arrowright', COPY.scene.andarParaADireita, '→')}
            <Button variant="barOutline" onClick={restart}>
              {COPY.scene.recomecar}
            </Button>
          </div>
          <p role="status" className="mt-2 min-h-5 text-sm">
            {prepared.scene.name}
            {message ? ` · ${message}` : ''}
          </p>
        </>
      )}
    </Dialog>
  )
}
