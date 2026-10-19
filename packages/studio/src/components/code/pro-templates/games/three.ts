export function threeSources(id: string): Record<string, string> {
  const action = id === 'three-action'
  return {
    'src/config.ts': `export const config = { title: ${JSON.stringify(action ? 'Jardim das luzes' : 'Ilha dos cristais')}, action: ${action}, speed: 5, goal: 8, radius: 12, maxLights: 16, maxDpr: 1.5, modelPath: '', animation: '', modelHeight: 1.4 }\n`,
    'src/assets.ts': `
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

export class ModelActorDimensionsError extends Error {
  constructor(message: string) { super(message); this.name = 'ModelActorDimensionsError' }
}

/** Cache promises, not just completed requests. Clones share owned GPU resources. */
export class ModelLibrary {
  private cache = new Map<string, Promise<GLTF>>()
  private disposed = false
  private loader = new GLTFLoader()
  async actor(path: string, height: number, animationName: string) {
    if (this.disposed) throw new Error('Biblioteca encerrada.')
    const url = new URL(path, location.href)
    if (url.origin !== new URL(location.href).origin || !/^https?:$/.test(url.protocol)) throw new Error('Escolha um modelo dos Materiais deste projeto.')
    let request = this.cache.get(url.href)
    if (!request) {
      request = this.loader.loadAsync(url.href).then(gltf => { if (this.disposed) { disposeObject(gltf.scene); throw new Error('Carregamento encerrado.') }; return gltf })
      this.cache.set(url.href, request)
      request.catch(() => { if (this.cache.get(url.href) === request) this.cache.delete(url.href) })
    }
    const gltf = await request
    if (this.disposed) throw new Error('Biblioteca encerrada.')
    const root = clone(gltf.scene)
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3())
    if (!Number.isFinite(size.y) || size.y <= 0) { disposeSkeletons(root); throw new ModelActorDimensionsError('Este modelo não tem altura para substituir o personagem. Escolha um modelo com volume.') }
    if (!Number.isFinite(height) || height <= 0) { disposeSkeletons(root); throw new ModelActorDimensionsError('Defina modelHeight maior que zero em src/config.ts.') }
    const object = new THREE.Group()
    root.position.sub(new THREE.Vector3(center.x, box.min.y, center.z))
    object.add(root); object.scale.setScalar(height / size.y)
    const mixer = new THREE.AnimationMixer(root)
    const clip = gltf.animations.find(value => value.name === animationName) ?? gltf.animations[0]
    if (clip) mixer.clipAction(clip).play()
    let released = false
    return { object, update: (dt: number) => { if (!released) mixer.update(dt) }, dispose() { if (released) return; released = true; mixer.stopAllAction(); mixer.uncacheRoot(root); disposeSkeletons(root); object.removeFromParent() } }
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    // Pending loads perform their own late-result disposal above.
    for (const request of this.cache.values()) void request.then(gltf => disposeObject(gltf.scene)).catch(() => {})
    this.cache.clear()
  }
}

function disposeSkeletons(root: THREE.Object3D) {
  const skeletons = new Set<THREE.Skeleton>()
  root.traverse(node => { if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton) })
  for (const skeleton of skeletons) skeleton.dispose()
}
export function disposeObject(root: THREE.Object3D) {
  const skeletons = new Set<THREE.Skeleton>(), geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  for (const texture of textures) { const image = texture.source.data; if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close(); texture.dispose() }
  for (const material of materials) material.dispose()
  for (const geometry of geometries) geometry.dispose()
  for (const skeleton of skeletons) skeleton.dispose()
}
`,
    'src/game.ts': `
import * as THREE from 'three'
import { config } from './config'
import { ModelActorDimensionsError, ModelLibrary, disposeObject } from './assets'
import { frameLoop } from './lifecycle'
import type { GameUI } from './ui'
import type { GameInput } from './input'
import type { GameController } from './contracts'

export function createGame(ui: GameUI, input: GameInput): GameController {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#9acbda'); scene.fog = new THREE.Fog('#9acbda',22,48)
  const camera = new THREE.PerspectiveCamera(50,16/9,.1,60)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  const lifetime = new AbortController()
  renderer.domElement.addEventListener('webglcontextlost', () => { ui.pause(); ui.note('O desenho 3D foi interrompido. Aguarde o navegador recuperar a imagem.') }, { signal: lifetime.signal })
  renderer.domElement.addEventListener('webglcontextrestored', () => { ui.note('Imagem recuperada. Clique em Continuar.'); invalidate() }, { signal: lifetime.signal })
  renderer.setPixelRatio(Math.min(config.maxDpr, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label',config.title + '. Setas movem pelo jardim.')
  ui.stage.append(renderer.domElement)
  scene.add(new THREE.HemisphereLight(0xebfaff,0x658c57,2))
  const sun = new THREE.DirectionalLight(0xffffff,2.5); sun.position.set(6,12,5); scene.add(sun)
  const land = new THREE.Mesh(new THREE.CylinderGeometry(config.radius,config.radius+1,1,40),new THREE.MeshStandardMaterial({ color: '#699f76', roughness: 1 }))
  land.position.y = -.5; scene.add(land)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({ color: '#669fbd', roughness: .5 })); water.rotation.x = -Math.PI/2; water.position.y = -.8; scene.add(water)
  const player = new THREE.Group(), visual = new THREE.Group(); player.add(visual); scene.add(player)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.3,.7,3,8),new THREE.MeshStandardMaterial({ color: '#f6cf73' })); body.position.y = .65; visual.add(body)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.18,.4,5),new THREE.MeshStandardMaterial({ color: '#373652' })); nose.rotation.x = -Math.PI/2; nose.position.set(0,.9,-.35); visual.add(nose)
  const targetGeometry = new THREE.OctahedronGeometry(.4), targetMaterial = new THREE.MeshStandardMaterial({ color: '#a84db3', emissive: '#341c45' })
  const targets = Array.from({ length: config.goal }, (_, i) => {
    const mesh = new THREE.Mesh(targetGeometry,targetMaterial)
    const angle = i/config.goal*Math.PI*2, distance = 4+(i%3)*2
    mesh.position.set(Math.sin(angle)*distance,.65,Math.cos(angle)*distance); scene.add(mesh)
    return mesh
  })
  const portal = new THREE.Mesh(new THREE.TorusGeometry(1.1,.14,8,24),new THREE.MeshStandardMaterial({ color: '#ffdc71', emissive: '#5b4214' })); portal.position.set(0,1.3,-9.5); portal.visible = false; scene.add(portal)
  // A fixed pool: each projectile owns position/direction, but shares geometry/material.
  const lightGeometry = new THREE.SphereGeometry(.12,8,6), lightMaterial = new THREE.MeshBasicMaterial({ color: '#fff5a6' })
  const lights = Array.from({ length: config.maxLights }, () => { const mesh = new THREE.Mesh(lightGeometry,lightMaterial); mesh.visible = false; scene.add(mesh); return { mesh, direction: new THREE.Vector3(), ttl: 0 } })
  const direction = new THREE.Vector3(), desiredCamera = new THREE.Vector3(), look = new THREE.Vector3(), facing = new THREE.Vector3(0,0,-1)
  const cameraOffset = new THREE.Vector3(0,10,13), portalGoal = new THREE.Vector3(0,0,-9.5)
  const library = new ModelLibrary()
  let actor: Awaited<ReturnType<ModelLibrary['actor']>> | undefined
  let invalidate = () => {}
  let disposed = false, score = 0, cooldown = 0
  if (config.modelPath) void library.actor(config.modelPath,config.modelHeight,config.animation).then(value => {
    if (disposed) { value.dispose(); return }
    actor = value; body.visible = false; nose.visible = false; visual.add(value.object); invalidate()
  }).catch(error => {
    if (disposed) return
    ui.note(error instanceof ModelActorDimensionsError
      ? error.message + ' O personagem inicial continua disponível.'
      : 'Não foi possível abrir o modelo. Confira o caminho em src/config.ts; o personagem inicial continua disponível.')
  })
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const resize = () => { const w = ui.stage.clientWidth, h = ui.stage.clientHeight; if (!w || !h) return; renderer.setPixelRatio(Math.min(ui.reducedQuality ? 1 : config.maxDpr,devicePixelRatio || 1)); renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix(); invalidate() }
  const stopQuality = ui.onQuality(resize)
  const observer = new ResizeObserver(resize); observer.observe(ui.stage); resize()
  function reset() {
    player.position.set(0,0,2); visual.rotation.y = 0; facing.set(0,0,-1); score = 0; cooldown = 0
    for (const target of targets) target.visible = true
    for (const light of lights) { light.ttl = 0; light.mesh.visible = false }
    portal.visible = false; input.clear(); camera.position.set(0,11,15); look.copy(player.position); camera.lookAt(look)
  }
  reset(); ui.onReset(reset)
  const unsubscribe = ui.onPhase(() => { input.clear(); invalidate() })
  const loop = frameLoop(dt => {
    input.poll()
    if (ui.phase === 'playing') {
      cooldown -= dt
      direction.set(Number(input.down('right'))-Number(input.down('left')),0,Number(input.down('down'))-Number(input.down('up')))
      if (direction.lengthSq() > 0) { direction.normalize(); facing.copy(direction); player.position.addScaledVector(direction,dt*config.speed); visual.rotation.y = Math.atan2(-direction.x,-direction.z) }
      const length = Math.hypot(player.position.x,player.position.z)
      if (length > config.radius-.6) { player.position.x *= (config.radius-.6)/length; player.position.z *= (config.radius-.6)/length }
      if (config.action && input.down('action') && cooldown <= 0) {
        const light = lights.find(value => value.ttl <= 0)
        if (light) { light.ttl = 1.3; light.mesh.visible = true; light.mesh.position.copy(player.position); light.mesh.position.y = .65; light.direction.copy(facing); cooldown = .2; ui.tone(480) }
      }
      for (const light of lights) {
        if (light.ttl <= 0) continue
        light.ttl -= dt; light.mesh.position.addScaledVector(light.direction,dt*12)
        if (light.ttl <= 0) light.mesh.visible = false
      }
      for (const target of targets) {
        if (!target.visible) continue
        if (!reducedMotion.matches && !ui.reducedQuality) target.rotation.y += dt
        const hit = config.action ? lights.find(light => light.ttl > 0 && light.mesh.position.distanceToSquared(target.position) < .55) : player.position.distanceToSquared(target.position) < 1.2
        if (hit) { target.visible = false; score++; ui.tone(760); if (typeof hit === 'object') { hit.ttl = 0; hit.mesh.visible = false } }
      }
      portal.visible = score >= config.goal
      if (portal.visible && player.position.distanceToSquared(portalGoal) < 1.5) ui.finish(true,'Missão cumprida! O portal está aberto.',score)
      if (actor) actor.update(dt)
      desiredCamera.copy(player.position).add(cameraOffset); camera.position.lerp(desiredCamera,1-Math.exp(-dt*5)); look.copy(player.position); look.y = .5; camera.lookAt(look)
    }
    ui.hud((config.action ? 'Luzes acesas: ' : 'Cristais: ') + score + '/' + config.goal + (portal.visible ? ' · Vá até o portal dourado!' : ''))
    renderer.render(scene,camera)
  }, () => ui.phase === 'playing')
  invalidate = loop.request
  return {
    inspect: () => ({ engine: 'three', phase: ui.phase, score, goal: config.goal, player: { x: player.position.x, y: player.position.y, z: player.position.z }, targets: targets.filter(target => target.visible).map(target => ({ x: target.position.x, y: target.position.y, z: target.position.z })), render: { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures } }),
    dispose() { if (disposed) return; disposed = true; lifetime.abort(); loop.dispose(); unsubscribe(); stopQuality(); observer.disconnect(); actor?.dispose(); library.dispose(); disposeObject(scene); renderer.dispose(); renderer.domElement.remove() },
  }
}
`,
    'src/main.ts': `import { createProgress } from './progress'\nimport { config } from './config'\nimport { createUI } from './ui'\nimport { createInput } from './input'\nimport { createGame } from './game'\nimport { manageLifetime, exposeGameInspection } from './lifecycle'\nconst ui = createUI(config.title, ${JSON.stringify(action ? 'Setas ou WASD movem e miram; Espaço ou Ação lança luz. Acenda os oito cristais e entre no portal dourado. Esc pausa.' : 'Setas ou WASD movem pelo jardim. Reúna os oito cristais e caminhe até o portal dourado. Esc pausa.')})\nconst input = createInput(ui.controls, () => ui.phase === 'playing', ${JSON.stringify({ left: '← Esquerda', right: 'Direita →', up: '↑ Frente', down: '↓ Voltar', ...(action ? { action: 'Lançar luz' } : {}) })})\nconst stopProgress = createProgress(ui, ${JSON.stringify(id)})\ntry { const game = createGame(ui,input); const stopInspection = exposeGameInspection(game); manageLifetime(() => { stopInspection(); game.dispose(); stopProgress(); input.destroy(); ui.destroy() }) } catch (error) { console.error('Não foi possível iniciar o jogo 3D:', error); ui.note('Não foi possível iniciar o 3D. Confira o Console; se o navegador não oferecer WebGL2, escolha um kit 2D.'); stopProgress(); input.destroy(); manageLifetime(() => ui.destroy()) }\n`,
  }
}
