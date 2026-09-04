/**
 * A prévia 3D da textura (three.js cru): a folha vira uma `DataTexture` sRGB
 * NEAREST vestindo um cubo e uma bola, repetida 3×3 para a emenda ficar
 * visível. Material OPACO de propósito: texel transparente sai PRETO, que é o
 * que o jogo mostra. Órbita com um dedo; render sob demanda.
 */
import {
  BoxGeometry,
  CircleGeometry,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  UnsignedByteType,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface TexturePreviewLike {
  setTexture(rgba: Uint8Array, size: number): void
  dispose(): void
}

export interface TexturePreviewOptions {
  reducedMotion?: boolean
}

export type TexturePreviewFactory = (
  canvas: HTMLCanvasElement,
  options: TexturePreviewOptions,
) => TexturePreviewLike

export class TexturePreview implements TexturePreviewLike {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly orbit: OrbitControls
  private readonly material = new MeshStandardMaterial({ roughness: 0.9, metalness: 0 })
  private readonly resizeObserver: ResizeObserver | null
  private readonly disposables: Array<{ dispose(): void }> = []
  private texture: DataTexture | null = null
  private frameHandle: number | null = null
  private disposed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: TexturePreviewOptions = {},
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(4.5, 3.2, 6)
    this.orbit = new OrbitControls(this.camera, canvas)
    this.orbit.enableDamping = !options.reducedMotion
    this.orbit.dampingFactor = 0.08
    this.orbit.enablePan = false
    this.orbit.minDistance = 3
    this.orbit.maxDistance = 16
    this.orbit.target.set(0, 1, 0)
    this.orbit.update()
    this.orbit.addEventListener('change', this.onOrbitChange)

    const hemisphere = new HemisphereLight(0xffffff, 0x7f8fa8, 1.3)
    const sun = new DirectionalLight(0xffffff, 2)
    sun.position.set(5, 8, 6)
    this.scene.add(hemisphere, sun)
    const ground = new Mesh(
      new CircleGeometry(4, 40),
      new MeshStandardMaterial({ color: 0xd7e3f2, roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)
    this.disposables.push(ground.geometry, ground.material as MeshStandardMaterial)
    const box = new Mesh(new BoxGeometry(2, 2, 2), this.material)
    box.position.set(-1.5, 1, 0)
    const ball = new Mesh(new SphereGeometry(1.1, 32, 24), this.material)
    ball.position.set(1.6, 1.1, 0)
    this.scene.add(box, ball)
    this.disposables.push(box.geometry, ball.geometry, this.material)

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(canvas.parentElement ?? canvas)
    } else {
      this.resizeObserver = null
    }
    canvas.addEventListener('contextmenu', this.onContextMenu)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    this.resize()
  }

  setTexture(rgba: Uint8Array, size: number): void {
    if (this.disposed) return
    const texture = new DataTexture(rgba, size, size, RGBAFormat, UnsignedByteType)
    texture.colorSpace = SRGBColorSpace
    texture.magFilter = NearestFilter
    texture.minFilter = NearestFilter
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(3, 3)
    texture.generateMipmaps = false
    // A folha é desenhada de cima para baixo; a UV do three começa embaixo.
    texture.flipY = true
    texture.needsUpdate = true
    this.texture?.dispose()
    this.texture = texture
    this.material.map = texture
    this.material.needsUpdate = true
    this.requestFrame()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle)
    this.resizeObserver?.disconnect()
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.orbit.removeEventListener('change', this.onOrbitChange)
    this.orbit.dispose()
    for (const item of this.disposables) item.dispose()
    this.texture?.dispose()
    this.renderer.dispose()
  }

  private requestFrame(): void {
    if (this.disposed || this.frameHandle !== null) return
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = null
      if (this.disposed) return
      const moving = this.orbit.update()
      this.renderer.render(this.scene, this.camera)
      if (moving) this.requestFrame()
    })
  }

  private resize(): void {
    const parent = this.canvas.parentElement ?? this.canvas
    const width = parent.clientWidth
    const height = parent.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.requestFrame()
  }

  private readonly onOrbitChange = (): void => {
    this.requestFrame()
  }

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
  }

  private readonly onContextRestored = (): void => {
    if (this.texture) this.texture.needsUpdate = true
    this.requestFrame()
  }
}
