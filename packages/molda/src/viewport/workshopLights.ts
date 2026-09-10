import { DirectionalLight, HemisphereLight } from 'three'

/** Consistent neutral workshop lighting for legacy and hierarchical documents. */
export function workshopLights() {
  const hemisphere = new HemisphereLight(0xffffff, 0x7f8fa8, 1.4)
  const sun = new DirectionalLight(0xffffff, 2.2)
  sun.position.set(12, 24, 10)
  const fill = new DirectionalLight(0xffffff, 0.5)
  fill.position.set(-14, 8, -12)
  return [hemisphere, sun, fill]
}
