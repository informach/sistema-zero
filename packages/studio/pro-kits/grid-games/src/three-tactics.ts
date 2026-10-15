import * as THREE from 'three'
import type { GameInput } from './input'
import { config } from './tactics-config'
import { createTacticsController } from './tactics-controller'
import type { GameUI } from './ui'

export function createGame(ui: GameUI, input: GameInput) {
  return createTacticsController(ui, input, 'three', (host, pick, ready) => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#254c65')
    const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 60)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.tabIndex = 0
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.setAttribute(
      'aria-label',
      'Ilha tática 3D. Toque nas casas ou use setas e Espaço. O HUD descreve a seleção.',
    )
    host.stage.append(renderer.domElement)
    const lifetime = new AbortController(),
      geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>()
    const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
      geometries.add(value)
      return value
    }
    const material = (color: string) => {
      const value = new THREE.MeshLambertMaterial({ color })
      materials.add(value)
      return value
    }
    const tileGeometry = geometry(new THREE.BoxGeometry(0.94, 0.4, 0.94)),
      bodyGeometry = geometry(new THREE.CylinderGeometry(0.23, 0.28, 0.6, 8))
    const scoutGeometry = geometry(new THREE.ConeGeometry(0.31, 0.7, 8)),
      ringGeometry = geometry(new THREE.RingGeometry(0.35, 0.42, 24))
    const barGeometry = geometry(new THREE.BoxGeometry(0.65, 0.06, 0.07))
    const grass = material('#75a985'),
      high = material('#c6c890'),
      water = material('#315e79'),
      friend = material('#86f4de'),
      rival = material('#efac7e')
    const white = material('#ffffff'),
      yellow = material('#ffe580'),
      moveColor = material('#bbf8e1'),
      dark = material('#234353')
    scene.add(new THREE.HemisphereLight(0xe8faff, 0x526e63, 2))
    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(-4, 10, 6)
    scene.add(light)
    const centerX = (config.terrain[0]!.length - 1) / 2,
      centerY = (config.terrain.length - 1) / 2
    camera.position.set(centerX + 9, 12, centerY + 10)
    camera.lookAt(centerX, 0, centerY)
    const tiles: THREE.Mesh[] = [],
      cursor = new THREE.Mesh(ringGeometry, yellow)
    cursor.rotation.x = -Math.PI / 2
    scene.add(cursor)
    for (let y = 0; y < config.terrain.length; y++)
      for (let x = 0; x < config.terrain[y]!.length; x++) {
        const level = config.terrain[y]![x]!,
          mesh = new THREE.Mesh(tileGeometry, level === 0 ? water : level === 2 ? high : grass)
        mesh.position.set(x, level === 0 ? -0.35 : level === 2 ? 0.2 : 0, y)
        mesh.userData.cell = { x, y }
        scene.add(mesh)
        tiles.push(mesh)
      }
    // Fixed visual pool, shared geometry/materials; recruitment never allocates GPU resources.
    const actors = Array.from({ length: 12 }, () => {
      const root = new THREE.Group(),
        body = new THREE.Mesh(bodyGeometry, friend),
        ring = new THREE.Mesh(ringGeometry, white)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.03
      const health = new THREE.Mesh(barGeometry, white),
        back = new THREE.Mesh(barGeometry, dark)
      health.position.set(0, 1, 0.02)
      back.position.set(0, 1, 0)
      body.position.y = 0.45
      root.add(body, ring, back, health)
      root.visible = false
      scene.add(root)
      return { root, body, ring, health }
    })
    const moves = Array.from({ length: 144 }, () => {
      const mesh = new THREE.Mesh(ringGeometry, moveColor)
      mesh.rotation.x = -Math.PI / 2
      mesh.scale.setScalar(0.75)
      mesh.visible = false
      scene.add(mesh)
      return mesh
    })
    const raycaster = new THREE.Raycaster(),
      pointer = new THREE.Vector2()
    let disposed = false,
      contextLost = false
    const draw = () => {
      if (!disposed && !contextLost) renderer.render(scene, camera)
    }
    const resize = () => {
      const width = host.stage.clientWidth,
        height = host.stage.clientHeight
      if (!width || !height || disposed) return
      const aspect = width / height,
        extent = Math.max(config.terrain.length, config.terrain[0]!.length) * 0.7
      camera.left = -extent * Math.max(1, aspect)
      camera.right = -camera.left
      camera.top = extent * Math.max(1, 1 / aspect)
      camera.bottom = -camera.top
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(host.reducedQuality ? 1 : 1.5, devicePixelRatio || 1))
      renderer.setSize(width, height, false)
      draw()
    }
    renderer.domElement.addEventListener(
      'pointerdown',
      (event) => {
        if (contextLost || host.phase !== 'playing') return
        const rect = renderer.domElement.getBoundingClientRect()
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        )
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(tiles, false)[0]
        if (hit) pick(hit.object.userData.cell)
      },
      { signal: lifetime.signal },
    )
    renderer.domElement.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault()
        contextLost = true
        host.pause()
        host.setReadiness('loading', 'O desenho 3D foi interrompido. Recuperando a imagem…')
      },
      { signal: lifetime.signal },
    )
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      () => {
        contextLost = false
        host.setReadiness('ready', 'Imagem recuperada. Continue quando quiser.')
        resize()
      },
      { signal: lifetime.signal },
    )
    const observer = new ResizeObserver(resize)
    observer.observe(host.stage)
    const offQuality = host.onQuality(resize)
    resize()
    ready()
    return {
      draw(model) {
        const level = (x: number, y: number) =>
          model.tile({ x, y }) === 2 ? 0.42 : model.tile({ x, y }) === 0 ? -0.12 : 0.22
        cursor.position.set(
          model.cursor.x,
          level(model.cursor.x, model.cursor.y) + 0.02,
          model.cursor.y,
        )
        const alive = model.units.filter((unit) => unit.health > 0)
        for (let index = 0; index < actors.length; index++) {
          const actor = actors[index]!,
            unit = alive[index]
          actor.root.visible = !!unit
          if (!unit) continue
          actor.root.position.set(unit.x, level(unit.x, unit.y), unit.y)
          actor.body.geometry = unit.role === 'scout' ? scoutGeometry : bodyGeometry
          actor.body.material = unit.acted ? dark : unit.side === 'friend' ? friend : rival
          actor.ring.visible = unit.id === model.selectedId
          actor.health.scale.x = unit.health / unit.maxHealth
        }
        const selected = model.selected(),
          cells = selected && model.turn === 'player' ? model.moves(selected) : []
        for (let index = 0; index < moves.length; index++) {
          const mesh = moves[index]!,
            cell = cells[index]
          mesh.visible = !!cell
          if (cell) mesh.position.set(cell.x, level(cell.x, cell.y) + 0.01, cell.y)
        }
        draw()
      },
      statistics: () => ({
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      }),
      dispose() {
        if (disposed) return
        disposed = true
        lifetime.abort()
        observer.disconnect()
        offQuality()
        scene.clear()
        for (const value of geometries) value.dispose()
        for (const value of materials) value.dispose()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      },
    }
  })
}
