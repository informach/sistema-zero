import { MOUSE, TOUCH } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewportCamera } from './viewportCamera'

/** One owner for navigation listeners. Recreate after changing projection/up-axis. */
export function createViewportOrbit(
  canvas: HTMLCanvasElement,
  rig: ViewportCamera,
  reducedMotion: boolean,
  onChange: () => void,
): OrbitControls {
  const orbit = new OrbitControls(rig.camera, canvas)
  orbit.target = rig.target
  orbit.enableDamping = !reducedMotion
  orbit.dampingFactor = 0.08
  orbit.minDistance = 0.25
  orbit.maxDistance = Math.max(140, rig.camera.position.distanceTo(orbit.target) * 4)
  orbit.minZoom = 0.05
  orbit.maxZoom = 100
  if (rig.view !== 'free') {
    orbit.enableRotate = false
    orbit.mouseButtons.LEFT = MOUSE.PAN
    orbit.touches.ONE = TOUCH.PAN
    orbit.touches.TWO = TOUCH.DOLLY_PAN
  }
  orbit.update()
  orbit.addEventListener('change', onChange)
  return orbit
}
