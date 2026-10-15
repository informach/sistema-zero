import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type DirectionalLight,
  Group,
  LineSegments,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  ShadowMaterial,
  Vector3,
} from 'three'
import type { Bounds } from '../model/transform'

/** Ground helpers own GPU resources and theme observation; model data and exports stay untouched. */
export class SceneGround {
  readonly root = new Group()
  readonly grid: LineSegments<BufferGeometry, ShaderMaterial>
  private readonly shadow = new Mesh(
    new PlaneGeometry(1, 1),
    new ShadowMaterial({ opacity: 0.17, depthWrite: false }),
  )
  private readonly observer: MutationObserver | null
  private readonly direction = new Vector3(12, 24, 10).normalize()
  constructor(
    canvas: HTMLCanvasElement,
    private readonly sun: DirectionalLight,
    request: () => void,
  ) {
    const positions: number[] = []
    for (let i = -24; i <= 24; i++) positions.push(-24, 0, i, 24, 0, i, i, 0, -24, i, 0, 24)
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        gridInk: { value: new Color() },
        axisX: { value: new Color(0xe5484d) },
        axisZ: { value: new Color(0x3e63dd) },
        opacity: { value: 0.5 },
      },
      vertexShader:
        'varying vec3 gridPosition; void main() { gridPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 gridPosition;
uniform vec3 gridInk; uniform vec3 axisX; uniform vec3 axisZ; uniform float opacity;
void main() {
  float fade = 1.0 - smoothstep(6.0, 24.0, length(gridPosition.xz));
  vec3 ink = abs(gridPosition.z) < 0.00001 ? axisX : abs(gridPosition.x) < 0.00001 ? axisZ : gridInk;
  gl_FragColor = vec4(ink, opacity * fade);
  #include <colorspace_fragment>
}`,
    })
    this.grid = new LineSegments(
      new BufferGeometry().setAttribute(
        'position',
        new BufferAttribute(new Float32Array(positions), 3),
      ),
      material,
    )
    this.grid.name = 'molda-ground-grid'
    this.grid.position.y = 0.002
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.receiveShadow = true
    this.shadow.name = 'molda-ground-shadow'
    this.root.add(this.grid, this.shadow)
    sun.castShadow = true
    // The light and casters do not change when only the viewing camera moves.
    // Rebuild the map for content/pose/visibility changes, not for every orbit frame.
    sun.shadow.autoUpdate = false
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.normalBias = 0.015
    sun.shadow.bias = -0.0001
    const host = canvas.closest('[data-molda-theme]')
    const theme = () => {
      const dark = host?.getAttribute('data-molda-theme') === 'dark'
      const css = canvas.ownerDocument.defaultView?.getComputedStyle(canvas)
      material.uniforms.gridInk!.value.set(
        css?.getPropertyValue('--mld-grid-ink').trim() || (dark ? '#53647e' : '#a8b7cc'),
      )
      const alpha = Number(
        css?.getPropertyValue('--mld-grid-opacity').trim() || (dark ? '0.36' : '0.5'),
      )
      material.uniforms.opacity!.value = Number.isFinite(alpha)
        ? Math.max(0, Math.min(1, alpha))
        : 0.5
      this.shadow.material.opacity = dark ? 0.27 : 0.17
      request()
    }
    this.observer = host ? new MutationObserver(theme) : null
    try {
      this.observer?.observe(host!, {
        attributes: true,
        attributeFilter: ['data-molda-theme', 'style'],
      })
      theme()
    } catch (error) {
      this.dispose()
      throw error
    }
  }
  invalidateShadow() {
    this.sun.shadow.needsUpdate = true
  }
  update(bounds: Bounds | null) {
    this.invalidateShadow()
    this.shadow.visible = bounds !== null
    if (!bounds) return
    const min = new Vector3(...bounds.min),
      max = new Vector3(...bounds.max),
      center = min.clone().add(max).multiplyScalar(0.5)
    const radius = Math.max(max.clone().sub(min).length() / 2, 0.25),
      ground = Math.min(0, bounds.min[1])
    const reach = radius + Math.max(0, bounds.min[1] - ground)
    // Project the caster bounds onto the ground along the directional light.
    // A transparent receiver outside this footprint still executes the PCF
    // shader for every pixel; bounding it avoids shading empty screen area.
    const groundY = ground - radius * 1e-5
    const top = max.y - groundY,
      bottom = min.y - groundY
    const slopeX = this.direction.x / this.direction.y
    const slopeZ = this.direction.z / this.direction.y
    const normalBias = radius * 0.002
    const texel = (reach * 4) / Math.min(this.sun.shadow.mapSize.x, this.sun.shadow.mapSize.y)
    // Include the PCF kernel and the normal bias projected onto the receiver.
    const padding = (texel * 4 + normalBias * 2) / this.direction.y
    const left = min.x - Math.max(top * slopeX, bottom * slopeX) - padding
    const right = max.x - Math.min(top * slopeX, bottom * slopeX) + padding
    const near = min.z - Math.max(top * slopeZ, bottom * slopeZ) - padding
    const far = max.z - Math.min(top * slopeZ, bottom * slopeZ) + padding
    this.shadow.position.set((left + right) / 2, groundY, (near + far) / 2)
    this.shadow.scale.set(right - left, far - near, 1)
    this.sun.position.copy(center).addScaledVector(this.direction, reach * 3)
    this.sun.target.position.copy(center)
    const camera = this.sun.shadow.camera
    camera.left = camera.bottom = -reach * 2
    camera.right = camera.top = reach * 2
    camera.near = Math.max(reach * 0.01, 0.001)
    camera.far = reach * 8
    camera.updateProjectionMatrix()
    this.sun.shadow.normalBias = normalBias
  }
  dispose() {
    this.observer?.disconnect()
    this.grid.geometry.dispose()
    this.grid.material.dispose()
    this.shadow.geometry.dispose()
    this.shadow.material.dispose()
    this.sun.shadow.dispose()
    this.root.clear()
  }
}
