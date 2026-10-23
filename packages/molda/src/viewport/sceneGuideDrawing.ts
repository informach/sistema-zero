import { BufferAttribute, BufferGeometry, Color, DoubleSide, Points, PointsMaterial } from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import type { Vec3 } from '../core/model'

/** Pixel sizes use the renderer's CSS viewport and point pixel ratio, including high-DPI screens. */
export function guideLine(
  segments: readonly (readonly [Vec3, Vec3])[],
  color: number,
  width: number,
  depthTest = true,
) {
  const line = new LineSegments2(
    new LineSegmentsGeometry().setPositions(segments.flatMap(([a, b]) => [...a, ...b])),
    new LineMaterial({
      color,
      linewidth: width,
      depthTest,
      depthWrite: false,
      transparent: true,
      // Wide-line triangles expand in screen space. A reflected world matrix flips
      // Three's face culling, but not these triangles' winding.
      side: DoubleSide,
      forceSinglePass: true,
    }),
  )
  line.renderOrder = 20
  return line
}

export function guidePoints(
  points: readonly Vec3[],
  size: number,
  color: number,
  border: number,
  stroke: number,
) {
  const material = new PointsMaterial({
    color,
    size,
    sizeAttenuation: false,
    depthWrite: false,
    depthTest: false,
    transparent: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.guideBorder = { value: new Color(border) }
    shader.uniforms.guideInner = { value: 0.5 - stroke / size }
    shader.fragmentShader =
      `uniform vec3 guideBorder; uniform float guideInner;\n${shader.fragmentShader}`.replace(
        '#include <map_particle_fragment>',
        `
        float radius = length(gl_PointCoord - vec2(0.5));
        if (radius > 0.5) discard;
        diffuseColor.rgb = mix(diffuseColor.rgb, guideBorder, step(guideInner, radius));
      `,
      )
  }
  material.customProgramCacheKey = () => 'molda-guide-circle-v1'
  const result = new Points(
    new BufferGeometry().setAttribute(
      'position',
      new BufferAttribute(Float32Array.from(points.flat()), 3),
    ),
    material,
  )
  result.renderOrder = 23
  return result
}
