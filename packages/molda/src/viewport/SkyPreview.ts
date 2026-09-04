/**
 * A prévia do céu (three.js cru): a imagem equiretangular do render na CPU
 * vira uma `DataTexture` HALF FLOAT (float32 com filtro linear falta em
 * celular), linear, `flipY = true` (linha 0 = zênite), usada como FUNDO da
 * cena e, pelo `PMREMGenerator`, como AMBIENTE que ilumina uma casinha e uma
 * bola metálica (o reflexo é o que mostra que o céu é HDR de verdade).
 * Órbita com um dedo; render sob demanda.
 */
import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  DataTexture,
  DataUtils,
  EquirectangularReflectionMapping,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  RGBAFormat,
  Scene,
  SphereGeometry,
  type Texture,
  WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SkyImage } from '../sky/render'

export interface SkyPreviewLike {
  setSky(image: SkyImage): void
  dispose(): void
}

export interface SkyPreviewOptions {
  reducedMotion?: boolean
}

export type SkyPreviewFactory = (
  canvas: HTMLCanvasElement,
  options: SkyPreviewOptions,
) => SkyPreviewLike

export class SkyPreview implements SkyPreviewLike {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly orbit: OrbitControls
  private readonly pmrem: PMREMGenerator
  private readonly resizeObserver: ResizeObserver | null
  private readonly disposables: Array<{ dispose(): void }> = []
  private texture: DataTexture | null = null
  private environment: WebGLRenderTarget | null = null
  private frameHandle: number | null = null
  private disposed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: SkyPreviewOptions = {},
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera = new PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(7, 3.2, 8)
    this.orbit = new OrbitControls(this.camera, canvas)
    this.orbit.enableDamping = !options.reducedMotion
    this.orbit.dampingFactor = 0.08
    this.orbit.enablePan = false
    this.orbit.minDistance = 4
    this.orbit.maxDistance = 30
    this.orbit.maxPolarAngle = Math.PI / 2 + 0.2
    this.orbit.target.set(0, 1.2, 0)
    this.orbit.update()
    this.orbit.addEventListener('change', this.onOrbitChange)
    this.pmrem = new PMREMGenerator(this.renderer)

    this.buildSampleScene()

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

  setSky(image: SkyImage): void {
    if (this.disposed) return
    const data = new Uint16Array(image.width * image.height * 4)
    const one = DataUtils.toHalfFloat(1)
    for (let i = 0; i < image.width * image.height; i += 1) {
      data[i * 4] = DataUtils.toHalfFloat(image.rgb[i * 3] as number)
      data[i * 4 + 1] = DataUtils.toHalfFloat(image.rgb[i * 3 + 1] as number)
      data[i * 4 + 2] = DataUtils.toHalfFloat(image.rgb[i * 3 + 2] as number)
      data[i * 4 + 3] = one
    }
    const texture = new DataTexture(data, image.width, image.height, RGBAFormat, HalfFloatType)
    texture.colorSpace = LinearSRGBColorSpace
    texture.mapping = EquirectangularReflectionMapping
    texture.flipY = true
    texture.magFilter = LinearFilter
    texture.minFilter = LinearFilter
    texture.generateMipmaps = false
    texture.needsUpdate = true

    const previousTexture = this.texture
    this.replaceEnvironment(texture)
    this.texture = texture
    this.scene.background = texture
    previousTexture?.dispose()
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
    this.environment?.dispose()
    this.texture?.dispose()
    this.pmrem.dispose()
    this.renderer.dispose()
  }

  private buildSampleScene(): void {
    const add = (mesh: Mesh): void => {
      this.scene.add(mesh)
      this.disposables.push(mesh.geometry, mesh.material as MeshStandardMaterial)
    }
    const ground = new Mesh(
      new CircleGeometry(7, 48),
      new MeshStandardMaterial({ color: 0x8fb06e, roughness: 0.95, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    add(ground)
    const walls = new Mesh(
      new BoxGeometry(3, 2, 2.6),
      new MeshStandardMaterial({ color: 0xf0e2c4, roughness: 0.85, metalness: 0 }),
    )
    walls.position.set(-0.6, 1, 0)
    add(walls)
    const roof = new Mesh(
      new ConeGeometry(2.35, 1.3, 4),
      new MeshStandardMaterial({ color: 0xc0553a, roughness: 0.75, metalness: 0 }),
    )
    roof.position.set(-0.6, 2.65, 0)
    roof.rotation.y = Math.PI / 4
    add(roof)
    const chimney = new Mesh(
      new BoxGeometry(0.4, 0.9, 0.4),
      new MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.9, metalness: 0 }),
    )
    chimney.position.set(0.3, 2.9, -0.6)
    add(chimney)
    const ball = new Mesh(
      new SphereGeometry(0.9, 32, 24),
      new MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 1 }),
    )
    ball.position.set(2.4, 0.9, 1.2)
    add(ball)
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
    if (this.texture) {
      this.texture.needsUpdate = true
      this.replaceEnvironment(this.texture)
    }
    this.requestFrame()
  }

  private replaceEnvironment(texture: Texture): void {
    const environment = this.pmrem.fromEquirectangular(texture)
    const previous = this.environment
    this.environment = environment
    this.scene.environment = environment.texture
    previous?.dispose()
  }
}
